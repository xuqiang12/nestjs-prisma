import { BadRequestException, Injectable } from '@nestjs/common'
import { WORKFLOW_NODE_TYPES, WorkflowGraph, WorkflowNode } from './workflow.types'

@Injectable()
export class WorkflowValidatorService {
  validateGraph(graph: WorkflowGraph) {
    const nodes = graph.nodes || []
    const edges = graph.edges || []
    const nodeMap = new Map<string, WorkflowNode>()

    for (const node of nodes) {
      if (nodeMap.has(node.nodeKey)) {
        throw new BadRequestException(`节点编码重复：${node.nodeKey}`)
      }
      nodeMap.set(node.nodeKey, node)
      this.validateNode(node)
    }

    const startCount = nodes.filter((node) => node.type === 'start').length
    if (startCount !== 1) {
      throw new BadRequestException('工作流必须且只能有一个 start 节点')
    }

    if (!nodes.some((node) => node.type === 'output')) {
      throw new BadRequestException('工作流至少需要一个 output 节点')
    }

    for (const edge of edges) {
      if (!nodeMap.has(edge.fromNodeKey)) {
        throw new BadRequestException(`边起点不存在：${edge.fromNodeKey}`)
      }
      if (!nodeMap.has(edge.toNodeKey)) {
        throw new BadRequestException(`边终点不存在：${edge.toNodeKey}`)
      }
    }

    this.ensureAcyclic(nodes, edges)
    return graph
  }

  private validateNode(node: WorkflowNode) {
    if (!WORKFLOW_NODE_TYPES.includes(node.type as any)) {
      throw new BadRequestException(`节点类型不支持：${node.type}`)
    }

    const config = node.config || {}
    const requireString = (field: string) => {
      if (typeof config[field] !== 'string' || !config[field].trim()) {
        throw new BadRequestException(`节点 ${node.nodeKey} 缺少配置：${field}`)
      }
    }

    if (node.type === 'start') {
      requireString('inputField')
    }
    if (node.type === 'prompt') {
      requireString('promptCode')
      requireString('outputField')
    }
    if (node.type === 'knowledge') {
      requireString('queryField')
      requireString('outputField')
    }
    if (node.type === 'llm') {
      requireString('userMessageField')
      requireString('outputField')
    }
    if (node.type === 'tool') {
      requireString('toolCode')
      requireString('outputField')
    }
    if (node.type === 'condition') {
      requireString('field')
      requireString('operator')
    }
    if (node.type === 'output') {
      requireString('outputField')
    }
  }

  private ensureAcyclic(nodes: WorkflowNode[], edges: WorkflowGraph['edges']) {
    const nextMap = new Map<string, string[]>()
    nodes.forEach((node) => nextMap.set(node.nodeKey, []))
    edges.forEach((edge) => nextMap.get(edge.fromNodeKey)?.push(edge.toNodeKey))

    const visiting = new Set<string>()
    const visited = new Set<string>()

    const visit = (nodeKey: string) => {
      if (visiting.has(nodeKey)) {
        throw new BadRequestException('工作流不能包含循环')
      }
      if (visited.has(nodeKey)) {
        return
      }

      visiting.add(nodeKey)
      for (const nextKey of nextMap.get(nodeKey) || []) {
        visit(nextKey)
      }
      visiting.delete(nodeKey)
      visited.add(nodeKey)
    }

    nodes.forEach((node) => visit(node.nodeKey))
  }
}
