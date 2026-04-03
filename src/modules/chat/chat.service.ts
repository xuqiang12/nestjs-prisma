import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {
  constructor(private readonly configService: ConfigService) { }
  async streamChat(message: CreateChatDto, res: any) {
    console.log(message);
    const response = await axios.post(
      this.configService.get('CHAT_API_URL'),
      {
        model: 'doubao-seed-1-6-lite-251015',
        messages: [{ role: 'user', content: message.message }],
        stream: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configService.get('CHAT_API_KEY')}`,
        },
        responseType: 'stream',
      },
    );

    // 👇 监听数据流
    response.data.on('data', (chunk) => {
      const str = chunk.toString();

      // 豆包返回是类似 OpenAI 的格式
      const lines = str.split('\n').filter(line => line.trim() !== '');
      console.log(lines);
      for (const line of lines) {
        if (line === 'data: [DONE]') {
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }

        if (line.startsWith('data:')) {
          const jsonStr = line.replace('data:', '').trim();

          try {
            const data = JSON.parse(jsonStr);
            const content = data.choices?.[0]?.delta?.content;

            if (content) {
              // 👇 推给前端
              res.write(`data: ${content}\n\n`);
            }
          } catch (err) {
            console.log('解析失败:', err);
          }
        }
      }
    });

    response.data.on('end', () => {
      res.end();
    });

    response.data.on('error', (err) => {
      console.error(err);
      res.end();
    });
  }
  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, UpdateChatDto: UpdateChatDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
