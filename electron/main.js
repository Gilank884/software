import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';

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
      preload: path.join(__dirname, 'preload.js'),
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
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-printers', async (event) => {
    return event.sender.getPrintersAsync();
  });

  ipcMain.on('print-test-page', (event) => {
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
        <body style="margin:0; padding:0; width:6in; height:4in; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px solid black; font-family:sans-serif; text-align:center;">
          <h1 style="font-size:48px; margin:0 0 10px 0;">LATARCERITA</h1>
          <h2 style="font-size:32px; margin:0 0 20px 0; color:#3b82f6;">4R TEST PRINT</h2>
          <div style="width:400px; height:10px; background:#3b82f6; border-radius:5px; margin-bottom:20px;"></div>
          <p style="font-size:14px; color:#64748b;">PRINTER CALIBRATION & TEST SUCCESSFUL</p>
          <div style="margin-top:30px; border:1px dashed #cbd5e1; width:80%; padding:10px;">
            <p style="font-size:12px; color:#94a3b8; margin:0;">Target Format: 4x6 Inches (4R)</p>
          </div>
        </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testPattern)}`);

    printWindow.webContents.on('did-finish-load', () => {
      // Print to default printer
      printWindow.webContents.print({ 
        silent: false, // Set to false to allow printer selection/check in test mode
        printBackground: true, 
        deviceName: '' // Default printer
      }, (success, failureReason) => {
        if (!success) console.error("Print Failed:", failureReason);
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
