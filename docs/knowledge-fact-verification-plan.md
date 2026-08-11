# 知识库事实校验体系最终实施计划

- 文档状态：已确认，待实施
- 当前阶段：Phase 0
- 本文用途：后续 Codex 实施的唯一计划依据
- 当前任务：仅完成计划文档落地，不执行实施

## 一、实施目标

建立一套可测试、可追溯、可治理的知识库事实校验体系，重点解决 RAG 场景下 AI 对金额、期限、数量、版本、政策极性等高风险事实的错误回答问题。

最终链路固定为：

```text
先清理 Query Rewrite 双轨
  -> 建立最小纯内存 Fact Domain
  -> 接入 KnowledgeFact 持久化
  -> 建立 AnswerFact + Verification
  -> 替换旧 KnowledgeAnswerGuardService 主链路
  -> 最后做后台治理
```

第一版目标不是做万能语义理解，也不是知识图谱，而是先让这条链路稳定跑通：

```text
KnowledgeFact
  -> AnswerFact
  -> Align
  -> Verify
  -> GroundingPolicy
```

本计划作为后续 Codex 实施的唯一计划文档。实施时不得重新发明新的 Manager / Resolver / Dispatcher / Adapter / Context / Provider 等中间抽象。

## 二、当前真实架构

当前真实 RAG 运行链路为：

```text
AgentRuntimeService.stream()
  -> RulePlanner.plan()
  -> ExecutionPlan
  -> AgentCapabilityExecutor.execute()
  -> RagHandler.execute()
  -> KnowledgeQAService.answer()
```

当前 Query Rewrite 已经存在于 Planner 侧：

```text
IntentClassifierService
  -> 要求模型输出 rewrittenQuestion / rewriteApplied

RulePlanner.buildQuestionInput()
  -> 统一整理 originalQuestion / rewrittenQuestion / rewriteApplied

RagHandler.execute()
  -> 将 rewrittenQuestion / rewriteApplied 传给 KnowledgeQAService
```

当前仍存在的问题：

```text
KnowledgeQAService
  -> FOLLOW_UP_QUESTION_PATTERN
  -> buildRetrievalQuestion()
  -> shouldUseHistory()
```

这会形成：

```text
Planner Rewrite
+
KnowledgeQAService Rewrite
```

双轨风险。

当前知识库数据结构：

```text
AiKnowledgeBase
  -> 知识库配置

AiKnowledgeFile
  -> 上传的源文件

Document
  -> 当前持久化 chunk
  -> Prisma model 名为 Document
  -> 数据库表名 documents
```

关键字段：

```text
Document.id
  = 当前持久化 chunk id

Document.knowledgeBaseId
  = AiKnowledgeBase.id

Document.fileId
  = AiKnowledgeFile.id

Document.chunkIndex
  = chunk 顺序
```

当前旧事实校验：

```text
KnowledgeEvidenceService.buildFacts()
  -> 生成 text + requiredTerms

extractKnowledgeNumberTerms()
  -> 抽取数字短语

KnowledgeAnswerGuardService
  -> 校验回答数字短语是否出现在 facts 中
```

当前旧 Guard 使用点不止一个：

```text
KnowledgeQAService
WorkflowExecutorService
```

因此 Phase 4 替换旧 Guard 时，必须同时收口这两个使用点。

## 三、最终职责边界

```text
AgentRuntime / Planner / Executor
  只负责上下文、能力选择、执行计划和事件流。
  不负责事实抽取、事实归一化、事实比较、Grounding 策略。

IntentClassifierService / RulePlanner
  是 Query Rewrite 唯一负责方。
  负责产出 originalQuestion / rewrittenQuestion / rewriteApplied。

RagHandler
  只负责把 AgentContext 和 ExecutionStep 转成 KnowledgeQAService 入参。
  不负责事实抽取、归一化、对齐和比较。

KnowledgeQAService
  只负责知识问答主流程编排：
  检索 -> 证据 -> 模型回答 -> 事实校验 -> 输出策略。
  不直接实现 Extract / Normalize / Align / Verify 规则。

ai-runtime/knowledge/fact/*
  负责 KnowledgeFact 类型、抽取、归一化等纯逻辑。

ai-runtime/knowledge/verification/*
  负责 AnswerFact、对齐、事实校验和 GroundingPolicy。

KnowledgeBaseService
  负责知识库管理侧的知识库、文件、chunk 生命周期。
  Phase 3 以后负责触发 KnowledgeFact 的生成、失效、重建。

WorkflowExecutorService
  Phase 4 后不能继续直接依赖旧 KnowledgeAnswerGuardService 作为最终事实校验。
```

单向依赖固定为：

```text
FactExtractor
  -> FactNormalizer

AnswerFactExtractor
  -> FactNormalizer
  -> FactAligner
  -> FactVerifier
  -> GroundingPolicy
```

禁止循环依赖。

## 四、最终目录结构

第一版建议目录：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\
  knowledge-qa.service.ts
  knowledge-evidence.service.ts
  knowledge.types.ts

  fact\
    knowledge-fact.types.ts
    fact-extractor.ts
    fact-normalizer.ts

  verification\
    answer-fact.types.ts
    answer-fact-extractor.ts
    fact-aligner.ts
    fact-verifier.ts
    grounding-policy.ts
