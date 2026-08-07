// 这个测试文件验证对应后端单元的关键行为。
import { ArgumentsHost } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AllExceptionFilter } from 'src/common/filters/all-exception.filter'

describe('AllExceptionFilter', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('logs the request and stack before returning a generic server error', () => {
    const exception = new Error('database exploded')
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/knowledge-bot/conversation/list',
        }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost

    new AllExceptionFilter().catch(exception, host)

    expect(errorSpy).toHaveBeenCalledWith('[ERROR] GET /knowledge-bot/conversation/list')
    expect(errorSpy).toHaveBeenCalledWith(exception.stack)
    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({
      code: 500,
      message: '服务器错误',
      data: exception,
    })
  })

  it('logs a Prisma server error only once', () => {
    const exception = new Prisma.PrismaClientKnownRequestError('Missing table', {
      code: 'P2021',
      clientVersion: '5.0.0',
      meta: { table: 'public.AiConversation' },
    })
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/knowledge-bot/conversation/list',
        }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost

    new AllExceptionFilter().catch(exception, host)

    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenNthCalledWith(1, '[ERROR] GET /knowledge-bot/conversation/list')
    expect(errorSpy).toHaveBeenNthCalledWith(2, exception.stack)
    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({
      code: 500,
      message: '服务器错误',
      data: exception,
    })
  })
})
