// 这个测试文件验证对应后端单元的关键行为。
import { NotFoundException } from '@nestjs/common'
import { ConversationService } from 'src/modules/agent-chat/conversation/conversation.service'

describe('ConversationService', () => {
  function createService() {
    const prisma = {
      aiConversation: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      aiMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    }

    return { service: new ConversationService(prisma as any), prisma }
  }

  it('creates a conversation with a title derived from the first message', async () => {
    const { service, prisma } = createService()
    prisma.aiConversation.create.mockResolvedValue({
      id: 'conversation-1',
      userId: '1',
      mode: 'knowledge',
      title: '帮我查入住规则',
    })

    const result = await service.getOrCreateForMessage('1', {
      message: '帮我查入住规则',
      mode: 'knowledge',
    })

    expect(result.id).toBe('conversation-1')
    expect(prisma.aiConversation.create).toHaveBeenCalledWith({
      data: {
        userId: '1',
        mode: 'knowledge',
        title: '帮我查入住规则',
      },
    })
  })

  it('returns an existing conversation only when it belongs to the current user', async () => {
    const { service, prisma } = createService()
    prisma.aiConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      userId: '1',
      mode: 'chat',
      title: '普通聊天',
    })

    const result = await service.getOrCreateForMessage('1', {
      conversationId: 'conversation-1',
      message: '继续',
      mode: 'knowledge',
    })

    expect(result.mode).toBe('chat')
    expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'conversation-1',
        userId: '1',
        isDeleted: false,
      },
    })
    expect(prisma.aiConversation.create).not.toHaveBeenCalled()
  })

  it('throws when conversation detail is not owned by current user', async () => {
    const { service, prisma } = createService()
    prisma.aiConversation.findFirst.mockResolvedValue(null)

    await expect(service.detail('1', 'other-conversation')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('soft deletes a conversation owned by current user', async () => {
    const { service, prisma } = createService()
    prisma.aiConversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      userId: '1',
    })
    prisma.aiConversation.update.mockResolvedValue({
      id: 'conversation-1',
      isDeleted: true,
    })

    await expect(service.delete('1', 'conversation-1')).resolves.toEqual({ success: true })
    expect(prisma.aiConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: {
        isDeleted: true,
        deletedAt: expect.any(Date),
      },
    })
  })
})
