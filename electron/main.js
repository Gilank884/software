import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { CameraManagerBackend } from './camera/cameraManager.js';
import { FolderBridge } from './camera/FolderBridge.js';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const execAsync = promisify(exec);

const POWERSHELL_PATH = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const WMIC_PATH = 'C:\\Windows\\System32\\wbem\\wmic.exe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security: Treat localhost as a secure origin for media devices
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://localhost:3000');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream'); // Auto-accept media stream permissions UI

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
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

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

// ─── Helper: execAsync with timeout ───────────────────────────────────────────
const execWithTimeout = (cmd, timeoutMs = 8000) => {
  return Promise.race([
    execAsync(cmd),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Command timed out: ${cmd}`)), timeoutMs)
    ),
  ]);
};

// ─── Windows Printer Discovery ────────────────────────────────────────────────
const getWindowsPrinters = async () => {
  const allPrinters = new Map();

  // Helper to run PS with UTF-8 encoding
  const runPS = (command) => {
    const utf8Command = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`;
    // Try raw 'powershell' first, then absolute path
    return execWithTimeout(`powershell -ExecutionPolicy Bypass -NoProfile -Command "${utf8Command}"`)
      .catch(() => execWithTimeout(`"${POWERSHELL_PATH}" -ExecutionPolicy Bypass -NoProfile -Command "${utf8Command}"`));
  };

  const methods = [
    // Method A: PowerShell Get-Printer (most reliable on modern Win)
    runPS('Get-Printer | Select-Object Name,IsDefault | ConvertTo-Json -Compress')
      .then(({ stdout }) => {
        if (!stdout?.trim()) return;
        try {
          let parsed = JSON.parse(stdout.trim());
          if (!Array.isArray(parsed)) parsed = [parsed];
          parsed.forEach(p => {
            if (p?.Name) {
              allPrinters.set(p.Name, {
                name: p.Name,
                displayName: p.Name,
                isDefault: !!p.IsDefault,
                status: 0,
                source: 'powershell-json',
              });
            }
          });
        } catch (e) { console.warn('[Printer] Method A Parse failed:', e.message); }
      }).catch(e => console.warn('[Printer] Method A (PS JSON) failed:', e.message)),

    // Method B: WMI via PowerShell (fallback)
    runPS('Get-WmiObject Win32_Printer | Select-Object Name,Default | ConvertTo-Json -Compress')
      .then(({ stdout }) => {
        if (!stdout?.trim()) return;
        try {
          let parsed = JSON.parse(stdout.trim());
          if (!Array.isArray(parsed)) parsed = [parsed];
          parsed.forEach(p => {
            if (p?.Name && !allPrinters.has(p.Name)) {
              allPrinters.set(p.Name, {
                name: p.Name,
                displayName: p.Name,
                isDefault: !!p.Default,
                status: 0,
                source: 'wmi-json',
              });
            }
          });
        } catch (e) { console.warn('[Printer] Method B Parse failed:', e.message); }
      }).catch(e => console.warn('[Printer] Method B (WMI JSON) failed:', e.message)),

    // Method C: Legacy WMIC (fallback)
    execWithTimeout('wmic printer get name,default /format:csv', 6000)
      .catch(() => execWithTimeout(`"${WMIC_PATH}" printer get name,default /format:csv`, 6000))
      .then(({ stdout }) => {
        if (!stdout?.trim()) return;
        const lines = stdout.split(/\r?\n/).filter(Boolean);
        lines.slice(1).forEach(line => {
          const parts = line.split(',');
          if (parts.length >= 3) {
            const name = parts[parts.length - 1]?.trim();
            const isDefault = parts[parts.length - 2]?.trim().toUpperCase() === 'TRUE';
            if (name && !allPrinters.has(name)) {
              allPrinters.set(name, {
                name,
                displayName: name,
                isDefault,
                status: 0,
                source: 'wmic-csv',
              });
            }
          }
        });
      }).catch(e => console.warn('[Printer] Method C (WMIC CSV) failed:', e.message)),
  ];

  await Promise.allSettled(methods);
  return allPrinters;
};

app.whenReady().then(() => {
  createWindow();

  // Initialize Camera Backend
  new CameraManagerBackend(mainWindow);

  // Initialize Automated Hot Folder Bridge
  const projectRoot = path.join(__dirname, '..');
  const bridge = new FolderBridge(projectRoot);
  bridge.start();

  // Stop bridge on app quit
  app.on('will-quit', () => bridge.stop());

  ipcMain.handle('get-printers', async (event) => {
    console.log('[Printer] Starting discovery...');
    const allPrinters = new Map();

    // Step 1: Electron built-in API (jalan di dev & production)
    // Gunakan event.sender (window yang merequest) sebagai prioritas utama
    try {
      const printers = await event.sender.getPrintersAsync();
      if (printers?.length > 0) {
        printers.forEach(p => {
          allPrinters.set(p.name, {
            name: p.name,
            isDefault: !!p.isDefault,
            status: p.status || 0,
            displayName: p.displayName || p.name,
            source: 'electron-api',
          });
        });
        console.log(`[Printer] Electron API found ${printers.length} printer(s)`);
      }
    } catch (e) {
      console.warn('[Printer] Native API (event.sender) failed:', e.message);
      
      // Fallback: Coba semua window jika sender gagal
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        try {
          const printers = await win.webContents.getPrintersAsync();
          if (printers?.length > 0) {
            printers.forEach(p => {
              if (!allPrinters.has(p.name)) {
                allPrinters.set(p.name, {
                  name: p.name,
                  isDefault: !!p.isDefault,
                  status: p.status || 0,
                  displayName: p.displayName || p.name,
                  source: 'electron-api-fallback',
                });
              }
            });
          }
        } catch (innerE) { /* ignore */ }
      }
    }

    // Step 2: Windows OS-level fallback — SELALU dijalankan di Windows
    if (process.platform === 'win32') {
      console.log('[Printer] Running Windows OS discovery (parallel)...');
      const osPrinters = await getWindowsPrinters();
      osPrinters.forEach((val, key) => {
        const trimmedKey = key.trim();
        if (!allPrinters.has(trimmedKey)) {
          allPrinters.set(trimmedKey, val);
        } else if (val.isDefault) {
          // Prioritaskan info isDefault dari OS jika native tidak set
          allPrinters.get(trimmedKey).isDefault = true;
        }
      });
    }

    const results = Array.from(allPrinters.values());
    console.log(`[Printer] Discovery done. Total: ${results.length}`, results.map(p => p.name));
    return results;
  });

  const printWithLp = async (imageUrl, printerName, pageSize, copies, autoEpsonMatte) => {
    const isMac = process.platform === 'darwin';
    const isEpson = printerName.toLowerCase().includes('epson');

    if (isEpson && autoEpsonMatte) {
      if (isMac) {
        console.log(`Using lp command for Epson Matte printing on Mac: ${printerName}`);
        const tempDir = os.tmpdir();
        const fileName = `print_${Date.now()}.png`;
        const filePath = path.join(tempDir, fileName);

        try {
          const base64Data = imageUrl.replace(/^data:image\/png;base64,/, '');
          await writeFileAsync(filePath, base64Data, 'base64');

          const mediaOption = pageSize.toLowerCase() === 'a4' ? 'A4' : '4x6.FullBleed';
          const copiesOption = copies > 1 ? `-n ${copies}` : '';

          const lpCommand = `lp -d "${printerName}" ${copiesOption} -o media=${mediaOption} -o MediaType=Matte -o EP_MATTE=True "${filePath}"`;

          console.log(`Executing: ${lpCommand}`);
          await execAsync(lpCommand);
          console.log('Print command sent successfully via lp');

          await unlinkAsync(filePath);
          return true;
        } catch (err) {
          console.error('Lp Print Failed, falling back to standard print:', err);
          if (fs.existsSync(filePath)) await unlinkAsync(filePath);
          return false;
        }
      } else if (process.platform === 'win32') {
        console.log(`Epson Matte requested on Windows for: ${printerName}. Using standard print.`);
        return false;
      }
    }
    return false;
  };

  ipcMain.on('print-test-page', async (event, { printerName, pageSize = '4r', autoEpsonMatte = false } = {}) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { offscreen: true },
    });

    const testPattern = `
      <html>
        <body style="margin:0; padding:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background: white; font-family:sans-serif; text-align:center;">
          <style>
            @page { size: ${pageSize.toLowerCase() === 'a4' ? '210mm 297mm' : '4in 6in'}; margin: 0; }
            body { border: 1px solid #eee; box-sizing: border-box; }
          </style>
          <h1 style="font-size:60px; margin:0; font-weight: 900; color: #000;">Test Print</h1>
          <div style="width:150px; height:6px; background:#000; margin: 20px 0;"></div>
          <p style="font-size:18px; color: #000; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em;">Latarcerita Photobooth</p>
          <p style="font-size:12px; color: #666; margin-top: 10px;">Format: ${pageSize.toUpperCase()}</p>
          <p style="font-size:10px; color: #999; margin-top: 5px;">300 DPI High-Quality</p>
        </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testPattern)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName || '',
        color: true,
        margins: { marginType: 'none' },
        dpi: { horizontal: 300, vertical: 300 },
        pageSize: pageSize.toLowerCase() === 'a4' ? 'A4' : { width: 101600, height: 152400 },
      }, (success, failureReason) => {
        if (!success) console.error('Print Failed:', failureReason);
        printWindow.close();
      });
    });
  });

  ipcMain.on('print-image', async (event, { imageUrl, copies = 1, printerName = '', pageSize = '4r', autoEpsonMatte = false }) => {
    console.log(`Printing image: ${imageUrl.substring(0, 50)}... x${copies} (Matte: ${autoEpsonMatte})`);

    const lpSuccess = await printWithLp(imageUrl, printerName, pageSize, copies, autoEpsonMatte);
    if (lpSuccess) return;

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { offscreen: true },
    });

    const html = `
      <html>
        <body style="margin:0; padding:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:white;">
          <style>
             @page { size: ${pageSize.toLowerCase() === 'a4' ? '210mm 297mm' : '4in 6in'}; margin: 0; }
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
        dpi: { horizontal: 300, vertical: 300 },
        pageSize: pageSize.toLowerCase() === 'a4' ? 'A4' : { width: 101600, height: 152400 },
      }, (success, failureReason) => {
        if (!success) console.error('Photo Print Failed:', failureReason);
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