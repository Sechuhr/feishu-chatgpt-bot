// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';

  // 从飞书事件体中获取 chat_id

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // 安全校验，防止空请求
  if (!req.body || !req.body.event || !req.body.event.message) {
    console.log('请求体缺少 event 或 message');
    return res.status(200).send('ok');
  }

  // 从飞书事件体中获取 chat_id
  const chatId = req.body.event.message.chat_id;
  const messageText = (() => {
    try {
      return JSON.parse(req.body.event.message.content).text;
    } catch {
      return '[解析消息内容失败]';
    }
  })();

  console.log('拿到的 chat_id:', chatId);
  console.log('收到消息内容:', messageText);

  // 这里你可以加代码调用飞书发送接口，给 chatId 回复消息

  res.status(200).send('ok');
}

  // 从飞书事件体中获取 chat_id

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const msg = req.body?.event?.message;
  if (!msg) return res.status(200).send('ok');

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
    receive_id: msg.chat_id,
    msg_type: 'text',
    content: JSON.stringify({ text: reply }),
  };

  const bodyStr = JSON.stringify(payload);
  console.log('发送请求体:', bodyStr);

  try {
    const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: bodyStr,
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
