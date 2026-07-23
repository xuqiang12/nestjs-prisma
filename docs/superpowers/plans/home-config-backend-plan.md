# 首页配置需求文档

## 文档维护方式

本文件作为首页配置功能的产品需求与技术契约沉淀文档。后续沟通中，每确认一个需求点，就同步更新到本文档，避免只停留在聊天记录里。

当前需求围绕三个方向展开：

1. 后台管理系统怎么配置。
2. 小程序如何展示。
3. 数据如何设计。

## 本轮已确认结论

- 后台第一版采用表单配置方式，不做可视化拖拽装修器。
- 后台需要围绕当前首页装修组件做配置、排序、启停和保存。
- 小程序继续按当前组件化方式展示，不因为接后端而重写页面渲染逻辑。
- 数据设计继续服务 `HomeDecoration -> HomeComponent[] -> info` 这套结构。
- 第一阶段仍只覆盖公共首页装修能力，不混入商品、品牌、购物车、活动弹窗等业务模块。
- 当前后端项目 `nestjs-prisma` 已完成 `home_decoration`、`home_component` 数据模型、公开读取接口和后台管理接口。
- 当前后端没有全局 `/api` 前缀，所以本文档中的后端真实接口统一不带 `/api`。
- 当前后端统一响应由全局 `ResponseInterceptor` 处理，接口响应外层为 `{ code, message, data }`。
- 当前阶段不做首页配置 seed；后续如需初始化小程序 mock 数据，再单独补 seed。
- 当前后台管理接口先不加 `@Permissions`，等菜单、按钮和权限 seed 一起确认后再补权限控制。

## 产品目标

让运营或管理员可以在后台维护小程序首页配置，小程序通过接口读取配置后动态展示首页内容。第一版目标不是做复杂装修平台，而是把当前写在 `src/api/home.ts` 里的 mock 配置变成后端可存储、后台可维护、小程序可直接消费的数据。

## 跨项目 AI 开发交接说明

本节用于把当前小程序已经完成的首页能力，交接给后端项目和后台管理项目继续开发。后续在后端项目或后台项目中，可以先让 AI 阅读本文件，再按本节的项目分工执行。

### 当前小程序已完成内容

当前小程序项目已经完成首页展示层，后端和后台不需要重新设计小程序页面。

小程序侧源码依据：

- 首页入口：`src/pages/index/index.vue`
- 首页数据契约和 mock：`src/api/home.ts`
- 首页头部：`src/pages/index/homePageTitle.vue`
- 一级导航：`src/pages/index/navSingle.vue`
- 内容组件分发：`src/pages/index/components/homeBlocks.vue`
- 二级联动：`src/pages/index/components/navLinkage.vue`
- 跳转协议：`src/pages/index/utils/homeJump.ts`
- 内容组件目录：`src/pages/index/components`

小程序当前只依赖两个数据函数：

```ts
getHomeConfig()
getHomeContentDetail(id)
```

后续接真实后端时，只需要把这两个函数从 mock 改成接口请求。当前后端响应外层为 `{ code, message, data }`，小程序业务层继续消费其中的 `data`，`data` 保持 `HomeDecoration` 结构不变。

### 后端和后台共同数据语言

三端统一围绕 `HomeDecoration` 和 `HomeComponent` 工作。

```ts
type HomeComponent = {
  id: string
  templateId: HomeTemplateId
  templateName?: string
  info: Record<string, any>
}

type HomeDecoration = {
  id: string
  name: string
  scene: 'homePage' | 'firstScreen' | 'content' | 'empty'
  components: HomeComponent[]
}
```

字段映射：

| 小程序字段 | 数据库字段 | 后台表单含义 |
| --- | --- | --- |
| `HomeDecoration.id` | `home_decoration.id` | 配置 ID，也是导航和联动内容引用 ID。 |
| `HomeDecoration.name` | `home_decoration.name` | 配置名称。 |
| `HomeDecoration.scene` | `home_decoration.scene` | 场景类型。 |
| `HomeDecoration.components` | 通过 `home_component.decoration_id` 查询 | 当前配置下的组件列表。 |
| `HomeComponent.id` | `home_component.id` | 组件 ID。 |
| `HomeComponent.templateId` | `home_component.template_id` | 组件类型。 |
| `HomeComponent.templateName` | `home_component.template_name` | 组件名称。 |
| `HomeComponent.info` | `home_component.info` | 组件差异化配置 JSON。 |

当前小程序 mock 中后续可迁移为初始化数据的配置包括。当前阶段后端暂不做 seed，以下列表仅作为后续初始化数据参考：

- `mock-home`
- `home-all-modules`
- `home-recommend`
- `home-new`
- `home-life`
- `home-digital`
- `home-linkage`
- `linkage-coffee`
- `linkage-fruit`
- `linkage-clean`
- `linkage-storage`
- `home-empty`

引用关系：

- `navSingle.list[].param.id` 引用一个 `HomeDecoration.id`。
- `navLinkage.list[].param.id` 可以引用一个 `HomeDecoration.id`。
- `navLinkage.list[].children[].param.id` 引用一个 `HomeDecoration.id`。
- `clickType = 0` 表示加载引用的内容配置。
- `clickType = 1` 表示按跳转协议直接跳转。

### 后端项目开发目标

后端项目负责把首页配置变成真实可查询、可保存、可校验的数据服务。当前 `nestjs-prisma` 后端第一阶段已经完成数据模型、公开读取接口和后台管理接口。

后端第一阶段完成内容：

1. 新增首页配置表 `home_decoration`。
2. 新增首页组件表 `home_component`。
3. 提供首页主配置公开接口。
4. 提供频道或联动内容详情公开接口。
5. 提供后台管理用配置列表、详情、新增、编辑、启停接口。
6. 提供后台管理用组件列表、新增、编辑、启停、排序接口。
7. 按 `status`、`sort_no` 和组件枚举做基础过滤和校验。
8. 返回结构使用当前后端统一外层 `{ code, message, data }`，其中 `data` 满足 `HomeDecoration` 或后台管理数据结构。

后端不需要做：

- 不需要实现小程序 UI。
- 不需要做后台表单页面。
- 当前阶段不需要做首页配置 seed。
- 不需要引入商品、品牌、购物车、活动弹窗等业务模块。
- 不需要把每种组件拆成独立业务表。
- 当前阶段不需要接入后台按钮权限，后续等菜单和权限初始化一起处理。

