# 企业级知识库问答开发方案

本文用于规划后端知识库问答从当前 RAG 回答模式升级到企业级可靠问答模式的开发方案。重点解决当前已复现的问题：

> 知识库事实已经传给大模型，但模型仍可能把价格、日期、型号、期限等关键事实改错。例如知识库中是 `1999元/年` 和 `4999元/年`，模型原始回答可能变成 `1911元/年`、`4111元/年`。

本方案只描述后端设计和实施步骤，不包含代码实现。实施前需要单独确认开发范围。

---

## 1. 背景

当前知识库问答主链路如下：

```text
ChatController
-> ChatService
-> AgentRuntimeService
-> AgentPlanService
-> AgentExecutorService
-> AiOrchestratorService.buildCompletion()
-> VectorStoreService.similaritySearch()
-> LlmService.streamWithMessages()
-> ensureKnowledgeAnswer()
-> ChatService 保存 assistant 消息
```

当前机制已经做到：

- 根据 `agentCode` 解析 Agent 配置。
- 使用 Agent 绑定的提示词、模型、知识库范围、工具白名单。
- 知识库模式下先检索 `documents` 表。
- 把命中的知识片段整理为 `事实依据` 放进 `system` prompt。
- 对模型最终回答做数字事实校验。
- 如果校验失败，返回知识库事实兜底。

当前暴露的问题：

- 模型拿到事实依据后仍可能杜撰数字。
- 当前兜底回答会把较多知识事实整段返回，客服体验不够自然。
- 普通 RAG 和 Workflow knowledge 节点存在相似但不完全统一的校验逻辑。
- 如果继续靠问题关键词、价格字段、日期字段等规则补丁，会让代码越来越复杂。

---

## 2. 目标

### 2.1 总目标

把知识库问答升级为：

```text
问题改写
-> 检索
-> 证据构建
-> 证据校验
-> 答案生成
-> 答案校验
-> 可靠返回
```

核心原则：

> 大模型可以组织语言，但关键事实必须来自可校验的知识库证据。

### 2.2 具体目标

- 不再依赖业务字段补丁，例如“价格”“型号”“日期”“售后”专用判断。
- 所有关键事实都必须能回溯到检索命中的知识片段。
- 普通 Agent 知识问答和 Workflow 知识节点最终复用同一套知识答案保护机制。
- `AgentRuntimeService` 不承担知识问答细节，只负责运行时编排。
- 保留当前 Agent、Prompt、Knowledge Base、Workflow、Tool、Conversation 主体能力。

### 2.3 非目标

本方案不做以下事情：

- 不修改前端页面。
- 不新增数据库表，除非后续明确需要保存证据链或质量评估记录。
- 不把业务字段写死在代码中。
- 不绕过当前 `AiAgent`、`AiPrompt`、`AiKnowledgeBase` 配置体系。
- 不让大模型直接访问数据库或直接理解 `knowledgeBaseIds`。

---

## 3. 设计原则

### 3.1 证据优先

知识库问答不能只相信模型的自然语言回答。模型返回中的价格、日期、型号、编号、期限等内容，必须能在知识库证据中找到来源。

### 3.2 统一入口

知识答案校验、证据构建、纠偏、拒答不能散落在 `AgentRuntimeService`、`AiOrchestratorService`、`WorkflowExecutorService` 多个地方。应该沉淀到统一服务。

### 3.3 通用机制

不针对某个样例写规则。例如不能写：

```text
如果用户问“怎么卖”，就找“售价”
```

正确方向是：

```text
从检索事实中抽取可引用证据
校验证据来自原文
用证据生成答案
校验答案没有越界事实
```

### 3.4 渐进落地

企业级完整链路可以分阶段完成，不要求一次改完所有 RAG 和 Workflow 代码。每一阶段都必须有明确验收标准。

---

## 4. 推荐架构

长期完整形态可以沉淀为后端知识问答能力层：

```text
src/ai-engine/knowledge-qa
├── knowledge-qa.service.ts
├── knowledge-query-rewrite.service.ts
├── knowledge-retriever.service.ts
├── knowledge-evidence.service.ts
├── knowledge-answer-generator.service.ts
├── knowledge-answer-guard.service.ts
├── knowledge-answer-repair.service.ts
├── knowledge-answer-formatter.service.ts
└── knowledge.types.ts
```

