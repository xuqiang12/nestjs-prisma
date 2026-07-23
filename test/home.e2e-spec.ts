import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import * as request from 'supertest'
import { PrismaService } from 'nestjs-prisma'
import { AppModule } from '../src/app.module'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { HOME_CUBE_LAYOUTS } from '../src/modules/home/home.constants'

jest.setTimeout(30000)

describe('HomeController (e2e)', () => {
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
      userId: 'home-e2e-user',
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

  it('saves homepage components as one ordered list and soft deletes removed components', async () => {
    await prisma.homeDecoration.create({
      data: {
        id: 'mock-home',
        name: '首页',
        scene: 'homePage',
        components: {
          create: [
            {
              id: 'old-search',
              templateId: 'search',
              templateName: '旧搜索',
              info: { placeholder: '旧搜索' },
            },
          ],
        },
      },
    })

    const titleInfo = {
      bgColor: '#123456',
      textColor: '#ffffff',
      showLocation: false,
      locationText: '闭环城市',
      searchPageId: 'search-page',
      placeholder: '闭环搜索',
      searchRadius: 24,
      searchBgColor: '#eeeeee',
      searchTextColor: '#333333',
      isSearchSwiperWords: true,
      rollingWords: ['闭环词'],
    }
    const searchInfo = { placeholder: '数组搜索', searchPageId: 'search-page' }
    const advertInfo = {
      height: 260,
      autoHeight: false,
      bkChange: true,
      marginTop: 20,
      marginRight: 24,
      marginBottom: 16,
      marginLeft: 24,
      borderRadius: 18,
      list: [
        {
          title: 'banner',
          imgUrl: 'https://example.com/banner.png',
          bgColor: '#fce4ec',
          clickType: '1',
          url: '/pages-sub/demo/index',
          path: '',
          uri: '',
          uriType: '',
          param: { id: 'banner-1' },
        },
      ],
    }
    expect(HOME_CUBE_LAYOUTS).toEqual([
      'TWO_ROW',
      'THREE_ROW',
      'FOUR_ROW',
      'FOUR_GRID',
      'ONE_UP_TWO_DOWN',
      'ONE_LEFT_TWO_RIGHT',
      'ONE_LEFT_RIGHT_TOP_TWO_BOTTOM',
    ])
    const cubeInfo = {
      iconType: 'ONE_LEFT_RIGHT_TOP_TWO_BOTTOM',
      sizeUnit: 'rpx',
      bkColor: '#ffffff',
      isBglucency: false,
      marginTop: 20,
      marginRight: 24,
      marginBottom: 20,
      marginLeft: 24,
      paddingTop: 20,
      paddingRight: 20,
      paddingBottom: 20,
      paddingLeft: 20,
      gap: 16,
      borderRadius: 16,
      itemBorderRadius: 12,
      list: [
        {
          title: '主图',
          imgUrl: 'https://example.com/cube-main.png',
          clickType: '1',
          url: '/pages-sub/demo/index',
          path: '',
          uri: '',
          uriType: '',
          param: { id: 'cube-main' },
        },
        {
          title: '右上',
          imgUrl: 'https://example.com/cube-top.png',
          clickType: '0',
          param: { id: 'content-top' },
          url: '',
          path: '',
          uri: '',
          uriType: '',
        },
      ],
    }

    const saveResponse = await request(app.getHttpServer())
      .post('/home/decorations/save-components')
      .set('Authorization', `Bearer ${token}`)
      .send({
        decorationId: 'mock-home',
        components: [
          {
            templateId: 'homePageTitle',
            templateName: '首页头部',
            info: titleInfo,
          },
          {
            templateId: 'advert',
            templateName: '广告轮播',
            info: advertInfo,
          },
          {
            templateId: 'cube',
            templateName: '图片魔方',
            info: cubeInfo,
          },
          {
            templateId: 'search',
            templateName: '搜索块',
            info: searchInfo,
          },
        ],
      })
      .expect(201)

    expect(saveResponse.body.data.map((item) => item.templateId)).toEqual(['homePageTitle', 'advert', 'cube', 'search'])
    expect(saveResponse.body.data[0].id).toEqual(expect.any(String))

    await request(app.getHttpServer())
      .get('/home/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.components.map((item) => item.templateId)).toEqual(['homePageTitle', 'advert', 'cube', 'search'])
        expect(body.data.components[0]).toMatchObject({
          templateId: 'homePageTitle',
          templateName: '首页头部',
          info: titleInfo,
        })
        expect(body.data.components[1]).toMatchObject({
          templateId: 'advert',
          templateName: '广告轮播',
          info: advertInfo,
        })
        expect(body.data.components[2]).toMatchObject({
          templateId: 'cube',
          templateName: '图片魔方',
          info: cubeInfo,
        })
        expect(body.data.components[3]).toMatchObject({
          templateId: 'search',
          templateName: '搜索块',
          info: searchInfo,
        })
      })

    const oldComponent = await prisma.homeComponent.findUnique({
      where: { id: 'old-search' },
      select: { status: true },
    })
    expect(oldComponent?.status).toBe(0)
  })

  it('creates homepage decoration without frontend id and exposes it in home config', async () => {
    await request(app.getHttpServer())
      .post('/home/decorations/create')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '自动首页',
        scene: 'homePage',
        status: 1,
        sortNo: 0,
        remark: '',
      })
      .expect(201)

    const decoration = await prisma.homeDecoration.findFirst({
      where: { name: '自动首页', scene: 'homePage' },
      select: { id: true, status: true },
    })
    expect(decoration?.id).toEqual(expect.any(String))
    expect(decoration?.status).toBe(1)

    await request(app.getHttpServer())
      .get('/home/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.id).toBe(decoration?.id)
        expect(body.data.name).toBe('自动首页')
      })
  })

  it('enables one homepage decoration and disables other homepage decorations', async () => {
    await prisma.homeDecoration.createMany({
      data: [
        { id: 'home-a', name: '首页 A', scene: 'homePage', status: 1, sortNo: 0 },
        { id: 'home-b', name: '首页 B', scene: 'homePage', status: 0, sortNo: 1 },
      ],
    })

    await request(app.getHttpServer())
      .post('/home/decorations/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'home-b', status: 1 })
      .expect(201)

    const decorations = await prisma.homeDecoration.findMany({
      where: { scene: 'homePage' },
      orderBy: { id: 'asc' },
      select: { id: true, status: true },
    })
    expect(decorations).toEqual([
      { id: 'home-a', status: 0 },
      { id: 'home-b', status: 1 },
    ])

    await request(app.getHttpServer())
      .get('/home/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.id).toBe('home-b')
      })
  })

  it('rejects disabling the current homepage decoration', async () => {
    await prisma.homeDecoration.create({
      data: { id: 'home-main', name: '首页', scene: 'homePage', status: 1 },
    })

    await request(app.getHttpServer())
      .post('/home/decorations/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'home-main', status: 0 })
      .expect(400)

    const decoration = await prisma.homeDecoration.findUnique({
      where: { id: 'home-main' },
      select: { status: true },
    })
    expect(decoration?.status).toBe(1)
  })

  async function cleanHomeTables() {
    await prisma.homeComponent.deleteMany()
    await prisma.homeDecoration.deleteMany()
  }
})