```

Phase 3 接 Prisma 后，如确实需要，再增加：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\fact\knowledge-fact.service.ts
```

这个 Service 只允许负责：

```text
从数据库读取 ACTIVE facts
写入新抽取 facts
标记 STALE / DISABLED / REVIEW_REQUIRED
按 documentId / fileId / knowledgeBaseId 查询 facts
```

禁止新增：

```text
KnowledgeFactManager
KnowledgeFactResolver
KnowledgeFactDispatcher
KnowledgeFactAdapter
QueryRewriteManager
QueryRewriteResolver
FactContext
ScopeResolver
ScopeMatcher
```

如果一个文件暂时只有几十行纯函数，就保持纯函数，不额外包 Service。

## 五、最终数据模型

Phase 3 的 KnowledgeFact 建议模型字段固定为：

```text
id
knowledgeBaseId
fileId
documentId
chunkIndex

kind
factType

text
subject
attribute

valueText
valueNumber
normalizedValue
unit

condition
polarity
scope

evidenceText
confidence
sourceHash

origin
status

createdAt
updatedAt
```

字段语义：

```text
documentId
  = Document.id
  = 当前持久化 chunk id

fileId
  = AiKnowledgeFile.id
  用于回溯源文件、按文件重建 facts、后台筛选。

chunkIndex
  = Document.chunkIndex
  用于展示 chunk 顺序和辅助排查，不作为事实身份主键。

knowledgeBaseId
  = AiKnowledgeBase.id
  用于限制当前 Agent 绑定知识库范围，也参与同一事实键判断。

scope
  string | null
  第一版只作为事实区分信息。
  不实现复杂有效期、活动价、区域价、客户价、客户分层模型。

confidence
  表示 FactExtractor 对抽取结果的置信程度。
  不表示该事实经过 Verification 后的正确程度。

sourceHash
  来自 Document.content 的 hash。
  用于判断 chunk 内容变化后，原 GENERATED facts 是否应标记 STALE。
```

禁止同时出现：

```text
documentId
chunkId
```

两个指向同一 chunk 的字段。

第一版暂不做字段：

```text
metadata
extractorVersion
reviewer
reviewedAt
effectiveFrom
effectiveTo
region
customerType
channel
versionRange
sourcePriority
factVersion
graphNodeId
```

原因：这些属于第二阶段治理、复杂 scope 或事实版本能力，不属于第一版闭环。

枚举建议：

```ts
export type KnowledgeFactKind = 'VALUE_FACT' | 'POLICY_FACT'

export type KnowledgeFactType =
  | 'MONEY'
  | 'DURATION'
  | 'VERSION'
  | 'QUANTITY'
  | 'POLICY'

export type KnowledgeFactPolarity = 'ALLOW' | 'DENY' | 'NEUTRAL'

export type KnowledgeFactOrigin = 'GENERATED' | 'MANUAL' | 'OVERRIDE'

export type KnowledgeFactStatus =
  | 'ACTIVE'
  | 'DISABLED'
  | 'STALE'
  | 'REVIEW_REQUIRED'
```

P1 再扩展：

```ts
export type KnowledgeFactTypeP1 = 'DATE' | 'PERCENTAGE'
```

## 六、Phase 0：现状审计

目标：确认现状，冻结边界，不做代码改动。

做什么：

```text
1. 复核 AgentRuntimeService -> KnowledgeQAService 主链路。
2. 复核 Planner 侧 rewrittenQuestion / rewriteApplied。
3. 复核 KnowledgeQAService 中旧 Query Rewrite 逻辑。
4. 复核 KnowledgeAnswerGuardService 使用点。
5. 复核 Document / AiKnowledgeBase / AiKnowledgeFile 关系。
6. 复核 chunk 创建、替换、重分片、编辑、删除入口。
7. 复核现有 knowledge 单元测试和 contract test。
```

不做什么：

```text
不改代码
不改 Prisma
不生成 migration
不运行数据库命令
不实现新服务
不删除旧逻辑
```

需要检查的文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\agent-runtime.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\planner\intent-classifier.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\planner\rule-planner.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\executor\agent-capability-executor.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\executor\handlers\rag.handler.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-qa.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-evidence.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-answer-guard.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-answer.util.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\workflow\workflow-executor.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge\knowledge-base\knowledge-base.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\prisma\schema.prisma
```

新增文件：

```text
无
```

删除/替换旧逻辑：

```text
无
```

保留旧逻辑：

```text
全部保留，只做审计。
```

验收标准：

```text
1. 明确 Query Rewrite 当前唯一应归属 Planner。
2. 明确 KnowledgeQAService 中存在待删除的 FOLLOW_UP_QUESTION_PATTERN。
3. 明确 WorkflowExecutorService 也是旧 Guard 使用点。
4. 明确 KnowledgeFact 的 documentId 应对应 Document.id。
5. 明确第一版不使用 chunkId 字段。
```

完成后系统状态：

```text
系统行为不变。
形成后续 Phase 1 -> Phase 5 的准确执行依据。
```

停止条件：

```text
如果发现还有第三条知识问答主链路依赖旧 Guard，必须先补充到本计划，再进入 Phase 1。
如果发现 Document.id 不是当前 chunk id，必须重新校准 KnowledgeFact 数据模型。
```

## 七、Phase 1：Query Rewrite 清理

目标：彻底解决 Query Rewrite 双轨。

做什么：

```text
1. 保留 Planner / IntentClassifier 作为 Query Rewrite 唯一入口。
2. KnowledgeQAService 只消费上游传入的 rewrittenQuestion / rewriteApplied。
3. 删除 FOLLOW_UP_QUESTION_PATTERN。
4. 删除 shouldUseHistory()。
5. 删除或降级 buildRetrievalQuestion()。
6. 调整相关测试，覆盖独立问题、真实追问和历史不污染。
```

不做什么：

```text
不新增 QueryRewriteManager
不新增 QueryRewriteResolver
不新增 QueryUnderstandingService
不新增 IntentResolver
不接 Prisma
不改事实校验
不改 KnowledgeAnswerGuardService
```

修改文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-qa.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\knowledge-qa.service.spec.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\ai-rag-answer-sanitize-contract.test.cjs
```

