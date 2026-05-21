import { Workflow } from './types'

export class AIRegistry {
  private workflows: Map<string, Workflow> = new Map()

  registerWorkflow(workflow: Workflow) {
    this.workflows.set(workflow.name, workflow)
  }

  getWorkflow(name: string): Workflow | undefined {
    return this.workflows.get(name)
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys())
  }
}
