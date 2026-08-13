// 定义不同工具来源适配器共享的最小执行协议。
import { ToolDefinition, ToolResult, ToolRuntimeContext, ToolSource } from '../tool.types'

export interface ToolSourceAdapter {
  readonly source: ToolSource
  supports(tool: ToolDefinition): boolean
  execute(tool: ToolDefinition, input: unknown, context: ToolRuntimeContext): Promise<ToolResult>
}
