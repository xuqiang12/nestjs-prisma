# 小程序底部导航配置接口

## 功能目标

本模块用于保存和公开读取小程序底部主导航配置。它是小程序全局壳层配置，不属于首页装修组件，因此不写入 `HomeDecoration` 和 `HomeComponent`。

## 数据存储

使用一张表整体保存多套配置：

| 表 | 用途 |
| --- | --- |
| `mobile_tabbar_config` | 保存底部导航配置 JSON，`status = 1` 表示当前启用配置。 |

`config` 字段保存完整业务配置，`name` 用于后台识别。同一时间最多一条配置启用；允许全部禁用，全部禁用时公开读取接口返回系统原生 tabBar 默认配置。

## 接口

| 方法 | 地址 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/mobile-tabbar/config` | 公开 | 小程序读取当前底部导航配置。 |
| GET | `/mobile-tabbar/list` | 需要登录 | 后台读取底部导航配置列表。 |
| GET | `/mobile-tabbar/detail` | 需要登录 | 后台读取单条底部导航配置详情。 |
| POST | `/mobile-tabbar/save` | 需要登录 | 后台保存底部导航配置。 |
| POST | `/mobile-tabbar/status` | 需要登录 | 后台启用或禁用底部导航配置。 |

## 后台菜单

`prisma/seeds/menu.ts` 初始化独立后台菜单：

| 菜单 | path | component |
| --- | --- | --- |
| 移动端 | `/mobile` | `Layout` |
| 首页配置 | `/mobile/homeConfig/index` | `/mobile/homeConfig/index` |
| 底部导航配置 | `/mobile/tabBar/index` | `/mobile/tabBar/index` |

前端动态路由会加载 `vue-element-admin-dev/src/views/mobile/tabBar/index.vue`。执行 `npm run seed` 后，默认 `Administrator` 角色会通过 `MenuRole` 获得该菜单。

## 配置结构

```ts
type MobileTabBarConfig = {
  id: string
  name: string
  tabBarMode: 'custom' | 'native'
  bgColorMode: 'system' | 'custom'
  bgColor: string
  textColorMode: 'system' | 'custom'
  textColor: string
  activeColor: string
  radiusMode: 'square' | 'round' | 'largeRound'
  items: MobileTabBarItem[]
}

type MobileTabBarItem = {
  id: string
  name: string
  icon: string
  activeIcon: string
  linkType: 'page'
  pagePath: string
  sortNo: number
}
```

## 关键规则

- 菜单项数量必须为 2-5 个。
- `tabBarMode: 'custom'` 时，小程序隐藏 uniapp 原生 tabBar，渲染后端配置的自定义底部导航。
- `tabBarMode: 'native'` 时，小程序显示 `pages.json` 中发版固定的 uniapp 原生 tabBar，不承诺后台动态增删原生 tab 页面。
- 当前仅支持 `linkType: 'page'`。
- `pagePath` 必须在后端白名单内，避免小程序跳转到不存在页面。
- 未保存过配置时，公开读取接口返回默认配置。
- 后台保存时只保存当前配置内容，不直接启用。
- 启用某一条配置时，后端会自动禁用其它配置。
- 禁用最后一条启用配置是允许的；禁用后小程序公开读取接口返回 `tabBarMode: 'native'`，小程序显示发版固定的系统原生 tabBar。

## 当前页面白名单

```txt
/pages/index/index
/pages/category/index
/pages/cart/index
/pages/buyerShow/index
/pages/mine/index
```
