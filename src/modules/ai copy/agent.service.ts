import { SYSTEM_PROMPT } from './prompt'
import { callLLM } from './llm.service'
import { RAGService } from './rag.service'
import { getSkill } from './skills/skill.index'

export class AgentService {
  private rag = new RAGService()

  async run(userMessage: string, res: any) {
    // =========================
    // 1️⃣ RAG（知识增强）
    // =========================
    const ragContext = await this.rag.search(userMessage)
    // =========================
    // 2️⃣ 第一次LLM（判断是否调用Skill）
    // =========================
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `知识库：${ragContext}` },
      { role: 'user', content: userMessage },
    ]

    const first = await callLLM(messages)

    let parsed
    try {
      parsed = JSON.parse(first)
    } catch (e) {
      // 👉 普通回答
      res.write(`data: ${first}\n\n`)
      res.end()
      return
    }

    // =========================
    // 3️⃣ Skill执行
    // =========================
    if (parsed.skill) {
      const skill = getSkill(parsed.skill)

      if (!skill) {
        res.write(`data: 未找到技能\n\n`)
        res.end()
        return
      }

      const result = await skill.handler(parsed.params)

      // =========================
      // 4️⃣ 二次LLM生成自然语言
      // =========================
      const final = await callLLM([
        ...messages,
        {
          role: 'assistant',
          content: first,
        },
        {
          role: 'user',
          content: `技能结果：${JSON.stringify(result)}，请生成自然语言回答`,
        },
      ])

      // =========================
      // 5️⃣ SSE输出
      // =========================
      res.write(`data: ${final}\n\n`)
      res.write(`data: [DONE]\n\n`)
      res.end()
      return
    }

    // =========================
    // 6️⃣ 无Skill直接返回
    // =========================
    res.write(`data: ${first}\n\n`)
    res.end()
  }
}