按需检查但原则上不改：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\planner\intent-classifier.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\planner\rule-planner.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\executor\handlers\rag.handler.ts
```

新增文件：

```text
无
```

旧逻辑处理：

```text
FOLLOW_UP_QUESTION_PATTERN
  -> Phase 1 直接删除。

shouldUseHistory()
  -> Phase 1 直接删除。

buildRetrievalQuestion()
  -> 优先 Phase 1 删除。
  -> 如果测试显示仍有非 AgentRuntime 入口直接调用 KnowledgeQAService 且未传 rewrittenQuestion，则临时保留为“只返回 currentQuestion.trim()”。
  -> 最多保留到 Phase 2 结束。
  -> 保留期间禁止读取 history，禁止新增关键词，禁止判断业务词。
```

保留逻辑：

```text
rewrittenQuestion
rewriteApplied
originalQuestion
```

验收标准：

```text
1. KnowledgeQAService 中不存在 FOLLOW_UP_QUESTION_PATTERN。
2. KnowledgeQAService 不再根据业务词判断是否拼接历史。
3. 已改写问题使用 rewrittenQuestion 检索。
4. 独立问题不拼接历史。
5. 真实追问依赖 Planner 改写，不依赖 KnowledgeQAService 兜底。
```

测试重点：

```text
上文：智能办公助手Pro多少钱一年
本轮：售后呢？
期望：RagHandler 传入 rewrittenQuestion 后，KnowledgeQAService 使用 rewrittenQuestion 检索。

上文：基础版多少钱
本轮：企业版价格是多少？
期望：KnowledgeQAService 不拼接基础版历史。

本轮：售后政策是什么？
期望：作为独立问题检索。

本轮：这个有效期多久？
期望：是否改写由 Planner 决定，不由 KnowledgeQAService 关键词判断。
```

完成后系统状态：

```text
Query Rewrite 只剩 Planner 一条主线。
KnowledgeQAService 不再承担追问识别职责。
事实校验仍使用旧 KnowledgeAnswerGuardService。
```

停止条件：

```text
如果 KnowledgeQAService 仍需要读取 history 才能通过测试，必须停止并查清调用链，而不是恢复关键词正则。
如果有人提议新增 QueryRewriteManager / Resolver，停止实施并回到职责边界确认。
```

## 八、Phase 2：纯内存 Fact Domain

目标：建立纯内存 Fact Domain，先证明抽取和归一化规则可测、可控。

做什么：

```text
1. 定义 KnowledgeFactDraft。
2. 定义 KnowledgeFact 纯类型。
3. 实现 FactExtractor。
4. 实现 FactNormalizer。
5. 仅用纯内存输入输出写单元测试。
6. 覆盖 P0 范围：MONEY / DURATION / VERSION / QUANTITY / POLICY。
```

不做什么：

```text
不改 Prisma
不生成 migration
不访问数据库
不接 RAG
不接 AgentRuntime
不接 SSE
不调用 LLM API
不实现 AnswerFactExtractor
不实现 FactAligner
不实现 FactVerifier
不实现 GroundingPolicy
不创建空壳文件
```

新增文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\fact\knowledge-fact.types.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\fact\fact-extractor.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\fact\fact-normalizer.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\fact\fact-extractor.spec.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\fact\fact-normalizer.spec.ts
```

