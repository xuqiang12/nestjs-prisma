import axios from 'axios'

/**
 * 将文本转换为向量（火山 Doubao）
 */
export async function EmbeddingService(text) {
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
    // 火山返回结构
    return res.data.data[0].embedding
  } catch (error) {
    console.log(error)
  }
}
