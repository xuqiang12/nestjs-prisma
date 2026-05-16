/**
 * 向量嵌入服务 - 将文本转换为向量表示
 * 使用 SiliconFlow 的 Qwen3-VL-Embedding-8B 模型
 */
import axios from 'axios'

export async function createEmbedding(text) {
  try {
    const res = await axios.post(
      'https://api.siliconflow.cn/v1/embeddings',
      {
        model: 'Qwen/Qwen3-VL-Embedding-8B',
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${'sk-sbryzumrzqcjqhtygwxrkbqqjdhbcvanjdcvsmoylxahjcte'}`,
          'Content-Type': 'application/json',
        },
      },
    )
    console.log(res.data)
    return res.data.data[0].embedding
  } catch (error) {
    console.log(error)
  }
}