修改文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge.types.ts
```

删除/替换旧逻辑：

```text
不删除旧 Guard。
不替换 buildFacts。
本阶段只建立新纯函数能力。
```

保留旧逻辑：

```text
KnowledgeEvidenceService.buildFacts()
KnowledgeAnswerGuardService
extractKnowledgeNumberTerms()
requiredTerms
```

但从本阶段开始，`requiredTerms` 只能被视为旧 Guard 的兼容字段，不再是新事实校验的核心模型。

第一版必须覆盖：

```text
企业版：4999元/年
基础版：1999元/年
购买超过7天不支持无理由退款
审核通过后将在3个工作日内安排处理
产品型号：OA-Pro-2026
```

允许抽取失败：

```text
企业版功能非常丰富
适合大型企业
体验很好
```

进入 REVIEW_REQUIRED 的情况：

```text
有数字但 subject / attribute 缺失。
同一句出现多个金额但无法确定属于谁。
存在支持 / 不支持，但条件无法可靠切分。
```

完成后系统状态：

```text
已有纯内存 FactExtractor / FactNormalizer。
主 RAG 行为不变。
数据库不变。
旧 Guard 仍在主链路。
```

验收标准：

```text
1. MONEY / DURATION / VERSION / QUANTITY / POLICY 纯函数测试通过。
2. FactExtractor 不包含具体业务实体、产品名称、知识库关键词或业务专属正则。
3. FactNormalizer 不判断事实正确性。
4. 不依赖 NestJS / Prisma / DB / RAG / AgentRuntime / SSE / LLM API。
```

停止条件：

```text
如果 P0 类型无法通过纯内存测试，禁止进入 Phase 3。
如果为了通过测试需要加入“企业版价格正则”这类业务规则，停止并重新收缩规则。
如果 Normalizer 开始处理大量自然语言变体，停止并把变体放入 P1/P2。
```

## 九、Phase 3：KnowledgeFact 持久化

目标：在纯函数稳定后接入 KnowledgeFact 持久化和 chunk 生命周期。

做什么：

```text
1. 修改 Prisma schema，新增 KnowledgeFact 表。
2. 生成 migration。
3. 执行 Prisma Client 生成。
4. 按项目数据库闭环要求更新目标数据库。
5. 在 chunk 创建、替换、重分片、编辑、删除时维护 facts。
6. RAG 检索后优先读取 ACTIVE KnowledgeFact。
7. 没有 ACTIVE facts 的旧数据临时 fallback 到 buildFacts。
```

不做什么：

```text
不做 AnswerFact。
不做 FactVerifier。
不做 GroundingPolicy。
不做后台 facts 页面。
不做复杂 scope。
不做全库 regenerate。
```

修改文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\prisma\schema.prisma
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge\knowledge-base\knowledge-base.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-evidence.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-qa.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\ai-runtime.module.ts
```

新增文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\prisma\migrations\<timestamp>_add_knowledge_fact\migration.sql
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\fact\knowledge-fact.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\fact\knowledge-fact.service.spec.ts
```

KnowledgeFact 生命周期：

```text
新 chunk 生成：
  GENERATED + ACTIVE

chunk 内容更新：
  原 GENERATED facts 标记 STALE
  重新抽取新 GENERATED facts
  MANUAL / OVERRIDE facts 暂不覆盖，是否标记 REVIEW_REQUIRED 视 sourceHash 是否变化决定

文件替换 / 重新分片：
  旧 Document 删除前，相关 GENERATED facts 标记 STALE 或随 Document 级联删除
  【待确认】最终采用 STALE 保留还是级联删除，需结合审计历史解释需求确认

删除 chunk：
  相关 facts 不再参与 ACTIVE 校验
  推荐标记 DISABLED 或依赖级联删除
  【待确认】是否要求后台保留删除前解释链路

删除知识库：
  可级联删除 facts

没有结构化事实：
  facts 允许为空
```

兼容策略：

```text
有 ACTIVE KnowledgeFact：
  factSource = DATABASE

没有 ACTIVE KnowledgeFact：
  factSource = FALLBACK
  临时使用 KnowledgeEvidenceService.buildFacts()
```

fallback 限制：

```text
只允许用于历史数据迁移窗口。
不允许永久双轨。
必须记录 fallback 使用率。
```

完成后系统状态：

```text
新 chunk 可以产生并持久化 KnowledgeFact。
RAG 可以优先读取 ACTIVE facts。
旧数据仍可通过 fallback 保持可用。
最终事实判断仍未替换旧 Guard。
```

验收标准：

```text
1. KnowledgeFact 表字段符合最终数据模型。
2. documentId = Document.id。
3. 不存在 chunkId 字段。
4. 新 chunk / 更新 chunk / 重分片 / 删除 chunk 生命周期有测试覆盖。
5. RAG 能区分 DATABASE facts 和 FALLBACK facts。
6. fallback 有迁移统计，且计划中有退出时间。
```

停止条件：

```text
如果目标数据库无法迁移成功，禁止进入 Phase 4。
如果 Prisma Client 未生成成功，禁止进入 Phase 4。
如果 chunk 更新不能正确维护 ACTIVE / STALE，禁止进入 Phase 4。
如果 fallback 逻辑开始扩展成第二套事实系统，停止并收敛。
```

## 十、Phase 4：AnswerFact + Verification + Grounding

目标：建立 AnswerFact + Verification + Grounding，并替换旧 Guard 主链路。

做什么：

```text
1. 实现 AnswerFactExtractor。
2. 实现 FactAligner。
3. 实现 FactVerifier。
4. 实现 GroundingPolicy。
5. KnowledgeQAService 接入新 verification 流程。
6. WorkflowExecutorService 同步接入新 verification 流程。
7. 旧 KnowledgeAnswerGuardService 从主链路退出。
8. 保留旧 Guard 仅作为迁移期测试对照或 fallback 文本构建辅助。
```

不做什么：

```text
不实现 REGENERATE。
不使用 LLM 做最终裁判。
不使用 embedding 对齐事实。
不做模糊匹配。
不做复杂 scope。
不做后台治理页面。
```

新增文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\verification\answer-fact.types.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\verification\answer-fact-extractor.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\verification\fact-aligner.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\verification\fact-verifier.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\verification\grounding-policy.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\verification\answer-fact-extractor.spec.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\verification\fact-aligner.spec.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\verification\fact-verifier.spec.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\verification\grounding-policy.spec.ts
```

