// 通过内置工具映射执行 builtin 来源工具。
import { ToolSourceAdapter } from './tool-source-adapter.types'
import { BuiltinToolMap, ToolDefinition, ToolResult, ToolRuntimeContext } from '../tool.types'

export class BuiltinToolAdapter implements ToolSourceAdapter {
  readonly source = 'builtin' as const

  // 注入内置工具映射，保持 BuiltinToolMap 仍是 builtin 执行入口。
  constructor(private readonly builtinTools: BuiltinToolMap) {}

  // 判断当前适配器是否支持指定工具来源。
  supports(tool: ToolDefinition): boolean {
    return tool.source === this.source
  }

  // 执行内置工具并转换为统一 ToolResult。
  async execute(tool: ToolDefinition, input: unknown, context: ToolRuntimeContext): Promise<ToolResult> {
    const builtinTool = this.builtinTools.get(tool.code)
    if (!builtinTool) {
      return { success: false, error: { code: 'TOOL_IMPLEMENTATION_NOT_FOUND', message: `内置工具实现不存在：${tool.code}` } }
    }
    try {
      return { success: true, data: await builtinTool.execute(input, context) }
    } catch (error) {
      return { success: false, error: { code: 'TOOL_EXECUTION_FAILED', message: error instanceof Error ? error.message : String(error) } }
    }
  }
}
