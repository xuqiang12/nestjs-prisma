# AI 对话与知识库问答前端实施计划

## 目标

在 `vue-element-admin-dev` 前端项目中，把当前占位的 AI 模块升级为可用页面：

- `src/views/AIEngine/chat/index.vue`：AI 对话工作台，包含会话列表、普通聊天、知识库问答、流式回复和引用来源展示。
- `src/views/AIEngine/knowledge/index.vue`：知识库管理页面，包含知识列表、搜索、新增、上传、删除、重向量化和相似检索。

本计划只规划前端实现，不修改后端代码。后端已提供统一会话与聊天模式能力，前端按该契约消费。

## 当前现状

- `src/views/AIEngine/chat/index.vue` 当前只有页面外壳和标题“AI对话”。
- `src/views/AIEngine/knowledge/index.vue` 当前只有页面外壳和标题“知识库管理”。
- `doc/code/AIEngine/chat.md` 和 `doc/code/AIEngine/knowledge.md` 已记录当前占位页面状态，开发完成后需要同步更新。
- 前端项目使用 Vue 2.6、Vue Router 3、Vuex 3、Element UI、axios、SCSS、common-utils-kit。
- 表格、表单、弹窗优先使用 `common-utils-kit/element` 中的 `ElementTable`、`ElementForm`、`ResetDialog`。
- 搜索区优先参考 `src/components/BaseCom/search/index.vue`。
- 分页优先使用 `src/components/BaseCom/page/index.vue`。

## 前置确认

### 菜单路径必须统一

当前前端真实页面路径是：

```text
src/views/AIEngine/chat/index.vue
src/views/AIEngine/knowledge/index.vue
```

因此后端菜单建议保持：

```text
path: /AIEngine/chat/index
component: /AIEngine/chat/index

path: /AIEngine/knowledge/index
component: /AIEngine/knowledge/index
```

如果后端菜单使用 `/ai/chat/index`、`/ai/knowledge/index`，前端动态路由会找不到现有页面。实施前必须先确认后端菜单最终路径；推荐以后端菜单改回 `AIEngine`，前端不新增平行目录。

## 后端接口契约

### 会话接口

```text
GET  /knowledge-bot/conversation/list
POST /knowledge-bot/conversation/create
GET  /knowledge-bot/conversation/detail
POST /knowledge-bot/conversation/rename
POST /knowledge-bot/conversation/delete
```

会话模式：

```text
chat      普通聊天
knowledge 知识库问答
```

### 对话接口

```text
POST /knowledge-bot/chat
POST /knowledge-bot/chat/stream
```

普通 JSON 请求参数：

```js
{
  conversationId: "会话ID，可不传",
  mode: "chat 或 knowledge",
  message: "用户输入"
}
```

普通 JSON 返回核心字段：

```js
{
  conversationId: "会话ID",
  mode: "chat 或 knowledge",
  answer: "AI回复",
  route: "chat 或 knowledge",
  sources: []
}
```

流式接口返回 SSE 行：

```text
data: {"type":"content","content":"分段文本"}
data: {"type":"sources","sources":[...]}
data: [DONE]
```

### 知识库接口

```text
GET  /knowledge-bot/knowledge/list
POST /knowledge-bot/knowledge
POST /knowledge-bot/knowledge/upload
POST /knowledge-bot/knowledge/delete
POST /knowledge-bot/knowledge/revector
GET  /knowledge-bot/knowledge/search
```

## 页面一：AI 对话工作台

### 页面布局

`src/views/AIEngine/chat/index.vue` 使用左右分栏：

```text
page-container
└── page-card chat-layout
    ├── conversation-sidebar
    │   ├── 新建普通对话
    │   ├── 新建知识库问答
    │   ├── 会话模式筛选：全部 / 普通 / 知识库
    │   └── 会话列表
    └── chat-main
        ├── chat-header：标题、模式标签、重命名、删除
        ├── message-list：用户消息、AI消息、引用来源
        └── chat-input：输入框、发送按钮
```

### 状态字段