修改文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge-qa.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\workflow\workflow-executor.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\knowledge\knowledge.types.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\ai-runtime\ai-runtime.module.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\knowledge\knowledge-qa.service.spec.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\unit\ai-runtime\workflow\workflow-executor.service.spec.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\ai-rag-answer-sanitize-contract.test.cjs
F:\公司项目\node-vue2-vue3\nestjs-prisma\test\ai-workflow-knowledge-answer-contract.test.cjs
```

旧逻辑处理：

```text
KnowledgeQAService 中：
  guardService.ensureAnswer()
  guardService.validate()
  -> 替换为 AnswerFactExtractor + FactVerifier + GroundingPolicy。

WorkflowExecutorService 中：
  ensureKnowledgeAnswer()
  guardService.ensureAnswer()
  -> 替换为同一套 verification 入口。

KnowledgeAnswerGuardService：
  -> 不再作为主链路最终事实校验器。
  -> 是否保留为文本清理 / fallback 辅助，必须在本阶段结束时明确。
```

FactAligner 第一版规则：

```text
knowledgeBaseId 必须一致。
factType 必须一致。
unit 必须一致或可确定等价。
scope 必须相同，或二者都为空。
subject 规范化后精确匹配。
attribute 规范化后精确匹配。
condition 为空对空；有条件时必须规范化后相同。
```

允许的通用归一：

```text
subject:
  企业版 / 企业版本
  基础版 / 基础版本

attribute:
  售价 / 价格
```

禁止：

```text
业务知识库专用同义词不断添加
embedding
LLM
模糊相似度
为了通过率扩大匹配范围
```

FactVerifier 状态：

```text
SUPPORTED
CONTRADICTED
NOT_FOUND
UNCERTAIN
SOURCE_CONFLICT
```

GroundingPolicy 第一版动作：

```text
PASS
FALLBACK
UNCERTAIN
```

暂不实现：

```text
REGENERATE
```

关键策略：

```text
SUPPORTED x 4 + CONTRADICTED x 1
  -> FALLBACK

SOURCE_CONFLICT
  -> UNCERTAIN

全部 NOT_FOUND
  -> 严格知识库模式 FALLBACK
  -> 非严格模式 UNCERTAIN

没有 AnswerFact
  -> PASS，但记录 answerFactCount = 0

存在关键 UNCERTAIN
  -> 严格模式 FALLBACK
  -> 非严格模式 UNCERTAIN
```

完成后系统状态：

```text
新 FactVerifier 成为唯一事实校验入口。
KnowledgeQAService 和 WorkflowExecutorService 都不再依赖旧 Guard 做最终事实判断。
旧 Guard 主链路退出。
```

验收标准：

```text
1. 企业版4999 vs 企业版3999 => CONTRADICTED。
2. 基础版1999、企业版4999，AI 说基础版4999 => CONTRADICTED。
3. 购买超过7天不支持退款，AI 说支持退款 => CONTRADICTED。
4. KnowledgeFact 内部企业版4999 / 企业版5999 => SOURCE_CONFLICT 或保守 UNCERTAIN。
5. AnswerFact = [] 不等于 NOT_FOUND。
6. WorkflowExecutorService 与 KnowledgeQAService 使用同一套 verification 入口。
```

停止条件：

```text
如果 CONTRADICTED / SOURCE_CONFLICT 不能稳定测试，禁止进入 Phase 5。
如果旧 Guard 和新 Verifier 同时作为最终判断入口，禁止进入 Phase 5。
如果 FactAligner 需要引入 embedding / LLM 才能通过第一版测试，停止并收缩测试范围。
```

## 十一、Phase 5：后台治理

目标：后台治理，属于第二阶段，不阻塞第一版事实校验闭环。

做什么：

```text
1. facts 列表查询。
2. 按知识库、文件、Document、factType、status 筛选。
3. 查看 evidenceText 和来源 chunk。
4. 人工新增 fact。
5. 人工编辑 fact。
6. 人工停用 fact。
7. 单 chunk / 单 document 重新生成 facts。
8. REVIEW_REQUIRED facts 人工确认。
```

不做什么：

```text
不做全库 regenerate。
不做知识图谱。
不做事实版本树。
不做复杂 scope 建模。
不做跨知识库事实合并。
不做自动重生成回答。
```

后端可能新增文件：

```text
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge\knowledge-fact\knowledge-fact.controller.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge\knowledge-fact\knowledge-fact.service.ts
F:\公司项目\node-vue2-vue3\nestjs-prisma\src\modules\knowledge\knowledge-fact\dto\knowledge-fact.dto.ts
```

前端可能新增或修改：

```text
F:\公司项目\node-vue2-vue3\fullstack-admin-serve\vue-element-admin-dev\src\views\AIEngine\knowledge\index.vue
```

【待确认】后台事实治理是做在现有知识库页面内，还是单独新增 facts 页面。

权限可能新增：

```text
ai:knowledge:fact:list
ai:knowledge:fact:update
ai:knowledge:fact:disable
ai:knowledge:fact:confirm
ai:knowledge:fact:regenerate
```

【待确认】权限是否拆细，还是复用现有 `ai:knowledge:list / upload / revector / delete`。

完成后系统状态：

```text
事实可以查看、修正、停用、确认。
人工治理不会改变 Phase 4 的事实校验职责边界。
```

验收标准：

```text
1. 能按 knowledgeBaseId / fileId / documentId / status 查询 facts。
2. 能看到 evidenceText 和来源 chunk。
3. 人工修改后 origin = OVERRIDE。
4. 人工新增后 origin = MANUAL。
5. 停用后 status = DISABLED，不参与校验。
6. 单 chunk 重新生成不会影响无关 chunk。
```

停止条件：

```text
如果 Phase 4 主链路未稳定，禁止做 Phase 5。
如果后台需求推动复杂 scope / 版本树 / 全库重生成，必须另立第二阶段计划。
```

## 十二、旧逻辑替换清单

| 旧逻辑 | 当前用途 | 最终处理 | 所在 Phase | 替代逻辑 | 删除时间 |
|---|---|---|---|---|---|
| `FOLLOW_UP_QUESTION_PATTERN` | KnowledgeQAService 判断追问和拼接历史 | 删除 | Phase 1 | Planner 的 `rewrittenQuestion/rewriteApplied` | Phase 1 |
| `buildRetrievalQuestion()` | 根据问题和 history 生成检索问题 | 删除；若有非 AgentRuntime 入口则临时改成只返回当前问题 | Phase 1 | `RagHandler` 传入的 `rewrittenQuestion` | 最迟 Phase 2 结束 |
| `shouldUseHistory()` | 调用业务关键词正则判断追问 | 删除 | Phase 1 | Planner Rewrite | Phase 1 |
| `KnowledgeEvidenceService.buildFacts()` | 从召回内容生成 `text + requiredTerms` | 降级为历史数据 fallback | Phase 3 | DB `ACTIVE KnowledgeFact` | fallback 迁移完成后删除主链路依赖 |
| `requiredTerms` | 旧 Guard 的数字短语依据 | 降级为候选提示或兼容字段 | Phase 2 / Phase 3 | `KnowledgeFact.normalizedValue/unit/subject/attribute` | Phase 4 后不再作为最终校验依据 |
| `extractKnowledgeNumberTerms()` | 抽取数字短语 | 可保留为候选抽取工具 | Phase 2 | `FactExtractor + FactNormalizer` | Phase 4 后不作为最终验证器 |
| `KnowledgeAnswerGuardService` in `KnowledgeQAService` | RAG 答案数字校验和兜底 | 退出主链路 | Phase 4 | `AnswerFactExtractor + FactVerifier + GroundingPolicy` | Phase 4 |
| `KnowledgeAnswerGuardService` in `WorkflowExecutorService` | workflow knowledge 节点答案校验 | 退出主链路 | Phase 4 | 同一套 verification 入口 | Phase 4 |

目标状态：

```text
旧 Guard
  -> 最终退出主链路

