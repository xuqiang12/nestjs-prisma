// 提供 AI 工具管理端列表查询能力。
import { Injectable } from '@nestjs/common'
import { RuntimeToolRegistry } from '../../../ai-runtime/tools/runtime-tool-registry.service'

@Injectable()
export class ToolService {
  // 注入运行时工具注册表以读取当前可配置工具。
  constructor(private readonly registry: RuntimeToolRegistry) {}

  // 返回工具元数据列表，不暴露运行时 handler。
  list() {
    const list = this.registry.listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      params: tool.params,
    }))
    return { list, total: list.length }
  }
}