但第一阶段不直接落完整形态，避免新增大量透传 Service。第一阶段只新增：

```text
src/ai-engine/knowledge-qa
├── knowledge-qa.service.ts
├── knowledge-answer-guard.service.ts
├── knowledge-evidence.service.ts
└── knowledge.types.ts
```

第一阶段只修改：

```text
src/ai-engine/orchestrator/ai-orchestrator.service.ts
src/ai-engine/ai-engine.module.ts
```

`KnowledgeRuntimeContext` 第一阶段先放在 `knowledge.types.ts`，不单独创建 `knowledge-runtime-context.ts`。等上下文字段明显变多后，再拆成独立文件。

### 4.1 KnowledgeQAService

长期职责：

- 作为知识问答统一入口和 Coordinator。
- 接收用户问题、历史、Agent 提示词、知识库范围、模型配置。
- 只负责串联问题改写、检索、证据构建、答案生成、校验、纠偏和格式化。

不负责：

- 不直接处理 Controller 请求。
- 不创建会话。
- 不写 `AiMessage`。
- 不决定 Agent 路由。
- 不直接实现检索、证据构建、答案生成、纠偏、格式化细节。

调用方：

- `AiOrchestratorService` 的 knowledge 分支。
- 后续 `WorkflowExecutorService` 的 knowledge/llm 组合节点。

第一阶段职责：

- 提供 `answer(context)` 或等价入口。
- 内部先复用当前检索、facts 构建、prompt、LLM 调用和 Guard 兜底逻辑。
- 让 `AiOrchestratorService` 的 knowledge 分支尽快收口为调用 `KnowledgeQAService.answer()`。
- 不在第一阶段引入 Repair、Formatter、Pipeline、Workflow 复用。

### 4.1.1 KnowledgeRuntimeContext

第一阶段必须保留运行时上下文对象，避免后续方法参数膨胀。

推荐先放在 `knowledge.types.ts`：

```ts
type KnowledgeRuntimeContext = {
  question: string
  history: ChatMessage[]
  systemPrompt?: string
  knowledgeStrict?: boolean
  knowledgeTags?: string[]
  knowledgeBaseIds?: string[]
  allowedToolCodes?: string[]
  sources?: SearchResult[]
  evidence?: KnowledgeEvidence[]
  answer?: string
  guardResult?: KnowledgeGuardResult
}
```

第一阶段字段可以少，但调用方式应优先围绕 `context` 扩展，而不是继续增加长参数列表。

### 4.2 KnowledgeQueryRewriteService

后续阶段再拆为独立服务，第一阶段不新建该文件。

职责：

- 根据当前用户问题和最近对话上下文，生成用于知识库检索的 `rewrittenQuestion`。
- 判断当前问题是否需要历史补全，避免把上一轮无关问题直接拼进检索 query。
- 保留 `originalQuestion` 和 `rewrittenQuestion`，方便开发调试和后续质量追踪。

推荐输出结构：

```ts
type KnowledgeQueryRewriteResult = {
  originalQuestion: string
  rewrittenQuestion: string
  usedHistory: boolean
  reason?: string
}
```

第一版约束：

- 当前问题本身完整时，`rewrittenQuestion = originalQuestion`。
- 当前问题是追问、省略问法时，最多只结合最近一轮用户问题补全。
- 当前问题明显换话题时，不带历史。
- 不把 assistant 回答直接拼入检索 query。

长期可选升级：

- 使用 LLM 做 Query Rewrite，并在调试信息中展示“原问题 / 改写后”。
- LLM 改写只负责生成检索问题，不负责回答用户问题。

### 4.3 KnowledgeRetrieverService

职责：

- 统一调用 `VectorStoreService.similaritySearch()`。
- 处理知识库范围、标签、严格模式阈值和 TopK。
- 返回原始 `SearchResult[]`，不在这里拆句、不拼 prompt、不调用 LLM。

### 4.4 KnowledgeEvidenceService

职责：

- 从已检索出的 `sources` 中构建回答证据。
- 第一版不调用 LLM，不解析 LLM JSON，直接基于 `SearchResult` 生成 evidence。
- 同时保留原始片段和拆句后的原子事实，避免“给模型的上下文太碎”和“Guard 无法校验”互相冲突。
- 第一阶段先迁移当前 `buildKnowledgeFacts()`、`compactKnowledgeContent()`、`splitKnowledgeFactTexts()` 等逻辑。

