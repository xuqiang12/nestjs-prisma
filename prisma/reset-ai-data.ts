import * as fs from 'fs'
import * as path from 'path'
import { Prisma, PrismaClient } from '@prisma/client'

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    return
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) {
      continue
    }

    const [, key, rawValue] = match
    let value = rawValue.trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = process.env[key] || value
  }

  if (!process.env.NEON_DATABASE_URL && process.env.NEON_DIRECT_URL) {
    process.env.NEON_DATABASE_URL = process.env.NEON_DIRECT_URL
  }
}

loadLocalEnv()

const prisma = new PrismaClient()

const json = (value: unknown) => value as Prisma.InputJsonValue

async function clearAiData() {
  await prisma.$transaction([
    prisma.aiWorkflowRunStep.deleteMany(),
    prisma.aiWorkflowRun.deleteMany(),
    prisma.aiMessage.deleteMany(),
    prisma.aiConversation.deleteMany(),
    prisma.aiWorkflowEdge.deleteMany(),
    prisma.aiWorkflowNode.deleteMany(),
    prisma.aiWorkflow.deleteMany(),
    prisma.aiSkillPackage.deleteMany(),
    prisma.aiAgent.deleteMany(),
    prisma.aiSensitiveWord.deleteMany(),
    prisma.aiPrompt.deleteMany(),
  ])
}

