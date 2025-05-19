// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      console.warn('收到非POST请求，拒绝处理');
      return res.status(405).send('Method Not Allowed');
    }

    const body = req.body;

    // 飞书最新schema 2.0事件类型在 header.event_type
    const type = body.header?.event_type || '';
    const challenge = body.challenge || '';

    // 日志打印，方便调试
    console.log('收到请求体:', JSON.stringify(body, null, 2));
    console.log('事件类型:', type);

    // 飞书事件订阅首次验证请求
    if (type === 'url_verification') {
      console.log('收到 url_verification 请求，返回 challenge');
      return res.status(200).json({ challenge });
    }

    // 只处理消息接收事件
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
        text = '[消息内容格式异常]';
      }
      console.log('收到消息文本:', text);

      // 调用 ChatGPT 生成回复
      const reply = await chatWithGpt(text);
      console.log('ChatGPT 回复:', reply);

      // 获取飞书 tenant_access_token
      const token = await getTenantAccessToken();
      console.log('获取到的 tenant_access_token 前10字符:', token.slice(0, 10), '...');

      // 向飞书发送消息
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
        console.error('发送飞书消息失败，状态码:', sendRes.status, '响应内容:', errText);
      } else {
        console.log('消息发送成功');
      }

      return res.status(200).send('ok');
    }

    // 其他事件忽略
    console.log('非关注事件或格式异常，忽略');
    return res.status(200).send('ok');
  } catch (error) {
    console.error('处理请求时异常:', error);
    return res.status(500).send('Internal Server Error');
  }
}
