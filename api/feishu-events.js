import crypto from 'crypto';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { type, challenge, event } = req.body;

  // 接口验证
  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  // 用户发消息事件
  if (event && event.message) {
    const text = JSON.parse(event.message.content).text;

    const reply = await chatWithGpt(text);

    // 通过机器人接口回复用户
    await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FEISHU_BOT_TOKEN}`
      },
      body: JSON.stringify({
        receive_id_type: 'chat_id',
        receive_id: event.message.chat_id,
        content: JSON.stringify({ text: reply }),
        msg_type: 'text'
      })
    });
  }

  return res.status(200).send('ok');
}
