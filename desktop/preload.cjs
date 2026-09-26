/**
 * Sadik Sons Enterprises — Desktop Preload Context Bridge
 * Exposes native desktop OS integration securely to the UI
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: process.platform,

  openFolder(path) {
    return ipcRenderer.invoke('open-folder', path);
  },

  openFile(path) {
    return ipcRenderer.invoke('open-file', path);
  },

  selectFile(options) {
    return ipcRenderer.invoke('select-file', options);
  },

  printSpine() {
    return ipcRenderer.invoke('print-spine');
  },

  getAppVersion() {
    return ipcRenderer.invoke('get-app-version');
  }
});