推荐输出结构：

```ts
type KnowledgeEvidence = {
  sourceId: string
  knowledgeBaseId?: string | null
  fileId?: string | null
  chunkIndex?: number | null
  content: string
  facts: KnowledgeFact[]
}

type KnowledgeFact = {
  text: string
  requiredTerms: string[]
}
```

证据构建结果示例：

```json
{
  "evidence": [
    {
      "sourceId": "document-id-1",
      "content": "智能办公助手Pro基础版本：1999元/年；企业版本：4999元/年；购买后提供一年技术支持服务。",
      "facts": [
        { "text": "智能办公助手Pro基础版本：1999元/年", "requiredTerms": ["1999元/年"] },
        { "text": "企业版本：4999元/年", "requiredTerms": ["4999元/年"] },
        { "text": "购买后提供一年技术支持服务", "requiredTerms": [] }
      ]
    }
  ]
}
```

说明：

- `content` 用于答案生成，尽量保留原始 chunk 或压缩后的段落上下文。
- `facts` 用于答案校验，可以继续沿用当前 `buildKnowledgeFacts()` 的拆句思路。
- 如果回答质量不好，优先检查原始 chunk、拆句粒度和 evidence 输入，而不是先怀疑“知识库没有传入”。
- LLM 证据抽取只作为后续增强，不作为第一版默认路径。

后续可在 `KnowledgeEvidenceService` 内部分出 Builder、Ranker、Compressor、Deduplicator 等子能力；不要第一阶段就拆成多个透传文件。

### 4.5 KnowledgeAnswerGeneratorService

职责：

- 只根据已构建的 evidence 生成自然语言答案。
- 不负责校验事实，不负责纠偏，不负责最终返回格式。
- knowledge QA 默认缓冲完整模型输出，校验通过后再返回。

### 4.6 KnowledgeAnswerGuardService

职责：

- 校验模型生成答案是否只使用证据内事实。
- 检测答案中的数字、日期、期限、型号、编号等关键值是否来自证据。
- 只返回校验结果，不调用 LLM，不 repair，不生成拒答文案。

推荐输出结构：

```ts
type KnowledgeGuardResult = {
  passed: boolean
  errors: KnowledgeGuardError[]
}
```

Guard 是裁判，不是运动员。纠偏和拒答由上层 Coordinator 串联独立服务完成。

### 4.7 KnowledgeAnswerRepairService

职责：

- 当 Guard 校验失败时，最多执行一次统一纠偏。
- 纠偏 prompt 只说明哪些关键事实不可信，不写价格、售后、型号等业务字段分支。
- 纠偏后必须再次经过 Guard。

### 4.8 KnowledgeAnswerFormatterService

职责：

- 统一最终返回文案、Markdown、sources 兼容字段和拒答话术。
- 区分普通回答、纠偏回答、证据不足、知识库不支持、校验失败拒答。
- 不暴露内部 prompt、evidence JSON、guard error 和调试信息给最终用户。

推荐整体流程：

```text
originalQuestion
-> QueryRewriteService.rewrite()
-> Retriever.search()
-> EvidenceBuilder.build()
-> AnswerGenerator.generate()
-> Guard.validate()
-> pass: Formatter.formatAnswered()
-> fail: RepairService.repairOnce()
-> Guard.validate()
-> pass: Formatter.formatRepaired()
-> fail: Formatter.formatRejected()
```

统一拒答示例：

```text
当前知识库命中内容无法生成可靠回答，请联系客服人员进一步确认。
```

拒答不应伪装成系统异常，也不应输出内部校验细节。

---

## 5. 长期企业级流程

### 5.1 阶段一：问题改写

当前代码会把最近用户历史和当前问题拼成 standalone question。这个机制可以补全追问上下文，但在用户换话题时会污染检索。

推荐改成明确的 Query Rewrite：

```text
历史上下文 + 当前问题
-> originalQuestion
-> rewrittenQuestion
-> 用 rewrittenQuestion 检索
```

要求：

- 保留 `originalQuestion` 和 `rewrittenQuestion`。
- 只有当前问题是追问、省略问法时才使用最近历史。
- 最多结合最近一轮用户问题，不继续扩大到多轮历史。
- 当前问题完整或明显换话题时，只使用当前问题。
- 不把 assistant 回答原文直接拼入检索 query。

