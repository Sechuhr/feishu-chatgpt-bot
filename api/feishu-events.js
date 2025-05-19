// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { header, event, challenge } = req.body;
  const type = header?.event_type || '';

  console.log('收到请求体:', JSON.stringify(req.body, null, 2));
  console.log('事件类型:', type);

  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  if (type === 'im.message.receive_v1') {
    if (!event?.message) {
      console.log('缺少 message 字段，忽略');
      return res.status(200).send('ok');
    }

    const msg = event.message;
    let text = '';
    try {
      text = JSON.parse(msg.content).text || '';
    } catch (e) {
      console.error('消息内容解析失败:', e);
      text = '[消息格式异常]';
    }
    console.log('收到消息文本:', text);

    let reply = '';
    try {
      reply = await chatWithGpt(text);
    } catch (err) {
      console.error('调用 ChatGPT 失败:', err);
      reply = 'ChatGPT 暂时无法回答，请稍后再试。';
    }
    console.log('ChatGPT 回复:', reply);

    const token = await getTenantAccessToken();

    const payload = {
      receive_id_type: 'chat_id',
      receive_id: msg.chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply }),
    };

    console.log('发送飞书消息请求体:', JSON.stringify(payload));

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
      console.error('发送飞书消息失败，状态码:', sendRes.status, '响应内容:', errText);
    } else {
      console.log('发送飞书消息成功');
    }

    return res.status(200).send('ok');
  }

  console.log('非关注事件，忽略');
  return res.status(200).send('ok');
}