新 FactVerifier
  -> 成为唯一事实校验入口
```

禁止长期存在：

```text
旧 Guard + 新 Verifier
```

双轨。

## 十三、核心类型与函数接口

Phase 2 类型：

```ts
export type KnowledgeFactKind = 'VALUE_FACT' | 'POLICY_FACT'

export type KnowledgeFactType =
  | 'MONEY'
  | 'DURATION'
  | 'VERSION'
  | 'QUANTITY'
  | 'POLICY'

export type KnowledgeFactPolarity = 'ALLOW' | 'DENY' | 'NEUTRAL'

export type KnowledgeFactStatus =
  | 'ACTIVE'
  | 'DISABLED'
  | 'STALE'
  | 'REVIEW_REQUIRED'

export type KnowledgeFactOrigin = 'GENERATED' | 'MANUAL' | 'OVERRIDE'

export type KnowledgeFactDraft = {
  kind: KnowledgeFactKind
  factType: KnowledgeFactType
  text: string
  subject?: string
  attribute?: string
  valueText?: string
  condition?: string
  polarity?: KnowledgeFactPolarity
  evidenceText: string
  confidence: number
}

export type KnowledgeFact = {
  id?: string
  knowledgeBaseId?: string
  fileId?: string | null
  documentId?: string
  chunkIndex?: number | null

  kind: KnowledgeFactKind
  factType: KnowledgeFactType

  text: string
  subject: string | null
  attribute: string | null

  valueText: string | null
  valueNumber: number | null
  normalizedValue: string | null
  unit: string | null

  condition: string | null
  polarity: KnowledgeFactPolarity
  scope: string | null

  evidenceText: string
  confidence: number
  sourceHash?: string

  origin?: KnowledgeFactOrigin
  status?: KnowledgeFactStatus
}
```

Phase 2 函数：

```ts
export function extractFacts(text: string): KnowledgeFactDraft[]

export function normalizeFact(fact: KnowledgeFactDraft): KnowledgeFact
```

职责：

```text
extractFacts()
  只负责从文本中抽取高风险事实草稿。
  不判断答案是否正确。
  不调用 FactAligner。
  不调用 FactVerifier。

normalizeFact()
  只负责值、单位、极性、条件的规范化。
  不判断事实正确性。
```

Phase 4 类型：

```ts
export type AnswerFact = {
  kind: KnowledgeFactKind
  factType: KnowledgeFactType

  text: string
  subject: string | null
  attribute: string | null

  valueText: string | null
  valueNumber: number | null
  normalizedValue: string | null
  unit: string | null

  condition: string | null
  polarity: KnowledgeFactPolarity
  scope: string | null
}

