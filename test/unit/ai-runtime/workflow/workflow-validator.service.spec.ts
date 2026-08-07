// 校验工作流图结构校验器的节点和环路约束。
import { BadRequestException } from '@nestjs/common'
import { WorkflowValidatorService } from 'src/ai-runtime/workflow/workflow-validator.service'
import { WorkflowGraph } from 'src/ai-runtime/workflow/workflow.types'

describe('WorkflowValidatorService', () => {
  const validator = new WorkflowValidatorService()

  it('accepts a simple acyclic workflow graph', () => {
    const graph: WorkflowGraph = {
      nodes: [
        { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
        { nodeKey: 'llm', type: 'llm', name: '模型', config: { userMessageField: 'message', outputField: 'answer' }, sortNo: 2 },
        { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'answer' }, sortNo: 3 },
      ],
      edges: [
        { fromNodeKey: 'start', toNodeKey: 'llm', sortNo: 1 },
        { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 1 },
      ],
    }

    expect(validator.validateGraph(graph)).toEqual(graph)
  })

  it('rejects unsupported node types and cycles', () => {
    const graph: WorkflowGraph = {
      nodes: [
        { nodeKey: 'start', type: 'start', name: '开始', config: { inputField: 'message' }, sortNo: 1 },
        { nodeKey: 'script', type: 'script', name: '脚本', config: {}, sortNo: 2 },
        { nodeKey: 'output', type: 'output', name: '输出', config: { outputField: 'answer' }, sortNo: 3 },
      ],
      edges: [
        { fromNodeKey: 'start', toNodeKey: 'script', sortNo: 1 },
        { fromNodeKey: 'script', toNodeKey: 'start', sortNo: 1 },
      ],
    }

    expect(() => validator.validateGraph(graph)).toThrow(BadRequestException)
    expect(() => validator.validateGraph(graph)).toThrow(/节点类型不支持|工作流不能包含循环/)
  })
})
