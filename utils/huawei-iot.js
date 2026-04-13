const core = require('@huaweicloud/huaweicloud-sdk-core');
const iotda = require("@huaweicloud/huaweicloud-sdk-iotda");

const ak = process.env.HUAWEI_AK;
const sk = process.env.HUAWEI_SK;
const endpoint = "https://aaa5e35be5.st1.iotda-app.cn-south-1.myhuaweicloud.com";
const project_id = "7ebb619da48b40b6a99c058288aa3449";
const region_id = "cn-south-1";
const deviceId = "69bc02f5c9429d337f397528_text";

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
    const response = await client.listProperties(request);
    return response;
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
    const response = await client.createCommand(request);
    return response;
}

module.exports = { queryDeviceProperties, sendDeviceCommand };