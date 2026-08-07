// 这个测试文件验证对应后端单元的关键行为。
import { of, lastValueFrom } from 'rxjs'
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor'

describe('ResponseInterceptor', () => {
  it('formats dates in response data recursively', async () => {
    const interceptor = new ResponseInterceptor()
    const result = await lastValueFrom(
      interceptor.intercept({} as any, {
        handle: () =>
          of({
            id: 1,
            createdAt: new Date('2026-07-03T07:29:23.731Z'),
            profile: {
              updatedAt: new Date('2026-07-04T08:30:24.123Z'),
            },
            logs: [{ deletedAt: null }, { deletedAt: new Date('2026-07-05T09:31:25.456Z') }],
          }),
      }),
    )

    expect(result).toEqual({
      code: 0,
      message: 'success',
      data: {
        id: 1,
        createdAt: '2026-07-03 15:29:23',
        profile: {
          updatedAt: '2026-07-04 16:30:24',
        },
        logs: [{ deletedAt: null }, { deletedAt: '2026-07-05 17:31:25' }],
      },
    })
  })
})
