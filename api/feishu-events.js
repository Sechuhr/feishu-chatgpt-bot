// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn('收到非POST请求，拒绝处理');
    return res.status(405).send('Method Not Allowed');
  }

  const { type, challenge, event } = req.body;

  console.log('收到飞书事件请求体:', JSON.stringify(req.body, null, 2));

  if (type === 'url_verification') {
    console.log('收到飞书url_verification请求，返回challenge');
    return res.status(200).json({ challenge });
  }

  if (type === 'event_callback' && event && event.event && event.event.message) {
    const msg = event.event.message;
    let text = '';
    try {
      text = JSON.parse(msg.content).text;
    } catch (parseErr) {
      console.error('解析消息内容失败，content:', msg.content, parseErr);
      text = '[消息内容格式异常]';
    }
    console.log('收到消息文本:', text);

    try {
      const reply = await chatWithGpt(text);
      console.log('ChatGPT回复内容:', reply);

      const token = await getTenantAccessToken();
      console.log('获取的飞书token前10字符:', token.slice(0, 10), '...');

      const sendRes = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receive_id_type: 'chat_id',
          receive_id: msg.chat_id,
          msg_type: 'text',
          content: JSON.stringify({ text: reply })
        })
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error('发送消息失败，状态码:', sendRes.status, '响应内容:', errText);
      } else {
        console.log('消息发送成功');
      }
    } catch (err) {
      console.error('处理消息异常:', err);
    }
  } else {
    console.log('收到非消息事件或事件格式异常，忽略');
  }

  return res.status(200).send('ok');
}
