// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

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
      if (!event?.message) {
        console.log('缺少 message 字段，忽略');
        return res.status(200).send('ok');
      }
      const msg = event.message;

      let text = '';
      try {
        text = JSON.parse(msg.content).text || '';
      } catch (e) {
        console.error('消息内容解析失败', e);
        text = '[消息格式异常]';
      }
      console.log('收到消息文本:', text);

      // 调用 GPT
      const reply = await chatWithGpt(text);
      console.log('ChatGPT 回复:', reply);

      // 获取飞书 Token
      const token = await getTenantAccessToken();
      console.log('Token 前10字符:', token.slice(0, 10), '...');

      // 发送消息
      const bodyToSend = {
        receive_id_type: 'chat_id',   // 严格小写字符串
        receive_id: msg.chat_id,
        msg_type: 'text',
        content: JSON.stringify({ text: reply })
      };
      console.log('发送飞书消息请求体:', JSON.stringify(bodyToSend));

      const sendRes = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyToSend)
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error('发送消息失败，状态码:', sendRes.status, '响应:', errText);
      } else {
        console.log('消息发送成功');
      }

      return res.status(200).send('ok');
    }

    console.log('非关注事件，忽略');
    return res.status(200).send('ok');
  } catch (error) {
    console.error('处理异常:', error);
    return res.status(500).send('Internal Server Error');
  }
}
