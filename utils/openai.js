// utils/openai.js
import axios from 'axios';

export async function chatWithGpt(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('❌ GPT 请求失败:', err.response?.data || err.message);
    return 'ChatGPT 暂时无法回答，请稍后再试。';
  }
}
