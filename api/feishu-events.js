// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';
import { chatWithGpt } from '../utils/openai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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
      console.error('ChatGPT请求失败:', err);
      reply = 'ChatGPT 暂时无法回答，请稍后再试。';
    }
    console.log('ChatGPT 回复:', reply);

    // 获取飞书 token
    const token = await getTenantAccessToken();

    // 注意这里body结构，保证无任何多余空格或类型错误
    const payload = {
      receive_id_type: 'chat_id',    // **必须字符串且全部小写**
      receive_id: msg.chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply }),
    };

    console.log('发送飞书消息请求体:', JSON.stringify(payload));

    // 发送请求
    const sendRes = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',  // **必须准确**
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('发送飞书消息失败，状态码:', sendRes.status, '响应:', errText);
    } else {
      console.log('消息发送成功');
    }

    return res.status(200).send('ok');
  }

  return res.status(200).send('ok');
}
