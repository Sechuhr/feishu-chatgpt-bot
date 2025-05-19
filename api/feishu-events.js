// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn('收到非POST请求，拒绝处理');
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body;

  // 全量日志打印，便于排查事件结构
  console.log('收到请求体:', JSON.stringify(body, null, 2));
  console.log('type:', body.type);
  console.log('event:', JSON.stringify(body.event, null, 2));
  console.log('event.event:', JSON.stringify(body.event?.event, null, 2));
  console.log('event.event.message:', JSON.stringify(body.event?.event?.message, null, 2));

  if (body.type === 'url_verification') {
    console.log('收到url_verification，返回challenge');
    return res.status(200).json({ challenge: body.challenge });
  }

  if (
    body.type === 'event_callback' &&
    body.event &&
    body.event.event &&
    body.event.event.message
  ) {
    const msg = body.event.event.message;

    let text = '';
    try {
      text = JSON.parse(msg.content).text;
    } catch (err) {
      console.error('解析消息内容失败，content:', msg.content, err);
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