export type VerificationStatus =
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'NOT_FOUND'
  | 'UNCERTAIN'
  | 'SOURCE_CONFLICT'

export type VerificationResult = {
  status: VerificationStatus
  answerFact: AnswerFact
  matchedFacts: KnowledgeFact[]
  reason: string
}

export type GroundingAction =
  | 'PASS'
  | 'FALLBACK'
  | 'UNCERTAIN'

export type GroundingDecision = {
  action: GroundingAction
  answer: string
  results: VerificationResult[]
  answerFactCount: number
}
```

Phase 4 函数：

```ts
export function extractAnswerFacts(answer: string): AnswerFact[]

export function alignFact(input: {
  answerFact: AnswerFact
  knowledgeFacts: KnowledgeFact[]
}): KnowledgeFact[]

export function verify(input: {
  answerFact: AnswerFact
  knowledgeFacts: KnowledgeFact[]
}): VerificationResult

export function applyGroundingPolicy(input: {
  rawAnswer: string
  fallbackAnswer: string
  verificationResults: VerificationResult[]
  strict: boolean
}): GroundingDecision
```

职责：

```text
extractAnswerFacts()
  只抽取回答中的高风险事实。

alignFact()
  只返回候选 KnowledgeFact。
  不决定 PASS / FALLBACK。

verify()
  只输出 SUPPORTED / CONTRADICTED / NOT_FOUND / UNCERTAIN / SOURCE_CONFLICT。

applyGroundingPolicy()
  只根据 VerificationResult 决定 PASS / FALLBACK / UNCERTAIN。
```

## 十四、测试计划

Phase 1 测试：

```text
独立问题不拼接历史。
真实追问使用 Planner 改写结果。
KnowledgeQAService 不包含 FOLLOW_UP_QUESTION_PATTERN。
KnowledgeQAService 不再通过业务词判断追问。
```

Phase 2 测试：

```text
extractFacts('企业版：4999元/年')
  -> MONEY fact draft

extractFacts('基础版：1999元/年')
  -> MONEY fact draft

extractFacts('购买超过7天不支持无理由退款')
  -> POLICY fact draft，polarity = DENY，condition = 购买超过7天

extractFacts('审核通过后将在3个工作日内安排处理')
  -> DURATION / QUANTITY fact draft

extractFacts('产品型号：OA-Pro-2026')
  -> VERSION fact draft

extractFacts('企业版功能非常丰富')
  -> []
```

Phase 2 Normalizer 测试：

```text
4999元/年 -> 4999:CNY_PER_YEAR
1999元/年 -> 1999:CNY_PER_YEAR
10000元 -> 10000:CNY
1万元 -> 10000:CNY
3个工作日 -> 3:WORKDAY
3天 -> 3:DAY
90天 -> 90:DAY
OA-Pro-2026 -> OA-Pro-2026:VERSION
```

Phase 3 测试：

```text
新 chunk 生成 ACTIVE facts。
chunk 更新后原 GENERATED facts 变为 STALE。
没有 facts 的 chunk 允许为空。
RAG 优先读取 ACTIVE KnowledgeFact。
没有 ACTIVE facts 时 factSource = FALLBACK。
```

Phase 4 测试：

```text
KB：企业版4999元/年
AI：企业版4999元/年
=> SUPPORTED

KB：企业版4999元/年
AI：企业版3999元/年
=> CONTRADICTED

KB：基础版1999元/年，企业版4999元/年
AI：基础版4999元/年
=> CONTRADICTED

KB：购买超过7天不支持无理由退款
AI：购买超过7天支持无理由退款
=> CONTRADICTED

KB：企业版4999元/年，企业版5999元/年
AI：企业版4999元/年
=> SOURCE_CONFLICT 或 UNCERTAIN，不能 SUPPORTED

AI：企业版功能非常丰富
AnswerFact = []
=> 不是 NOT_FOUND
```

建议命令在实际编码阶段执行：

```text
npm.cmd run test -- --runInBand test/unit/ai-runtime/knowledge
node --test test/ai-rag-answer-sanitize-contract.test.cjs
node --test test/ai-workflow-knowledge-answer-contract.test.cjs
npx.cmd tsc -p tsconfig.build.json --noEmit
```

本计划生成阶段不运行测试。

## 十五、数据库变更计划

数据库变更只允许发生在 Phase 3。

Phase 3 前禁止：

```text
修改 prisma/schema.prisma
生成 migration
执行 migrate
执行 prisma generate
执行数据库命令
```

Phase 3 必须完成数据库闭环：

```text
1. 明确目标数据库来源。
2. 修改 prisma/schema.prisma。
3. 生成 migration。
4. 执行 migrate:deploy 或项目约定迁移命令。
5. 执行 prisma:generate。
6. 执行 migrate:status。
7. 查询或测试确认 KnowledgeFact 表可用。
```

最终回复必须区分：

```text
源码是否已改
migration 是否已生成
Prisma Client 是否已生成
目标数据库是否已更新
数据库状态是否已校验
```

KnowledgeFact 关系建议：

```text
KnowledgeFact.knowledgeBaseId -> AiKnowledgeBase.id
KnowledgeFact.fileId -> AiKnowledgeFile.id，可为空
KnowledgeFact.documentId -> Document.id
```

【待确认】`documentId` 是否设置级联删除：

```text
方案 A：Document 删除时级联删除 facts。
优点：数据干净。
缺点：历史解释链路消失。

