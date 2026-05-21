src/
│
├── main.ts
│
├── ai/
│
│ ├── api/ # 🌐 接口层（Controller）
│ │ └── ai.controller.ts
│
│ ├── core/ # 🧠 核心运行时（AI大脑）
│ │ ├── ai.service.ts # 对外统一入口
│ │ ├── orchestrator.ts # 总调度器
│ │ ├── router.service.ts # 意图识别（rag/chat/agent）
│ │ ├── agent.runner.ts # 🔥 Agent循环执行器
│ │ ├── model.gateway.ts # 模型统一入口（硅基流动/OpenAI）
│ │ └── events.ts # SSE事件协议
│ │
│ ├── memory/ # 🧠 记忆系统
│ │ └── memory.service.ts # session记忆（可换Redis）
│ │
│ ├── tools/ # 🧰 工具系统（Agent能力）
│ │ ├── tool.registry.ts # 工具注册中心
│ │ ├── tool.executor.ts # 工具执行器（可选扩展）
│ │ └── search.tool.ts # 示例工具
│ │
│ ├── workflows/ # 🔧 工作流层（可选扩展能力）
│ │ ├── rag.workflow.ts
│ │ ├── chat.workflow.ts
│ │ └── tool.workflow.ts
│ │
│ ├── vector/ # 📦 向量层（RAG）
│ │ └── vector.service.ts
│ │
│ ├── runtime/ # ⚙️ 执行引擎（未来扩展）
│ │ ├── workflow.engine.ts
│ │ ├── stream.engine.ts
│ │
│ └── ai.module.ts # Nest模块入口

                ┌──────────────────────┐
                │  HTTP Request        │
                │ /ai/stream?q=xxx     │
                └─────────┬────────────┘
                          ↓
        ┌─────────────────────────────────┐
        │ ai.controller.ts (SSE入口)      │
        └─────────┬───────────────────────┘
                  ↓
        ┌─────────────────────────────────┐
        │ ai.service.ts (统一入口)        │
        └─────────┬───────────────────────┘
                  ↓
        ┌─────────────────────────────────┐
        │ orchestrator.ts (总调度器)      │
        └─────────┬───────────────────────┘
                  ↓
        ┌─────────────────────────────────┐
        │ router.service.ts (意图识别)     │
        │ rag / chat / agent              │
        └─────────┬───────────────────────┘
                  ↓
        ┌─────────────────────────────────┐
        │ agent.runner.ts (核心执行器🔥)   │
        │  ├── 读 memory                   │
        │  ├── 调 model stream            │
        │  ├── tool判断                   │
        │  ├── tool执行                   │
        │  ├── SSE事件生成               │
        └─────────┬───────────────────────┘
                  ↓
        ┌─────────────────────────────────┐
        │ model.gateway.ts (LLM请求)       │
        └─────────────────────────────────┘

                  ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

        ┌─────────────────────────────────┐
        │ SSE 推送给前端（事件流）         │
        │ token / tool / done             │
        └─────────────────────────────────┘

                  ↓
        ┌─────────────────────────────────┐
        │ memory.service.ts (写入历史)     │
        └─────────────────────────────────┘

src/
│
├── core-ai/ # 🧠 AI内核（完全独立，可单独发布npm）
│ ├── core/
│ │ ├── orchestrator.ts
│ │ ├── model.gateway.ts
│ │ ├── events.ts
│ │
│ ├── router/
│ │ ├── task.router.ts
│ │ ├── domain.router.ts
│ │
│ ├── runtime/
│ │ ├── workflow.engine.ts
│ │ ├── workflows/
│ │
│ ├── agent/
│ │ ├── agent.runner.ts
│ │ ├── planner.ts
│ │ ├── executor.ts
│ │
│ ├── memory/
│ │ ├── memory.service.ts
│ │
│ ├── tools/
│ │ ├── tool.registry.ts
│ │
│ ├── index.ts # 👈 对外统一导出AI能力
│
│
├── apps/ # 🧩 业务系统（完全独立）
│ ├── customer-app/
│ │ ├── ai/ # 只写“业务AI配置”
│ │ │ ├── agent.ts
│ │ │ ├── prompt.ts
│ │ │ ├── tools.ts
│ │ │ ├── module.ts
│ │ │
│ │ ├── service/
│ │ ├── controller/
│ │
│ ├── order-app/
│ │ ├── ai/
│ │ │ ├── agent.ts
│ │ │ ├── prompt.ts
│ │ │ ├── tools.ts
│ │ │ ├── module.ts
│ │
│
├── shared/ # 🧩 通用工具（可选）
│ ├── logger/
│ ├── utils/
│
├── main.ts

ai-engine/
│
├── src/
│ │
│ ├── runtime/ # 🧠 运行时（核心）
│ │ ├── orchestrator.ts # 总入口（AI大脑）
│ │ ├── graph.ts # 执行流程图
│ │ ├── node-executor.ts # 节点执行器
│ │ └── context.ts # 上下文管理
│ │
│ ├── nodes/ # 🔀 所有业务节点
│ │ ├── router.node.ts # 意图路由
│ │ ├── llm.node.ts # LLM调用
│ │ ├── rag.node.ts # RAG查询
│ │ └── chat.node.ts # 普通聊天
│ │
│ ├── capabilities/ # 🧠 AI能力封装
│ │ ├── llm.client.ts # LLM请求封装
│ │ ├── embedding.ts # 向量生成
│ │ └── prompt.ts # prompt构建
│ │
│ ├── infra/ # 🗄️ 基础设施
│ │ ├── vector.store.ts # 向量库
│ │ ├── memory.store.ts # memory
│ │ └── cache.ts # 缓存
│ │
│ ├── types/ # 📦 类型定义
│ │ ├── index.ts
│ │
│ └── index.ts # 🚀 入口文件
│
├── package.json
├── tsconfig.json
└── README.md
