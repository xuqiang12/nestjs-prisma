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
  })

  it('returns a default tabbar config without authentication', async () => {
    await request(app.getHttpServer())
      .get('/mobile-tabbar/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.message).toBe('success')
        expect(body.data).toMatchObject({
          name: '主导航栏',
          bgColorMode: 'system',
          bgColor: '#ffffff',
          textColorMode: 'system',
          textColor: '#999999',
          activeColor: '#018d71',
          radiusMode: 'square',
        })
        expect(body.data.items.map((item) => item.pagePath)).toEqual([
          '/pages/index/index',
          '/pages/category/index',
          '/pages/cart/index',
          '/pages/buyerShow/index',
          '/pages/mine/index',
        ])
      })
  })

  it('saves one published tabbar config and returns it publicly', async () => {
    const config = {
      name: '主导航栏',
      bgColorMode: 'custom',
      bgColor: '#fefefe',
      textColorMode: 'custom',
      textColor: '#666666',
      activeColor: '#ff3b30',
      radiusMode: 'largeRound',
      items: [
        {
          id: 'home',
          name: '首页',
          icon: 'static/tabbar/home.png',
          activeIcon: 'static/tabbar/homeHL.png',
          linkType: 'page',
          pagePath: '/pages/index/index',
          sortNo: 0,
        },
        {
          id: 'about',
          name: '我的',
          icon: 'static/tabbar/example.png',
          activeIcon: 'static/tabbar/exampleHL.png',
          linkType: 'page',
          pagePath: '/pages/mine/index',
          sortNo: 1,
        },
      ],
    }

    await request(app.getHttpServer())
      .post('/mobile-tabbar/save')
      .set('Authorization', `Bearer ${token}`)
      .send(config)
      .expect(201)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.data.items.map((item) => item.name)).toEqual(['首页', '我的'])
      })

    await request(app.getHttpServer())
      .get('/mobile-tabbar/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({
          name: '主导航栏',
          bgColorMode: 'custom',
          bgColor: '#fefefe',
          textColorMode: 'custom',
          textColor: '#666666',
          activeColor: '#ff3b30',
          radiusMode: 'largeRound',
        })
        expect(body.data.items).toEqual(config.items)
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

  async function cleanMobileTabBarTables() {
    try {
      await prisma.$executeRawUnsafe('DELETE FROM "mobile_tabbar_config"')
    } catch (error) {
      if (!String(error).includes('mobile_tabbar_config')) {
        throw error
      }
    }
  }
})