示例：

```text
上一轮：智能办公助手Pro怎么卖？
当前：有没有售后？
改写后：智能办公助手Pro购买后是否提供售后服务？
```

换话题时：

```text
上一轮：智能办公助手Pro怎么卖？
当前：批改园景区导览
改写后：批改园景区导览
```

### 5.2 阶段二：检索

沿用当前 `VectorStoreService.similaritySearch()`。

输入：

- `rewrittenQuestion`。
- Agent 绑定的 `knowledgeBaseIds`。
- Agent 配置的 `knowledgeTags`。

输出：

- `SearchResult[] sources`

要求：

- 只检索 `documents.status = 1`。
- 有知识库绑定时必须限制在绑定知识库内。
- 有标签时必须按 `metadata.tags` 过滤。
- 保留 `sourceId`、`knowledgeBaseId`、`fileId`、`chunkIndex`、`distance`。

### 5.3 阶段三：证据构建

第一版证据构建不依赖 LLM，直接把检索结果标准化为 evidence。

要求：

- 保留原始 `source.content` 或压缩后的段落上下文，供答案生成使用。
- 同时生成拆句后的 `facts`，供 Guard 做关键事实校验。
- 当前 `buildKnowledgeFacts()` 按句号、分号拆句的能力可以迁入 `EvidenceBuilder`，但不要只把拆碎后的 facts 给模型。
- evidence 为空时不能继续生成自然语言答案。
- 严格模式下无证据直接返回 `未找到相关制度。`
- 非严格模式下无证据返回“知识库中没有足够信息”，不调用通用知识编造。

原因：

- 如果只传拆句 facts，模型可能丢失标题、条件、例外条款等上下文。
- 如果只传原始 chunk，Guard 又不容易提取和校验关键事实。
- 双层 evidence 可以同时兼顾回答质量和事实校验。

### 5.4 阶段四：答案生成

答案生成只基于已校验的 evidence。

推荐 messages：

```text
system:
你是企业客服助手。
只能根据“已校验证据”回答。
禁止新增证据中没有的数字、价格、日期、型号、期限和编号。
可以组织语言，但不得改变证据含义。

user:
用户问题：...
已校验证据：
1. 基础版本：1999元/年
2. 企业版本：4999元/年
3. 购买后提供一年技术支持服务
```

如果追求更低成本，可以在证据足够简单时跳过二次 LLM，直接由后端格式化。

### 5.5 阶段五：答案校验

对最终自然语言答案再次执行事实校验。

校验范围：

- 数字。
- 日期。
- 金额。
- 型号。
- 编号。
- 期限。
- 其他后续可抽象为关键条件的字符串。

第一版可以复用当前 `knowledge-answer.util.ts` 中的数字条件校验。后续再扩展型号、编号等通用提取器。

Guard 只负责返回 `passed/errors`，不执行 repair，也不生成拒答话术。

### 5.6 阶段六：一次纠偏

如果首次答案未通过 Guard，由 `KnowledgeAnswerRepairService` 最多执行一次纠偏。

要求：

- repair prompt 只要求模型回到 evidence，不写业务字段规则。
- repair 后必须再次执行 Guard。
- repair 仍失败时，不继续多轮重试。
- 日志能区分 `rawAnswer`、`repairAnswer`、`finalAnswer`。

### 5.7 阶段七：格式化与可靠返回

最终返回必须属于以下状态之一：

```ts
type KnowledgeQAStatus =
  | 'answered'
  | 'repaired'
  | 'insufficient_evidence'
  | 'unsupported'
  | 'rejected'
```

含义：

- `answered`：首次答案通过校验。
- `repaired`：首次答案失败，纠偏后通过。
- `insufficient_evidence`：检索到相关内容，但证据不足以可靠回答。
- `unsupported`：问题本身超出知识库支持范围，例如预测、推断或要求编造未入库政策。
- `rejected`：有证据并尝试回答，但首次和纠偏答案都无法通过校验。

不允许：

- 把模型原始失败答案返回给前端。
- 把内部 prompt、证据 JSON、校验错误直接返回给用户。
- 在兜底阶段编造客服话术中的事实。

---

## 6. 与当前代码的关系

### 6.1 当前保留

