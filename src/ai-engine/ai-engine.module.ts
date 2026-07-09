import { Global, Module } from '@nestjs/common'
import { AIRegistry } from './core/ai.registry'
import { EmbeddingService } from './embedding/embedding.service'
import { InMemoryMemoryService } from './memory/memory.service'
import { AiOrchestratorService } from './orchestrator/ai-orchestrator.service'
import { DefaultToolExecutor } from './tools/tool.executor'
import { LlmService } from './llm/llm.service'
import { VectorStoreService } from './vector/vector-store.service'

@Global()
@Module({
  providers: [
    LlmService,
    EmbeddingService,
    VectorStoreService,
    AiOrchestratorService,
    {
      provide: AIRegistry,
      useFactory: () => new AIRegistry(),
    },
    InMemoryMemoryService,
    DefaultToolExecutor,
  ],
  exports: [
    AIRegistry,
    InMemoryMemoryService,
    DefaultToolExecutor,
    LlmService,
    EmbeddingService,
    VectorStoreService,
    AiOrchestratorService,
  ],
})
export class AIEngineModule {}
