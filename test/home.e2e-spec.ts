import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'
import { PrismaService } from 'nestjs-prisma'
import { AppModule } from '../src/app.module'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'

describe('HomeController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalInterceptors(new ResponseInterceptor())
    prisma = app.get(PrismaService)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await cleanHomeTables()
  })

  afterEach(async () => {
    await cleanHomeTables()
  })

  it('returns empty content detail for missing id without authentication', async () => {
    await request(app.getHttpServer())
      .get('/home/content-detail')
      .query({ id: 'missing-id' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.message).toBe('success')
        expect(body.data).toEqual({
          id: 'missing-id',
          name: '',
          scene: 'empty',
          components: [],
        })
      })
  })

  it('returns enabled homepage components in sort order without authentication', async () => {
    await prisma.homeDecoration.create({
      data: {
        id: 'mock-home',
        name: '首页',
        scene: 'homePage',
        components: {
          create: [
            {
              id: 'nav-single',
              templateId: 'navSingle',
              templateName: '一级导航',
              info: { list: [] },
              sortNo: 20,
            },
            {
              id: 'home-title',
              templateId: 'homePageTitle',
              templateName: '首页头部',
              info: { locationText: '全国' },
              sortNo: 10,
            },
            {
              id: 'disabled-component',
              templateId: 'advert',
              templateName: '停用轮播',
              info: { list: [] },
              sortNo: 5,
              status: 0,
            },
          ],
        },
      },
    })

    await request(app.getHttpServer())
      .get('/home/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0)
        expect(body.message).toBe('success')
        expect(body.data.id).toBe('mock-home')
        expect(body.data.components.map((item) => item.id)).toEqual(['home-title', 'nav-single'])
        expect(body.data.components[0]).toMatchObject({
          templateId: 'homePageTitle',
          templateName: '首页头部',
          info: { locationText: '全国' },
        })
      })
  })

  async function cleanHomeTables() {
    await prisma.homeComponent.deleteMany()
    await prisma.homeDecoration.deleteMany()
  }
})
