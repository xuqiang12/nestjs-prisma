import { Injectable } from '@nestjs/common'
import { AiOrchestratorService, CompletionPlan } from '../orchestrator/ai-orchestrator.service'
import { DefaultToolExecutor } from '../tools/tool.executor'
import { WorkflowStreamEvent } from '../workflow/workflow.types'
import { WorkflowRuntimeService } from '../workflow/workflow-runtime.service'
import { AgentContext, AgentPlanStep, AgentRuntimeInput } from './agent-runtime.types'

export type AgentStepExecutionResult =
  | { type: 'chat' | 'knowledge'; completionPlan: CompletionPlan }
  | { type: 'tool'; output: unknown }
  | { type: 'workflow'; answer: string; sources: any[]; workflowRunId?: string }

@Injectable()
export class AgentExecutorService {
  constructor(
    private readonly aiOrchestratorService: AiOrchestratorService,
    private readonly toolExecutor: DefaultToolExecutor,
    private readonly workflowRuntimeService: WorkflowRuntimeService,
  ) {}

  async execute(step: AgentPlanStep, input: AgentRuntimeInput, context: AgentContext): Promise<AgentStepExecutionResult> {
    if (step.type === 'workflow') {
      const result = await this.workflowRuntimeService.execute(context.workflow!.code, {
        message: input.message,
        userId: input.userId,
        history: input.history,
        agentCode: context.agentCode || '',
        workflowCode: context.workflow!.code,
        conversationId: input.conversationId,
        allowedToolCodes: context.tools,
        knowledgeStrict: context.knowledge.strict,
        knowledgeTags: context.knowledge.tags,
        knowledgeBaseIds: context.knowledge.ids,
        llmOptions: input.agent?.llmOptions,
      })
      return { type: 'workflow', answer: result.answer, sources: result.sources, workflowRunId: result.runId }
    }

    if (step.type === 'tool') {
      return { type: 'tool', output: await this.executeTool(step.target!, step.params) }
    }

    const completionPlan = await this.aiOrchestratorService.buildCompletion(
      input.message,
      step.type === 'knowledge' ? 'knowledge' : 'chat',
      input.history,
      {
        systemPrompt: context.prompt.system,
        allowedToolCodes: context.tools,
        knowledgeStrict: context.knowledge.strict,
        knowledgeTags: context.knowledge.tags,
        knowledgeBaseIds: context.knowledge.ids,
      },
    )
    return { type: step.type, completionPlan }
  }

  executeTool(toolCode: string, params: Record<string, unknown>) {
    return this.toolExecutor.execute(toolCode, params)
  }

  streamWorkflow(step: AgentPlanStep, input: AgentRuntimeInput, context: AgentContext): Promise<AsyncIterable<WorkflowStreamEvent>> {
    return this.workflowRuntimeService.stream(context.workflow!.code, {
      message: input.message,
      userId: input.userId,
      history: input.history,
      agentCode: context.agentCode || '',
      workflowCode: context.workflow!.code,
      conversationId: input.conversationId,
      allowedToolCodes: context.tools,
      knowledgeStrict: context.knowledge.strict,
      knowledgeTags: context.knowledge.tags,
      knowledgeBaseIds: context.knowledge.ids,
      llmOptions: input.agent?.llmOptions,
    })
  }
}
