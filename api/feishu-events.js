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

    // 解析用户消息文本
    let text = '';
    try {
      text = JSON.parse(msg.content).text || '';
    } catch {
      text = '[消息格式异常]';
    }

    // 调用 GPT 获取回复
    let reply = '';
    try {
      reply = await chatWithGpt(text);
    } catch (err) {
      console.error('调用 GPT 失败:', err);
      reply = 'ChatGPT 暂时无法回答，请稍后再试。';
    }

    // 获取飞书租户访问令牌
    const token = await getTenantAccessToken();

    // 构造飞书消息请求体
    const payload = {
      receive_id_type: 'chat_id',
      receive_id: msg.chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply }),
    };

    // 发送消息给飞书
    const sendRes = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('飞书发送消息失败，状态码:', sendRes.status, '响应内容:', errText);
    } else {
      console.log('飞书发送消息成功');
    }

    return res.status(200).send('ok');
  }

  return res.status(200).send('ok');
}

