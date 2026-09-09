// 这个文件负责维护 AI 平台启动所需的模型、提示词、智能体和工作流基础数据。
import { Prisma } from '@prisma/client'
import { prisma } from '../client'

const DEFAULT_PROMPT_CODE = 'TSC0000000000000005'
const DEFAULT_MODEL_CONFIG_CODE = 'deepseek-v32-siliconflow'

const modelProviderSeeds = [
  {
    code: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
    status: 1,
  },
  {
    code: 'volcengine',
    name: '火山引擎',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyEnv: 'VOLCENGINE_API_KEY',
    status: 1,
  },
]

const modelConfigSeeds = [
  {
    code: DEFAULT_MODEL_CONFIG_CODE,
    providerCode: 'siliconflow',
    name: 'DeepSeek V3.2',
    modelName: 'deepseek-ai/DeepSeek-V3.2',
    modelType: 'chat',
    capabilities: {
      stream: true,
      toolCall: false,
      vision: false,
      jsonMode: true,
      contextWindow: 64000,
    },
    isDefault: true,
    status: 1,
  },
  {
    code: 'qwen25-7b-siliconflow',
    providerCode: 'siliconflow',
    name: 'Qwen2.5 7B',
    modelName: 'Qwen/Qwen2.5-7B-Instruct',
    modelType: 'chat',
    capabilities: {
      stream: true,
      toolCall: false,
      vision: false,
      jsonMode: false,
      contextWindow: 32768,
    },
    isDefault: false,
    status: 1,
  },
]

const promptSeeds = [
  {
    code: DEFAULT_PROMPT_CODE,
    name: '售后客服助手',
    scene: '负责帮助用户解决产品咨询、售后服务、订单查询等问题',
    content: `你是一名专业的企业售后客服助手，负责帮助用户解决产品咨询、售后服务、订单查询等问题。

你的职责：

1. 产品咨询
- 根据知识库中的产品资料回答用户问题。
- 如果知识库没有相关信息，不要编造答案。
- 可以告诉用户：“当前没有查询到相关信息，请联系客服人员进一步确认。”

2. 售后服务
- 根据企业售后政策回答退货、换货、维修等问题。
- 回答时保持耐心、礼貌、专业。

3. 用户沟通规范
- 使用中文回答。
- 回复内容简洁清晰。
- 优先给出解决方案。
- 不使用攻击性、歧视性语言。

4. 知识库使用规则
- 优先参考知识库内容。
- 如果知识库和你的通用知识冲突，以知识库内容为准。
- 不允许虚构不存在的产品、政策、价格。

5. 安全规则
- 不泄露企业内部机密信息。
- 不提供管理员账号、数据库、服务器等敏感信息。
- 遇到违规请求，需要拒绝并引导用户咨询正常业务。

回答格式：

问题明确：
直接回答。

问题不明确：
先询问用户补充信息。

无法回答：
说明原因，并提供人工客服渠道。`,
    status: 1,
    remark: '',
  },
]

