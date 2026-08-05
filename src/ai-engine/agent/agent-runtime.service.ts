import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { AgentExecutorService } from './agent-executor.service'
import { AgentExecutionLoggerService } from './agent-execution-logger.service'
import { AgentPlanService, MAX_AGENT_PLAN_STEPS } from './agent-plan.service'
import { AgentResponseComposerService } from './agent-response-composer.service'
import { ModelResolverService } from '../model/model-resolver.service'
import {
  AgentContext,
  AgentExecutionResult,
  AgentRuntimeConfig,
  AgentRuntimeInput,
  AgentRuntimeStreamChunk,
} from './agent-runtime.types'

@Injectable()
export class AgentRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: AgentPlanService,
    private readonly executor: AgentExecutorService,
    private readonly responseComposer: AgentResponseComposerService,
    private readonly executionLogger: AgentExecutionLoggerService,
    private readonly modelResolver: ModelResolverService,
  ) {}

  async resolve(agentCode?: string): Promise<AgentRuntimeConfig | null> {
    if (!agentCode) {
      return null
    }

    const agent = await this.prisma.aiAgent.findFirst({
      where: { code: agentCode, status: 1 },
      include: {
        knowledgeBases: {
          where: { knowledgeBase: { status: 1 } },
          select: { knowledgeBaseId: true },
        },
      },
    })
    if (!agent) {
      throw new BadRequestException('Agent does not exist or is disabled')
    }

    const prompt = await this.prisma.aiPrompt.findFirst({
      where: { id: agent.promptId, status: 1 },
    })
    if (!prompt) {
      throw new BadRequestException('Agent prompt does not exist or is disabled')
    }

    // agentCode 在这里被解析成运行时配置：提示词、模型、知识库范围、工具白名单和可选工作流都从同一个入口输出。
    const basePrompt = [agent.promptSnapshot || prompt.content, agent.promptEnhancement]
      .filter(Boolean)
      .join('\n\n')
    const llmOptions = await this.modelResolver.resolve(agent.modelConfigId, agent.model)
    return {
      agentCode: agent.code,
      agentName: agent.name,
      promptId: prompt.id,
      mode: agent.knowledgeEnabled
        ? 'knowledge'
        : agent.mode === 'knowledge'
          ? 'knowledge'
          : 'chat',
      systemPrompt: basePrompt,
      llmOptions: {
        ...llmOptions,
        temperature: agent.temperature ?? undefined,
        topP: agent.topP ?? undefined,
      },
      toolCodes: this.normalizeToolCodes(agent.toolCodes),
      knowledgeEnabled: agent.knowledgeEnabled,
      knowledgeStrict: agent.knowledgeStrict,
      knowledgeTags: this.normalizeStringArray(agent.knowledgeTags),
      knowledgeBaseIds: agent.knowledgeBases.map((item) => item.knowledgeBaseId),
      workflowCode: agent.workflowCode || undefined,
    }
  }

  async resolveDefault(mode: AgentRuntimeConfig['mode'] = 'chat'): Promise<AgentRuntimeConfig> {
    const llmOptions = await this.modelResolver.resolveDefault()
    return {
      mode,
      systemPrompt: '',
      llmOptions,
      toolCodes: mode === 'knowledge' ? ['search_knowledge'] : [],
      knowledgeEnabled: mode === 'knowledge',
      knowledgeStrict: false,
      knowledgeTags: [],
      knowledgeBaseIds: [],
    }
  }

  async execute(input: AgentRuntimeInput): Promise<AgentExecutionResult> {
    const startedAt = Date.now()
    const context = this.buildContext(input)
    const plan = this.planService.createPlan(input, context)
    const log = await this.executionLogger.logStart({
      conversationId: input.conversationId,
      messageId: input.userMessageId,
      agentCode: context.agentCode,
      plan,
    })

    try {
      this.planService.validate(plan, context)
      // 当前版本只执行首个受校验的计划步骤；能力边界由 AgentContext 决定，避免业务层自行分散兜底。
      const step = plan.steps[0]
      const executionResult = await this.executor.execute(step, input, context)
      const composed = await this.responseComposer.compose(input, context, executionResult)
      const result = {
        route: step.type,
        answer: composed.answer,
        sources: composed.sources,
        workflowCode: step.type === 'workflow' ? context.workflow?.code : undefined,
        plan,
        executionLogId: log.id,
      }
      await this.executionLogger.logSuccess(log.id, {
        route: result.route,
        durationMs: Date.now() - startedAt,
      })
      return result
    } catch (error) {
      await this.executionLogger.logFailed(log.id, {
        message: error instanceof Error ? error.message : 'Agent execution failed',
        durationMs: Date.now() - startedAt,
      })
      throw error
    }
  }

  async *stream(input: AgentRuntimeInput): AsyncIterable<AgentRuntimeStreamChunk> {
    const startedAt = Date.now()
    const context = this.buildContext(input)
    const plan = this.planService.createPlan(input, context)
    const log = await this.executionLogger.logStart({
      conversationId: input.conversationId,
      messageId: input.userMessageId,
      agentCode: context.agentCode,
      plan,
    })
    let answer = ''
    let sources: any[] = []

    try {
      this.planService.validate(plan, context)
      // 流式执行复用同一套计划；workflow 透传节点事件，chat/knowledge 则统一产出 content 与 sources。
      const step = plan.steps[0]
      if (step.type === 'workflow') {
        for await (const event of await this.executor.streamWorkflow(step, input, context)) {
          if (event.type === 'content') answer += event.content
          if (event.type === 'sources') sources = event.sources || []
          if (event.type === 'workflow_done') answer = event.answer
          yield { event }
        }
      } else if (step.type === 'chat' || step.type === 'knowledge') {
        const executionResult = await this.executor.execute(step, input, context)
        if (executionResult.type !== 'chat' && executionResult.type !== 'knowledge') {
          throw new BadRequestException('Agent plan execution result does not match')
        }
        const completionPlan = executionResult.completionPlan
        sources = completionPlan.sources
        if (completionPlan.directAnswer) {
          answer = step.type === 'knowledge'
            ? this.responseComposer.ensureKnowledgeAnswer(completionPlan.directAnswer, completionPlan.knowledgeFacts, input.message)
            : completionPlan.directAnswer
          yield { event: { type: 'content', content: answer } }
        } else {
          for await (const content of this.responseComposer.streamCompletion(completionPlan.messages, input.agent?.llmOptions)) {
            answer += content
            if (step.type !== 'knowledge') {
              yield { event: { type: 'content', content } }
            }
          }
          if (step.type === 'knowledge') {
            answer = this.responseComposer.ensureKnowledgeAnswer(answer, completionPlan.knowledgeFacts, input.message)
            yield { event: { type: 'content', content: answer } }
          }
        }
      } else {
        const executionResult = await this.executor.execute(step, input, context)
        const composed = await this.responseComposer.compose(input, context, executionResult)
        answer = composed.answer
        sources = composed.sources
        yield { event: { type: 'content', content: answer } }
      }

      const state = {
        route: step.type,
        answer,
        sources,
        workflowCode: step.type === 'workflow' ? context.workflow?.code : undefined,
        plan,
        executionLogId: log.id,
      }
      await this.executionLogger.logSuccess(log.id, {
        route: state.route,
        durationMs: Date.now() - startedAt,
      })
      yield { event: { type: 'sources', sources }, state }
    } catch (error) {
      await this.executionLogger.logFailed(log.id, {
        message: error instanceof Error ? error.message : 'Agent execution failed',
        durationMs: Date.now() - startedAt,
      })
      throw error
    }
  }

  private buildContext(input: AgentRuntimeInput): AgentContext {
    const agent = input.agent
    return {
      agentCode: agent?.agentCode,
      agentName: agent?.agentName,
      model: {
        provider: agent?.llmOptions.provider || 'default',
        name: agent?.llmOptions.model,
        temperature: agent?.llmOptions.temperature,
        topP: agent?.llmOptions.topP,
      },
      prompt: {
        id: agent?.promptId,
        system: agent?.systemPrompt,
      },
      knowledge: {
        enabled: agent ? agent.knowledgeEnabled : input.mode === 'knowledge',
        ids: agent?.knowledgeBaseIds || [],
        tags: agent?.knowledgeTags || [],
        strict: !!agent?.knowledgeStrict,
      },
      tools: agent?.toolCodes || (input.mode === 'knowledge' ? ['search_knowledge'] : []),
      workflow: agent?.workflowCode ? { code: agent.workflowCode } : undefined,
      user: {
        id: input.userId,
        roles: [],
      },
      conversation: {
        id: input.conversationId,
        history: input.history,
      },
      mode: agent?.mode || input.mode,
      maxSteps: MAX_AGENT_PLAN_STEPS,
    }
  }

  private normalizeStringArray(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter((item): item is string => typeof item === 'string' && !!item.trim())
  }

  private normalizeToolCodes(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter((item): item is string => typeof item === 'string')
  }
}
