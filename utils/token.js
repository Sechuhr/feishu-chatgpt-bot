// utils/token.js
import axios from 'axios';

let cachedToken = '';
let expireAt = 0;

export async function getTenantAccessToken() {
  const now = Date.now() / 1000;

  if (cachedToken && now < expireAt - 60) {
    return cachedToken;
  }

  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: process.env.FEISHU_APP_ID,
    app_secret: process.env.FEISHU_APP_SECRET
  });

  if (res.data.code !== 0) {
    throw new Error('获取飞书 token 失败: ' + res.data.msg);
  }

  cachedToken = res.data.tenant_access_token;
  expireAt = now + res.data.expire;

  return cachedToken;
}
