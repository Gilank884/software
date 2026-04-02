import { ipcMain } from 'electron';
import { CanonDriver } from './canonDriver.js';

export class CameraManagerBackend {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.canon = new CanonDriver();
    this.setupIPC();
  }

  setupIPC() {
    ipcMain.handle('camera:init', async () => {
      try {
        const result = await this.canon.init();
        return result;
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('camera:startPreview', async () => {
      try {
        const result = await this.canon.startPreview();
        return result;
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('camera:stopPreview', async () => {
      try {
        const result = await this.canon.stopPreview();
        return result;
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('camera:capture', async () => {
      try {
        const result = await this.canon.capture();
        return result;
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    ipcMain.handle('camera:getStatus', async () => {
      try {
        const status = await this.canon.getStatus();
        return { success: true, status };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // Listen for frames and send them to the renderer
    this.canon.on('frame', (base64Frame) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('camera:previewFrame', base64Frame);
      }
    });
  }
}
