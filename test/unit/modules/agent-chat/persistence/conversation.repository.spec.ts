// 这个测试文件验证新版智能体会话历史读取不会重复带入本轮用户问题。
import { ConversationRepository } from 'src/modules/agent-chat/persistence/conversation.repository'

describe('ConversationRepository history', () => {
  // 构造只包含 aiMessage 查询能力的 Prisma 替身。
  function createRepository(messages: Array<{ role: string; content: string }>) {
    const prisma = {
      aiMessage: {
        findMany: jest.fn(async () => messages),
      },
    }

    return {
      repository: new ConversationRepository(prisma as any),
      findMany: prisma.aiMessage.findMany,
    }
  }

  it('removes only the latest user message when it is the current request', async () => {
    const { repository } = createRepository([
      { role: 'user', content: '售后怎么样' },
      { role: 'assistant', content: '售后政策包含退货和换货。' },
      { role: 'user', content: '售后怎么样' },
    ])

    const history = await repository.getHistoryMessages('conv-1', 20, '售后怎么样')

    expect(history).toEqual([
      { role: 'user', content: '售后怎么样' },
      { role: 'assistant', content: '售后政策包含退货和换货。' },
    ])
  })

  it('keeps history unchanged when the latest message is not the current user request', async () => {
    const { repository } = createRepository([
      { role: 'assistant', content: '企业版 4999 元/年。' },
      { role: 'user', content: '产品多少钱' },
    ])

    const history = await repository.getHistoryMessages('conv-1', 20, '售后怎么样')

    expect(history).toEqual([
      { role: 'user', content: '产品多少钱' },
      { role: 'assistant', content: '企业版 4999 元/年。' },
    ])
  })
})
