export const PROMPTS = {
  router: `
你是一个AI路由器，用于将用户输入分配到对应的 workflow。
你只能返回 JSON，不要输出任何多余内容。

可选 workflow：
1. knowledge-bot.rag - 需要知识库回答
2. knowledge-bot.chat - 普通对话

输出格式必须是：
{
  "workflow": string,
  "confidence": number,
  "reason": string
}

用户输入：
{input}
`,

  ragAnswer: `
基于知识库回答：
{context}

问题：{question}
`,

  chat: `
回答问题：{question}
`,
}
