import { BadRequestException, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { UserService } from './user.service'

describe('UserService', () => {
  let prisma: any
  let service: UserService

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    }
    service = new UserService(prisma)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('filters deleted users from list by default', async () => {
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)

    await service.getUserList({ pageNum: 1, pageSize: 10 })

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false }),
      }),
    )
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ isDeleted: false }),
    })
  })

  it('creates admin user and binds roles', async () => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never)
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 7 })

    const result = await (service as any).createAdminUser({
      username: 'admin01',
      password: 'secret123',
      email: 'admin01@example.com',
      phone: '13800138000',
      avatar: 'https://example.com/a.png',
      isSuperAdmin: true,
      roleIds: [1, 2],
    })

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: 'admin01',
        password: 'hashed-password',
        email: 'admin01@example.com',
        phone: '13800138000',
        avatar: 'https://example.com/a.png',
        isSuperAdmin: true,
      },
    })
    expect(prisma.userRole.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 7, roleId: 1 },
        { userId: 7, roleId: 2 },
      ],
      skipDuplicates: true,
    })
    expect(result).toBe('用户新增成功')
  })

  it('rejects duplicate username, email, or phone when creating admin user', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1 })

    await expect(
      (service as any).createAdminUser({
        username: 'admin01',
        password: 'secret123',
        email: 'admin01@example.com',
        phone: '13800138000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('returns active user detail with role ids', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 7,
      username: 'admin01',
      email: 'admin01@example.com',
      phone: '13800138000',
      avatar: null,
      isSuperAdmin: false,
      isDeleted: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      roles: [{ roleId: 1, role: { id: 1, name: 'admin' } }],
    })

    const result = await (service as any).getUserDetail(7)

    expect(result.roleIds).toEqual([1])
    expect(result.roleNames).toEqual(['admin'])
  })

  it('updates user password, base fields, and roles', async () => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-password' as never)
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.user.findUnique.mockResolvedValue({ id: 7, isDeleted: false })

    const result = await (service as any).updateAdminUser(7, {
      username: 'admin02',
      password: 'new-secret',
      email: 'admin02@example.com',
      phone: '13900139000',
      roleIds: [2, 3],
    })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        username: 'admin02',
        password: 'new-hashed-password',
        email: 'admin02@example.com',
        phone: '13900139000',
      },
    })
    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } })
    expect(prisma.userRole.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 7, roleId: 2 },
        { userId: 7, roleId: 3 },
      ],
      skipDuplicates: true,
    })
    expect(result).toBe('用户修改成功')
  })

  it('soft deletes user instead of removing row', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, isDeleted: false })

    const result = await (service as any).deleteAdminUser(7)

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        isDeleted: true,
        deletedAt: expect.any(Date),
      },
    })
    expect(prisma.user.delete).toBeUndefined()
    expect(result).toBe('用户删除成功')
  })

  it('throws when updating deleted or missing user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, isDeleted: true })

    await expect((service as any).updateAdminUser(7, { username: 'admin02' })).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })
})
