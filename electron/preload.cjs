const { contextBridge, ipcRenderer } = require('electron');

// Secure bridge for IPC
contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
  getAppVersion: () => process.versions.electron,
  printTestPage: (printerName, pageSize, autoEpsonMatte) => ipcRenderer.send('print-test-page', { printerName, pageSize, autoEpsonMatte }),
  printImage: (imageUrl, copies, printerName, pageSize, autoEpsonMatte) => ipcRenderer.send('print-image', { imageUrl, copies, printerName, pageSize, autoEpsonMatte }),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  deleteCaptures: () => ipcRenderer.invoke('delete-captures'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  getPhoneCameraUrl: () => ipcRenderer.invoke('get-phone-camera-url'),

  // Canon / gphoto2 — direct USB control, no EOS Webcam Utility needed
  canonDetect: () => ipcRenderer.invoke('canon:detect'),
  canonCapturePhoto: () => ipcRenderer.invoke('canon:capturePhoto'),
  canonStartPreview: () => ipcRenderer.invoke('canon:startPreview'),
  canonStopPreview: () => ipcRenderer.invoke('canon:stopPreview'),
  canonGetStatus: () => ipcRenderer.invoke('canon:getStatus'),
  onCanonPreviewFrame: (callback) => ipcRenderer.on('canon:previewFrame', (_, frame) => callback(frame)),
  offCanonPreviewFrame: () => ipcRenderer.removeAllListeners('canon:previewFrame'),
});
