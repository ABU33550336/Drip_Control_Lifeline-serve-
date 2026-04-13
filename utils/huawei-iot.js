const crypto = require('crypto');
const https = require('https');

const AK = process.env.HUAWEI_AK;
const SK = process.env.HUAWEI_SK;
const PROJECT_ID = process.env.HUAWEI_PROJECT_ID;
const DEVICE_ID = process.env.HUAWEI_DEVICE_ID;
const IOTDA_ENDPOINT = process.env.HUAWEI_IOTDA_ENDPOINT;

function generateSignature(method, path, headers, body, timestamp) {
  const sortedHeaders = Object.keys(headers)
    .filter(k => k.toLowerCase().startsWith('x-') || k.toLowerCase() === 'host')
    .sort()
    .reduce((obj, k) => ({ ...obj, [k]: headers[k] }), {});

  const headerStr = Object.keys(sortedHeaders)
    .map(k => `${k.toLowerCase()}:${sortedHeaders[k]}`)
    .join('\n');

  const bodyStr = body ? JSON.stringify(body) : '';
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

  const signedHeaders = Object.keys(sortedHeaders).map(k => k.toLowerCase()).join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    path,
    '',
    headerStr,
    signedHeaders,
    bodyHash
  ].join('\n');

  const algorithm = 'SDK-HMAC-SHA256';
  const date = timestamp.substring(0, 8);
  const credentialScope = `${date}/default/sdk_request`;

  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  const kDate = crypto.createHmac('sha256', SK).update(date).digest();
  const kService = crypto.createHmac('sha256', kDate).update('iotda').digest();
  const kSigning = crypto.createHmac('sha256', kService).update('sdk_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return `${algorithm} Credential=${AK}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function huaweiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    if (!AK || !SK || !PROJECT_ID || !DEVICE_ID || !IOTDA_ENDPOINT) {
      reject(new Error('请在环境变量中配置 HUAWEI_AK, HUAWEI_SK, HUAWEI_PROJECT_ID, HUAWEI_DEVICE_ID, HUAWEI_IOTDA_ENDPOINT'));
      return;
    }

    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const headers = {
      'Content-Type': 'application/json',
      'Host': IOTDA_ENDPOINT,
      'X-Sdk-Date': timestamp
    };

    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = generateSignature(method, path, headers, body, timestamp);
    headers['Authorization'] = signature;

    const options = {
      hostname: IOTDA_ENDPOINT,
      port: 443,
      path: path,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

async function queryDeviceProperties() {
  const path = `/v5/iot/${PROJECT_ID}/devices/${DEVICE_ID}/properties?service_id=infusion`;
  return huaweiRequest('GET', path);
}

async function sendDeviceCommand(command, param) {
  const path = `/v5/iot/${PROJECT_ID}/devices/${DEVICE_ID}/commands`;
  
  let paras = { command: command };
  if (command === 'set_speed' && param !== null) {
    paras.speed = param;
  } else if (command === 'set_threshold' && param) {
    paras = { ...param };
  }

  const body = {
    service_id: 'control',
    command_name: 'control',
    paras: paras
  };

  return huaweiRequest('POST', path, body);
}

module.exports = { queryDeviceProperties, sendDeviceCommand };