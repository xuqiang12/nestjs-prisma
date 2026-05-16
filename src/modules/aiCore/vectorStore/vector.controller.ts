import { Body, Controller, Post, Res } from '@nestjs/common'
import { VectorService } from './vector.service'
import { Public } from '../../../common/decorators/public.decorator'
import { readFileContent } from '../utils/fileReader'
@Controller('aiCore/vectorStore')
export class VectorController {
  constructor(private readonly vector: VectorService) {}
  @Public()
  @Post('setVector')
  async setVector() {
    const content = await readFileContent('src/modules/aiCore/prompt/test.txt')
    return this.vector.createKnowledge(content, {
      source: 'test',
    })
  }
  @Public()
  @Post('search')
  async searchSimilar(@Body() body: { message: string }) {
    return this.vector.searchSimilar(body.message, 5)
  }
}
