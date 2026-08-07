// 这个测试文件验证对应后端单元的关键行为。
import { ForbiddenException } from '@nestjs/common'
import { PermissionsGuard } from 'src/common/guards/permissions.guard'

describe('PermissionsGuard', () => {
  function createGuard(requiredPermissions?: string[]) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
    }
    const guard = new PermissionsGuard(reflector as any)

    return { guard, reflector }
  }

  function createContext(user: any) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any
  }

  it('allows super admin without configured permission codes', () => {
    const { guard } = createGuard(['system:user:delete'])

    expect(
      guard.canActivate(createContext({ isSuperAdmin: true, permissions: [] })),
    ).toBe(true)
  })

  it('requires configured permission codes for normal users', () => {
    const { guard } = createGuard(['system:user:delete'])

    expect(() =>
      guard.canActivate(createContext({ isSuperAdmin: false, permissions: ['system:user:add'] })),
    ).toThrow(ForbiddenException)
  })
})