```js
data() {
  return {
    // 会话列表查询条件
    conversationQuery: { pageNum: 1, pageSize: 20, mode: "" },
    // 左侧会话列表
    conversationList: [],
    // 当前选中的会话
    currentConversation: null,
    // 当前会话消息列表
    messageList: [],
    // 当前输入框内容
    inputMessage: "",
    // 当前是否正在流式回复
    sending: false,
    // 会话列表加载状态
    conversationLoading: false,
    // 消息详情加载状态
    messageLoading: false,
    // 重命名弹窗是否展示
    renameDialogVisible: false,
    // 重命名表单
    renameForm: { id: "", title: "" }
  };
}
```

### 核心交互

1. 进入页面后请求会话列表。
2. 点击“新建普通对话”调用 `createConversation({ mode: "chat", title: "新会话" })`。
3. 点击“新建知识库问答”调用 `createConversation({ mode: "knowledge", title: "新会话" })`。
4. 点击左侧会话项调用 `getConversationDetail({ id })`，回填 `currentConversation` 和 `messageList`。
5. 点击发送时，如果没有当前会话，先按默认 `knowledge` 创建会话；如果有当前会话，使用当前会话的 `mode`。
6. 发送时先把用户消息插入 `messageList`，再插入一条空的 assistant 消息。
7. 读取 `streamChat` 的 SSE 内容，`type=content` 时追加到当前 assistant 消息。
8. 收到 `type=sources` 时写入当前 assistant 消息的 `sources`。
9. 收到 `[DONE]` 后结束 loading，并刷新会话列表以更新标题和更新时间。
10. 删除会话时使用 `this.$kit.confirm.customConfirm` 二次确认，确认后调用删除接口并清空右侧会话。

### 消息展示规则

- `role === "user"` 靠右展示。
- `role === "assistant"` 靠左展示。
- 普通聊天不展示引用来源。
- 知识库问答如果 `sources` 有值，在 AI 回复下方展示“引用来源”，默认折叠。
- 引用来源展示 `metadata.fileName`、`content`、`distance`；字段为空时只做 `null` / `undefined` 兜底，不擅自改接口数据。

### 流式请求实现要求

普通 axios 响应不适合消费 fetch reader 流。`src/api/ai.js` 中需要为 `streamChat` 单独使用 `fetch`，但必须沿用当前 token 获取方式和 `VUE_APP_BASE_API` 前缀。

实现时必须先检查当前 `src/utils/request.js` 的 token header 名称，不能猜测。`fetch` 请求头要和普通请求保持一致。

## 页面二：知识库管理

### 页面布局

`src/views/AIEngine/knowledge/index.vue` 使用后台列表页结构：

```text
page-container
└── page-card
    ├── SearchIndex：关键词搜索
    ├── table-wrapper：ElementTable
    ├── page：分页
    ├── ResetDialog：新增知识
    ├── ResetDialog：上传文件
    └── ResetDialog：相似检索结果
```

### 表格列

```js
columns: [
  { label: "内容摘要", param: "content" },
  { label: "元数据", param: "metadata" },
  { label: "创建时间", param: "createdAt" },
  {
    label: "操作",
    param: [
      { lable: "检索", flag: "search" },
      { lable: "重向量", flag: "revector" },
      { lable: "删除", flag: "delete" }
    ],
    type: "button",
    tooltip: false
  }
]
```

### 状态字段

```js
data() {
  return {
    // 知识库搜索条件
    searchParams: { pageNum: 1, pageSize: 10, query: "" },
    // 知识库表格数据
    tableData: [],
    // 知识库分页状态
    page: { currentPage: 1, pageSize: 10, total: 0 },
    // 新增知识弹窗状态
    knowledgeDialogVisible: false,
    // 上传文件弹窗状态
    uploadDialogVisible: false,
    // 相似检索结果弹窗状态
    searchResultDialogVisible: false,
    // 新增知识表单
    knowledgeForm: { content: "", metadataText: "" },
    // 上传知识文件表单
    uploadForm: { file: null, metadataText: "" },
    // 相似检索结果
    searchResultList: [],
    // 提交 loading
    submitLoading: false
  };
}
```

