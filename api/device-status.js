module.exports = async (req, res) => {
  const { queryDeviceProperties } = require('../utils/huawei-iot');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const data = await queryDeviceProperties();
    res.status(200).json(data);
  } catch (error) {
    console.error('查询设备状态失败:', error);
    res.status(500).json({ error: error.message });
  }
};