方案 B：Document 删除时保留 facts 并标记 DISABLED / STALE。
优点：可解释历史。
缺点：实现略复杂。
```

第一版建议优先方案 A，除非后台治理明确要求保留历史解释。

## 十六、验收标准

第一版完成标准：

```text
1. Query Rewrite 只存在 Planner 一条主线。
2. KnowledgeQAService 不再有 FOLLOW_UP_QUESTION_PATTERN。
3. KnowledgeQAService 不再通过业务关键词拼接历史。
4. KnowledgeFact 纯函数抽取和归一化稳定。
5. KnowledgeFact 持久化模型贴合 Document / AiKnowledgeFile / AiKnowledgeBase。
6. documentId = Document.id。
7. 不存在 chunkId 字段。
8. 新 chunk 可生成 facts，无事实允许为空。
9. chunk 更新、重分片、删除能维护 facts 生命周期。
10. RAG 优先使用 ACTIVE KnowledgeFact。
11. requiredTerms 不再作为唯一校验依据。
12. AnswerFact 不持久化。
13. FactVerifier 支持 SUPPORTED / CONTRADICTED / NOT_FOUND / UNCERTAIN / SOURCE_CONFLICT。
14. GroundingPolicy 第一版只支持 PASS / FALLBACK / UNCERTAIN。
15. 不实现 REGENERATE。
16. KnowledgeQAService 和 WorkflowExecutorService 都收口到新 verification 入口。
17. 旧 KnowledgeAnswerGuardService 不再作为主链路最终校验器。
18. 第一版不使用 LLM 做最终裁判。
19. 第一版不使用 embedding / 模糊匹配做 FactAligner。
20. 后台治理只在 Phase 5 开始。
```

## 十七、反补丁规则

实施过程必须遵守：

```text
1. 遇到测试失败先定位职责归属，不允许直接在调用方加 if。
2. 不允许增加 V2 / V3 / V4 版本类实现解决单个案例。
3. 不允许继续向 FOLLOW_UP_QUESTION_PATTERN 增加关键词。
4. 不允许向 FactAligner 无限增加业务同义词。
5. 不允许为了通过测试修改 Verification 规则。
6. 不允许旧 Guard 和新 Verifier 长期并存。
7. 不允许一个类同时负责 Extract / Normalize / Align / Verify。
8. 新增文件必须有明确单一职责和调用者。
9. 如果新增抽象不能解释“为什么现有职责无法承载”，就不要新增。
10. 每完成一个 Phase 必须删除或降级对应旧逻辑，而不是只新增新逻辑。
11. 不允许 LLM JSON 直接进入 ACTIVE KnowledgeFact。
12. 不允许为了每个 chunk 都有 fact 强行生成低质量 fact。
13. 不允许为了提高通过率扩大模糊匹配。
14. 不允许把 fallback 做成永久第二条事实链路。
15. 不允许在 KnowledgeQAService 里重新实现 Query Rewrite。
```

## 十八、最终实施顺序

严格按以下顺序执行：

```text
Phase 0：现状审计
  -> 只读确认真实链路和旧逻辑使用点。

Phase 1：Query Rewrite 清理
  -> 删除 KnowledgeQAService 的业务词追问判断。
  -> Planner 成为 Query Rewrite 唯一入口。

Phase 2：纯内存 Fact Domain
  -> 只实现 KnowledgeFact 类型、FactExtractor、FactNormalizer。
  -> 不碰 Prisma、RAG、LLM、SSE、AgentRuntime。

Phase 3：KnowledgeFact 持久化
  -> 接 Prisma。
  -> 接 chunk 生命周期。
  -> RAG 优先读取 ACTIVE facts。
  -> fallback 只作为历史迁移窗口。

Phase 4：AnswerFact + Verification + Grounding
  -> 建立 AnswerFactExtractor / FactAligner / FactVerifier / GroundingPolicy。
  -> KnowledgeQAService 和 WorkflowExecutorService 同步替换旧 Guard 主链路。
  -> 不实现 REGENERATE。

Phase 5：后台治理
  -> facts 查询、编辑、停用、人工确认、局部重新生成。
  -> 不阻塞第一版事实校验闭环。
```

进入下一阶段的硬条件：

```text
Phase 1 完成后：
  KnowledgeQAService 不再承担 Query Rewrite。

Phase 2 完成后：
  MONEY / DURATION / VERSION / QUANTITY / POLICY 纯函数测试稳定。

Phase 3 完成后：
  KnowledgeFact 持久化和 chunk 生命周期稳定。

Phase 4 完成后：
  CONTRADICTED / SOURCE_CONFLICT / NOT_FOUND / UNCERTAIN 可稳定测试。
  旧 Guard 不再作为最终事实校验入口。

Phase 5 开始前：
  Phase 4 主链路必须稳定。
```

## 十九、实施状态

```text
当前状态：

Phase 0：待执行
Phase 1：未开始
Phase 2：未开始
Phase 3：未开始
Phase 4：未开始
Phase 5：未开始

源码修改：无
Prisma 修改：无
Migration：无
数据库变更：无
测试执行：无
```
