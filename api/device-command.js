module.exports = async (req, res) => {
  const { sendDeviceCommand } = require('../utils/huawei-iot');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { command, param } = req.body;
    const result = await sendDeviceCommand(command, param);
    res.status(200).json(result);
  } catch (error) {
    console.error('命令下发失败:', error);
    res.status(500).json({ error: error.message });
  }
};