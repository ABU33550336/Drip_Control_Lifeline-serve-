const axios = require('axios');

const HUAWEI_CONFIG = {
  accountName: process.env.HUAWEI_ACCOUNT_NAME || 'your-email@example.com',
  password: process.env.HUAWEI_PASSWORD || 'your-password',
  domainName: process.env.HUAWEI_DOMAIN || 'your-domain',
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

  console.log('刷新华为云IAM Token...');
  const url = `https://iam.cn-south-1.myhuaweicloud.com/v3/auth/tokens`;
  
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
      scope: {
        project: { id: HUAWEI_CONFIG.projectId }
      }
    }
  };

  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' }
  });

  cachedToken = res.headers['x-subject-token'];
  const expires = res.data.token.expires_at;
  tokenExpireTime = new Date(expires).getTime();
  
  console.log(`Token刷新成功，过期时间: ${expires}`);
  return cachedToken;
}

const BASE_URL = `https://${HUAWEI_CONFIG.apiEndpoint}/v5/iot/${HUAWEI_CONFIG.projectId}`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url;

  try {
    if (path === '/api/device/status' || path.startsWith('/api/device/status')) {
      const token = await getHuaweiToken();
      const url = `${BASE_URL}/devices/${HUAWEI_CONFIG.deviceId}/properties?service_id=infusion`;
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        }
      });

      if (response.status === 200) {
        const data = response.data.response || {};
        const services = data.services || [];
        if (services.length === 0) {
          return res.json({ success: true, data: {} });
        }
        return res.json({ success: true, data: services[0].properties || {} });
      } else {
        return res.json({ success: false, error: `API错误: ${response.status}` });
      }
    } 
    else if (path === '/api/device/command' || path.startsWith('/api/device/command')) {
      const token = await getHuaweiToken();
      const { command, param, hrMin, hrMax, dripMin, dripMax } = req.body || {};
      const url = `${BASE_URL}/devices/${HUAWEI_CONFIG.deviceId}/commands`;

      let body = {};
      if (command === 'set_speed' && param !== null) {
        body = {
          service_id: 'control',
          command_name: 'control',
          paras: { command: 'set_speed', speed: param }
        };
      } else if (command === 'set_threshold') {
        body = {
          service_id: 'control',
          command_name: 'control',
          paras: { hr_min: hrMin, hr_max: hrMax, drip_min: dripMin, drip_max: dripMax }
        };
      } else {
        body = {
          service_id: 'control',
          command_name: 'control',
          paras: { command: command }
        };
      }

      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        }
      });

      return res.json({ success: response.status === 200, data: response.data });
    } 
    else {
      return res.json({ success: false, error: '未知路径' });
    }
  } catch (error) {
    console.error('请求错误:', error.message);
    return res.json({ success: false, error: error.message });
  }
};
