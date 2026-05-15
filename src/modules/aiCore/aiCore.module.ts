import { Module } from '@nestjs/common'

import { VectorController } from './vectorStore/vector.controller'
import { VectorService } from './vectorStore/vector.service'

@Module({
  controllers: [VectorController],
  providers: [VectorService],
})
export class AiCoreModule {}