### 后端接口必须保持的契约

#### 获取首页主配置

```http
GET /home/config
```

返回 `scene = homePage` 的首页主配置，至少包含：

- `homePageTitle`
- `navSingle`

#### 获取频道或联动内容详情

```http
GET /home/content-detail?id=xxx
```

返回指定 ID 对应的 `HomeDecoration`。

未找到时返回空内容，不返回接口错误：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "请求的 id",
    "name": "",
    "scene": "empty",
    "components": []
  }
}
```

### 后端数据返回规则

- 后端只返回 `status = 1` 的配置和组件。
- `components` 必须按 `sort_no` 升序返回。
- 返回给小程序的字段使用驼峰：`templateId`、`templateName`。
- 数据库存储可以使用下划线：`template_id`、`template_name`。
- `home_component.info` 原样返回到组件的 `info` 字段。
- 后端保存时校验 `template_id` 是否在当前 9 种组件枚举内。
- 后端保存时校验 `scene` 是否在 `homePage / firstScreen / content / empty` 内。
- 当前后端数据库字段在 Prisma 中使用 `sortNo`、`templateId`、`templateName`，实际表字段通过映射落到 `sort_no`、`template_id`、`template_name`。

### 后台管理项目开发目标

后台管理项目负责让运营或管理员通过表单维护首页配置。

后台第一阶段必须完成：

1. 首页配置列表。
2. 首页配置新增和编辑。
3. 配置下的组件列表。
4. 组件新增和编辑。
5. 组件排序。
6. 配置启停。
7. 组件启停。
8. 按组件类型展示不同表单字段。
9. 保存时调用后端接口，让后端落库和校验。

后台不需要做：

- 不做拖拽装修器。
- 不做实时小程序模拟预览。
- 不做复杂版本发布流程。
- 不做商品、品牌、购物车、活动弹窗等业务配置。
- 不直接改小程序代码。

### 后台和后端的职责边界

| 事项 | 后台项目 | 后端项目 |
| --- | --- | --- |
| 页面表单 | 负责 | 不负责 |
| 字段展示和交互 | 负责 | 不负责 |
| 数据落库 | 不负责 | 负责 |
| 枚举校验 | 可前置提示 | 必须兜底校验 |
| 图片必填校验 | 可前置提示 | 必须兜底校验 |
| 组件排序 | 提交排序值 | 按排序值保存和返回 |
| 启停状态 | 提交状态 | 过滤停用数据 |
| 返回小程序结构 | 不负责 | 负责 |

### 后台对接后端建议接口

后台管理接口按当前 `nestjs-prisma` 后端真实契约对接。读取使用 `GET`，新增、修改、启停、排序等写操作统一使用 `POST`，不使用 `PUT`、`PATCH`、`DELETE`。

```http
GET  /home/decorations/list
GET  /home/decorations/detail?id=mock-home
POST /home/decorations/create
POST /home/decorations/update
POST /home/decorations/status

GET  /home/components/list?decorationId=mock-home
POST /home/components/create
POST /home/components/update
POST /home/components/status
POST /home/components/sort
```

说明：

- 小程序端接口和后台管理接口可以分开。
- 小程序端接口只返回已启用数据。
- 后台管理接口需要能看到启用和停用数据，方便编辑。
- 当前阶段后台管理接口未加按钮权限限制，后续接入菜单和权限 seed 后再补 `@Permissions`。

### 后端项目 AI 开发提示词

在后端项目中可直接使用以下提示词：

```text
请先阅读 docs/superpowers/plans/home-config-backend-plan.md。当前小程序首页已经实现，源码契约来自 uniapp-vue3-ts 项目的 src/api/home.ts、src/pages/index/index.vue、src/pages/index/navSingle.vue、src/pages/index/components/homeBlocks.vue、src/pages/index/components/navLinkage.vue 和 src/pages/index/utils/homeJump.ts。

