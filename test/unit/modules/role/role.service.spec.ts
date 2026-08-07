// 这个测试文件验证对应后端单元的关键行为。
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { RoleService } from 'src/modules/role/role.service'

describe('RoleService', () => {
  let prisma: any
  let service: RoleService

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userRole: {
        count: jest.fn(),
      },
      menuRole: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      rolePermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    }
    service = new RoleService(prisma)
  })

  it('returns role list with user count', async () => {
    prisma.role.findMany.mockResolvedValue([
      { id: '1', name: 'admin', _count: { users: 2 } },
      { id: '2', name: 'common', _count: { users: 0 } },
    ])

    const result = await service.getRoleList()

    expect(prisma.role.findMany).toHaveBeenCalledWith({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { id: 'asc' },
    })
    expect(result).toEqual([
      { id: '1', name: 'admin', userCount: 2 },
      { id: '2', name: 'common', userCount: 0 },
    ])
  })

  it('returns role detail with menu ids and permission ids', async () => {
    prisma.role.findUnique.mockResolvedValue({
      id: '1',
      name: 'admin',
      menus: [{ menuId: '1' }, { menuId: '2' }],
      permissions: [{ permissionId: '3' }, { permissionId: '4' }],
    })

    const result = await service.getRoleDetail('1')

    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
      include: {
        menus: { select: { menuId: true } },
        permissions: { select: { permissionId: true } },
      },
    })
    expect(result).toEqual({
      id: '1',
      name: 'admin',
      menuIds: ['1', '2'],
      permissionIds: ['3', '4'],
    })
  })

  it('throws when role detail is missing', async () => {
    prisma.role.findUnique.mockResolvedValue(null)

    await expect(service.getRoleDetail('1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates role with name', async () => {
    prisma.role.create.mockResolvedValue({ id: '1', name: 'admin' })

    const result = await service.createRole({ name: 'admin' })

    expect(prisma.role.create).toHaveBeenCalledWith({
      data: { name: 'admin' },
    })
    expect(result).toBe('角色新增成功')
  })

  it('updates role name after checking role exists', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: '1', name: 'admin' })
    prisma.role.update.mockResolvedValue({ id: '1', name: 'operator' })

    const result = await service.updateRole({ id: '1', name: 'operator' })

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { name: 'operator' },
    })
    expect(result).toBe('角色修改成功')
  })

  it('saves role menu and permission ids in one transaction', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: '1', name: 'admin' })

    const result = await service.updateRolePermission({
      id: '1',
      menuIds: ['1', '2'],
      permissionIds: ['3', '4'],
    })

    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.menuRole.deleteMany).toHaveBeenCalledWith({ where: { roleId: '1' } })
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: '1' } })
    expect(prisma.menuRole.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: '1', menuId: '1' },
        { roleId: '1', menuId: '2' },
      ],
      skipDuplicates: true,
    })
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: '1', permissionId: '3' },
        { roleId: '1', permissionId: '4' },
      ],
      skipDuplicates: true,
    })
    expect(result).toBe('角色授权保存成功')
  })

  it('clears role authorization when ids are empty arrays', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: '1', name: 'admin' })

    await service.updateRolePermission({ id: '1', menuIds: [], permissionIds: [] })

    expect(prisma.menuRole.deleteMany).toHaveBeenCalledWith({ where: { roleId: '1' } })
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: '1' } })
    expect(prisma.menuRole.createMany).not.toHaveBeenCalled()
    expect(prisma.rolePermission.createMany).not.toHaveBeenCalled()
  })

  it('rejects deleting role already bound to users', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: '1', name: 'admin' })
    prisma.userRole.count.mockResolvedValue(1)

    await expect(service.deleteRole({ id: '1' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('clears role authorization before deleting unused role', async () => {
    prisma.role.findUnique.mockResolvedValue({ id: '1', name: 'admin' })
    prisma.userRole.count.mockResolvedValue(0)

    const result = await service.deleteRole({ id: '1' })

    expect(prisma.menuRole.deleteMany).toHaveBeenCalledWith({ where: { roleId: '1' } })
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: '1' } })
    expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: '1' } })
    expect(result).toBe('角色删除成功')
  })
})
