const { contextBridge, ipcRenderer } = require('electron');

// Secure bridge for IPC
contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
  getAppVersion: () => process.versions.electron,
  printTestPage: () => ipcRenderer.send('print-test-page'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