继续保留：

- `ChatController`
- `ChatService`
- `AgentRuntimeService`
- `AgentPlanService`
- `AgentExecutorService`
- `AiOrchestratorService`
- `VectorStoreService`
- `LlmService`
- `ConversationService`
- `WorkflowRuntimeService`
- `WorkflowExecutorService`

### 6.2 当前调整方向

当前 `AiOrchestratorService.buildCompletion()` 中的 knowledge 分支做了太多事情：

- 构造 standalone question，并可能把上一轮用户历史带入检索。
- 检索知识库。
- 过滤 sources。
- 按句号、分号拆分 facts。
- 拼 system prompt。
- 调用 LLM 后再校验答案。

长期目标是把 knowledge 分支逐步迁移到 `KnowledgeQAService`。

迁移后：

```text
AgentExecutorService
-> KnowledgeQAService.answer()
-> 返回 answer、sources、evidence、guardResult、status
```

`AiOrchestratorService` 可以保留普通聊天 completion 构建职责，或后续改名为更准确的 `CompletionService`。

### 6.3 Workflow 复用

当前 Workflow knowledge 节点也会检索知识库并拼 prompt。长期应避免它和 ordinary RAG 各写一套。

目标：

```text
WorkflowExecutorService knowledge/llm 节点
-> KnowledgeQAService 或 KnowledgeAnswerGuardService
```

如果工作流需要节点级灵活性，可以只复用：

- 证据构建。
- 证据校验。
- 答案校验。
- 拒答策略。

不要让 Workflow 再复制一套价格、日期、型号校验规则。

---

## 7. 分阶段开发计划

### 阶段 1：MVP 收口入口和核心能力

目标：

- 新增 `KnowledgeQAService`，让 ordinary RAG 先通过 `KnowledgeQAService.answer()`。
- 新增 `KnowledgeAnswerGuardService`，迁移当前 `ensureKnowledgeAnswer()` 相关校验和兜底逻辑。
- 新增 `KnowledgeEvidenceService`，迁移当前 `buildKnowledgeFacts()`、`compactKnowledgeContent()`、`splitKnowledgeFactTexts()` 等 facts 构建逻辑。
- 新增 `knowledge.types.ts`，集中放 `KnowledgeRuntimeContext`、`KnowledgeQAResult`、`KnowledgeEvidence`、`KnowledgeFact`、`KnowledgeGuardResult` 等类型。
- `AiOrchestratorService` 的 knowledge 分支收口为调用 `KnowledgeQAService.answer()`。

新增文件：

```text
src/ai-engine/knowledge-qa/knowledge-qa.service.ts
src/ai-engine/knowledge-qa/knowledge-answer-guard.service.ts
src/ai-engine/knowledge-qa/knowledge-evidence.service.ts
src/ai-engine/knowledge-qa/knowledge.types.ts
```

修改文件：

```text
src/ai-engine/orchestrator/ai-orchestrator.service.ts
src/ai-engine/ai-engine.module.ts
```

第一阶段不做：

- 不新增 `KnowledgeQueryRewriteService`。
- 不新增 `KnowledgeAnswerRepairService`。
- 不新增 `KnowledgeAnswerFormatterService`。
- 不新增 `KnowledgePipeline`。
- 不迁移 Workflow。
- 不修改数据库。
- 不修改前端。
- 不改变现有 SSE、`sources`、`AiMessage.sources` 对外兼容行为。

第一阶段验收标准：

- ordinary RAG 入口从 `AiOrchestratorService` 收口到 `KnowledgeQAService.answer()`。
- `AiOrchestratorService` 不再直接包含完整 knowledge QA 主流程。
- 当前 `1999元/年`、`4999元/年` 的事实校验仍然通过。
- 当模型回答 `1911元/年`、`4111元/年` 时，最终不会返回错误价格。
- 普通 chat 不受影响。
- 不新增价格、售后、型号等业务专用分支。
- TypeScript 检查通过。
- 相关合同测试通过。

### 阶段 2：证据结构升级

目标：

- 在 `KnowledgeEvidenceService` 内把当前 facts 升级为双层 evidence：原始片段 `content` + 原子事实 `facts`。
- 答案生成优先使用 `content`，Guard 校验使用 `facts`。
- 继续避免 LLM JSON 证据抽取。

验收标准：

