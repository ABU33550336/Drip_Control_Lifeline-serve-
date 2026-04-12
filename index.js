module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ 
    message: 'Server is running', 
    path: req.url,
    method: req.method,
    time: new Date().toISOString()
  });
};
