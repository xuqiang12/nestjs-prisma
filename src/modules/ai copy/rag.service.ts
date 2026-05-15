export class RAGService {
  private docs = [
    {
      content: '退款规则：7天内可无理由退款',
    },
    {
      content: '订单发货后不可修改地址',
    },
    {
      content: '会员积分可用于抵扣订单金额',
    },
  ]

  async search(query: string) {
    // 👉 简化版：关键词匹配（生产换向量库）
    const result = this.docs.filter(
      (doc) => doc.content.includes(query) || query.includes('退款') || query.includes('订单'),
    )

    return result.map((d) => d.content).join('\n')
  }
}
