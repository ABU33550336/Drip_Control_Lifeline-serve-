const crypto = require('crypto');
const https = require('https');

const AK = process.env.HUAWEI_AK;
const SK = process.env.HUAWEI_SK;
const PROJECT_ID = process.env.HUAWEI_PROJECT_ID;
const DEVICE_ID = process.env.HUAWEI_DEVICE_ID;
const IOTDA_ENDPOINT = process.env.HUAWEI_IOTDA_ENDPOINT;

function canonicalQueryString(query) {
  if (!query || Object.keys(query).length === 0) return '';
  return Object.keys(query)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');
}

function generateSignature(method, path, query, headers, body, timestamp) {
  const canonicalUri = path;
  const canonicalQuery = canonicalQueryString(query);

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
    canonicalUri,
    canonicalQuery,
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

  const derivedKey = crypto.createHmac('sha256', SK).update('DefaultDerivedSignKey').digest();
  const kDate = crypto.createHmac('sha256', derivedKey).update(date).digest();
  const kService = crypto.createHmac('sha256', kDate).update('iotda').digest();
  const kSigning = crypto.createHmac('sha256', kService).update('sdk_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return `${algorithm} Credential=${AK}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function huaweiRequest(method, path, query = null, body = null) {
  return new Promise((resolve, reject) => {
    if (!AK || !SK || !PROJECT_ID || !DEVICE_ID || !IOTDA_ENDPOINT) {
      reject(new Error('环境变量缺失'));
      return;
    }

    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const headers = {
      'Content-Type': 'application/json',
      'Host': IOTDA_ENDPOINT,
      'X-Sdk-Date': timestamp
    };

    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = generateSignature(method, path, query, headers, body, timestamp);
    headers['Authorization'] = signature;

    const queryStr = canonicalQueryString(query);
    const fullPath = queryStr ? `${path}?${queryStr}` : path;

    const options = {
      hostname: IOTDA_ENDPOINT,
      port: 443,
      path: fullPath,
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
  const path = `/v5/iot/${PROJECT_ID}/devices/${DEVICE_ID}/properties`;
  const query = { service_id: 'infusion' };
  return huaweiRequest('GET', path, query);
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

  return huaweiRequest('POST', path, null, body);
}

module.exports = { queryDeviceProperties, sendDeviceCommand };