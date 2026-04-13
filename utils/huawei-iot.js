const core = require('@huaweicloud/huaweicloud-sdk-core');
const iotda = require('@huaweicloud/huaweicloud-sdk-iotda');

const ak = process.env.HUAWEI_AK;
const sk = process.env.HUAWEI_SK;
const endpoint = process.env.HUAWEI_IOTDA_ENDPOINT;
const projectId = process.env.HUAWEI_PROJECT_ID;
const deviceId = process.env.HUAWEI_DEVICE_ID;

function getClient() {
  if (!ak || !sk || !endpoint || !projectId || !deviceId) {
    throw new Error('请在环境变量中配置 HUAWEI_AK, HUAWEI_SK, HUAWEI_PROJECT_ID, HUAWEI_DEVICE_ID, HUAWEI_IOTDA_ENDPOINT');
  }

  const credentials = new core.BasicCredentials()
    .withAk(ak)
    .withSk(sk)
    .withProjectId(projectId);

  return iotda.IoTDAClient.newBuilder()
    .withCredential(credentials)
    .withEndpoint(endpoint)
    .build();
}

async function queryDeviceProperties() {
  const client = getClient();
  const request = new iotda.ListDevicePropertiesRequest();
  request.deviceId = deviceId;
  request.serviceId = 'infusion';
  const response = await client.listDeviceProperties(request);
  return response;
}

async function sendDeviceCommand(command, param) {
  const client = getClient();
  const request = new iotda.CreateCommandRequest();
  request.deviceId = deviceId;

  let paras = { command: command };
  if (command === 'set_speed' && param !== null) {
    paras.speed = param;
  } else if (command === 'set_threshold' && param) {
    Object.assign(paras, param);
  }

  const body = new iotda.CommandBody({
    serviceId: 'control',
    commandName: 'control',
    paras: paras
  });
  request.body = body;

  const response = await client.createCommand(request);
  return response;
}

module.exports = { queryDeviceProperties, sendDeviceCommand };