// 校验工作流执行器的节点执行、工具调用收口和流式输出行为。
import { BadRequestException } from '@nestjs/common'
import { KnowledgeAnswerGuardService } from 'src/ai-runtime/knowledge/knowledge-answer-guard.service'
import { KnowledgeEvidenceService } from 'src/ai-runtime/knowledge/knowledge-evidence.service'
import { WorkflowExecutorService } from 'src/ai-runtime/workflow/workflow-executor.service'

describe('WorkflowExecutorService', () => {
  function createService() {
    const prisma = { aiPrompt: { findFirst: jest.fn() } }
    const vectorStore = { similaritySearch: jest.fn() }
    const llmService = {
      invokeWithMessages: jest.fn().mockResolvedValue('工作流回答'),
      streamWithMessages: jest.fn(async function* () {
        yield '流式'
        yield '回答'
      }),
    }
    const toolExecutor = { execute: jest.fn() }
    const runLogger = {
      startRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      logStep: jest.fn(),
      finishRun: jest.fn(),
      failRun: jest.fn(),
    }
    const service = new WorkflowExecutorService(
      prisma as any,
      vectorStore as any,
      llmService as any,
      toolExecutor as any,
      runLogger as any,
      new KnowledgeEvidenceService(),
      new KnowledgeAnswerGuardService(),
    )
    return { service, prisma, llmService, toolExecutor, runLogger }
  }

  it('uses fixed prompt content in prompt nodes', async () => {
    const { service, prisma } = createService()
    prisma.aiPrompt.findFirst.mockResolvedValue({
      content: '你是固定提示词助手。',
    })

    const result = await service.execute(
      {
        nodes: [
          { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
      { nodeKey: 'prompt', type: 'prompt', name: '提示词', config: { promptId: 'fixed-prompt', outputField: 'systemPrompt' }, sortNo: 2 },
          { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'systemPrompt' }, sortNo: 3 },
        ],
        edges: [
          { fromNodeKey: 'start', toNodeKey: 'prompt', sortNo: 1 },
          { fromNodeKey: 'prompt', toNodeKey: 'output', sortNo: 1 },
        ],
      },
      {
        message: '你好',
        agentCode: 'agent',
        workflowCode: 'wf',
        allowedToolCodes: [],
      },
    )

    expect(result.answer).toBe('你是固定提示词助手。')
  })

  it('executes a simple start llm output workflow', async () => {
    const { service, llmService, runLogger } = createService()

    const result = await service.execute(
      {
        nodes: [
          { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
          { nodeKey: 'llm', type: 'llm', name: '模型', config: { userMessageField: 'message', outputField: 'answer' }, sortNo: 2 },
          { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'answer' }, sortNo: 3 },
        ],
        edges: [
          { fromNodeKey: 'start', toNodeKey: 'llm', sortNo: 1 },
          { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 1 },
        ],
      },
      {
        message: '你好',
        agentCode: 'agent',
        workflowCode: 'wf',
        allowedToolCodes: [],
      },
    )

    expect(result.answer).toBe('工作流回答')
    expect(llmService.invokeWithMessages).toHaveBeenCalled()
    expect(runLogger.finishRun).toHaveBeenCalledWith('run-1', { answer: '工作流回答', sources: [] })
  })

  it('delegates tool nodes to ToolExecutor without repeating agent authorization', async () => {
    const { service, toolExecutor, runLogger } = createService()
    toolExecutor.execute.mockResolvedValue({ success: true, data: '10:00' })

    const result = await service.execute(
      {
        nodes: [
          { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
          { nodeKey: 'tool', type: 'tool', name: '工具', config: { toolCode: 'get_time', outputField: 'toolResult' }, sortNo: 2 },
          { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'toolResult' }, sortNo: 3 },
        ],
        edges: [
          { fromNodeKey: 'start', toNodeKey: 'tool', sortNo: 1 },
          { fromNodeKey: 'tool', toNodeKey: 'output', sortNo: 1 },
        ],
      },
      {
        message: '几点了',
        agentCode: 'agent',
        workflowCode: 'wf',
        userId: '1',
        allowedToolCodes: [],
      },
    )

    expect(result.values.toolResult).toEqual('10:00')
    expect(toolExecutor.execute).toHaveBeenCalledWith(
      'get_time',
      {},
      { userId: '1', agentCode: 'agent', conversationId: undefined },
    )
    expect(runLogger.logStep).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1',
      nodeKey: 'tool',
      nodeType: 'tool',
      status: 'success',
      output: { toolResult: '10:00' },
    }))
  })

  it('passes authenticated user id through runtime context instead of tool input', async () => {
    const { service, toolExecutor } = createService()
    toolExecutor.execute.mockResolvedValue({ success: true, data: { menuCount: 1 } })

    await service.execute(
      {
        nodes: [
          { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
          { nodeKey: 'tool', type: 'tool', name: '工具', config: { toolCode: 'get_user_menu_permissions', paramsField: 'toolParams', outputField: 'toolResult' }, sortNo: 2 },
          { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'toolResult' }, sortNo: 3 },
        ],
        edges: [
          { fromNodeKey: 'start', toNodeKey: 'tool', sortNo: 1 },
          { fromNodeKey: 'tool', toNodeKey: 'output', sortNo: 1 },
        ],
      },
      {
        message: '查权限',
        agentCode: 'agent',
        workflowCode: 'wf',
        userId: '1',
        allowedToolCodes: ['get_user_menu_permissions'],
      },
    )

    expect(toolExecutor.execute).toHaveBeenCalledWith(
      'get_user_menu_permissions',
      {},
      { userId: '1', agentCode: 'agent', conversationId: undefined },
    )
  })

  it('stops workflow when ToolExecutor returns failure ToolResult', async () => {
    const { service, toolExecutor, runLogger } = createService()
    toolExecutor.execute.mockResolvedValue({
      success: false,
      error: { code: 'TOOL_DISABLED', message: '工具已禁用：get_time' },
    })

    await expect(
      service.execute(
        {
          nodes: [
            { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
            { nodeKey: 'tool', type: 'tool', name: '工具', config: { toolCode: 'get_time', outputField: 'toolResult' }, sortNo: 2 },
            { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'toolResult' }, sortNo: 3 },
          ],
          edges: [
            { fromNodeKey: 'start', toNodeKey: 'tool', sortNo: 1 },
            { fromNodeKey: 'tool', toNodeKey: 'output', sortNo: 1 },
          ],
        },
        {
          message: '几点了',
          agentCode: 'agent',
          workflowCode: 'wf',
          userId: '1',
          allowedToolCodes: [],
        },
      ),
    ).rejects.toThrow('工具已禁用：get_time')
    expect(toolExecutor.execute).toHaveBeenCalledTimes(1)
    expect(runLogger.logStep).toHaveBeenCalledWith({
      runId: 'run-1',
      nodeKey: 'tool',
      nodeType: 'tool',
      status: 'failed',
      input: { nodeKey: 'tool' },
      errorMessage: '工具已禁用：get_time',
    })
    expect(runLogger.finishRun).not.toHaveBeenCalled()
  })

  it('streams a start llm output workflow with node events', async () => {
    const { service, llmService, runLogger } = createService()

    const events = []
    for await (const event of service.streamExecute(
      {
        nodes: [
          { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
          { nodeKey: 'llm', type: 'llm', name: '模型', config: { userMessageField: 'message', outputField: 'answer' }, sortNo: 2 },
          { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'answer' }, sortNo: 3 },
        ],
        edges: [
          { fromNodeKey: 'start', toNodeKey: 'llm', sortNo: 1 },
          { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 1 },
        ],
      },
      {
        message: '你好',
        agentCode: 'agent',
        workflowCode: 'wf',
        allowedToolCodes: [],
      },
    )) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      'workflow_start',
      'node_start',
      'node_end',
      'node_start',
      'content',
      'content',
      'node_end',
      'node_start',
      'node_end',
      'sources',
      'workflow_done',
    ])
    expect(llmService.streamWithMessages).toHaveBeenCalled()
    expect(events.filter((event) => event.type === 'content').map((event: any) => event.content).join('')).toBe('流式回答')
    expect(events[events.length - 1]).toMatchObject({ type: 'workflow_done', runId: 'run-1', answer: '流式回答' })
    expect(runLogger.finishRun).toHaveBeenCalledWith('run-1', { answer: '流式回答', sources: [] })
  })

  it('rejects workflows with more than one streaming llm node', async () => {
    const { service, runLogger } = createService()

    await expect(async () => {
      for await (const event of service.streamExecute(
        {
          nodes: [
            { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
            { nodeKey: 'llm_1', type: 'llm', name: '模型1', config: { userMessageField: 'message', outputField: 'answer1' }, sortNo: 2 },
            { nodeKey: 'llm_2', type: 'llm', name: '模型2', config: { userMessageField: 'answer1', outputField: 'answer2' }, sortNo: 3 },
            { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'answer2' }, sortNo: 4 },
          ],
          edges: [
            { fromNodeKey: 'start', toNodeKey: 'llm_1', sortNo: 1 },
            { fromNodeKey: 'llm_1', toNodeKey: 'llm_2', sortNo: 1 },
            { fromNodeKey: 'llm_2', toNodeKey: 'output', sortNo: 1 },
          ],
        },
        {
          message: '你好',
          agentCode: 'agent',
          workflowCode: 'wf',
          allowedToolCodes: [],
        },
      )) {
        void event
      }
    }).rejects.toThrow('当前版本仅支持一个流式 LLM 节点')
    expect(runLogger.failRun).toHaveBeenCalledWith('run-1', '当前版本仅支持一个流式 LLM 节点')
  })
})
