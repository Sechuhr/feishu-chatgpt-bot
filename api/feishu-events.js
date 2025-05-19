// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (!req.body || !req.body.event || !req.body.event.message) {
    console.log('请求体缺少 event 或 message');
    return res.status(200).send('ok');
  }

  const msg = req.body.event.message;
  const chatId = msg.chat_id;
  let messageText = '';
  try {
    messageText = JSON.parse(msg.content).text;
  } catch {
    messageText = '[解析消息内容失败]';
  }

  console.log('拿到的 chat_id:', chatId);
  console.log('收到消息内容:', messageText);

  const reply = '机器人测试回复';

  let token = '';
  try {
    token = await getTenantAccessToken();
  } catch (err) {
    console.error('获取飞书token失败:', err);
    return res.status(500).send('获取token失败');
  }

  const payload = {
    receive_id_type: 'chat_id',
    receive_id: chatId,
    msg_type: 'text',
    content: JSON.stringify({ text: reply }),
  };

  try {
    const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error('飞书发送消息失败，状态码:', response.status, '响应:', text);
    } else {
      console.log('飞书发送消息成功:', text);
    }
  } catch (err) {
    console.error('飞书发送消息异常:', err);
  }

  return res.status(200).send('ok');
}
