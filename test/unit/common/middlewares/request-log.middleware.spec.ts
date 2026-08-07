// 这个测试文件验证对应后端单元的关键行为。
import { requestLogMiddleware } from 'src/common/middlewares/request-log.middleware'

describe('requestLogMiddleware', () => {
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('logs method, url, status code and duration after response finishes', () => {
    const listeners: Record<string, () => void> = {}
    const req = {
      method: 'GET',
      originalUrl: '/knowledge-bot/conversation/list',
    }
    const res = {
      statusCode: 500,
      on: jest.fn((event: string, callback: () => void) => {
        listeners[event] = callback
        return res
      }),
    }
    const next = jest.fn()

    requestLogMiddleware(req as any, res as any, next)
    listeners.finish()

    expect(next).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[HTTP\] GET \/knowledge-bot\/conversation\/list 500 \d+ms$/))
  })
})
