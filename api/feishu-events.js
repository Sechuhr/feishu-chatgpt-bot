// api/feishu-events.js
import { getTenantAccessToken } from '../utils/token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const msg = req.body?.event?.message;
  if (!msg) return res.status(200).send('ok');

  // 固定回复，避免调用GPT，方便测试飞书消息发送流程是否正常
  const reply = '机器人测试回复';

  let token = '';
  try {
    token = await getTenantAccessToken();
  } catch (err) {
    console.error('获取飞书token失败:', err);
    return res.status(500).send('获取token失败');
  }

  const payload = {
    receive_id_type: 'chat_id',    // 必须是字符串，且全部小写
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
