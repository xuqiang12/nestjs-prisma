// 这个文件提供小程序首页装修标准模板的恢复种子数据。
import { Prisma } from '@prisma/client'
import { prisma } from '../client'

type HomeComponentSeed = {
  id: string
  templateId: string
  templateName: string
  info: Prisma.InputJsonValue
}

type HomeDecorationSeed = {
  id: string
  name: string
  scene: string
  components: HomeComponentSeed[]
}

const legacyHomeDecorationIds = [
  '344015393360187914',
  '355640489430487630',
  'mock-home',
  'home-all-modules',
  'home-recommend',
  'home-new',
  'home-life',
  'home-digital',
  'home-linkage',
  'linkage-coffee',
  'linkage-fruit',
  'linkage-clean',
  'linkage-storage',
  'home-empty',
]

export const homeDecorationSeeds: HomeDecorationSeed[] = [
  {
    id: '355640661845742159',
    name: '首页配置',
    scene: 'homePage',
    components: [
      {
        id: '355640770893451856',
        templateId: 'homePageTitle',
        templateName: '首页头部',
        info: {
          bgColor: '#ffffff',
          leftIcon: 'el-icon-menu',
          sizeUnit: 'rpx',
          textColor: '#1f2937',
          placeholder: '搜索商品、品牌、活动',
          locationText: '杭州',
          leftIconMode: 'default',
          rollingWords: ['咖啡', '露营装备', '夏日防晒', '智能家居'],
          searchPageId: 'mock-search',
          searchRadius: 34,
          searchBgColor: '#f8fafc',
          searchTextColor: '#64748b',
          searchMarginLeft: 0,
          searchMarginRight: 0,
          isSearchSwiperWords: true,
        },
      },
      {
        id: '355640771845558865',
        templateId: 'navSingle',
        templateName: '一级导航',
        info: {
          list: [
            { id: 'nav-1', name: '推荐', param: { id: '' }, clickType: '0' },
            { id: 'nav-2', name: '新品', param: { id: '' }, clickType: '0' },
          ],
          bgColor: '#ffffff',
          sizeUnit: 'rpx',
          textColor: '#475569',
          activeColor: '#018d71',
          categoryUrl: '/pages/about/about',
          navItemPadding: 28,
          showCategoryEntry: true,
        },
      },
      {
        id: '355640772449538642',
        templateId: 'advert',
        templateName: '广告轮播',
        info: {
          css: '{"duration":3500,"isFillet":true}',
          list: [
            {
              uri: '',
              url: '/pages-sub/demo/index',
              path: '',
              param: { source: 'banner-1' },
              title: '当季好物',
              imgUrl:
                'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
              bgColor: '#d9f99d',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              path: '/pages-sub/demo/index',
              param: { source: 'banner-2' },
              title: '新品精选',
              imgUrl:
                'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
              bgColor: '#bfdbfe',
              uriType: '',
              clickType: '1',
            },
          ],
          height: 260,
          bkChange: true,
          sizeUnit: 'rpx',
          marginTop: 24,
          autoHeight: false,
          marginLeft: 40,
          marginRight: 40,
          borderRadius: 32,
          marginBottom: 40,
        },
      },
      {
        id: '355640773057712723',
        templateId: 'notice',
        templateName: '公告',
        info: {
          icon: '',
          list: [
            {
              path: '/pages-sub/demo/index',
              text: '新人专区上线，首页装修来自标准配置。',
              param: { source: 'notice' },
            },
            '公告支持多条轮播、颜色和点击跳转。',
          ],
          color: '#c2410c',
          height: 100,
          bgColor: '#fff7ed',
          iconText: '!',
          isScroll: true,
          sizeUnit: 'rpx',
          marginTop: 12,
          marginLeft: 0,
          marginRight: 0,
          borderRadius: 4,
          marginBottom: 0,
          backgroundColor: '#ffffff',
          iconColor: '#ffffff',
          iconBgColor: '#f97316',
        },
      },
      {
        id: '355640773670081108',
        templateId: 'cube',
        templateName: '图片魔方',
        info: {
          gap: 16,
          list: [
            {
              uri: '',
              url: '',
              path: '/pages-sub/demo/index?entry=cube',
              param: { c_title: '今日上新', c_source: 'home' },
              title: '今日上新',
              imgUrl:
                'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=500&q=80',
              uriType: '4',
              clickType: '1',
            },
            {
              uri: 'subPage/goods',
              url: '',
              path: '',
              param: { id: 'mock-goods' },
              title: '品质生活',
              imgUrl:
                'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=500&q=80',
              uriType: '',
              clickType: '0',
            },
            {
              uri: '',
              url: '',
              path: '',
              param: { id: '' },
              title: '数码精选',
              imgUrl:
                'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=80',
              uriType: '',
              clickType: '0',
            },
            {
              uri: '',
              url: '',
              path: '',
              param: { id: '' },
              title: '周末好物',
              imgUrl:
                'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
              uriType: '',
              clickType: '0',
            },
          ],
          bkColor: '#ffffff',
          iconType: 'FOUR_ROW',
          sizeUnit: 'rpx',
          marginTop: 20,
          marginLeft: 24,
          paddingTop: 20,
          isBglucency: false,
          marginRight: 24,
          paddingLeft: 20,
          borderRadius: 16,
          marginBottom: 20,
          paddingRight: 20,
          paddingBottom: 20,
          itemBorderRadius: 12,
        },
      },
      {
        id: '355640774278255189',
        templateId: 'typeList',
        templateName: '类目导航',
        info: {
          list: [
            {
              uri: '',
              url: '',
              name: '咖啡',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'coffee' },
              title: '咖啡',
              imgUrl:
                'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '水果',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'fruit' },
              title: '水果',
              imgUrl:
                'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '居家',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'home' },
              title: '居家',
              imgUrl:
                'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '数码',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'digital' },
              title: '数码',
              imgUrl:
                'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
              badgeIcon: 'https://dummyimage.com/112x52/22c55e/ffffff.png&text=NEW',
              badgePosition: 'top-right',
            },
            {
              uri: '',
              url: '',
              name: '餐厨',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'kitchen' },
              title: '餐厨',
              imgUrl:
                'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '旅行',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'travel' },
              title: '旅行',
              imgUrl:
                'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '绿植',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'plant' },
              title: '绿植',
              imgUrl:
                'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '收纳',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'storage' },
              title: '收纳',
              imgUrl:
                'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '运动',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'sports' },
              title: '运动',
              imgUrl:
                'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
            {
              uri: '',
              url: '',
              name: '礼品',
              path: '/pages-sub/demo/index',
              param: { source: 'typeList', category: 'gift' },
              title: '礼品',
              imgUrl:
                'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=300&q=80',
              uriType: '',
              clickType: '1',
            },
          ],
          rows: 2,
          bkColor: '#ffffff',
          columns: 4,
          itemGap: 36,
          sizeUnit: 'rpx',
          imageMode: 'contain',
          showTitle: true,
          imageRatio: 70,
          marginLeft: 36,
          titleColor: '#0f766e',
          imageRadius: 44,
          isBglucency: false,
          marginRight: 36,
          titleFontSize: 28,
          titleFontWeight: 'bold',
        },
      },
      {
        id: '355640774878040662',
        templateId: 'goodsWaterfall',
        templateName: '瀑布流商品',
        info: {
          bkColor: '#f5f6f7',
          itemGap: 20,
          showTags: true,
          sizeUnit: 'rpx',
          columnGap: 20,
          marginTop: 20,
          showPrice: true,
          cardRadius: 16,
          marginLeft: 20,
          imageRadius: 16,
          isBglucency: false,
          marginRight: 20,
          marginBottom: 20,
        },
      },
      {
        id: '355640775486214743',
        templateId: 'divider',
        templateName: '分割占位',
        info: {
          lineHeight: 12,
        },
      },
    ],
  },
]