- evidence 保留 source 元数据和原始段落上下文。
- 回答质量不好时可以追踪是 source 原文、拆句粒度还是检索 query 的问题。
- 无 evidence 时不调用自然语言答案生成。

### 阶段 3：轻量问题预处理

目标：

- 先在 `KnowledgeQAService` 内部增加轻量 `rewriteQuestion()` 或 `preprocessQuestion()`。
- 只解决最明显的追问补全和换话题污染。
- 不新建 `KnowledgeQueryRewriteService`，不调用 LLM。

验收标准：

- `有没有售后？` 可以被补全为带产品上下文的问题。
- `批改园景区导览` 这类新问题不会混入上一轮产品价格问题。
- 最多使用最近一轮用户历史，不扩大到多轮拼接。
- 改写结果只用于检索，不直接作为最终回答。

### 阶段 4：统一返回结构

目标：

- 在 `KnowledgeQAService` 内部先统一 `KnowledgeQAResult`。
- 返回 `answer`、`sources`、`evidence`、`guardResult`、`status`。
- 暂不新增 Formatter 文件。

推荐返回结构：

```ts
type KnowledgeQAResult = {
  answer: string
  sources: SearchResult[]
  evidence: KnowledgeEvidence[]
  guardResult: KnowledgeGuardResult
  status: 'answered' | 'insufficient_evidence' | 'unsupported' | 'rejected'
}
```

验收标准：

- Agent knowledge 路径返回结果和旧接口兼容。
- SSE 仍然输出 `content` 和 `sources`。
- `AiMessage.sources` 仍然可保存。
- 最终用户看不到内部 prompt、evidence JSON、guard error。

### 阶段 5：可选纠偏

目标：

- 评估是否新增 `KnowledgeAnswerRepairService`。
- 如果新增，repair 最多执行一次，且必须再次经过 Guard。
- 如果不新增，继续保持 `Generator -> Guard -> Reject`。

验收标准：

- repair 关闭时不会影响现有拒答策略。
- repair 打开时能区分 `rawAnswer`、`repairAnswer`、`finalAnswer`。
- repair 最多执行一次，避免成本失控。

### 阶段 6：服务继续拆分

目标：

- 当 `KnowledgeQAService` 内部的 rewrite、response、pipeline 逻辑真实变复杂后，再拆：
  - `KnowledgeQueryRewriteService`
  - `KnowledgeAnswerFormatterService`
  - `KnowledgePipeline`
- 不提前新增只有一行透传逻辑的 Service。

验收标准：

- 拆分后 `KnowledgeQAService` 仍只是对外门面和轻量协调器。
- 拆分不改变对外接口。

### 阶段 7：Workflow 复用知识问答能力

目标：

- Workflow knowledge 节点复用统一 evidence 和 Guard。
- Workflow llm 节点如果依赖 knowledge sources，也必须经过 Guard。
- 删除重复的知识答案校验代码。

验收标准：

- 普通 Agent RAG 和 Workflow RAG 对同一知识事实的数字校验一致。
- Workflow 不再复制独立的事实 fallback 规则。
- 工作流事件流仍保持现有事件格式。

### 阶段 8：企业级增强

目标：

- 增加型号、编号、日期、金额等更完整的关键条件提取器。
- 支持按 Agent 配置不同知识问答策略。
- 可选记录证据链和校验结果，用于后续审计和质量分析。
- 可选增加 LLM Query Rewrite 和 LLM Evidence Selector。

可选扩展：

- `knowledgeAnswerPolicy`
- `maxRepairAttempts`
- `evidenceMode`
- `strictEvidenceOnly`
- `saveEvidenceTrace`
- `queryRewriteMode`

涉及数据库字段时必须按项目数据库闭环规则执行 migration、generate、status 和读回验证。

---

## 8. Prompt 设计

### 8.1 问题改写 Prompt

```text
你是知识库检索问题改写器。

任务：
根据当前用户问题和必要的最近历史，把问题改写成一个适合知识库检索的完整问题。

规则：
1. 如果当前问题本身完整，直接返回当前问题。
2. 如果当前问题是追问或省略问法，可以结合最近一轮用户问题补全。
3. 如果当前问题明显换话题，不要带入历史。
4. 不回答用户问题，只改写检索问题。
5. 不编造历史中不存在的实体、价格、日期、型号、政策。
6. 只输出 JSON，不输出解释。

输出格式：
{
  "rewrittenQuestion": "用于检索的完整问题",
  "usedHistory": boolean,
  "reason": "简短说明"
}
```

