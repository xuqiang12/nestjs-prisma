// 这个测试文件验证对应后端单元的关键行为。
import * as bcrypt from 'bcryptjs'
import { AuthService } from 'src/modules/auth/auth.service'

describe('AuthService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('signs token with isSuperAdmin from user record instead of a hardcoded admin flag', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          username: 'normal',
          email: 'normal@example.com',
          password: 'hashed-password',
          isDeleted: false,
          isSuperAdmin: false,
          roles: [
            {
              role: {
                name: 'Operator',
                permissions: [
                  { permission: { code: 'system:user:add' } },
                ],
              },
            },
          ],
        }),
      },
    }
    const jwtService = {
      sign: jest.fn().mockReturnValue('token'),
    }
    const service = new AuthService(prisma as any, jwtService as any)

    const result = await service.login({ email: 'normal@example.com', password: 'secret' })

    expect(result).toEqual({ token: 'token' })
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        isSuperAdmin: false,
      }),
    )
    expect(jwtService.sign).not.toHaveBeenCalledWith(
      expect.objectContaining({
        isAdmin: true,
      }),
    )
  })
})
