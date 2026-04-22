import axios from 'axios'

export async function callLLM(messages: any[]) {
  const res = await axios.post(
    process.env.CHAT_API_URL!,
    {
      model: 'doubao-seed-1-6-lite-251015',
      messages,
      temperature: 0.2,
      top_p: 0.8,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.CHAT_API_KEY}`,
      },
    },
  )

  return res.data.choices[0].message.content
}
