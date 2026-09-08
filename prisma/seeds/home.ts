// 这个文件提供小程序首页装修历史模板的恢复种子数据。
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

export const homeDecorationSeeds: HomeDecorationSeed[] = [
  {
    id: 'mock-home',
    name: '首页',
    scene: 'homePage',
    components: [
      {
        id: 'title',
        templateId: 'homePageTitle',
        templateName: '首页头部',
        info: {
          bgColor: '#ffffff',
          textColor: '#1f2937',
          placeholder: '搜索商品、品牌、活动',
          locationText: '杭州',
          rollingWords: ['咖啡', '露营装备', '夏日防晒', '智能家居'],
          searchPageId: 'mock-search',
          isSearchSwiperWords: true,
        },
      },
      {
        id: 'main-nav',
        templateId: 'navSingle',
        templateName: '首页导航',
        info: {
          list: [
            { id: 'recommend', name: '推荐', param: { id: 'home-recommend' }, clickType: '0' },
            { id: 'all-modules', name: '全部模块', param: { id: 'home-all-modules' }, clickType: '0' },
            { id: 'new', name: '新品', param: { id: 'home-new' }, clickType: '0' },
            { id: 'life', name: '生活', param: { id: 'home-life' }, clickType: '0' },
            { id: 'digital', name: '数码', param: { id: 'home-digital' }, clickType: '0' },
            { id: 'linkage', name: '联动', param: { id: 'home-linkage' }, clickType: '0' },
            { id: 'empty', name: '空内容', param: { id: 'home-empty' }, clickType: '0' },
            { id: 'sub-page', url: '/pages-sub/demo/index', name: '二级页', clickType: '1' },
          ],
          bgColor: '#ffffff',
          textColor: '#475569',
          activeColor: '#018d71',
          categoryUrl: '/pages/about/about',
        },
      },
    ],
  },
  {
    id: 'home-all-modules',
    name: '全部模块',
    scene: 'firstScreen',
    components: [
      {
        id: 'all-modules-search',
        templateId: 'search',
        templateName: '搜索块',
        info: {
          buttonText: '搜索',
          placeholder: '搜索块：支持占位词、按钮文案、跳转配置',
          searchPageId: 'mock-search-all',
        },
      },
      {
        id: 'all-modules-notice-list',
        templateId: 'notice',
        templateName: '公告 - 多条轮播',
        info: {
          list: [
            '公告模块：支持单条文本和多条轮播。',
            { path: '/pages-sub/demo/index', text: '公告点击可复用首页跳转协议。', param: { source: 'all-modules-notice' } },
          ],
          color: '#075985',
          bgColor: '#e0f2fe',
          duration: 350,
          iconText: '告',
          interval: 2400,
          iconColor: '#ffffff',
          iconBgColor: '#0ea5e9',
        },
      },
      {
        id: 'all-modules-banner-swiper',
        templateId: 'advert',
        templateName: '轮播图 - 多图联动背景',
        info: {
          css: '{"duration":3000,"isFillet":true}',
          list: [
            {
              path: '/pages-sub/demo/index',
              param: { source: 'all-modules-banner' },
              imgUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
              bgColor: '#dcfce7',
            },
            {
              imgUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
              bgColor: '#fef3c7',
            },
          ],
          height: 240,
          bkChange: true,
        },
      },
      {
        id: 'all-modules-banner-auto',
        templateId: 'advert',
        templateName: '轮播图 - 单图自适应高度',
        info: {
          css: '{"duration":4200,"isFillet":true}',
          list: [
            {
              imgUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
              bgColor: '#bfdbfe',
            },
          ],
          bkChange: false,
          autoHeight: true,
        },
      },
      {
        id: 'all-modules-type-list',
        templateId: 'typeList',
        templateName: '双行分类入口',
        info: {
          list: [
            { id: 'coffee', title: '咖啡', imgUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=300&q=80' },
            { id: 'fruit', title: '水果', imgUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80' },
            {
              id: 'digital',
              title: '数码',
              imgUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=300&q=80',
              badgeIcon: 'https://dummyimage.com/112x52/22c55e/ffffff.png&text=NEW',
              badgePosition: 'top-right',
            },
            { id: 'home', title: '居家', imgUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=300&q=80' },
            { id: 'travel', title: '旅行', imgUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80' },
            { id: 'gift', title: '礼品', imgUrl: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=300&q=80' },
          ],
          rows: 2,
          bkColor: '#ffffff',
        },
      },
      { id: 'all-modules-divider-cube', templateId: 'divider', templateName: '分割占位 - cube 配置', info: { lineHeight: 18 } },
      {
        id: 'cube-two-row',
        templateId: 'cube',
        templateName: '图片魔方 - TWO_ROW',
        info: {
          list: [
            { title: '两列一', imgUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=500&q=80' },
            { title: '两列二', imgUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'TWO_ROW',
          isBglucency: false,
        },
      },
      {
        id: 'cube-three-row',
        templateId: 'cube',
        templateName: '图片魔方 - THREE_ROW',
        info: {
          list: [
            { title: '三列一', imgUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=80' },
            { title: '三列二', imgUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80' },
            { title: '三列三', imgUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'THREE_ROW',
          isBglucency: false,
        },
      },
      {
        id: 'cube-four-row',
        templateId: 'cube',
        templateName: '图片魔方 - FOUR_ROW',
        info: {
          list: [
            { title: '四列一', imgUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=500&q=80' },
            { title: '四列二', imgUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=500&q=80' },
            { title: '四列三', imgUrl: 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=500&q=80' },
            { title: '四列四', imgUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'FOUR_ROW',
          isBglucency: false,
        },
      },
      {
        id: 'cube-five-row',
        templateId: 'cube',
        templateName: '图片魔方 - FIVE_ROW',
        info: {
          list: [
            { title: '五列一', imgUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=500&q=80' },
            { title: '五列二', imgUrl: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=500&q=80' },
            { title: '五列三', imgUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80' },
            { title: '五列四', imgUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80' },
            { title: '五列五', imgUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'FIVE_ROW',
          isBglucency: false,
        },
      },
      {
        id: 'cube-two-five-row',
        templateId: 'cube',
        templateName: '图片魔方 - TWO_FIVE_ROW',
        info: {
          list: [
            { title: '双行一', imgUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=500&q=80' },
            { title: '双行二', imgUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=500&q=80' },
            { title: '双行三', imgUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=80' },
            { title: '双行四', imgUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80' },
            { title: '双行五', imgUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=500&q=80' },
            { title: '双行六', imgUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=500&q=80' },
            { title: '双行七', imgUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=500&q=80' },
            { title: '双行八', imgUrl: 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=500&q=80' },
            { title: '双行九', imgUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=500&q=80' },
            { title: '双行十', imgUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'TWO_FIVE_ROW',
          isBglucency: false,
        },
      },
      {
        id: 'cube-four-grid',
        templateId: 'cube',
        templateName: '图片魔方 - FOUR_GRID',
        info: {
          list: [
            { title: '四宫一', imgUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=500&q=80' },
            { title: '四宫二', imgUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=500&q=80' },
            { title: '四宫三', imgUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=500&q=80' },
            { title: '四宫四', imgUrl: 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'FOUR_GRID',
          isBglucency: false,
        },
      },
      {
        id: 'cube-one-up-two-down',
        templateId: 'cube',
        templateName: '图片魔方 - ONE_UP_TWO_DOWN',
        info: {
          list: [
            { title: '上方大图', imgUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80' },
            { title: '下方左', imgUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80' },
            { title: '下方右', imgUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'ONE_UP_TWO_DOWN',
          isBglucency: false,
        },
      },
      {
        id: 'cube-one-left-two-right',
        templateId: 'cube',
        templateName: '图片魔方 - ONE_LEFT_TWO_RIGHT',
        info: {
          list: [
            { title: '左侧大图', imgUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=500&q=80' },
            { title: '右上', imgUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80' },
            { title: '右下', imgUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'ONE_LEFT_TWO_RIGHT',
          isBglucency: false,
        },
      },
      { id: 'all-modules-divider-linkage', templateId: 'divider', templateName: '分割占位 - 联动导航', info: { lineHeight: 18 } },
      {
        id: 'all-modules-linkage',
        templateId: 'navLinkage',
        templateName: '二级联动导航',
        info: {
          list: [
            {
              id: 'common',
              name: '公共',
              children: [
                { id: 'coffee', name: '公告+魔方', param: { id: 'linkage-coffee' }, clickType: '0' },
                { id: 'fruit', name: '搜索+公告', param: { id: 'linkage-fruit' }, clickType: '0' },
              ],
            },
            {
              id: 'state',
              name: '状态',
              children: [
                { id: 'clean', name: '单公告', param: { id: 'linkage-clean' }, clickType: '0' },
                { id: 'storage', name: '空内容', param: { id: 'home-empty' }, clickType: '0' },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'home-recommend',
    name: '推荐',
    scene: 'firstScreen',
    components: [
      {
        id: 'recommend-banner',
        templateId: 'advert',
        templateName: '轮播图',
        info: {
          css: '{"duration":3500,"isFillet":true}',
          list: [
            { url: '/pages-sub/demo/index', imgUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', bgColor: '#d9f99d' },
            { path: '/pages-sub/demo/index', param: { source: 'banner' }, imgUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', bgColor: '#bfdbfe' },
          ],
          height: 260,
          bkChange: true,
        },
      },
      { id: 'recommend-search', templateId: 'search', templateName: '搜索块', info: { buttonText: '搜索', placeholder: '在推荐频道搜索', searchPageId: 'mock-search' } },
      {
        id: 'recommend-notice',
        templateId: 'notice',
        templateName: '公告',
        info: {
          list: [
            { path: '/pages-sub/demo/index', text: '新人专区上线，首页配置均来自 mock 数据。', param: { source: 'notice' } },
            '公告支持多条轮播、颜色和点击跳转。',
          ],
          color: '#c2410c',
          bgColor: '#fff7ed',
          iconText: '!',
          iconBgColor: '#f97316',
        },
      },
      {
        id: 'recommend-type-list',
        templateId: 'typeList',
        templateName: '双行分类',
        info: {
          list: [
            { id: 'coffee', path: '/pages-sub/demo/index', param: { source: 'typeList', category: 'coffee' }, title: '咖啡', imgUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=300&q=80' },
            { id: 'fruit', title: '水果', imgUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80' },
            { id: 'home', title: '居家', imgUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=300&q=80' },
            {
              id: 'digital',
              title: '数码',
              imgUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=300&q=80',
              badgeIcon: 'https://dummyimage.com/112x52/22c55e/ffffff.png&text=NEW',
              badgePosition: 'top-right',
            },
            { id: 'kitchen', title: '餐厨', imgUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=300&q=80' },
            { id: 'travel', title: '旅行', imgUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80' },
            { id: 'plant', title: '绿植', imgUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=300&q=80' },
            { id: 'storage', title: '收纳', imgUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=300&q=80' },
            { id: 'sports', title: '运动', imgUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=300&q=80' },
            { id: 'gift', title: '礼品', imgUrl: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=300&q=80' },
          ],
          rows: 2,
          bkColor: '#ffffff',
        },
      },
      {
        id: 'recommend-cube',
        templateId: 'cube',
        templateName: '图片魔方',
        info: {
          list: [
            { path: '/pages-sub/demo/index?entry=cube', param: { c_title: '今日上新', c_source: 'home' }, title: '今日上新', imgUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=500&q=80', uriType: '4' },
            { uri: 'subPage/goods', param: { id: 'mock-goods' }, title: '品质生活', imgUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=500&q=80' },
            { title: '数码精选', imgUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=80' },
            { title: '周末好物', imgUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'FOUR_ROW',
          isBglucency: false,
        },
      },
      { id: 'recommend-space', templateId: 'divider', templateName: '分割占位', info: { lineHeight: 16 } },
    ],
  },
  {
    id: 'home-new',
    name: '新品',
    scene: 'content',
    components: [
      { id: 'new-search', templateId: 'search', templateName: '频道搜索', info: { buttonText: '搜索', placeholder: '搜索新品内容', searchPageId: 'mock-search-new' } },
      {
        id: 'new-banner',
        templateId: 'advert',
        templateName: '新品 banner',
        info: {
          css: '{"duration":4000,"isFillet":true}',
          list: [{ imgUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80', bgColor: '#fef3c7' }],
          bkChange: false,
          autoHeight: true,
        },
      },
      { id: 'new-notice', templateId: 'notice', templateName: '新品公告', info: { text: '新品频道示例：可按导航切换不同内容详情。' } },
    ],
  },
  {
    id: 'home-life',
    name: '生活',
    scene: 'content',
    components: [
      {
        id: 'life-cube',
        templateId: 'cube',
        templateName: '生活分类',
        info: {
          list: [
            { title: '家居', imgUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=500&q=80' },
            { title: '美食', imgUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80' },
            { title: '旅行', imgUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'ONE_LEFT_TWO_RIGHT',
          isBglucency: false,
        },
      },
      {
        id: 'life-four-grid',
        templateId: 'cube',
        templateName: '四宫格拼图',
        info: {
          list: [
            { title: '绿植', imgUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=500&q=80' },
            { title: '香薰', imgUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=500&q=80' },
            { title: '餐厨', imgUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=500&q=80' },
            { title: '布艺', imgUrl: 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'FOUR_GRID',
          isBglucency: false,
        },
      },
      { id: 'life-divider', templateId: 'divider', templateName: '生活分割', info: { lineHeight: 20 } },
    ],
  },
  {
    id: 'home-digital',
    name: '数码',
    scene: 'content',
    components: [
      { id: 'digital-notice', templateId: 'notice', templateName: '数码公告', info: { text: '数码频道 mock 内容，后续替换接口即可。' } },
      {
        id: 'digital-cube',
        templateId: 'cube',
        templateName: '数码宫格',
        info: {
          list: [
            { title: '智能设备', imgUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80' },
            { title: '影音娱乐', imgUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80' },
            { title: '移动办公', imgUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'ONE_UP_TWO_DOWN',
          isBglucency: false,
        },
      },
    ],
  },
  {
    id: 'home-linkage',
    name: '联动',
    scene: 'content',
    components: [
      {
        id: 'linkage-nav',
        templateId: 'navLinkage',
        templateName: '二级联动导航',
        info: {
          list: [
            {
              id: 'food',
              name: '吃喝',
              children: [
                { id: 'coffee', name: '咖啡', param: { id: 'linkage-coffee' }, clickType: '0' },
                { id: 'fruit', name: '水果', param: { id: 'linkage-fruit' }, clickType: '0' },
              ],
            },
            {
              id: 'home',
              name: '居家',
              children: [
                { id: 'clean', name: '清洁', param: { id: 'linkage-clean' }, clickType: '0' },
                { id: 'storage', name: '收纳', param: { id: 'linkage-storage' }, clickType: '0' },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'linkage-coffee',
    name: '咖啡',
    scene: 'content',
    components: [
      { id: 'coffee-notice', templateId: 'notice', templateName: '咖啡公告', info: { text: '二级分类内容：咖啡频道。' } },
      {
        id: 'coffee-cube',
        templateId: 'cube',
        templateName: '咖啡分类',
        info: {
          list: [
            { title: '手冲', imgUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=500&q=80' },
            { title: '拿铁', imgUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=500&q=80' },
          ],
          bkColor: '#ffffff',
          iconType: 'TWO_ROW',
          isBglucency: false,
        },
      },
    ],
  },
  {
    id: 'linkage-fruit',
    name: '水果',
    scene: 'content',
    components: [
      { id: 'fruit-search', templateId: 'search', templateName: '水果搜索', info: { buttonText: '搜索', placeholder: '搜索水果', searchPageId: 'mock-search-fruit' } },
      { id: 'fruit-notice', templateId: 'notice', templateName: '水果公告', info: { text: '二级分类内容：水果频道。' } },
    ],
  },
  {
    id: 'linkage-clean',
    name: '清洁',
    scene: 'content',
    components: [
      { id: 'clean-notice', templateId: 'notice', templateName: '清洁公告', info: { text: '二级分类内容：清洁频道。' } },
    ],
  },
  {
    id: 'linkage-storage',
    name: '收纳',
    scene: 'content',
    components: [
      { id: 'storage-notice', templateId: 'notice', templateName: '收纳公告', info: { text: '二级分类内容：收纳频道。' } },
    ],
  },
  {
    id: 'home-empty',
    name: '空内容',
    scene: 'empty',
    components: [],
  },
]

// 恢复首页装修历史模板，并停用其它首页主配置避免接口命中空首页。
export async function seedHomeDecorations() {
  console.log('初始化首页装修模板')

  const decorationIds = homeDecorationSeeds.map((item) => item.id)
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
        where: { scene: 'homePage', id: { not: 'mock-home' } },
        data: { status: 0 },
      })
      await tx.homeComponent.deleteMany({ where: { decorationId: { in: decorationIds } } })
      await tx.homeDecoration.deleteMany({ where: { id: { in: decorationIds } } })
      await tx.homeDecoration.createMany({
        data: homeDecorationSeeds.map((item, index) => ({
          id: item.id,
          name: item.name,
          scene: item.scene,
          status: 1,
          sortNo: index * 10,
          remark: '从历史 mock 首页模板恢复',
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
