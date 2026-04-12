module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.json({ 
    message: 'API is working!',
    path: req.url,
    method: req.method,
    env: {
      hasAccountName: !!process.env.HUAWEI_ACCOUNT_NAME,
      hasPassword: !!process.env.HUAWEI_PASSWORD,
      hasDomain: !!process.env.HUAWEI_DOMAIN
    }
  });
};