当前 nestjs-prisma 后端已经实现首页配置后端化：home_decoration 和 home_component 数据模型、GET /home/config、GET /home/content-detail?id=xxx，以及后台管理用的 /home/decorations/* 和 /home/components/* 接口。返回结构沿用后端统一的 { code, message, data }，小程序和后台管理系统消费 data。第一版只做公共首页装修，不做商品、品牌、购物车、活动弹窗，不把每个组件拆成独立业务表。

后续如果继续开发，请先核对当前后端的 Prisma schema、HomeModule、接口响应格式、迁移状态和测试方式，再做最小改动。
```

### 后台项目 AI 开发提示词

在后台管理项目中可直接使用以下提示词：

```text
请先阅读 docs/superpowers/plans/home-config-backend-plan.md。当前小程序首页已经实现，后台第一版只需要做表单式配置，不做拖拽装修器和实时预览。

你的任务是实现首页配置后台管理：配置列表、配置新增编辑、组件列表、组件新增编辑、组件排序、配置启停、组件启停。组件类型固定为 homePageTitle、navSingle、advert、notice、cube、typeList、divider、search、navLinkage。每种组件的表单字段、交互要求和保存校验以文档中的“组件表单字段设计”为准。

编码前先分析当前后台项目的路由、菜单、请求封装、表单组件、表格组件和权限风格，再按项目现有风格做最小改动。不要新增未要求的复杂装修能力。
```

### 跨项目开发顺序

建议顺序：

1. 后端先建表和迁移。当前已完成。
2. 后端完成小程序读取接口。当前已完成。
3. 后端完成后台管理接口。当前已完成基础版本。
4. 小程序把 `src/api/home.ts` 从 mock 切换到真实接口。
5. 后台实现配置列表和配置编辑。
6. 后台实现组件表单和排序启停。
7. 如需要初始数据，再补首页配置 seed。
8. 如需要按钮权限，再补菜单、按钮、权限 seed 和后端 `@Permissions`。
9. 联调小程序、后端、后台三端数据闭环。

最小闭环验收：

- 后台新增或编辑一个 `advert` 组件。
- 后端保存到 `home_component.info`。
- 小程序请求首页或频道详情后能看到该轮播图。
- 后台停用该组件后，小程序接口不再返回它。
- 后台调整组件排序后，小程序展示顺序同步变化。

## 需求方向一：后台管理系统配置

### 后台配置方式

第一版采用表单式配置页面。

后台不做拖拽式可视化装修器，不做实时页面预览，也不把每个组件拆成复杂的独立业务模块。后台以“首页配置 + 组件列表 + 组件表单”的方式维护数据。

### 后台核心页面

#### 首页配置列表

用于管理不同首页配置或频道配置。

基础字段：

- 配置名称。
- 场景类型。
- 状态。
- 排序。
- 更新时间。
- 操作入口。

支持操作：

- 新增配置。
- 编辑配置。
- 启用或停用配置。
- 查看配置下的组件列表。

#### 首页配置编辑页

用于维护单个 `HomeDecoration`。

基础字段：

- 配置 ID。
- 配置名称。
- 场景类型。
- 备注。
- 状态。

组件区域：

- 展示当前配置下的组件列表。
- 支持新增组件。
- 支持编辑组件。
- 支持调整组件顺序。
- 支持启用或停用组件。

#### 组件配置表单

每个组件根据 `templateId` 展示对应字段表单。

第一版组件范围：

- `homePageTitle` 首页头部。
- `navSingle` 一级导航。
- `advert` 轮播广告。
- `notice` 公告。
- `cube` 图片魔方。
- `typeList` 分类入口。
- `divider` 分割占位。
- `search` 独立搜索块。
- `navLinkage` 二级联动导航。

后台保存时，组件公共字段进入组件表，组件差异字段进入 `info` JSON。

### 组件表单字段设计

后台新增或编辑组件时，先填写组件公共字段，再根据组件类型展示对应业务字段。

公共字段：

- 组件名称。
- 组件类型。
- 状态。
- 排序。

#### homePageTitle 首页头部表单

用途：配置小程序首页顶部区域，包括位置文案、搜索框文案、颜色和搜索滚动词。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `bgColor` | 背景色 | 否 | 顶部默认背景色。 |
| `textColor` | 文字颜色 | 否 | 位置、搜索框等文字颜色。 |
| `locationText` | 位置文案 | 否 | 例如“全国”。 |
| `searchPageId` | 搜索页标识 | 否 | 点击顶部搜索时使用。 |
| `placeholder` | 搜索提示文案 | 否 | 未开启滚动词时展示。 |
| `isSearchSwiperWords` | 是否开启搜索滚动词 | 否 | 开启后使用 `rollingWords`。 |
| `rollingWords` | 搜索滚动词 | 否 | 多条文本列表。 |

交互要求：

- `isSearchSwiperWords` 关闭时，可以只填写 `placeholder`。
- `isSearchSwiperWords` 开启时，后台显示滚动词列表维护入口。
- 滚动词支持新增、删除、排序。
- 未配置颜色时，小程序按组件默认样式展示。

保存校验：

- `rollingWords` 为空时，不应强制开启搜索滚动词。
- 颜色字段如果填写，应符合颜色格式。

#### navSingle 一级导航表单

用途：配置首页一级导航及每个导航项的点击行为。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `bgColor` | 背景色 | 否 | 一级导航背景色。 |
| `textColor` | 默认文字颜色 | 否 | 未选中导航文字颜色。 |
| `activeColor` | 选中文字颜色 | 否 | 当前选中导航文字和下划线颜色。 |
| `categoryUrl` | 分类入口跳转地址 | 否 | 右侧“分类”入口使用。 |
| `list` | 导航项列表 | 是 | 至少一项。 |

导航项字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `id` | 导航项 ID | 是 | 用于前端识别当前项。 |
| `name` | 导航名称 | 是 | 小程序展示的导航文字。 |
| `clickType` | 点击类型 | 是 | `0` 表示加载内容，`1` 表示直接跳转。 |
| `param.id` | 内容配置 ID | 条件必填 | `clickType = 0` 时必填。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |

交互要求：

- 导航项支持新增、删除、排序。
- `clickType = 0` 时，后台优先让用户选择一个已有内容配置，保存到 `param.id`。
- `clickType = 1` 时，后台展示跳转配置字段。
- 导航项顺序就是小程序一级导航展示顺序。

保存校验：

- `list` 至少保留一项。
- 每个导航项必须有 `id` 和 `name`。
- `clickType = 0` 时，`param.id` 必须有值。
- `clickType = 1` 时，`url / path / uri` 至少填写一个。
- 颜色字段如果填写，应符合颜色格式。

#### advert 轮播广告表单

用途：配置首页 banner 或普通轮播广告，支持图片、背景色、自动高度和点击跳转。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `height` | 轮播高度 | 否 | 固定高度，单位按前端当前约定处理。 |
| `autoHeight` | 是否自动高度 | 否 | 开启后小程序根据图片比例计算高度。 |
| `bkChange` | 是否联动背景色 | 否 | 开启后 banner 切换时联动顶部背景。 |
| `css` | 扩展样式 JSON | 否 | 第一版可先作为 JSON 字符串维护。 |
| `list` | 轮播项列表 | 是 | 至少一项。 |

轮播项字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `imgUrl` | 图片地址 | 是 | 小程序展示的轮播图片。 |
| `bgColor` | 背景色 | 否 | 用于背景联动或图片底色。 |
| `title` | 标题 | 否 | 后台识别或后续展示使用。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |
| `param` | 跳转参数 | 否 | 透传给跳转协议。 |

交互要求：

- 轮播项支持新增、删除、排序。
- 每个轮播项都可以单独配置跳转。
- `autoHeight` 开启时，后台仍允许填写 `height`，但小程序优先按自动高度展示。
- `bkChange` 开启时，建议每个轮播项都配置 `bgColor`。

保存校验：

- `list` 至少保留一项。
- 每个轮播项必须填写 `imgUrl`。
- `css` 如果填写，必须是合法 JSON 字符串。
- 颜色字段如果填写，应符合颜色格式。

#### notice 公告表单

用途：配置首页公告条，支持单条公告、多条滚动公告、颜色和点击跳转。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `text` | 单条公告文案 | 否 | 没有维护列表时可直接展示。 |
| `icon` | 图标地址 | 否 | 公告左侧图标图片。 |
| `iconText` | 图标文字 | 否 | 没有图标图片时可展示文字标识。 |
| `iconColor` | 图标文字颜色 | 否 | 配合 `iconText` 使用。 |
| `iconBgColor` | 图标背景色 | 否 | 配合 `iconText` 使用。 |
| `color` | 公告文字颜色 | 否 | 公告正文颜色。 |
| `bgColor` | 公告背景色 | 否 | 公告条背景色。 |
| `interval` | 滚动间隔 | 否 | 多条公告轮播间隔。 |
| `duration` | 滚动动画时长 | 否 | 多条公告切换动画时长。 |
| `list` | 公告列表 | 否 | 多条公告时使用。 |

公告项字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `text` | 公告文案 | 条件必填 | 与 `title` 至少填写一个。 |
| `title` | 公告标题 | 条件必填 | 与 `text` 至少填写一个。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |
| `param` | 跳转参数 | 否 | 透传给跳转协议。 |

交互要求：

- 公告列表支持新增、删除、排序。
- 如果维护了 `list`，小程序优先展示列表。
- 如果没有维护 `list`，小程序展示 `text`。
- 每条公告都可以单独配置跳转。

保存校验：

- `text` 和 `list` 不能同时为空。
- `list` 中每一项的 `text / title` 至少填写一个。
- `interval` 和 `duration` 如果填写，应为正数。
- 颜色字段如果填写，应符合颜色格式。

#### cube 图片魔方表单

用途：配置图片魔方区域，支持多种布局、图片列表、背景色和点击跳转。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `iconType` | 魔方布局 | 是 | 决定小程序图片排列方式。 |
| `bkColor` | 背景色 | 否 | 魔方区域背景色。 |
| `isBglucency` | 背景是否透明 | 否 | 开启后背景按透明样式处理。 |
| `marginTop / marginRight / marginBottom / marginLeft` | 外边距 | 否 | 控制魔方组件外层边距，后台用滑块维护。 |
| `paddingTop / paddingRight / paddingBottom / paddingLeft` | 内边距 | 否 | 控制魔方组件内部留白，后台用滑块维护。 |
| `gap` | 图片间距 | 否 | 控制魔方图片之间的间距，后台用滑块维护。 |
| `borderRadius` | 组件圆角 | 否 | 控制魔方组件外层圆角，后台用滑块维护。 |
| `itemBorderRadius` | 图片圆角 | 否 | 控制每张魔方图片圆角，后台用滑块维护。 |
| `list` | 图片列表 | 是 | 根据布局维护对应图片。 |

布局选项：

- `TWO_ROW`
- `THREE_ROW`
- `FOUR_ROW`
- `FOUR_GRID`
- `ONE_UP_TWO_DOWN`
- `ONE_LEFT_TWO_RIGHT`
- `ONE_LEFT_RIGHT_TOP_TWO_BOTTOM`

图片项字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `id` | 图片项 ID | 否 | 后台识别用。 |
| `title` | 标题 | 否 | 后台识别或后续展示使用。 |
| `imgUrl` | 图片地址 | 是 | 小程序展示图片。 |
| `clickType` | 链接类型 | 否 | `0` 表示内容配置，`1` 表示直接跳转。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |
| `param` | 跳转参数 | 否 | 透传给跳转协议。 |

交互要求：

- 图片列表支持新增、删除、排序。
- 每个图片项都可以单独配置跳转。
- 后台根据 `iconType` 给出建议图片数量提示，但不强制限制数量。
- 运营切换布局时，不自动删除已有图片项。
- 小程序按当前布局推荐数量取 `list` 前 N 张展示，多余图片保留。

保存校验：

- `iconType` 必须是当前支持的布局枚举。
- `list` 至少保留一项。
- 每个图片项必须填写 `imgUrl`。
- 颜色字段如果填写，应符合颜色格式。

#### typeList 分类入口表单

用途：配置首页分类入口区域，支持横向多项入口、两行展示、角标和点击跳转。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `bkColor` | 背景色 | 否 | 分类区域背景色。 |
| `isBglucency` | 背景是否透明 | 否 | 开启后背景按透明样式处理。 |
| `rows` | 展示行数 | 否 | 当前建议支持 1 或 2，默认按小程序现有逻辑处理。 |
| `list` | 分类项列表 | 是 | 至少一项。 |

分类项字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `id` | 分类项 ID | 否 | 后台识别用。 |
| `title` | 标题 | 条件必填 | 与 `name / categoryName` 至少填写一个。 |
| `name` | 名称 | 条件必填 | 与 `title / categoryName` 至少填写一个。 |
| `categoryName` | 分类名称 | 条件必填 | 与 `title / name` 至少填写一个。 |
| `imgUrl` | 图片地址 | 条件必填 | 与其他图片字段至少填写一个。 |
| `image` | 图片地址 | 条件必填 | 兼容字段。 |
| `icon` | 图标地址 | 条件必填 | 兼容字段。 |
| `pic` | 图片地址 | 条件必填 | 兼容字段。 |
| `badgeIcon` | 角标图片 | 否 | 分类项角标。 |
| `badgePosition` | 角标位置 | 否 | 配合角标展示。 |
| `cornerMarkImg` | 角标图片 | 否 | 兼容旧字段。 |
| `cornerMarkUseShow` | 角标配置 | 否 | 兼容旧字段。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |
| `param` | 跳转参数 | 否 | 透传给跳转协议。 |

交互要求：

- 分类项支持新增、删除、排序。
- 每个分类项都可以单独配置跳转。
- 后台展示时优先使用一个主标题字段，兼容字段主要用于落库和接口返回。
- 角标字段第一版只做配置保存和回显，不做复杂规则。

保存校验：

- `list` 至少保留一项。
- 每个分类项至少有一个可展示名称。
- 每个分类项至少有一个可用图片字段。
- `rows` 如果填写，只允许保存当前小程序支持的行数。
- 颜色字段如果填写，应符合颜色格式。

#### divider 分割占位表单

用途：配置首页内容之间的空白分割区域。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `lineHeight` | 分割高度 | 否 | 控制分割占位高度。 |

交互要求：

- 后台只需要展示一个高度输入项。
- 未填写高度时，小程序使用默认分割高度。

保存校验：

- `lineHeight` 如果填写，应为非负数。

#### search 独立搜索块表单

用途：配置首页内容区的独立搜索块，与顶部搜索不同，它作为普通装修组件出现在内容流中。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `icon` | 搜索图标 | 否 | 搜索框左侧图标。 |
| `placeholder` | 搜索提示文案 | 否 | 搜索框默认提示。 |
| `defaultSearch` | 默认搜索词 | 否 | 点击搜索时可作为默认关键词。 |
| `buttonText` | 按钮文案 | 否 | 搜索按钮展示文案。 |
| `searchPageId` | 搜索页标识 | 否 | 点击搜索时使用。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |
| `param` | 跳转参数 | 否 | 透传给跳转协议。 |

交互要求：

- 搜索块可以只配置展示文案，不强制配置跳转。
- 如果配置了 `url / path / uri`，点击时按跳转协议执行。
- 如果没有配置跳转，小程序按当前逻辑抛出搜索事件。

保存校验：

- 跳转字段不是必填。
- 如果同时填写 `url / path / uri`，小程序按现有跳转优先级处理。

#### navLinkage 二级联动导航表单

用途：配置二级联动导航，支持一级分类、二级分类，以及二级分类对应内容配置或跳转。

表单字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `list` | 一级分类列表 | 是 | 至少一项。 |

一级分类字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `id` | 分类 ID | 否 | 后台识别用。 |
| `name` | 分类名称 | 是 | 小程序左侧或顶部分类展示名称。 |
| `clickType` | 点击类型 | 否 | 有子级时通常不配置。 |
| `param.id` | 内容配置 ID | 条件必填 | `clickType = 0` 且无子级时使用。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |
| `children` | 二级分类列表 | 否 | 当前分类下的二级项。 |

二级分类字段：

| 字段 | 表单项 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `id` | 二级分类 ID | 否 | 后台识别用。 |
| `name` | 二级分类名称 | 是 | 小程序展示名称。 |
| `clickType` | 点击类型 | 是 | `0` 表示加载内容，`1` 表示直接跳转。 |
| `param.id` | 内容配置 ID | 条件必填 | `clickType = 0` 时必填。 |
| `url` | 跳转 URL | 否 | 跳转协议字段之一。 |
| `path` | 小程序页面路径 | 否 | 跳转协议字段之一。 |
| `uri` | 业务 URI | 否 | 跳转协议字段之一。 |
| `uriType` | URI 类型 | 否 | 配合 `uri` 和 `param` 使用。 |

交互要求：

- 一级分类支持新增、删除、排序。
- 每个一级分类下可以维护二级分类列表。
- 二级分类支持新增、删除、排序。
- `clickType = 0` 时，后台优先让用户选择一个已有内容配置，保存到 `param.id`。
- `clickType = 1` 时，后台展示跳转配置字段。
- 第一版不做无限层级，只维护到二级分类。

保存校验：

- `list` 至少保留一项。
- 每个一级分类必须填写 `name`。
- 每个二级分类必须填写 `name` 和 `clickType`。
- `clickType = 0` 时，`param.id` 必须有值。
- `clickType = 1` 时，`url / path / uri` 至少填写一个。
- 不允许保存超过二级的嵌套结构。

### 后台页面草图

草图只表达第一版后台的信息结构，不代表最终 UI 样式。

#### 草图一：首页配置列表

```text
┌──────────────────────────────────────────────────────────────┐
│ 首页配置管理                                      [新增配置] │
├──────────────────────────────────────────────────────────────┤
│ 搜索：配置名称 [__________]  场景 [全部 v]  状态 [全部 v] [查询] │
├──────────────────────────────────────────────────────────────┤
│ 配置名称        场景          状态      排序    更新时间       操作 │
│ 首页主配置      homePage      启用      0       2026-07-17   编辑 组件 停用 │
│ 推荐频道        firstScreen   启用      10      2026-07-17   编辑 组件 停用 │
│ 咖啡联动内容    content       启用      20      2026-07-17   编辑 组件 停用 │
└──────────────────────────────────────────────────────────────┘
```

页面说明：

- 列表用于管理首页主配置、一级导航频道内容、二级联动内容。
- “组件”进入当前配置的组件列表。
- 停用后的配置不返回给小程序。

#### 草图二：首页配置编辑页

```text
┌──────────────────────────────────────────────────────────────┐
│ 首页配置编辑                                      [保存] [返回] │
├──────────────────────────────────────────────────────────────┤
│ 配置 ID   [mock-home________________]                         │
│ 配置名称  [首页主配置______________]                           │
│ 场景类型  [homePage v]                                         │
│ 状态      (● 启用  ○ 停用)                                     │
│ 备注      [______________________________________________]     │
├──────────────────────────────────────────────────────────────┤
│ 组件列表                                          [新增组件] │
│ 顺序  组件名称      组件类型          状态      操作          │
│ 1     首页头部      homePageTitle     启用      编辑 上移 下移 停用 │
│ 2     一级导航      navSingle         启用      编辑 上移 下移 停用 │
└──────────────────────────────────────────────────────────────┘
```

页面说明：

- 上半部分维护 `HomeDecoration` 公共信息。
- 下半部分维护当前配置下的 `HomeComponent`。
- 组件顺序决定小程序展示顺序。

#### 草图三：组件配置表单

```text
┌──────────────────────────────────────────────────────────────┐
│ 组件配置                                          [保存] [取消] │
├──────────────────────────────────────────────────────────────┤
│ 组件名称    [首页轮播________________]                         │
│ 组件类型    [advert v]                                         │
│ 状态        (● 启用  ○ 停用)                                   │
│ 排序        [10____]                                           │
├──────────────────────────────────────────────────────────────┤
│ 组件字段                                                       │
│ 高度        [320___]                                           │
│ 自动高度    [ ]                                                │
│ 背景联动    [x]                                                │
│ 轮播项列表                                                     │
│   图片地址 [________________________] 背景色 [#f5f7ff] [删除] │
│   图片地址 [________________________] 背景色 [#ffffff] [删除] │
│                                             [新增轮播项]       │
├──────────────────────────────────────────────────────────────┤
│ 跳转配置                                                       │
│ url  [________________________]                                │
│ path [________________________]                                │
│ uri  [________________________]                                │
└──────────────────────────────────────────────────────────────┘
```

页面说明：

- 公共字段包括组件名称、组件类型、状态和排序。
- `组件字段` 区域根据不同 `templateId` 展示不同表单。
- 列表类字段支持新增、删除和调整顺序。
- 保存后，公共字段进入组件表，差异字段合并为 `info` JSON。

### 后台第一版不做

- 不做拖拽装修器。
- 不做实时小程序模拟预览。
- 不做商品、品牌、购物车、活动弹窗配置。
- 不做每种组件的独立业务表。
- 不做复杂版本发布流程，先以保存后的启用数据为准。

### 后台验收标准

- 能新增和编辑首页配置。
- 能给一个配置新增 9 种组件中的任意一种。
- 能调整组件展示顺序。
- 能停用某个配置或某个组件。
- 无效 `templateId` 不能保存。
- `info` 必须是合法 JSON。
- 图片类组件缺少必要图片时，后台需要提示。

## 需求方向二：小程序展示

小程序继续使用当前首页组件结构。后续从 mock 切换为真实接口时，只替换 `src/api/home.ts` 的数据来源，页面和组件尽量不改。

### 小程序展示流程

1. 进入首页时，请求首页主配置。
2. 根据 `components` 顺序渲染首页头部和一级导航。
3. 点击一级导航时，如果是内容加载类型，则请求对应内容详情。
4. 内容详情返回后，根据组件 `templateId` 分发渲染。
5. 点击二级联动时，继续请求对应内容详情。
6. 点击跳转类元素时，复用当前统一跳转协议。

### 小程序接口加载规则

#### 首页初始化

小程序进入首页时，先请求首页主配置：

```http
GET /home/config
```

接口返回的 `data` 必须是 `HomeDecoration` 结构。小程序拿到配置后：

1. 找到 `homePageTitle` 组件，渲染首页头部。
2. 找到 `navSingle` 组件，渲染一级导航。
3. 如果一级导航第一项是 `clickType = 0`，自动请求 `param.id` 对应的内容详情。
4. 如果一级导航第一项是 `clickType = 1`，不自动跳转，只展示首页主配置已有内容。

#### 频道内容加载

点击一级导航时：

- `clickType = 0`：请求内容详情接口。
- `clickType = 1`：按跳转协议直接跳转。

内容详情接口：

```http
GET /home/content-detail?id=xxx
```

返回的 `components` 按接口顺序展示。频道内容可以包含 `advert / notice / cube / typeList / divider / search / navLinkage` 等组件。

#### 二级联动内容加载

`navLinkage` 组件内部点击二级分类时：

- `clickType = 0`：请求 `param.id` 对应的内容详情。
- `clickType = 1`：按跳转协议直接跳转。

二级联动加载到的内容仍然使用同一套 `HomeDecoration` 结构，小程序不额外引入新的数据模型。

### 小程序组件渲染规则

- 小程序根据 `templateId` 分发到对应组件渲染。
- 组件展示顺序以接口返回的 `components` 顺序为准。
- 小程序只渲染当前已支持的 9 种 `templateId`。
- 未识别的 `templateId` 不渲染，并建议在开发环境输出警告。
- `templateName` 仅用于后台和调试识别，不作为小程序渲染逻辑判断依据。
- 组件的差异字段统一从 `info` 读取。
- 缺少非关键字段时，组件使用自身默认值。
- 缺少关键字段时，该组件不展示，避免页面局部报错影响整个首页。

### 小程序状态处理规则

#### 空状态

以下情况按空内容处理：

- 内容详情接口未找到对应 `id`。
- 接口返回 `scene = empty`。
- 接口返回 `components = []`。
- 当前频道下所有组件都无法渲染。

空状态只影响当前内容区域，不影响首页头部和一级导航。

#### 异常状态

以下情况按异常处理：

- 首页主配置接口请求失败。
- 内容详情接口请求失败。
- 接口返回结构不符合 `{ code, message, data }`。
- `data` 不是可用的 `HomeDecoration`。

处理要求：

- 首页主配置失败时，展示首页失败态或降级空态。
- 频道内容失败时，只替换当前内容区域为失败态。
- 已成功展示的头部和一级导航不因后续内容请求失败而清空。
- 用户再次点击导航时，可以重新发起内容请求。

#### 加载状态

- 首次进入首页时展示首页 loading 或骨架屏。
- 切换一级导航时，只对内容区域展示 loading。
- 切换二级联动时，只对联动内容区域展示 loading。
- loading 结束后再替换为新内容、空状态或失败态。

### 小程序跳转规则

跳转字段统一复用当前协议：

1. 优先使用 `url`。
2. 其次使用 `path`。
3. 最后使用 `uri`。

特殊规则：

- `uriType === '4'` 时，只取 `param` 中 `c_` 开头的字段。
- 生成 query 时去掉 `c_` 前缀。
- 同时存在多个跳转字段时，小程序按现有优先级处理，不由后台额外判断。
- 没有任何跳转字段时，点击不跳转。

### 小程序 status 规则

- 小程序接口原则上只接收已启用数据。
- 后端应过滤 `status = 0` 的配置和组件。
- 如果小程序意外收到停用组件，可以直接不渲染。
- 小程序不负责解释后台草稿、停用、删除等管理状态。

### 小程序展示要求

- 组件展示顺序以接口返回顺序为准。
- `status = 0` 的配置和组件不应出现在接口结果中。
- 小程序只渲染已识别的 `templateId`。
- 未找到频道内容时，展示空内容状态。
- 接口异常时，保留当前页面失败态或空态，不影响首页基础结构。
- banner 背景色联动、导航切换、二级联动、搜索、公告、图片魔方、分类入口等现有展示能力需要保持不变。

### 小程序验收标准

- 首页主配置能从后端接口返回并正常展示。
- 一级导航可切换频道内容。
- 二级联动可加载子内容。
- 当前 9 种组件都至少有一条后端数据可渲染。
- 前端页面组件不需要因为接后端而重写渲染逻辑。

## 需求方向三：数据设计

数据设计以当前前端可消费为第一约束，不先追求复杂可扩展模型。

### 数据设计原则

- 保持 `HomeDecoration -> HomeComponent[] -> info` 结构。
- 公共字段结构化存储。
- 组件差异字段统一放入 `info` JSON。
- 第一版只做公共首页装修，不混入业务商品模型。
- 后端保存时做必要校验，避免小程序收到无法渲染的数据。

### 核心数据对象

`HomeDecoration` 表示一个首页配置或频道内容配置。

`HomeComponent` 表示配置下的一个装修组件。

`info` 表示不同组件自己的配置字段。

后续表结构、接口结构和校验规则继续沿用下文技术契约。

## 目标

把当前 `src/api/home.ts` 中的本地 mock 首页配置，整理成后端可返回、数据库可存储、前端可直接消费的数据契约。第一阶段只覆盖当前已经抽取的公共首页装修能力，不扩展商品、品牌、购物车、活动弹窗等业务模块。

## 前提假设

- 前端继续使用当前数据形状：`HomeDecoration -> HomeComponent[] -> info`。
- `src/api/home.ts` 先作为 mock 契约来源，后续替换为真实请求层。
- 首页主配置和频道/联动详情都使用同一种 `HomeDecoration` 结构。
- 组件差异字段先放在 JSON 中，不把每种组件拆成大量独立业务表。
- 后端需要做枚举校验和基础字段校验，避免前端收到无法识别的 `templateId`。

## 当前前端核心类型

```ts
type HomeTemplateId =
  | 'homePageTitle'
  | 'navSingle'
  | 'advert'
  | 'notice'
  | 'cube'
  | 'typeList'
  | 'divider'
  | 'search'
  | 'navLinkage'

type HomeComponent = {
  id: string
  templateId: HomeTemplateId
  templateName?: string
  info: Record<string, any>
}

type HomeDecoration = {
  id: string
  name: string
  scene: string
  components: HomeComponent[]
}
```

## scene 约定

| scene | 含义 | 当前用途 |
| --- | --- | --- |
| `homePage` | 首页主配置 | 包含 `homePageTitle` 和 `navSingle` |
| `firstScreen` | 首屏内容 | banner 颜色可联动顶部背景 |
| `content` | 普通内容 | 频道或联动子内容 |
| `empty` | 空内容 | 无组件时的空状态 |

## 组件类型和字段

### homePageTitle 首页头部

```ts
{
  bgColor?: string
  textColor?: string
  locationText?: string
  searchPageId?: string
  placeholder?: string
  isSearchSwiperWords?: boolean
  rollingWords?: string[]
}
```

### navSingle 一级导航

```ts
{
  bgColor?: string
  textColor?: string
  activeColor?: string
  categoryUrl?: string
  list: NavItem[]
}
```

```ts
type NavItem = {
  id: string
  name: string
  clickType?: '0' | '1'
  param?: { id?: string }
  url?: string
  path?: string
  uri?: string
  uriType?: string | number
}
```

`clickType === '0'` 表示加载 `param.id` 对应的 `HomeDecoration`。`clickType === '1'` 表示按跳转协议直接跳转。

### advert 轮播广告

```ts
{
  css?: string
  height?: number
  autoHeight?: boolean
  bkChange?: boolean
  list: AdvertItem[]
}
```

```ts
type AdvertItem = {
  imgUrl: string
  bgColor?: string
  title?: string
  url?: string
  path?: string
  uri?: string
  uriType?: string | number
  param?: Record<string, any>
}
```

`css` 当前是 JSON 字符串，示例：`{"duration":3000,"isFillet":true}`。后端可以先按字符串返回，后续如果要增强后台表单，再调整为对象并同步前端解析。

### notice 公告

```ts
{
  text?: string
  icon?: string
  iconText?: string
  iconColor?: string
  iconBgColor?: string
  color?: string
  bgColor?: string
  interval?: number
  duration?: number
  list?: Array<string | NoticeItem>
}
```

```ts
type NoticeItem = {
  text?: string
  title?: string
  url?: string
  path?: string
  uri?: string
  uriType?: string | number
  param?: Record<string, any>
}
```

### cube 图片魔方

```ts
{
  iconType:
    | 'TWO_ROW'
    | 'THREE_ROW'
    | 'FOUR_ROW'
    | 'FOUR_GRID'
    | 'ONE_UP_TWO_DOWN'
    | 'ONE_LEFT_TWO_RIGHT'
    | 'ONE_LEFT_RIGHT_TOP_TWO_BOTTOM'
  sizeUnit?: 'rpx'
  bkColor?: string
  isBglucency?: boolean
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  gap?: number
  borderRadius?: number
  itemBorderRadius?: number
  list: CubeItem[]
}
```

```ts
type CubeItem = {
  id?: string
  title?: string
  imgUrl: string
  clickType?: '0' | '1'
  url?: string
  path?: string
  uri?: string
  uriType?: string | number
  param?: Record<string, any>
}
```

### typeList 分类入口

```ts
{
  bkColor?: string
  isBglucency?: boolean
  rows?: number
  list: TypeItem[]
}
```

```ts
type TypeItem = {
  id?: string
  title?: string
  name?: string
  categoryName?: string
  imgUrl?: string
  image?: string
  icon?: string
  pic?: string
  badgeIcon?: string
  badgePosition?: string
  cornerMarkImg?: string
  cornerMarkUseShow?: {
    cornerMarkImg?: string
    position?: string
  }
  url?: string
  path?: string
  uri?: string
  uriType?: string | number
  param?: Record<string, any>
}
```

### divider 分割占位

```ts
{
  lineHeight?: number
}
```

### search 独立搜索块

```ts
{
  icon?: string
  placeholder?: string
  defaultSearch?: string
  buttonText?: string
  searchPageId?: string
  url?: string
  path?: string
  uri?: string
  uriType?: string | number
  param?: Record<string, any>
}
```

### navLinkage 二级联动导航

```ts
{
  list: LinkageItem[]
}
```

```ts
type LinkageItem = {
  id?: string
  name: string
  clickType?: '0' | '1'
  param?: { id?: string }
  url?: string
  path?: string
  uri?: string
  uriType?: string | number
  children?: LinkageItem[]
}
```

## 统一跳转字段

多个组件的列表项都可以复用同一套跳转协议：

```ts
type HomeJumpTarget = {
  url?: string
  path?: string
  uri?: string
  param?: Record<string, any>
  uriType?: string | number
}
```

优先级：

1. `url`
2. `path`
3. `uri`

特殊规则：`uriType === '4'` 时，只取 `param` 中 `c_` 开头的字段，并去掉 `c_` 作为 query key。例如 `{ c_source: 'home' }` 会变成 `source=home`。

## 后端接口设计

当前后端项目是 `nestjs-prisma`，没有全局 `/api` 前缀。接口外层由全局 `ResponseInterceptor` 统一包装为 `{ code, message, data }`。

### 获取首页主配置

```http
GET /home/config
```

返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "mock-home",
    "name": "首页",
    "scene": "homePage",
    "components": []
  }
}
```

### 获取频道或联动详情

```http
GET /home/content-detail?id=home-recommend
```

返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "home-recommend",
    "name": "推荐",
    "scene": "firstScreen",
    "components": []
  }
}
```

未找到时不返回接口错误，返回空内容：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "请求的 id",
    "name": "",
    "scene": "empty",
    "components": []
  }
}
```

### 后台管理接口

后台管理系统对接以下接口。读取使用 `GET`，新增、修改、启停、排序统一使用 `POST`。

```http
GET  /home/decorations/list
GET  /home/decorations/detail?id=mock-home
POST /home/decorations/create
POST /home/decorations/update
POST /home/decorations/status

GET  /home/components/list?decorationId=mock-home
POST /home/components/create
POST /home/components/update
POST /home/components/status
POST /home/components/sort
```

当前阶段后台管理接口不要求按钮权限。后续如果后台菜单、按钮和权限 seed 确认，再给这些接口补 `@Permissions`。

## 推荐表结构

当前后端实际使用 Prisma 5 + PostgreSQL。下列表结构对应 `prisma/schema.prisma` 和 migration `20260717000000_add_home_config`。

### 首页配置主表

```sql
CREATE TABLE "home_decoration" (
  "id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "scene" VARCHAR(32) NOT NULL,
  "status" INTEGER NOT NULL DEFAULT 1,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "remark" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "home_decoration_pkey" PRIMARY KEY ("id")
);
```

### 首页组件表

```sql
CREATE TABLE "home_component" (
  "id" VARCHAR(64) NOT NULL,
  "decoration_id" VARCHAR(64) NOT NULL,
  "template_id" VARCHAR(32) NOT NULL,
  "template_name" VARCHAR(100),
  "info" JSONB NOT NULL,
  "sort_no" INTEGER NOT NULL DEFAULT 0,
  "status" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "home_component_pkey" PRIMARY KEY ("id")
);
```

关系说明：

- `home_decoration.id = mock-home` 表示首页主配置。
- `home_decoration.id = home-recommend` 表示推荐频道内容。
- `home_decoration.id = linkage-coffee` 表示二级联动下的咖啡内容。
- `home_component.decoration_id` 指向所属配置。
- `home_component.template_id` 对应前端 `templateId`。
- `home_component.info` 存放组件差异化 JSON 配置。
- `home_component.decoration_id` 外键关联 `home_decoration.id`，删除配置时级联删除组件。

## 后端校验规则

- `template_id` 只能是当前 9 种组件类型。
- `scene` 只能是 `homePage / firstScreen / content / empty`。
- `components` 按 `sort_no` 升序返回。
- `status = 0` 的配置和组件不返回给前端。
- `navSingle` 和 `navLinkage` 中 `clickType === '0'` 的项，应保证 `param.id` 有值。
- `advert / cube / typeList` 中需要展示图片的项，应保证至少有一个可用图片字段。
- `info` 字段必须是合法 JSON。

## 实施计划

### 步骤 1：后端数据模型和迁移

状态：已完成。

后端已新增 `home_decoration`、`home_component` 两张表，并完成 Prisma Client 生成和 migration 应用。

验证标准：

- `npm.cmd run prisma:generate` 通过。
- `npx.cmd tsc --noEmit` 通过。
- `npm.cmd run migrate:status` 显示数据库 schema 已是最新。

### 步骤 2：后端公开读取接口

状态：已完成。

后端已提供：

- `GET /home/config`
- `GET /home/content-detail?id=xxx`

验证标准：

- 接口无需登录即可访问。
- 返回结构为 `{ code, message, data }`。
- `data` 满足 `HomeDecoration`。
- 未找到 `id` 时返回 `scene: 'empty', components: []`。
- `status = 0` 的配置和组件不出现在公开读取结果中。
- 组件按 `sort_no` 升序返回。

### 步骤 3：后端后台管理接口

状态：已完成基础版本。

后端已提供配置和组件的列表、详情、新增、编辑、启停和排序接口。当前阶段不加 `@Permissions`，等后台菜单和权限初始化确认后再补。

验证标准：

- 后台可通过接口创建和编辑 `HomeDecoration`。
- 后台可通过接口创建和编辑 `HomeComponent`。
- 无效 `templateId` 不能保存。
- 无效 `scene` 不能保存。
- `info` 必须是 JSON 对象。

### 步骤 4：小程序从 mock 切换到接口

状态：待小程序项目处理。

目标：只替换 `src/api/home.ts` 的数据来源，不改页面组件。

建议改动：

- `getHomeConfig()` 改为请求 `/home/config`。
- `getHomeContentDetail(id)` 改为请求 `/home/content-detail?id=${id}`。
- 保留现有类型导出，页面层不用感知数据来源变化。
- 如果小程序请求封装统一配置了后端代理前缀，应由请求封装或代理处理，不在本文档接口路径里额外写 `/api`。

验证标准：

- 首页顶部、一级导航、频道内容正常显示。
- 点击一级导航能加载对应内容。
- 点击二级联动能加载子内容。
- banner 背景色联动仍正常。
- 搜索、公告、图片魔方、分类入口、分割占位正常渲染。

### 步骤 5：后台管理系统表单化

状态：待后台管理项目处理。

目标：后台管理系统按本文档的组件字段和当前后端接口实现表单录入能力。

建议：

- 第一版后台按组件类型展示不同表单字段。
- 不做拖拽装修器。
- 不做实时小程序模拟预览。
- 不要第一版就把每个组件拆成独立业务表。
- 保存时调用当前后端 `/home/decorations/*` 和 `/home/components/*` 接口。

验证标准：

- 后台保存后，小程序公开接口返回结构不变。
- 无效 `templateId` 不能保存。
- 无效 JSON 不能保存。
- 图片类组件缺少图片时给出后台校验提示。

### 步骤 6：后续初始化数据和权限

状态：待确认。

当前阶段没有做首页配置 seed，也没有给后台管理接口加按钮权限。后续如果需要，应单独补：

- 首页配置初始 seed。
- 后台菜单 seed。
- 后台按钮和权限 seed。
- 后端管理接口 `@Permissions`。

## 不在本阶段处理

- 商品列表、品牌列表、购物车、活动弹窗。
- 同城配送、供应商搜索、京东/爱库存等业务路由。
- 可视化拖拽装修器。
- 对每种组件建立独立强业务表。

## 最小验收清单

- 首页主配置能从后端返回。
- 一级导航可切换频道内容。
- 二级联动可加载子内容。
- 当前 9 种组件都至少有一条后端数据可渲染。
- 前端组件不需要因为接后端而改动渲染逻辑。
- 现有首页相关测试和 lint 通过。
