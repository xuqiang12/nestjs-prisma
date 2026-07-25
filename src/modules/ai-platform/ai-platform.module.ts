import { Module } from '@nestjs/common'
import { AgentController } from './agent/agent.controller'
import { AgentService } from './agent/agent.service'
import { PromptController } from './prompt/prompt.controller'
import { PromptService } from './prompt/prompt.service'
import { SensitiveWordController } from './sensitive-word/sensitive-word.controller'
import { SensitiveWordService } from './sensitive-word/sensitive-word.service'
import { SkillPackageController } from './skill-package/skill-package.controller'
import { SkillPackageService } from './skill-package/skill-package.service'
import { WorkflowRunController } from './workflow-run/workflow-run.controller'
import { WorkflowRunService } from './workflow-run/workflow-run.service'
import { WorkflowController } from './workflow/workflow.controller'
import { WorkflowService } from './workflow/workflow.service'

@Module({
  controllers: [
    PromptController,
    SensitiveWordController,
    AgentController,
    WorkflowController,
    SkillPackageController,
    WorkflowRunController,
  ],
  providers: [
    PromptService,
    SensitiveWordService,
    AgentService,
    WorkflowService,
    SkillPackageService,
    WorkflowRunService,
  ],
  exports: [
    PromptService,
    SensitiveWordService,
    AgentService,
    WorkflowService,
    SkillPackageService,
    WorkflowRunService,
  ],
})
export class AiPlatformModule {}
