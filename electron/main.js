import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { CameraManagerBackend } from './camera/cameraManager.js';
import { FolderBridge } from './camera/FolderBridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security: Treat localhost as a secure origin for media devices
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://localhost:3000');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream'); // Auto-accept media stream permissions UI

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/Logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Ensure sandbox doesn't block hardware
    },
  });

  // Handle camera permission requests in Electron
  const session = mainWindow.webContents.session;
  
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'camera', 'microphone', 'display-capture'];
    if (allowedPermissions.includes(permission)) {
      return callback(true);
    }
    callback(false);
  });

  session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const allowedPermissions = ['media', 'camera', 'microphone', 'display-capture'];
    return allowedPermissions.includes(permission);
  });

  session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'video' || details.deviceType === 'audio') {
      return true;
    }
    return false;
  });

  // Enable full screen if needed for photobooth
  // mainWindow.setFullScreen(true);

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

app.whenReady().then(() => {
  const mainWindow = createWindow();
  
  // Initialize Camera Backend
  new CameraManagerBackend(mainWindow);
  
  // Initialize Automated Hot Folder Bridge
  const projectRoot = path.join(__dirname, '..');
  const bridge = new FolderBridge(projectRoot);
  bridge.start();
  
  // Stop bridge on app quit
  app.on('will-quit', () => bridge.stop());

  ipcMain.handle('get-printers', async (event) => {
    try {
      const printers = await event.sender.getPrintersAsync();
      console.log("System Detects Printers:", printers.map(p => p.name));
      return printers;
    } catch (err) {
      console.error("Failed to list printers:", err);
      return [];
    }
  });

  ipcMain.on('print-test-page', (event, { printerName } = {}) => {
    // Hidden window for 4R test print
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });

    // Simple 4R Test Pattern
    const testPattern = `
      <html>
        <body style="margin:0; padding:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background: white; font-family:sans-serif; text-align:center;">
          <style>
            @page { size: 4in 6in; margin: 0; }
            body { border: 1px solid #eee; box-sizing: border-box; }
          </style>
          <h1 style="font-size:60px; margin:0; font-weight: 900; color: #000;">Test Print</h1>
          <div style="width:150px; height:6px; background:#000; margin: 20px 0;"></div>
          <p style="font-size:18px; color: #000; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em;">Latarcerita Photobooth</p>
          <p style="font-size:12px; color: #666; margin-top: 10px;">Format: 4R (4x6 inches)</p>
          <p style="font-size:10px; color: #999; margin-top: 5px;">300 DPI High-Quality</p>
        </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testPattern)}`);

    printWindow.webContents.on('did-finish-load', () => {
      // Print to default printer
      printWindow.webContents.print({ 
        silent: true,
        printBackground: true, 
        deviceName: printerName || '',
        color: true,
        margins: { marginType: 'none' },
        dpi: { horizontal: 300, vertical: 300 }
      }, (success, failureReason) => {
        if (!success) console.error("Print Failed:", failureReason);
        printWindow.close();
      });
    });
  });

  ipcMain.on('print-image', (event, { imageUrl, copies = 1, printerName = '' }) => {
    console.log(`Printing image: ${imageUrl.substring(0, 50)}... x${copies}`);
    
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });

    // Load a simple HTML wrapper for the image to ensure correct sizing
    const html = `
      <html>
        <body style="margin:0; padding:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:white;">
          <style>
             @page { size: 4in 6in; margin: 0; }
          </style>
          <img src="${imageUrl}" style="width:100%; height:100%; object-fit:contain;" />
        </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName || '',
        copies: copies,
        color: true,
        margins: { marginType: 'none' },
        dpi: { horizontal: 300, vertical: 300 }
      }, (success, failureReason) => {
        if (!success) console.error("Photo Print Failed:", failureReason);
        printWindow.close();
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