async function seedAiData() {
  await prisma.aiPrompt.createMany({
    data: [
      {
        code: 'customer_reception_prompt',
        name: '客服接待提示词',
        scene: 'customer_service',
        content:
          '你是云管理后台的客服接待助手。回答要礼貌、简洁、可执行；涉及系统操作时按步骤说明；不确定时说明需要查看具体配置。',
        version: 1,
        status: 1,
        remark: '用于普通客服接待和问题分流',
      },
      {
        code: 'knowledge_answer_prompt',
        name: '知识库问答提示词',
        scene: 'knowledge_qa',
        content:
          '你是企业知识库问答助手。优先依据知识库检索结果回答。答案要给出结论、依据和下一步建议；如果检索结果不足，请明确提示补充资料。',
        version: 1,
        status: 1,
        remark: '用于知识库检索后回答',
      },
      {
        code: 'permission_helper_prompt',
        name: '后台权限排查提示词',
        scene: 'admin_permission',
        content:
          '你是后台权限排查助手。请从菜单、按钮权限、角色授权、登录用户身份四个角度排查，并输出检查顺序和可能原因。',
        version: 1,
        status: 1,
        remark: '用于后台菜单和按钮权限诊断',
      },
      {
        code: 'content_polish_prompt',
        name: '运营文案润色提示词',
        scene: 'content_operation',
        content:
          '你是运营文案助手。请输出更清晰、有行动指向、适合后台配置或小程序展示的中文文案，并保留关键信息。',
        version: 1,
        status: 1,
        remark: '用于公告、活动、首页配置文案润色',
      },
    ],
  })

  await prisma.aiSensitiveWord.createMany({
    data: [
      { word: '删除数据库', category: '高危操作', action: 'block', scope: 'input', status: 1, remark: '阻止直接要求破坏数据库的输入' },
      { word: '泄露密码', category: '安全风险', action: 'block', scope: 'both', status: 1, remark: '阻止输出或输入敏感凭据泄露请求' },
      { word: '真实手机号', category: '隐私信息', action: 'replace', replaceWith: '脱敏手机号', scope: 'output', status: 1, remark: '输出中替换隐私字段示例' },
      { word: '身份证号', category: '隐私信息', action: 'replace', replaceWith: '证件信息', scope: 'output', status: 1, remark: '输出中替换证件信息' },
      { word: '绕过权限', category: '安全风险', action: 'block', scope: 'input', status: 1, remark: '阻止绕过权限类请求' },
      { word: '内部密钥', category: '安全风险', action: 'replace', replaceWith: '敏感配置', scope: 'both', status: 1, remark: '避免密钥类信息明文出现' },
    ],
  })

  await prisma.aiWorkflow.create({
    data: {
      code: 'direct_answer_flow',
      name: '通用接待流',
      description: '按接待提示词组织上下文，再由模型生成可执行答复。',
      status: 1,
      version: 1,
      remark: '适合客服接待、简单问答和文案类场景',
      nodes: {
        create: [
          { nodeKey: 'start', type: 'start', name: '接收问题', config: json({ inputField: 'question' }), sortNo: 1 },
          { nodeKey: 'prompt', type: 'prompt', name: '生成系统提示', config: json({ promptCode: 'customer_reception_prompt', outputField: 'systemPrompt' }), sortNo: 2 },
          { nodeKey: 'llm', type: 'llm', name: '生成答复', config: json({ systemPromptField: 'systemPrompt', userMessageField: 'question', outputField: 'answer' }), sortNo: 3 },
          { nodeKey: 'output', type: 'output', name: '输出答案', config: json({ outputField: 'answer' }), sortNo: 4 },
        ],
      },
      edges: {
        create: [
          { fromNodeKey: 'start', toNodeKey: 'prompt', sortNo: 1 },
          { fromNodeKey: 'prompt', toNodeKey: 'llm', sortNo: 2 },
          { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 3 },
        ],
      },
    },
  })

  await prisma.aiWorkflow.create({
    data: {
      code: 'knowledge_service_flow',
      name: '知识库服务流',
      description: '先检索知识库，再结合知识库问答提示词生成答复并返回来源。',
      status: 1,
      version: 1,
      remark: '适合制度、操作手册、业务 FAQ 类问答',
      nodes: {
        create: [
          { nodeKey: 'start', type: 'start', name: '接收问题', config: json({ inputField: 'question' }), sortNo: 1 },
          { nodeKey: 'knowledge', type: 'knowledge', name: '检索知识库', config: json({ queryField: 'question', outputField: 'sources', limit: 5 }), sortNo: 2 },
          { nodeKey: 'prompt', type: 'prompt', name: '生成问答提示', config: json({ promptCode: 'knowledge_answer_prompt', outputField: 'systemPrompt' }), sortNo: 3 },
          { nodeKey: 'llm', type: 'llm', name: '生成知识库答复', config: json({ systemPromptField: 'systemPrompt', userMessageField: 'question', outputField: 'answer' }), sortNo: 4 },
          { nodeKey: 'output', type: 'output', name: '输出答案', config: json({ outputField: 'answer' }), sortNo: 5 },
        ],
      },
      edges: {
        create: [
          { fromNodeKey: 'start', toNodeKey: 'knowledge', sortNo: 1 },
          { fromNodeKey: 'knowledge', toNodeKey: 'prompt', sortNo: 2 },
          { fromNodeKey: 'prompt', toNodeKey: 'llm', sortNo: 3 },
          { fromNodeKey: 'llm', toNodeKey: 'output', sortNo: 4 },
        ],
      },
    },
  })

  await prisma.aiAgent.createMany({
    data: [
      {
        code: 'customer_service_agent',
        name: '客服接待助手',
        description: '用于日常客户咨询、后台操作说明和问题分流。',
        promptCode: 'customer_reception_prompt',
        mode: 'chat',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        temperature: 0.3,
        topP: 0.8,
        knowledgeEnabled: false,
        toolCodes: json([]),
        workflowCode: 'direct_answer_flow',
        status: 1,
        remark: '默认通用接待方案',
      },
      {
        code: 'knowledge_qa_agent',
        name: '知识库问答助手',
        description: '用于制度、帮助文档、操作手册类问题，优先走知识库检索。',
        promptCode: 'knowledge_answer_prompt',
        mode: 'knowledge',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        temperature: 0.2,
        topP: 0.75,
        knowledgeEnabled: true,
        toolCodes: json(['search_knowledge']),
        workflowCode: 'knowledge_service_flow',
        status: 1,
        remark: '知识库问答主方案',
      },
      {
        code: 'permission_check_agent',
        name: '权限排查助手',
        description: '用于后台菜单不可见、按钮无权限、角色授权异常等排查。',
        promptCode: 'permission_helper_prompt',
        mode: 'chat',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        temperature: 0.2,
        topP: 0.8,
        knowledgeEnabled: false,
        toolCodes: json(['get_user_menu_permissions']),
        workflowCode: null,
        status: 1,
        remark: '可结合用户权限工具做排查',
      },
      {
        code: 'content_polish_agent',
        name: '运营文案助手',
        description: '用于公告、活动、首页配置说明等中文文案优化。',
        promptCode: 'content_polish_prompt',
        mode: 'chat',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        temperature: 0.6,
        topP: 0.9,
        knowledgeEnabled: false,
        toolCodes: json([]),
        workflowCode: null,
        status: 1,
        remark: '偏创作型文案方案',
      },
    ],
  })

  await prisma.aiSkillPackage.create({
    data: {
      code: 'customer_service_basic_package',
      name: '客服基础能力包',
      description: '面向客服接待和知识库问答的基础能力组合，包含接待提示词、知识库提示词和知识库检索工具。',
      promptCodes: json(['customer_reception_prompt', 'knowledge_answer_prompt']),
      toolCodes: json(['search_knowledge']),
      workflowCode: 'knowledge_service_flow',
      agentDefaults: json({
        promptCode: 'knowledge_answer_prompt',
        mode: 'knowledge',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        temperature: 0.2,
        topP: 0.75,
        knowledgeEnabled: true,
      }),
      status: 1,
      remark: '可安装到需要知识库能力的运行方案',
    },
  })
}

async function printCounts() {
  const counts = {
    prompts: await prisma.aiPrompt.count(),
    sensitiveWords: await prisma.aiSensitiveWord.count(),
    agents: await prisma.aiAgent.count(),
    workflows: await prisma.aiWorkflow.count(),
    workflowNodes: await prisma.aiWorkflowNode.count(),
    workflowEdges: await prisma.aiWorkflowEdge.count(),
    skillPackages: await prisma.aiSkillPackage.count(),
    conversations: await prisma.aiConversation.count(),
    messages: await prisma.aiMessage.count(),
    workflowRuns: await prisma.aiWorkflowRun.count(),
    workflowRunSteps: await prisma.aiWorkflowRunStep.count(),
  }
  console.log('AI 数据重置完成：')
  console.log(JSON.stringify(counts, null, 2))
}

async function main() {
  console.log('开始清空 AI 模块数据...')
  await clearAiData()
  console.log('开始写入中文业务演示数据...')
  await seedAiData()
  await printCounts()
}

main()
  .catch((error) => {
    console.error('AI 数据重置失败', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
