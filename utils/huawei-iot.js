const core = require('@huaweicloud/huaweicloud-sdk-core');
const iotda = require("@huaweicloud/huaweicloud-sdk-iotda");

const ak = process.env.HUAWEI_AK;
const sk = process.env.HUAWEI_SK;
const project_id = process.env.HUAWEI_PROJECT_ID;
const deviceId = process.env.HUAWEI_DEVICE_ID;
const region_id = "cn-south-1";
const endpoint = "https://aaa5e35be5.st1.iotda-app.cn-south-1.myhuaweicloud.com";

const credentials = new core.BasicCredentials()
    .withAk(ak)
    .withSk(sk)
    .withDerivedPredicate(core.BasicCredentials.getDefaultDerivedPredicate)
    .withProjectId(project_id);

const client = iotda.IoTDAClient.newBuilder()
    .withCredential(credentials)
    .withEndpoint(endpoint)
    .withRegion(new core.Region(region_id, endpoint))
    .build();

async function queryDeviceProperties() {
    const request = new iotda.ListPropertiesRequest();
    request.deviceId = deviceId;
    request.serviceId = "infusion";
    try {
        const response = await client.listProperties(request);
        return response;
    } catch (error) {
        console.error('查询设备属性失败:', error);
        throw error;
    }
}

async function sendDeviceCommand(command, param) {
    const request = new iotda.CreateCommandRequest();
    request.deviceId = deviceId;
    const body = new iotda.CommandBody({
        serviceId: "control",
        commandName: "control",
        paras: (command === 'set_speed' && param) ? { command, speed: param } : { command }
    });
    request.body = body;
    try {
        const response = await client.createCommand(request);
        return response;
    } catch (error) {
        console.error('命令下发失败:', error);
        throw error;
    }
}

module.exports = { queryDeviceProperties, sendDeviceCommand };