### 核心交互

1. 进入页面后调用 `getKnowledgeList({ pageNum, pageSize })`。
2. 搜索区输入关键词后，如果后端列表接口不支持关键词过滤，搜索按钮调用 `searchKnowledge({ query, limit })` 并展示检索结果弹窗；列表仍由 `getKnowledgeList` 维护。
3. 新增知识调用 `createKnowledge({ content, metadata })`。
4. 上传文件使用 `FormData`，字段名为 `file` 和 `metadata`。
5. 删除知识使用 `this.$kit.confirm.customConfirm` 二次确认，确认后调用 `deleteKnowledge({ id })`。
6. 重向量化调用 `revectorKnowledge({ id })`，成功后提示并刷新列表。
7. `metadataText` 提交前必须是合法 JSON；如果为空，则不传 `metadata`。

## API 文件规划

新增：

```text
src/api/ai.js
```

接口方法按文件最下方一行新增，保持当前项目 API 习惯：

```js
import request from "@/utils/request";

const baseApi = process.env.VUE_APP_BASE_API;

export const getConversationList = params => request.get(`${baseApi}/knowledge-bot/conversation/list`, params);
export const createConversation = data => request.post(`${baseApi}/knowledge-bot/conversation/create`, data);
export const getConversationDetail = params => request.get(`${baseApi}/knowledge-bot/conversation/detail`, params);
export const renameConversation = data => request.post(`${baseApi}/knowledge-bot/conversation/rename`, data);
export const deleteConversation = data => request.post(`${baseApi}/knowledge-bot/conversation/delete`, data);
export const sendChat = data => request.post(`${baseApi}/knowledge-bot/chat`, data);
export const getKnowledgeList = params => request.get(`${baseApi}/knowledge-bot/knowledge/list`, params);
export const createKnowledge = data => request.post(`${baseApi}/knowledge-bot/knowledge`, data);
export const uploadKnowledge = data => request.post(`${baseApi}/knowledge-bot/knowledge/upload`, data, { type: "multipart/form-data" });
export const deleteKnowledge = data => request.post(`${baseApi}/knowledge-bot/knowledge/delete`, data);
export const revectorKnowledge = data => request.post(`${baseApi}/knowledge-bot/knowledge/revector`, data);
export const searchKnowledge = params => request.get(`${baseApi}/knowledge-bot/knowledge/search`, params);
```

`streamChat` 不在上面直接定死实现，实施前必须先检查当前 token 存储和请求头逻辑，再用 `fetch` 单独实现。

## 执行步骤

### 阶段一：接口与路由契约确认

- [ ] 检查后端菜单返回的 AI 路由路径是否为 `/AIEngine/chat/index` 和 `/AIEngine/knowledge/index`。
- [ ] 检查 `src/utils/request.js` 的 token header 名称和 base API 拼接方式。
- [ ] 新增 `src/api/ai.js`，封装非流式接口。
- [ ] 设计并实现 `streamChat` 的 fetch 版本，保持鉴权 header 与 axios 请求一致。

验收标准：

- [ ] `src/api/ai.js` 所有方法路径、GET/POST、参数名与后端一致。
- [ ] `streamChat` 能解析 `content`、`sources`、`[DONE]` 三类 SSE 数据。
- [ ] 不新增重复 axios 实例。

### 阶段二：AI 对话页布局

- [ ] 改造 `src/views/AIEngine/chat/index.vue` 为左右分栏。
- [ ] 左侧实现“新建普通对话”“新建知识库问答”“模式筛选”“会话列表”。
- [ ] 右侧实现会话标题、模式标签、消息列表、输入区。
- [ ] 消息区和会话列表区内部滚动，页面整体保持 `height: calc(100vh - 84px)`。

验收标准：

- [ ] 页面不出现整体浏览器滚动条。
- [ ] 左侧会话列表和右侧消息列表都能独立滚动。
- [ ] 未选中会话时展示空状态。

### 阶段三：AI 对话业务联动

