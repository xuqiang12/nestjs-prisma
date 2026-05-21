export interface LLMProvider {
  invoke(prompt: string): Promise<string>
  invokeWithMessages(messages: Array<{ role: string; content: string }>): Promise<string>
}
