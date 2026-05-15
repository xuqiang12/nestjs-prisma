import { Body, Controller, Post, Res } from '@nestjs/common'
import { VectorService } from './vector.service'
import { Public } from '../../../common/decorators/public.decorator'

@Controller('aiCore/vectorStore')
export class VectorController {
  constructor(private readonly vector: VectorService) {}
  @Public()
  @Post('setVector')
  async setVector() {
    return this.vector.createKnowledge('Vue 是一个渐进式框架', {
      source: 'test',
    })
  }
}
