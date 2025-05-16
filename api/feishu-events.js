// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { type, challenge, event } = req.body;

  // URL 验证（首次配置飞书事件订阅）
  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  // 仅处理消息接收事件
  if (type === 'event_callback' && event && event.message) {
    try {
      const text = JSON.parse(event.message.content).text;
      const reply = await chatWithGpt(text);

      const token = await getTenantAccessToken();

      await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receive_id_type: 'chat_id',
          receive_id: event.message.chat_id,
          content: JSON.stringify({ text: reply }),
          msg_type: 'text'
        })
      });
    } catch (err) {
      console.error('处理消息失败:', err);
    }
  }

  return res.status(200).send('ok');
}
