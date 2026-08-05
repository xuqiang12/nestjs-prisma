import { Module } from '@nestjs/common'
import { AgentController } from './agent/agent.controller'
import { AgentService } from './agent/agent.service'
import { ModelConfigController } from './model-config/model-config.controller'
import { ModelConfigService } from './model-config/model-config.service'
import { ModelProviderController } from './model-provider/model-provider.controller'
import { ModelProviderService } from './model-provider/model-provider.service'
import { SkillPackageController } from './skill-package/skill-package.controller'
import { SkillPackageService } from './skill-package/skill-package.service'
import { ToolController } from './tool/tool.controller'
import { ToolService } from './tool/tool.service'
import { WorkflowRunController } from './workflow-run/workflow-run.controller'
import { WorkflowRunService } from './workflow-run/workflow-run.service'
import { WorkflowController } from './workflow/workflow.controller'
import { WorkflowService } from './workflow/workflow.service'

@Module({
  controllers: [
    AgentController,
    ModelProviderController,
    ModelConfigController,
    WorkflowController,
    SkillPackageController,
    WorkflowRunController,
    ToolController,
  ],
  providers: [
    AgentService,
    ModelProviderService,
    ModelConfigService,
    WorkflowService,
    SkillPackageService,
    WorkflowRunService,
    ToolService,
  ],
  exports: [
    AgentService,
    ModelProviderService,
    ModelConfigService,
    WorkflowService,
    SkillPackageService,
    WorkflowRunService,
    ToolService,
  ],
})
export class AiPlatformModule {}
