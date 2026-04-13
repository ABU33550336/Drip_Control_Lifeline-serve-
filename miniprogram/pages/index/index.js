// pages/index/index.js
var app = getApp();

Page({
  data: {
    heartRate: '--',
    dripRate: '--',
    bottleRemain: '--',
    bottleCount: '--',
    alarm: false,
    hrMin: 60,
    hrMax: 120,
    dripMin: 20,
    dripMax: 60,
    targetSpeed: 60,
    heartHistory: [],
    logList: [],
    canvasCtx: null,
    canvasWidth: 600,
    canvasHeight: 200,
    apiBaseUrl: 'https://your-project.vercel.app/api',
    apiStatus: '等待连接...',
    isApiLoading: false
  },

  onLoad() {
    this.initPreviewData();
    this.log('系统正常工作中');
    this.fetchDeviceStatus();
    setInterval(() => this.fetchDeviceStatus(), 5000);
  },

  initPreviewData() {
    const now = Math.floor(Date.now() / 1000);
    const history = [];
    for (let i = 0; i < 20; i++) {
      history.push({
        timestamp: now - (19 - i) * 30,
        value: 70 + Math.floor(Math.random() * 30)
      });
    }
    this.setData({ heartHistory: history });
  },

  log(msg) {
    console.log(msg);
    const newList = [new Date().toLocaleTimeString() + ' - ' + msg, ...this.data.logList];
    if (newList.length > 20) newList.pop();
    this.setData({ logList: newList });
  },

  fetchDeviceStatus() {
    const that = this;
    const apiBaseUrl = this.data.apiBaseUrl;

    this.setData({ isApiLoading: true, apiStatus: '正在获取设备状态...' });

    wx.request({
      url: `${apiBaseUrl}/device-status`,
      method: 'GET',
      success(res) {
        console.log('[API] 获取设备状态响应:', res);
        if (res.statusCode === 200) {
          const data = res.data;
          if (data.error) {
            that.setData({
              apiStatus: '错误: ' + data.error,
              isApiLoading: false
            });
            that.log('错误: ' + data.error);
            return;
          }

          const props = data.properties || {};
          console.log('[API] 解析到的属性:', props);

          const newHeartRate = props.heart_rate;
          const newDripRate = props.drip_rate;
          const newBottleRemain = props.bottle_remain;
          const newBottleCount = props.bottle_count;
          const newAlarm = props.alarm ? true : false;

          if (newHeartRate !== undefined && newHeartRate !== null) {
            that.setData({ heartRate: newHeartRate });
            let history = that.data.heartHistory.slice();
            history.push({
              timestamp: Math.floor(Date.now() / 1000),
              value: newHeartRate
            });
            if (history.length > 20) history = history.slice(-20);
            that.setData({ heartHistory: history });
            if (that.data.canvasCtx) that.drawHeartChart();
          }
          if (newDripRate !== undefined && newDripRate !== null) that.setData({ dripRate: newDripRate });
          if (newBottleRemain !== undefined && newBottleRemain !== null) that.setData({ bottleRemain: newBottleRemain });
          if (newBottleCount !== undefined && newBottleCount !== null) that.setData({ bottleCount: newBottleCount });
          if (newAlarm !== undefined && newAlarm !== null) that.setData({ alarm: newAlarm });

          that.setData({ apiStatus: '状态更新成功', isApiLoading: false });
        } else {
          that.setData({
            apiStatus: `获取失败 (${res.statusCode})`,
            isApiLoading: false
          });
          that.log(`获取状态失败: ${res.statusCode}`);
        }
      },
      fail(err) {
        console.error('[API] 网络请求失败:', err);
        that.setData({
          apiStatus: '网络请求失败',
          isApiLoading: false
        });
        that.log('网络请求失败: ' + JSON.stringify(err));
      }
    });
  },

  sendCommand(command, param = null) {
    const that = this;
    const apiBaseUrl = this.data.apiBaseUrl;

    if (command === 'set_speed' && param !== null) {
      this.log(`发送设置滴速命令: ${param} 滴/分`);
    } else if (command === 'set_threshold') {
      this.log('发送设置阈值命令');
    } else {
      this.log(`发送命令: ${command}`);
    }

    let body = { command: command };
    if (param !== null) body.param = param;
    if (command === 'set_threshold') {
      body = {
        command: 'set_threshold',
        param: {
          hr_min: that.data.hrMin,
          hr_max: that.data.hrMax,
          drip_min: that.data.dripMin,
          drip_max: that.data.dripMax
        }
      };
    }

    wx.request({
      url: `${apiBaseUrl}/device-command`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: body,
      success(res) {
        if (res.statusCode === 200) {
          console.log(`命令 '${command}' 下发成功`);
        } else {
          console.error(`命令下发失败: ${res.statusCode}`, res.data);
          that.log(`命令下发失败: ${res.data.error || '未知错误'}`);
        }
      },
      fail(err) {
        console.error('命令请求网络失败:', err);
        that.log('命令请求网络失败');
      }
    });
  },

  start() { this.sendCommand('start'); },
  pause() { this.sendCommand('pause'); },
  switchBottle() { this.sendCommand('switch_bottle'); },
  clearAlarm() { this.sendCommand('clear_alarm'); },
  refresh() { this.fetchDeviceStatus(); },
  saveThreshold() { this.sendCommand('set_threshold'); },
  setSpeed() {
    const s = parseInt(this.data.targetSpeed);
    if (s >= 10 && s <= 150) this.sendCommand('set_speed', s);
    else this.log('滴速必须在10-150之间');
  },

  onCanvasReady() {
    wx.createSelectorQuery().select('#heartCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      this.setData({ canvasCtx: ctx, canvasWidth: canvas.width, canvasHeight: canvas.height });
      this.drawHeartChart();
    });
  },

  drawHeartChart() {
    const ctx = this.data.canvasCtx;
    if (!ctx) return;
    const w = this.data.canvasWidth, h = this.data.canvasHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath(); ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.moveTo(50, 20); ctx.lineTo(50, h - 30); ctx.lineTo(w - 20, h - 30); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.font = '10px Arial';
    for (let i = 0; i <= 5; i++) {
      const y = h - 30 - i * (h - 50) / 5;
      ctx.fillText(i * 30, 10, y + 3);
      ctx.beginPath(); ctx.moveTo(45, y); ctx.lineTo(50, y); ctx.stroke();
    }
    const history = this.data.heartHistory;
    if (history.length < 2) return;
    ctx.beginPath(); ctx.strokeStyle = 'blue'; ctx.lineWidth = 2;
    for (let i = 0; i < history.length; i++) {
      const x = 50 + i * (w - 70) / (history.length - 1);
      const y = h - 30 - (history[i].value / 150) * (h - 50);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
});