// import { AIRegistry } from '../ai-core/registry/ai.registry'
// import { AIRuntime } from '../ai-core/runtime/ai.runtime'
// import { IntentRouter } from '../ai-core/router/intent.router'
// import { MockLLMProvider } from '../ai-core/llm/openai.provider'

// import { registerOrderAI } from '../modules/order/ai/register'

// export class ChatService {
//   private runtime: AIRuntime

//   constructor() {
//     // 1. LLM（模型层）
//     const llm = new MockLLMProvider()

//     // 2. Router（AI路由层）
//     const router = new IntentRouter(llm)

//     // 3. Registry（业务插件中心）
//     const registry = new AIRegistry()

//     // 4. 注册业务模块
//     registerOrderAI(registry)

//     // 5. Runtime（核心调度器）
//     this.runtime = new AIRuntime(registry, router)
//   }

//   /**
//    * 👇 这就是你对外暴露的AI能力
//    */
//   async chat(message: string, userId?: string) {
//     const result = await this.runtime.run({
//       input: message,
//       userId,
//       metadata: {
//         source: 'chat.service',
//       },
//     })

//     return result
//   }
// }
