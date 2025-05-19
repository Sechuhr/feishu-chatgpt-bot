// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { header, event, challenge } = req.body;
  const type = header?.event_type || '';

  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  if (type === 'im.message.receive_v1') {
    if (!event?.message) return res.status(200).send('ok');

    const msg = event.message;

    let text = '';
    try {
      text = JSON.parse(msg.content).text || '';
    } catch {
      text = '[消息格式异常]';
    }

    let reply = '';
    try {
      reply = await chatWithGpt(text);
    } catch {
      reply = 'ChatGPT 暂时无法回答，请稍后再试。';
    }

    const token = await getTenantAccessToken();

    const payload = {
      receive_id_type: 'chat_id',   // 必须全部小写字符串
      receive_id: msg.chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply }),
    };

    console.log('【发送请求体】', JSON.stringify(payload));

    const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',  // 严格这样写
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('飞书发送消息失败，状态码:', response.status, '响应:', errorText);
    } else {
      console.log('飞书发送消息成功');
    }

    return res.status(200).send('ok');
  }

  return res.status(200).send('ok');
}