// 恢复首页装修标准模板，并清理误拆成多条配置的历史数据。
export async function seedHomeDecorations() {
  console.log('初始化首页装修模板')

  const decorationIds = homeDecorationSeeds.map((item) => item.id)
  const managedDecorationIds = [...decorationIds, ...legacyHomeDecorationIds]
  const componentRows = homeDecorationSeeds.flatMap((decoration) =>
    decoration.components.map((component, index) => ({
      id: component.id,
      decorationId: decoration.id,
      templateId: component.templateId,
      templateName: component.templateName,
      info: component.info,
      sortNo: index,
      status: 1,
    })),
  )

  await prisma.$transaction(
    async (tx) => {
      await tx.homeDecoration.updateMany({
        where: { scene: 'homePage', id: { notIn: decorationIds } },
        data: { status: 0 },
      })
      await tx.homeComponent.deleteMany({ where: { decorationId: { in: managedDecorationIds } } })
      await tx.homeDecoration.deleteMany({ where: { id: { in: managedDecorationIds } } })
      await tx.homeDecoration.createMany({
        data: homeDecorationSeeds.map((item, index) => ({
          id: item.id,
          name: item.name,
          scene: item.scene,
          status: 1,
          sortNo: index * 10,
          remark: '首页装修标准模板',
        })),
      })
      await tx.homeComponent.createMany({ data: componentRows })
    },
    { timeout: 30000 },
  )

  return {
    decorations: homeDecorationSeeds.length,
    components: componentRows.length,
  }
}

// 允许直接执行当前文件恢复首页装修模板。
async function runHomeSeedDirectly() {
  const result = await seedHomeDecorations()
  console.log(`首页装修模板初始化完成：${result.decorations} 个配置，${result.components} 个组件`)
}

if (require.main === module) {
  runHomeSeedDirectly()
    .catch((error) => {
      console.error('首页装修模板初始化失败', error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
