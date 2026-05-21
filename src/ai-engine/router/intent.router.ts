import { RouteResult } from '../core/types'
import { LLMProvider } from '../models/llm.interface'
import { llmProvider } from '../models/llm.provider'
import { PROMPTS } from '../prompts'

export class IntentRouter {
  constructor(private llm: LLMProvider = llmProvider) {}

  async route(input: string): Promise<RouteResult> {
    const prompt = PROMPTS.router.replace('{input}', input)

    const res = await this.llm.invokeWithMessages([
      {
        role: 'system',
        content: prompt,
      },
    ])

    return this.parseResult(res)
  }

  private parseResult(res: string): RouteResult {
    try {
      const json = JSON.parse(res)

      return {
        workflow: json.workflow || 'knowledge-bot.chat',
        confidence: json.confidence ?? 0.5,
        reason: json.reason || '',
      }
    } catch (e) {
      return {
        workflow: 'knowledge-bot.chat',
        confidence: 0.3,
        reason: 'parse failed fallback',
      }
    }
  }
}
