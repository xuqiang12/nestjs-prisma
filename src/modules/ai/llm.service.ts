import axios from 'axios'

export async function callLLM(messages: any[]) {
  try {
    console.log('messages:', process.env.CHAT_API_URL_AGENT!)
    const res = await axios.post(
      process.env.CHAT_API_URL_AGENT!,
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
    console.log('res:', res.data)

    return res.data.choices[0].message.content
  } catch (error) {
    console.log('error:', error)
    return '出错了'
  }
}
