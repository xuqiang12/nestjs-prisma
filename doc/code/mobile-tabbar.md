# 小程序底部导航配置接口

## 功能目标

本模块用于保存和公开读取小程序底部主导航配置。它是小程序全局壳层配置，不属于首页装修组件，因此不写入 `HomeDecoration` 和 `HomeComponent`。

## 数据存储

第一版使用一张表整体保存配置：

| 表 | 用途 |
| --- | --- |
| `mobile_tabbar_config` | 保存当前发布的底部导航配置 JSON。 |

固定使用 `id = default` 保存当前生效配置。`config` 字段保存完整业务配置，`name` 用于后台识别。

## 接口

| 方法 | 地址 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/mobile-tabbar/config` | 公开 | 小程序读取当前底部导航配置。 |
| POST | `/mobile-tabbar/save` | 需要登录 | 后台保存并发布底部导航配置。 |

## 后台菜单

`prisma/seeds/menu.ts` 初始化独立后台菜单：

| 菜单 | path | component |
| --- | --- | --- |
| 移动端 | `/mobile` | `Layout` |
| 底部导航配置 | `/mobile/tabBar` | `/mobile/tabBar/index` |

前端动态路由会加载 `vue-element-admin-dev/src/views/mobile/tabBar/index.vue`。执行 `npm run seed` 后，默认 `Administrator` 角色会通过 `MenuRole` 获得该菜单。

## 配置结构

```ts
type MobileTabBarConfig = {
  id: string
  name: string
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
- 当前仅支持 `linkType: 'page'`。
- `pagePath` 必须在后端白名单内，避免小程序跳转到不存在页面。
- 未保存过配置时，公开读取接口返回默认配置。
- 后台保存时整体 upsert 当前发布配置，不做版本发布和草稿管理。

## 当前页面白名单

```txt
/pages/index/index
/pages/category/index
/pages/cart/index
/pages/buyerShow/index
/pages/mine/index
```