说明：第一版可以先用轻量规则实现 Query Rewrite，LLM 改写作为后续增强。

### 8.2 答案生成 Prompt

```text
你是企业客服助手。

规则：
1. 只能根据已校验证据回答。
2. 可以组织自然语言，但不能改变证据中的数字、金额、日期、型号、期限、编号。
3. 如果证据不足，不要编造答案。
4. 使用中文，简洁清晰，优先给出结论。
5. 不要输出证据编号、JSON、调试信息、user、assistant、system。
```

### 8.3 证据选择 Prompt 可选增强

第一版不需要证据抽取 Prompt。证据由 `KnowledgeEvidenceService` 直接从 `SearchResult` 构建。

只有在复杂长文档、多段候选证据过多、TopK 内容需要进一步压缩时，才考虑增加 LLM Evidence Selector。即使启用，也必须满足：

- 输出证据必须是 `source.content` 的原文子串或可定位片段。
- JSON 解析失败不能继续生成答案。
- Selector 只选择证据，不生成最终客服回答。
- Selector 失败时优先降级到 SearchResult evidence，而不是编造证据。

### 8.4 纠偏 Prompt

```text
你上一次回答包含不在事实依据中的关键内容。

请重新回答。

要求：
1. 只能根据事实依据回答。
2. 不得出现事实依据之外的数字、金额、日期、型号、期限、编号。
3. 不得根据常识补全事实。
4. 如果无法可靠回答，只能说明知识库中没有足够信息。
```

---

## 9. 流式输出策略

企业级知识问答不建议在未校验前直接把 knowledge 答案逐 token 推给前端。

原因：

- 一旦模型先输出错误价格，后端后续即使校验失败，也无法从用户界面收回已输出内容。
- 知识问答比普通聊天更重视准确性，应该先完整生成、校验，再输出。

建议：

- 普通 chat 可以继续增量流式输出。
- knowledge QA 默认缓冲模型输出，校验通过后一次性输出最终答案。
- 如果后续要求 knowledge 也逐段流式，需要设计“句级缓冲 + 句级校验”机制，不能直接透传模型 chunk。

---

## 10. 日志与调试

开发阶段建议打印或记录：

- route。
- agentCode。
- knowledgeBaseIds。
- originalQuestion。
- rewrittenQuestion。
- queryRewrite usedHistory。
- matchedSources 的 id、distance、knowledgeBaseId。
- evidence 数量。
- rawAnswer。
- repairAnswer，启用 repair 后记录。
- finalAnswer。
- guard status。

注意：

- 不打印 API Key。
- 不把完整企业内部知识长期写入生产日志。
- 本地临时 `console.log` 必须在功能验证后清理或改成受控 debug 日志。

---

## 11. 测试计划

### 11.1 单元测试

阶段 1 优先覆盖：

- AI 回答正确数字，校验通过。
- AI 回答错误数字，Guard 拦截。
- `KnowledgeEvidenceService` 能复用当前 facts 构建能力。
- ordinary RAG 通过 `KnowledgeQAService.answer()` 返回旧接口兼容结果。
- 普通 chat 不受影响。

后续阶段再覆盖：

- repair 后正确，返回 repair 答案。
- repair 后仍错误，返回安全拒答。
- 当前问题是追问时，Query Rewrite 能补全最近一轮用户问题。
- 当前问题换话题时，Query Rewrite 不带入上一轮问题。
- `KnowledgeEvidenceService` 同时保留原始 `content` 和拆句后的 `facts`。
- 无 evidence 时不能继续生成自然语言答案。

### 11.2 合同测试

阶段 1 覆盖文件：

- `knowledge-answer.util.ts`
- `knowledge-answer-guard.service.ts`
- `knowledge-evidence.service.ts`
- `knowledge-qa.service.ts`
- `ai-orchestrator.service.ts`

后续阶段再覆盖：

- `knowledge-query-rewrite.service.ts`
- `knowledge-answer-repair.service.ts`
- `knowledge-answer-formatter.service.ts`
- `workflow-executor.service.ts`

重点断言：

