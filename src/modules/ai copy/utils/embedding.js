// 文档生成向量
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 将文本转换为向量
 */
export async function createEmbedding(text) {
    const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    return res.data[0].embedding;
}