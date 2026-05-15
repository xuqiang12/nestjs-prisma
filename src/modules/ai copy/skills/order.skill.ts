export const OrderSkill = {
  name: 'order.query',

  description: '根据订单ID查询订单信息',

  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
    },
    required: ['orderId'],
  },

  async handler(params: { orderId: string }) {
    const db = new Map([
      ['123', { orderId: '123', status: '已发货', price: 299 }],
      ['456', { orderId: '456', status: '待支付', price: 199 }],
    ])

    const data = db.get(params.orderId)

    return data ? { success: true, data } : { success: false, message: '未找到订单' }
  },
}
