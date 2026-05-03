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

  // FIX: Always use -ExecutionPolicy Bypass so production .exe tidak diblokir
  // FIX: Semua method dijalankan PARALEL (bukan chain catch), lalu hasil digabung
  const methods = [
    // Method A: PowerShell Get-Printer (paling reliable)
    execWithTimeout(
      'powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-Printer | Select-Object Name,IsDefault | ConvertTo-Json -Compress"'
    ).then(({ stdout }) => {
      if (!stdout?.trim()) return;
      let parsed = JSON.parse(stdout.trim());
      // Kalau hanya 1 printer, PowerShell return object bukan array
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
    }).catch(e => console.warn('[Printer] Method A (PS JSON) failed:', e.message)),

    // Method B: WMI via PowerShell (fallback kalau Get-Printer tidak tersedia)
    execWithTimeout(
      'powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-WmiObject Win32_Printer | Select-Object Name,Default | ConvertTo-Json -Compress"'
    ).then(({ stdout }) => {
      if (!stdout?.trim()) return;
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
    }).catch(e => console.warn('[Printer] Method B (WMI JSON) failed:', e.message)),

    // Method C: Legacy WMIC (Windows 10 lama / Server)
    execWithTimeout('wmic printer get name,default /format:csv', 6000).then(({ stdout }) => {
      if (!stdout?.trim()) return;
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      // Baris pertama = header (Node,Default,Name), skip
      lines.slice(1).forEach(line => {
        const parts = line.split(',');
        // Format CSV: Node, Default (TRUE/FALSE), Name
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

  // Jalankan semua method secara paralel, tunggu semua selesai
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

  ipcMain.handle('get-printers', async () => {
    console.log('[Printer] Starting discovery...');
    const allPrinters = new Map();

    // Step 1: Electron built-in API (jalan di dev & production)
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      try {
        const printers = await win.webContents.getPrintersAsync();
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
        console.warn('[Printer] Electron API failed:', e.message);
      }
    }

    // Step 2: Windows OS-level fallback — SELALU dijalankan di Windows
    // (bukan hanya kalau Electron API kosong, karena terkadang Electron API
    //  mengembalikan daftar berbeda dari yang sebenarnya terpasang di sistem)
    if (process.platform === 'win32') {
      console.log('[Printer] Running Windows OS discovery (parallel)...');
      const osPrinters = await getWindowsPrinters();
      osPrinters.forEach((val, key) => {
        if (!allPrinters.has(key)) {
          allPrinters.set(key, val);
        } else if (val.isDefault) {
          // Prioritaskan info isDefault dari OS
          allPrinters.get(key).isDefault = true;
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