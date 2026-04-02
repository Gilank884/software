const { contextBridge, ipcRenderer } = require('electron');

// Secure bridge for IPC
contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
  getAppVersion: () => process.versions.electron,
  printTestPage: (printerName) => ipcRenderer.send('print-test-page', { printerName }),
  printImage: (imageUrl, copies, printerName) => ipcRenderer.send('print-image', { imageUrl, copies, printerName }),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
