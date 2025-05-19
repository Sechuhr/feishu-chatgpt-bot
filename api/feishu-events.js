// api/feishu-events.js
import fetch from 'node-fetch'; // 需要安装 node-fetch: npm install node-fetch
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn('收到非POST请求，拒绝处理');
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body;

  const type = body.header?.event_type || '';
  const challenge = body.challenge || '';

  console.log('收到请求体:', JSON.stringify(body, null, 2));
  console.log('事件类型:', type);

  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  if (type === 'im.message.receive_v1') {
    const event = body.event;

    if (!event || !event.message) {
      console.log('事件体缺少 message 字段，忽略');
      return res.status(200).send('ok');
    }

    const msg = event.message;

    let text = '';
    try {
      text = JSON.parse(msg.content).text || '';
    } catch (e) {
      console.error('解析消息内容失败，content:', msg.content, e);
      text = '[消息格式异常]';
    }
    console.log('收到消息文本:', text);

    try {
      const reply = await chatWithGpt(text);
      console.log('ChatGPT 回复:', reply);

      const token = await getTenantAccessToken();
      console.log('Token 前10字符:', token.slice(0, 10), '...');

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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error('发送消息失败，状态码:', sendRes.status, '响应:', errText);
      } else {
        console.log('消息发送成功');
      }
    } catch (err) {
      console.error('处理消息异常:', err);
    }

    return res.status(200).send('ok');
  }

  console.log('非关注事件，忽略');
  return res.status(200).send('ok');
}
