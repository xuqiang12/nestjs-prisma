export type AIState = {
  question: string
  route?: 'chat' | 'rag'
  context?: string
  answer?: string
}
