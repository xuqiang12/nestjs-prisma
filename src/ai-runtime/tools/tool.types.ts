// 定义运行时工具注册和执行使用的统一工具协议。
export type ToolSource = 'builtin' | 'rest' | 'mcp'

export type ToolExposure = 'internal' | 'agent'

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: unknown[]
  items?: JsonSchemaProperty
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface JsonSchemaObject {
  type: 'object'
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface ToolDefinition {
  code: string
  name: string
  description: string
  source: ToolSource
  exposure: ToolExposure
  enabled: boolean
  inputSchema: JsonSchemaObject
  sourceConfig?: unknown
  params?: Record<string, any>
}

export interface ToolRuntimeContext {
  userId: string
  agentCode?: string
  conversationId?: string
  requestId?: string
  traceId?: string
  signal?: AbortSignal
}

export type ToolErrorCode =
  | 'TOOL_NOT_FOUND'
  | 'TOOL_DISABLED'
  | 'TOOL_SOURCE_UNSUPPORTED'
  | 'TOOL_IMPLEMENTATION_NOT_FOUND'
  | 'TOOL_EXECUTION_FAILED'

export type ToolResult<T = unknown> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: {
        code: ToolErrorCode
        message: string
      }
    }

export interface BuiltinTool {
  definition: ToolDefinition
  execute(input: unknown, context: ToolRuntimeContext): Promise<unknown>
}

export type BuiltinToolMap = ReadonlyMap<string, BuiltinTool>

export interface ToolExecutor {
  execute(toolCode: string, input: unknown, context: ToolRuntimeContext): Promise<ToolResult>
}

export type { ToolSourceAdapter } from './adapters/tool-source-adapter.types'
