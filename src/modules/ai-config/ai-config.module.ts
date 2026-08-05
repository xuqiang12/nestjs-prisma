import { Module } from '@nestjs/common'
import { PromptController } from './prompt/prompt.controller'
import { PromptService } from './prompt/prompt.service'
import { SensitiveWordController } from './sensitive-word/sensitive-word.controller'
import { SensitiveWordService } from './sensitive-word/sensitive-word.service'

@Module({
  controllers: [SensitiveWordController, PromptController],
  providers: [SensitiveWordService, PromptService],
  exports: [SensitiveWordService, PromptService],
})
export class AiConfigModule {}
