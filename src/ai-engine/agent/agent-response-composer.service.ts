import { Injectable } from '@nestjs/common'
import { ChatMessage, LlmOptions } from '../llm/llm.service'
import { AiOrchestratorService } from '../orchestrator/ai-orchestrator.service'
import { AgentStepExecutionResult } from './agent-executor.service'
import { AgentContext, AgentRuntimeInput } from './agent-runtime.types'

@Injectable()
export class AgentResponseComposerService {
  constructor(private readonly aiOrchestratorService: AiOrchestratorService) {}

  async compose(input: AgentRuntimeInput, context: AgentContext, result: AgentStepExecutionResult) {
    if (result.type === 'chat' || result.type === 'knowledge') {
      const rawAnswer = result.completionPlan.directAnswer
        || await this.aiOrchestratorService.complete(result.completionPlan.messages, input.agent?.llmOptions)
      const answer = result.type === 'knowledge'
        ? this.aiOrchestratorService.ensureKnowledgeAnswer(rawAnswer, result.completionPlan.knowledgeFacts, input.message)
        : rawAnswer
      return { answer, sources: result.completionPlan.sources }
    }

    if (result.type === 'workflow') {
      return this.composeFromExecution(input, context, result.answer, result.sources)
    }

    if (result.type === 'tool') {
      return this.composeFromExecution(input, context, result.output, [])
    }

    throw new Error('Unsupported Agent execution result')
  }

  streamCompletion(messages: ChatMessage[], options?: LlmOptions) {
    return this.aiOrchestratorService.streamCompletion(messages, options)
  }

  ensureKnowledgeAnswer(content: string, facts: any[], question: string) {
    return this.aiOrchestratorService.ensureKnowledgeAnswer(content, facts, question)
  }

  private async composeFromExecution(input: AgentRuntimeInput, context: AgentContext, output: unknown, sources: any[]) {
    const messages: ChatMessage[] = [
      { role: 'system', content: context.prompt.system || 'Answer the user based on the authorized execution result.' },
      {
        role: 'user',
        content: [
          `User question: ${input.message}`,
          `Authorized execution result: ${JSON.stringify(output)}`,
          'Reply with a concise natural-language final answer.',
        ].join('\n'),
      },
    ]
    const answer = await this.aiOrchestratorService.complete(messages, input.agent?.llmOptions)
    return { answer, sources }
  }
}