const workflowSeeds = [
  {
    code: 'direct_answer_flow',
    name: '通用接待流',
    description: '按售后客服提示词组织上下文，再由模型生成可执行答复。',
    status: 1,
    version: 1,
    remark: '适合客服接待、简单问答和文案类场景',
    nodes: [
      { nodeKey: 'start', type: 'start', name: '接收问题', config: { inputField: 'question' }, sortNo: 1 },
      { nodeKey: 'prompt', type: 'prompt', name: '生成系统提示', config: { promptCode: DEFAULT_PROMPT_CODE, outputField: 'systemPrompt' }, sortNo: 2 },
      { nodeKey: 'llm', type: 'llm', name: '生成答复', config: { systemPromptField: 'systemPrompt', userMessageField: 'question', outputField: 'answer' }, sortNo: 3 },
      { nodeKey: 'output', type: 'output', name: '输出答案', config: { outputField: 'answer' }, sortNo: 4 },
    ],
    edges: [
      { fromNodeKey: 'start', toNodeKey: 'prompt', sortNo: 1 },
      { fromNodeKey: 'prompt', toNodeKey: 'llm', sortNo: 2 },
      { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 3 },
    ],
  },
  {
    code: 'knowledge_service_flow',
    name: '知识库服务流',
    description: '先检索知识库，再结合售后客服提示词生成答复并返回来源。',
    status: 1,
    version: 1,
    remark: '适合制度、操作手册、业务 FAQ 类问答',
    nodes: [
      { nodeKey: 'start', type: 'start', name: '接收问题', config: { inputField: 'question' }, sortNo: 1 },
      { nodeKey: 'knowledge', type: 'knowledge', name: '检索知识库', config: { queryField: 'question', outputField: 'sources', limit: 5 }, sortNo: 2 },
      { nodeKey: 'prompt', type: 'prompt', name: '生成问答提示', config: { promptCode: DEFAULT_PROMPT_CODE, outputField: 'systemPrompt' }, sortNo: 3 },
      { nodeKey: 'llm', type: 'llm', name: '生成知识库答复', config: { systemPromptField: 'systemPrompt', userMessageField: 'question', outputField: 'answer' }, sortNo: 4 },
      { nodeKey: 'output', type: 'output', name: '输出答案', config: { outputField: 'answer' }, sortNo: 5 },
    ],
    edges: [
      { fromNodeKey: 'start', toNodeKey: 'knowledge', sortNo: 1 },
      { fromNodeKey: 'knowledge', toNodeKey: 'prompt', sortNo: 2 },
      { fromNodeKey: 'prompt', toNodeKey: 'llm', sortNo: 3 },
      { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 4 },
    ],
  },
]

// 统一写入 AI 平台基础配置，避免新库缺少默认模型或智能体。
export async function seedAiBaseData() {
  console.log('初始化 AI 基础配置')

  const providerIdByCode = await upsertModelProviders()
  const modelConfigIdByCode = await upsertModelConfigs(providerIdByCode)
  const promptIdByCode = await upsertPrompts()

  await upsertWorkflows(promptIdByCode)
  await upsertAgents(promptIdByCode, modelConfigIdByCode)
}

// 写入模型供应商，并返回供应商 code 到 id 的映射。
async function upsertModelProviders() {
  const providerIdByCode = new Map<string, string>()

  for (const item of modelProviderSeeds) {
    const provider = await prisma.aiModelProvider.upsert({
      where: { code: item.code },
      update: item,
      create: item,
      select: { id: true, code: true },
    })
    providerIdByCode.set(provider.code, provider.id)
  }

  return providerIdByCode
}

// 写入模型配置，并在没有其他默认聊天模型时恢复默认模型。
async function upsertModelConfigs(providerIdByCode: Map<string, string>) {
  const modelConfigIdByCode = new Map<string, string>()

  for (const item of modelConfigSeeds) {
    const providerId = providerIdByCode.get(item.providerCode)
    if (!providerId) {
      throw new Error(`模型供应商种子不存在：${item.providerCode}`)
    }
    const { providerCode, isDefault, ...data } = item
    void providerCode
    const modelConfig = await prisma.aiModelConfig.upsert({
      where: { code: item.code },
      update: {
        ...data,
        providerId,
        capabilities: item.capabilities as Prisma.InputJsonValue,
      },
      create: {
        ...data,
        providerId,
        isDefault: false,
        capabilities: item.capabilities as Prisma.InputJsonValue,
      },
      select: { id: true, code: true },
    })
    modelConfigIdByCode.set(modelConfig.code, modelConfig.id)
  }

  const defaultChatModel = await prisma.aiModelConfig.findFirst({
    where: { modelType: 'chat', isDefault: true, status: 1 },
    select: { code: true },
  })
  if (!defaultChatModel || defaultChatModel.code === DEFAULT_MODEL_CONFIG_CODE) {
    await prisma.aiModelConfig.updateMany({
      where: { modelType: 'chat', isDefault: true, code: { not: DEFAULT_MODEL_CONFIG_CODE } },
      data: { isDefault: false },
    })
    await prisma.aiModelConfig.update({
      where: { code: DEFAULT_MODEL_CONFIG_CODE },
      data: { isDefault: true, status: 1 },
    })
  }

  return modelConfigIdByCode
}

