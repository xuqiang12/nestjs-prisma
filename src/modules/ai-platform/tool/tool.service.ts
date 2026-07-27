import { Injectable } from '@nestjs/common'
import { AIRegistry } from '../../../ai-engine/core/ai.registry'

@Injectable()
export class ToolService {
  constructor(private readonly registry: AIRegistry) {}

  list() {
    const list = this.registry.listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      params: tool.params,
    }))
    return { list, total: list.length }
  }
}
