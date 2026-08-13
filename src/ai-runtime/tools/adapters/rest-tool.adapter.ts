// 通过 HTTP Client 执行 rest 来源工具并返回统一 ToolResult。
import { Injectable } from '@nestjs/common'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ToolSourceAdapter } from './tool-source-adapter.types'
import { ToolDefinition, ToolResult, ToolRuntimeContext } from '../tool.types'

type RestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type RestToolConfig = {
  method?: RestMethod
  url?: string
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: Record<string, string>
  timeoutMs?: number
}

type RestHttpClient = {
  request(config: AxiosRequestConfig): Promise<{ status: number; statusText?: string; data: unknown }>
}

@Injectable()
export class RestToolAdapter implements ToolSourceAdapter {
  readonly source = 'rest' as const

  // 注入 HTTP Client，测试可替换为最小 fake client。
  constructor(private readonly httpClient: RestHttpClient = axios as AxiosInstance) {}

  // 判断当前适配器是否支持指定工具来源。
  supports(tool: ToolDefinition): boolean {
    return tool.source === this.source
  }

  // 执行 REST 工具请求并转换响应或异常。
  async execute(tool: ToolDefinition, input: unknown, _context: ToolRuntimeContext): Promise<ToolResult> {
    const config = this.readConfig(tool)
    if (!config.url) {
      return this.failure('REST 工具配置缺少 url')
    }
    try {
      const response = await this.httpClient.request(this.buildRequest(config, input))
      if (response.status < 200 || response.status >= 300) {
        return this.failure(`REST 工具请求失败：${response.status} ${response.statusText || ''}`.trim())
      }
      return { success: true, data: response.data }
    } catch (error: any) {
      if (error?.code === 'ECONNABORTED') {
        return this.failure('REST 工具请求超时')
      }
      return this.failure(error instanceof Error ? error.message : String(error))
    }
  }

  // 读取 REST 工具 sourceConfig。
  private readConfig(tool: ToolDefinition): RestToolConfig {
    return tool.sourceConfig && typeof tool.sourceConfig === 'object' && !Array.isArray(tool.sourceConfig)
      ? tool.sourceConfig as RestToolConfig
      : {}
  }

  // 根据配置把 Tool Input 映射到请求 query/header/body。
  private buildRequest(config: RestToolConfig, input: unknown): AxiosRequestConfig {
    const params = this.pickMappedInput(config.query, input)
    const data = this.pickMappedInput(config.body, input)
    return {
      method: config.method || 'GET',
      url: config.url,
      headers: this.pickMappedInput(config.headers, input) as any,
      params: Object.keys(params).length ? params : undefined,
      data: Object.keys(data).length ? data : undefined,
      timeout: config.timeoutMs,
      validateStatus: () => true,
    }
  }

  // 从 Tool Input 中按映射表取值，避免透传 RuntimeContext。
  private pickMappedInput(mapping: Record<string, string> | undefined, input: unknown): Record<string, unknown> {
    if (!mapping) {
      return {}
    }
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
    return Object.entries(mapping).reduce<Record<string, unknown>>((result, [targetKey, inputKey]) => {
      if (Object.prototype.hasOwnProperty.call(source, inputKey)) {
        result[targetKey] = source[inputKey]
      }
      return result
    }, {})
  }

  // 构造 REST 工具失败结果。
  private failure(message: string): ToolResult {
    return { success: false, error: { code: 'TOOL_EXECUTION_FAILED', message } }
  }
}
