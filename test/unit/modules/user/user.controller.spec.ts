// 这个测试文件验证对应后端单元的关键行为。
import 'reflect-metadata'
import { PERMISSIONS_KEY } from 'src/common/decorators/permissions.decorator'
import { UserController } from 'src/modules/user/user.controller'

describe('UserController permissions', () => {
  it('declares permissions for admin user management endpoints', () => {
    const prototype = UserController.prototype as any

    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.getUserList)).toEqual(['system:user:list'])
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.getUserDetail)).toEqual(['system:user:detail'])
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.createAdminUser)).toEqual(['system:user:add'])
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.updateAdminUser)).toEqual(['system:user:edit'])
    expect(Reflect.getMetadata(PERMISSIONS_KEY, prototype.deleteAdminUser)).toEqual(['system:user:delete'])
  })
})