// 写入默认提示词，并返回提示词 code 到 id 的映射。
async function upsertPrompts() {
  const promptIdByCode = new Map<string, string>()

  for (const item of promptSeeds) {
    const prompt = await prisma.aiPrompt.upsert({
      where: { code: item.code },
      update: item,
      create: item,
      select: { id: true, code: true },
    })
    promptIdByCode.set(prompt.code, prompt.id)
  }

  return promptIdByCode
}

// 写入默认工作流，节点里的提示词引用按 code 解析成当前库 id。
async function upsertWorkflows(promptIdByCode: Map<string, string>) {
  for (const item of workflowSeeds) {
    const workflow = await prisma.aiWorkflow.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        status: item.status,
        version: item.version,
        remark: item.remark,
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        status: item.status,
        version: item.version,
        remark: item.remark,
      },
      select: { id: true },
    })

    await prisma.aiWorkflowNode.deleteMany({ where: { workflowId: workflow.id } })
    await prisma.aiWorkflowEdge.deleteMany({ where: { workflowId: workflow.id } })
    await prisma.aiWorkflowNode.createMany({
      data: item.nodes.map((node) => ({
        workflowId: workflow.id,
        nodeKey: node.nodeKey,
        type: node.type,
        name: node.name,
        config: resolveWorkflowNodeConfig(node.config, promptIdByCode),
        sortNo: node.sortNo,
      })),
    })
    await prisma.aiWorkflowEdge.createMany({
      data: item.edges.map((edge) => ({
        workflowId: workflow.id,
        fromNodeKey: edge.fromNodeKey,
        toNodeKey: edge.toNodeKey,
        sortNo: edge.sortNo,
      })),
    })
  }
}

// 写入默认智能体，并通过 code 解析模型和提示词关系。
async function upsertAgents(promptIdByCode: Map<string, string>, modelConfigIdByCode: Map<string, string>) {
  const promptId = promptIdByCode.get(DEFAULT_PROMPT_CODE)
  const modelConfigId = modelConfigIdByCode.get(DEFAULT_MODEL_CONFIG_CODE)
  if (!promptId || !modelConfigId) {
    throw new Error('默认智能体依赖的提示词或模型配置不存在')
  }

  await prisma.aiAgent.upsert({
    where: { code: 'ZNT0000000000000001' },
    update: {
      name: '智能客服',
      description: '',
      avatar: '',
      welcomeMessage: '',
      recommendedQuestions: [],
      tags: [],
      promptId,
      promptSyncEnabled: false,
      promptSnapshot: promptSeeds[0].content,
      promptEnhancement: '',
      mode: 'chat',
      model: 'deepseek-ai/DeepSeek-V3.2',
      modelConfigId,
      temperature: 0.1,
      topP: 0.1,
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeTags: [],
      toolCodes: ['search_knowledge', 'get_user_menu_permissions'],
      workflowCode: null,
      status: 1,
      remark: '',
    },
    create: {
      code: 'ZNT0000000000000001',
      name: '智能客服',
      description: '',
      avatar: '',
      welcomeMessage: '',
      recommendedQuestions: [],
      tags: [],
      promptId,
      promptSyncEnabled: false,
      promptSnapshot: promptSeeds[0].content,
      promptEnhancement: '',
      mode: 'chat',
      model: 'deepseek-ai/DeepSeek-V3.2',
      modelConfigId,
      temperature: 0.1,
      topP: 0.1,
      knowledgeEnabled: true,
      knowledgeStrict: false,
      knowledgeTags: [],
      toolCodes: ['search_knowledge', 'get_user_menu_permissions'],
      workflowCode: null,
      status: 1,
      remark: '',
    },
  })
}

// 把工作流节点配置中的 promptCode 转成当前数据库中的 promptId。
function resolveWorkflowNodeConfig(config: Record<string, unknown>, promptIdByCode: Map<string, string>) {
  if (typeof config.promptCode !== 'string') {
    return config as Prisma.InputJsonValue
  }
  const promptId = promptIdByCode.get(config.promptCode)
  if (!promptId) {
    throw new Error(`工作流提示词种子不存在：${config.promptCode}`)
  }
  const { promptCode, ...rest } = config
  void promptCode
  return { ...rest, promptId } as Prisma.InputJsonValue
}