- [ ] 页面创建时加载会话列表。
- [ ] 点击会话后加载会话详情。
- [ ] 新建会话后自动选中新会话。
- [ ] 发送消息时使用当前会话的 `mode`。
- [ ] 普通聊天只展示消息内容。
- [ ] 知识库问答展示引用来源。
- [ ] 删除会话前使用 `$kit.confirm.customConfirm` 二次确认。
- [ ] 重命名会话使用 `ResetDialog`。

验收标准：

- [ ] 新建普通对话后发送消息，请求参数 `mode` 为 `chat`。
- [ ] 新建知识库问答后发送消息，请求参数 `mode` 为 `knowledge`。
- [ ] 流式输出时 AI 消息逐步追加内容。
- [ ] 收到 `sources` 后展示引用来源。
- [ ] 刷新页面后可以通过会话详情恢复历史消息。

### 阶段四：知识库管理页

- [ ] 改造 `src/views/AIEngine/knowledge/index.vue` 为搜索、表格、分页结构。
- [ ] 使用 `SearchIndex` 维护搜索区。
- [ ] 使用 `ElementTable` 展示知识内容。
- [ ] 使用 `page` 组件维护分页。
- [ ] 使用 `ResetDialog` + `ElementForm` 实现新增知识弹窗。
- [ ] 使用 `ResetDialog` 实现上传文件弹窗。
- [ ] 实现删除、重向量、相似检索。

验收标准：

- [ ] 列表接口能正确渲染 `list` 和 `total`。
- [ ] 新增知识成功后刷新列表。
- [ ] 上传文件使用 `FormData`，字段名为 `file`、`metadata`。
- [ ] 删除前有确认弹窗。
- [ ] 重向量成功后有提示。
- [ ] 相似检索结果不污染列表数据，单独展示。

### 阶段五：页面文档同步

- [ ] 更新 `doc/code/AIEngine/chat.md`。
- [ ] 更新 `doc/code/AIEngine/knowledge.md`。

验收标准：

- [ ] 文档记录页面功能、业务流程、字段映射、接口依赖、数据流转和提交参数。
- [ ] 文档只记录最终真实实现，不保留占位页面描述。

## 风险评估

- `streamChat` 需要使用 `fetch` 读取流，必须手动补鉴权 header；如果 header 名称和 `request.js` 不一致，会出现 401。
- 后端菜单路径如果使用 `/ai/...`，当前前端 `AIEngine` 页面不会被动态路由加载。
- 知识库列表接口当前不一定支持关键词过滤，不能把 `searchKnowledge` 的相似检索结果直接复用为列表分页数据。
- `metadataText` 必须校验 JSON；否则后端 `JSON.parse` 会报错。
- AI 流式输出中途失败时，前端应结束 loading 并保留已输出内容，但不要伪造后端未返回的完整结果。

## 验证方式

实施完成后建议按以下顺序验证：

```powershell
npx.cmd eslint src/api/ai.js src/views/AIEngine/chat/index.vue src/views/AIEngine/knowledge/index.vue
npm.cmd run build:stage
git diff --check -- src/api/ai.js src/views/AIEngine/chat/index.vue src/views/AIEngine/knowledge/index.vue doc/code/AIEngine/chat.md doc/code/AIEngine/knowledge.md
```

如果本地后端可用，再人工验证：

- [ ] 无 token 访问 AI 接口应被拦截。
- [ ] 有权限用户可以进入 AI 对话页。
- [ ] 新建普通对话、发送消息、刷新后恢复消息。
- [ ] 新建知识库问答、发送消息、展示引用来源。
- [ ] 知识库新增、上传、列表、删除、重向量、检索可用。

## 待确认事项

- 后端菜单路径是否统一为 `/AIEngine/chat/index` 和 `/AIEngine/knowledge/index`。
- AI 对话页默认新建模式是 `knowledge` 还是必须由用户点按钮选择。
- 引用来源是否只展示 `metadata.fileName`、`content`、`distance`，还是还要展示其他 metadata 字段。
- 上传知识文件是否只允许 `.txt`、`.md`，还是允许任意文本文件。