- 不出现样例专用关键词分支。
- 普通 chat 不自动检索知识库。
- knowledge 模式必须经过 Guard。
- 阶段 1 不新增 Query Rewrite、Repair、Formatter、Workflow 复用。
- 后续阶段再断言 knowledge 检索使用 `rewrittenQuestion`，不直接拼接多轮用户历史。
- 后续阶段再断言 Workflow knowledge 最终复用同一套 Guard。

### 11.3 集成测试

场景：

用户问：

```text
智能办公助手Pro怎么卖？
```

知识库事实：

```text
基础版本：1999元/年
企业版本：4999元/年
购买后提供一年技术支持服务
```

模型第一次返回：

```text
基础版：1911元/年
企业版：4111元/年
```

期望：

- 最终响应不能包含 `1911元/年`、`4111元/年`。
- 最终响应包含 `1999元/年`、`4999元/年`。
- 阶段 1 不启用 repair 时，Guard status 不能是 `answered`，最终应走安全兜底或拒答。
- 后续启用 repair 后，Guard status 可以是 `repaired` 或 `rejected`。

追加场景：

```text
上一轮：智能办公助手Pro怎么卖？
当前：批改园景区导览
```

期望：

- 检索用问题不包含 `智能办公助手Pro怎么卖？`。
- 检索结果不应因为上一轮价格问题被污染。
- 调试信息能看到 `originalQuestion` 和 `rewrittenQuestion`。

---

## 12. 验收标准

最终验收必须满足：

- 知识库事实传入模型前可打印、可追踪。
- 检索问题改写前后可打印、可追踪。
- 换话题时不会把上一轮用户问题带入检索。
- evidence 同时保留原始片段和原子 facts。
- 模型原始回答、纠偏回答、最终回答可区分。
- 错误数字不会返回给前端。
- 没有新增价格、型号、日期等业务专用补丁。
- Agent knowledge 和 Workflow knowledge 使用同一套事实保护机制。
- `KnowledgeQAService` 只做 Coordinator，不直接实现各子能力细节。
- TypeScript 检查通过。
- 相关合同测试通过。
- 如涉及数据库字段，完成 migration、Prisma Client 生成、状态检查和目标库读回验证。

---

## 13. 推荐落地顺序

推荐先做：

```text
阶段 1：MVP 收口入口和核心能力
  - KnowledgeQAService
  - KnowledgeAnswerGuardService
  - KnowledgeEvidenceService
  - knowledge.types.ts
阶段 2：Evidence 双层结构升级
阶段 3：轻量问题预处理
阶段 4：统一 KnowledgeQAResult
阶段 5：可选 Repair
阶段 6：按真实复杂度继续拆 Service
阶段 7：Workflow 复用
阶段 8：企业级增强
```

不建议一开始直接完成全部长期形态。原因：

- 当前系统已有 Agent、RAG、Workflow 多条路径，一次大改风险高。
- 第一阶段真正收益是先把 `AiOrchestratorService` 的 knowledge 分支收口，不是一次性拆出十几个 Service。
- 检索 query 一旦被历史污染，后续 evidence、Guard、Repair 都是在污染结果上工作。
- 当前按句号、分号拆 facts 能用于校验，但不适合直接作为唯一生成上下文。
- LLM 证据抽取需要稳定 JSON 解析和证据回溯校验，不适合作为第一版默认路径。
- Workflow 迁移需要保持现有事件流和运行日志兼容。

最稳的第一步是先用 4 个新增文件和 2 个现有文件修改完成 MVP：收口入口、迁移 Guard、迁移 Evidence、保留 RuntimeContext。Query Rewrite、Repair、Formatter、Pipeline 都是后续演进，不作为第一阶段必须完成的工作。

---

## 14. 关键结论

长期企业级知识库问答不是让大模型“更认真地回答”，而是让后端建立可验证的事实边界：

```text
问题改写产出干净检索问题
知识库检索提供候选事实
证据构建保留原始片段和原子 facts
模型只根据证据组织语言
Guard 只负责事实校验
失败则由独立 Repair 纠偏
最终由 Formatter 可靠返回
```

这条链路可以避免继续堆叠字段级补丁，也能避免历史检索污染和拆句过碎导致的回答质量问题。后续如需更强能力，再把 LLM Query Rewrite、LLM Evidence Selector、证据链审计作为可选增强逐步接入。
