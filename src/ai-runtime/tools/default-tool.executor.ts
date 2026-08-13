// 执行运行时工具注册表中已注册的工具。
import { Inject, Injectable } from '@nestjs/common'
import { ToolSourceAdapter } from './adapters/tool-source-adapter.types'
import { RuntimeToolRegistry } from './runtime-tool-registry.service'
import { ToolErrorCode, ToolExecutor as IToolExecutor, ToolResult, ToolRuntimeContext, ToolSource } from './tool.types'

export const BUILTIN_TOOL_MAP = Symbol('BUILTIN_TOOL_MAP')
export const TOOL_SOURCE_ADAPTERS = Symbol('TOOL_SOURCE_ADAPTERS')

@Injectable()
export class DefaultToolExecutor implements IToolExecutor {
  private readonly adapters: Map<ToolSource, ToolSourceAdapter>

  // 注入工具目录和来源适配器，执行前只做系统状态校验和来源分发。
  constructor(
    private readonly registry: RuntimeToolRegistry,
    @Inject(TOOL_SOURCE_ADAPTERS) adapters: ToolSourceAdapter[],
  ) {
    this.adapters = new Map<ToolSource, ToolSourceAdapter>(adapters.map((adapter) => [adapter.source, adapter]))
  }

  // 按工具编码找到对应来源适配器，并把执行状态统一转换为 ToolResult。
  async execute(toolCode: string, input: unknown, context: ToolRuntimeContext): Promise<ToolResult> {
    const tool = this.registry.getTool(toolCode)
    if (!tool) {
      return this.failure('TOOL_NOT_FOUND', `工具不存在：${toolCode}`)
    }
    if (!tool.enabled) {
      return this.failure('TOOL_DISABLED', `工具已禁用：${toolCode}`)
    }
    const adapter = this.adapters.get(tool.source)
    if (!adapter || !adapter.supports(tool)) {
      return this.failure('TOOL_SOURCE_UNSUPPORTED', `当前阶段不支持执行 ${tool.source} 工具：${toolCode}`)
    }

    try {
      return await adapter.execute(tool, input, context)
    } catch (error) {
      return this.failure('TOOL_EXECUTION_FAILED', error instanceof Error ? error.message : String(error))
    }
  }

  // 构造统一工具失败结果。
  private failure(code: ToolErrorCode, message: string): ToolResult {
    return { success: false, error: { code, message } }
  }
}
