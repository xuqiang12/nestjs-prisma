// 这个测试校验小程序底部导航运行时和后台管理接口。
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import * as request from 'supertest'
import { PrismaService } from 'nestjs-prisma'
import { AppModule } from '../src/app.module'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'

jest.setTimeout(30000)

describe('MobileTabBarController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let token: string
  const e2eConfigIds = ['main-tabbar', 'tabbar-a', 'tabbar-b']

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalInterceptors(new ResponseInterceptor())
    prisma = app.get(PrismaService)
    token = app.get(JwtService).sign({
      userId: 'mobile-tabbar-e2e-user',
      roles: [],
      permissions: [],
      isAdmin: true,
      isSuperAdmin: true,
    })
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanMobileTabBarTables()
  })

  afterEach(async () => {
    await cleanMobileTabBarTables()
    await restoreSeedTabBarStatus()
  })

  it('returns a default tabbar config without authentication', async () => {
    await prisma.$executeRawUnsafe('UPDATE "mobile_tabbar_config" SET "status" = 0')

    await request(app.getHttpServer())
      .get('/mobile/tabbar')
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.message).toBe('success')
        expect(body.data).toMatchObject({
          name: '主导航栏',
          tabBarMode: 'native',
          bgColorMode: 'system',
          bgColor: '#ffffff',
          textColorMode: 'system',
          textColor: '#999999',
          activeColor: '#E83524',
          radiusMode: 'square',
        })
        expect(body.data.items).toEqual([])
      })
  })

  it('returns the release-time native tabbar without dynamic menu items', async () => {
    const config = {
      id: 'main-tabbar',
      name: '主导航栏',
      tabBarMode: 'native',
      bgColorMode: 'custom',
      bgColor: '#fefefe',
      textColorMode: 'custom',
      textColor: '#666666',
      activeColor: '#ff3b30',
      radiusMode: 'largeRound',
      items: [],
    }

    await request(app.getHttpServer())
      .post('/mobile-tabbar/save')
      .set('Authorization', `Bearer ${token}`)
      .send(config)
      .expect(201)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.data.items).toEqual([])
      })

    await request(app.getHttpServer())
      .post('/mobile-tabbar/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'main-tabbar', status: 1 })
      .expect(201)

    await request(app.getHttpServer())
      .get('/mobile/tabbar')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({
          name: '主导航栏',
          tabBarMode: 'native',
        })
        expect(body.data.items).toEqual([])
      })
  })

  it('lists tabbar configs and keeps only one enabled', async () => {
    await saveTabBarConfig('tabbar-a', '导航 A')
    await saveTabBarConfig('tabbar-b', '导航 B')

    await request(app.getHttpServer())
      .post('/mobile-tabbar/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'tabbar-a', status: 1 })
      .expect(201)

    await request(app.getHttpServer())
      .post('/mobile-tabbar/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'tabbar-b', status: 1 })
      .expect(201)

    await request(app.getHttpServer())
      .get('/mobile-tabbar/list')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        const currentCaseRows = body.data
          .filter((item) => ['tabbar-a', 'tabbar-b'].includes(item.id))
          .map((item) => ({ id: item.id, status: item.status }))
        expect(currentCaseRows).toEqual([
          { id: 'tabbar-a', status: 0 },
          { id: 'tabbar-b', status: 1 },
        ])
      })

    await request(app.getHttpServer())
      .get('/mobile/tabbar')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.id).toBe('tabbar-b')
        expect(body.data.name).toBe('导航 B')
      })
  })

  it('rejects disabling the last enabled tabbar so published data remains explicit', async () => {
    await saveTabBarConfig('tabbar-a', '导航 A')

    await request(app.getHttpServer())
      .post('/mobile-tabbar/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'tabbar-a', status: 1 })
      .expect(201)

    await request(app.getHttpServer())
      .post('/mobile-tabbar/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'tabbar-a', status: 0 })
      .expect(400)

    await request(app.getHttpServer())
      .get('/mobile/tabbar')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.id).toBe('tabbar-a')
        expect(body.data.name).toBe('导航 A')
      })
  })

  it('rejects invalid tabbar item counts and page paths', async () => {
    await request(app.getHttpServer())
      .post('/mobile-tabbar/save')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '主导航栏',
        items: [
          { name: '首页', icon: '', activeIcon: '', linkType: 'page', pagePath: '/pages/index/index', sortNo: 0 },
        ],
      })
      .expect(400)

    await request(app.getHttpServer())
      .post('/mobile-tabbar/save')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '主导航栏',
        items: [
          { name: '首页', icon: '', activeIcon: '', linkType: 'page', pagePath: '/pages/index/index', sortNo: 0 },
          { name: '不存在', icon: '', activeIcon: '', linkType: 'page', pagePath: '/pages/missing/index', sortNo: 1 },
        ],
      })
      .expect(400)
  })

  // 清理本测试创建的底部导航配置记录。
  async function cleanMobileTabBarTables() {
    try {
      await prisma.$executeRawUnsafe(
        'DELETE FROM "mobile_tabbar_config" WHERE "id" IN ($1, $2, $3)',
        ...e2eConfigIds,
      )
    } catch (error) {
      if (!String(error).includes('mobile_tabbar_config')) {
        throw error
      }
    }
  }

  // 恢复默认底部导航配置的启用状态，避免 e2e 临时配置影响开发库。
  async function restoreSeedTabBarStatus() {
    await prisma.$executeRawUnsafe(
      'UPDATE "mobile_tabbar_config" SET "status" = 1 WHERE "id" = $1',
      '340740439936077981',
    )
  }

  // 创建本测试使用的底部导航配置记录。
  async function saveTabBarConfig(id: string, name: string) {
    await request(app.getHttpServer())
      .post('/mobile-tabbar/save')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id,
        name,
        items: [
          {
            name: '首页',
            icon: 'static/tabbar/home-normal.png',
            activeIcon: 'static/tabbar/home-active.png',
            linkType: 'page',
            pagePath: '/pages/index/index',
            sortNo: 0,
          },
          {
            name: '我的',
            icon: 'static/tabbar/profile-normal.png',
            activeIcon: 'static/tabbar/profile-active.png',
            linkType: 'page',
            pagePath: '/pages/mine/index',
            sortNo: 1,
          },
        ],
      })
      .expect(201)
  }
})
