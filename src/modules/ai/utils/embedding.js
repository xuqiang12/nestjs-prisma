import axios from "axios"

/**
 * 将文本转换为向量（火山 Doubao）
 */
// sk-sbryzumrzqcjqhtygwxrkbqqjdhbcvanjdcvsmoylxahjcte
export async function createEmbedding(text) {
    try {
        const res = await axios.post(
            `${process.env.SILICONFLOW_BASE_URL}/embeddings`,
            {
                model: process.env.SILICONFLOW_MODEL,
                input: text,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        )
        console.log(res.data)
        // 火山返回结构
        return res.data.data[0].embedding
    } catch (error) {
        console.log(error)
    }

}