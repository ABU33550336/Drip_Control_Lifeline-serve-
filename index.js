const axios = require('axios');

const HUAWEI_CONFIG = {
  accountName: process.env.HUAWEI_ACCOUNT_NAME,
  password: process.env.HUAWEI_PASSWORD,
  domainName: process.env.HUAWEI_DOMAIN,
  projectId: process.env.PROJECT_ID || '7ebb619da48b40b6a99c058288aa3449',
  deviceId: process.env.DEVICE_ID || '69bc02f5c9429d337f397528_text',
  apiEndpoint: process.env.API_ENDPOINT || 'aaa5e35be5.st1.iotda-app.cn-south-1.myhuaweicloud.com'
};

let cachedToken = null;
let tokenExpireTime = 0;

async function getHuaweiToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpireTime - 300000) {
    return cachedToken;
  }

  const url = 'https://iam.cn-south-1.myhuaweicloud.com/v3/auth/tokens';
  const body = {
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: HUAWEI_CONFIG.accountName,
            password: HUAWEI_CONFIG.password,
            domain: { name: HUAWEI_CONFIG.domainName }
          }
        }
      },
      scope: { project: { id: HUAWEI_CONFIG.projectId } }
    }
  };

  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' }
  });

  cachedToken = res.headers['x-subject-token'];
  tokenExpireTime = new Date(res.data.token.expires_at).getTime();
  return cachedToken;
}

const BASE_URL = `https://${HUAWEI_CONFIG.apiEndpoint}/v5/iot/${HUAWEI_CONFIG.projectId}`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url || '/';

  try {
    if (path.includes('/api/device/status')) {
      const token = await getHuaweiToken();
      const response = await axios.get(
        `${BASE_URL}/devices/${HUAWEI_CONFIG.deviceId}/properties?service_id=infusion`,
        { headers: { 'X-Auth-Token': token } }
      );
      const props = (response.data.response?.services?.[0]?.properties) || {};
      res.json({ success: true, data: props });
      return;
    }

    if (path.includes('/api/device/command')) {
      const token = await getHuaweiToken();
      const { command, param, hrMin, hrMax, dripMin, dripMax } = req.body || {};
      const paras = command === 'set_speed' ? { command, speed: param }
        : command === 'set_threshold' ? { hr_min: hrMin, hr_max: hrMax, drip_min: dripMin, drip_max: dripMax }
        : { command };
      
      const response = await axios.post(
        `${BASE_URL}/devices/${HUAWEI_CONFIG.deviceId}/commands`,
        { service_id: 'control', command_name: 'control', paras },
        { headers: { 'X-Auth-Token': token } }
      );
      res.json({ success: response.status === 200, data: response.data });
      return;
    }

    res.json({ error: '未知路径' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};
