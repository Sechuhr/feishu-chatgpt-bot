import { getTenantAccessToken } from '../utils/token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { header, event, challenge } = req.body;
  const type = header?.event_type || '';

  if (type === 'url_verification') {
    return res.status(200).json({ challenge });
  }

  if (type === 'im.message.receive_v1') {
    if (!event?.message) return res.status(200).send('ok');

    const msg = event.message;

    // 固定回复测试
    const reply = '测试回复：飞书消息发送成功。';

    const token = await getTenantAccessToken();

    const payload = {
      receive_id_type: 'chat_id',
      receive_id: msg.chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text: reply }),
    };

    const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const respText = await response.text();

    if (!response.ok) {
      console.error('飞书发送消息失败', response.status, respText);
    } else {
      console.log('飞书发送消息成功', respText);
    }

    return res.status(200).send('ok');
  }

  return res.status(200).send('ok');
}
