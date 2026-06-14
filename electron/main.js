import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import isDev from 'electron-is-dev';
import { CameraManagerBackend } from './camera/cameraManager.js';
import { FolderBridge } from './camera/FolderBridge.js';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';
import { createServer as createHttpsServer } from 'https';
import { WebSocketServer, WebSocket as WS } from 'ws';
import selfsigned from 'selfsigned';

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

const doMinimize = () => {
  if (!mainWindow) return;
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false); // keluar fullscreen → muncul frame dengan tombol X - □
  } else {
    mainWindow.minimize();
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: false,
    frame: true,
    icon: path.join(__dirname, '../public/Logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
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
    : pathToFileURL(path.join(__dirname, '../dist/index.html')).href;

  mainWindow.loadURL(startUrl);


  // ESC → minimize ke taskbar (seperti klik tombol _ di Chrome)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      event.preventDefault();
      doMinimize();
    }
  });

  // Double-click title bar → kembali fullscreen
  mainWindow.on('maximize', () => {
    mainWindow.setFullScreen(true);
  });

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

// ─── Phone Camera Server ─────────────────────────────────────────────────────

const PHONE_CAM_PORT = 3456;
let phoneCamServerUrl = null;

function getLocalIP() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) candidates.push(net.address);
    }
  }
  return candidates.find(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'))
    || candidates[0]
    || '127.0.0.1';
}

const MOBILE_PAGE_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Photobooth — Phone Camera</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-user-select:none;user-select:none;}
    body{background:#0a0a14;height:100dvh;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;overflow:hidden;}
    .hdr{position:absolute;top:0;left:0;right:0;padding:16px 20px;background:linear-gradient(180deg,rgba(10,10,20,.9) 0%,transparent 100%);z-index:10;display:flex;align-items:center;justify-content:space-between;}
    .brand{font-size:14px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#c4b5fd;}
    #video{flex:1;width:100%;object-fit:cover;display:block;}
    .ctrl{position:absolute;bottom:0;left:0;right:0;padding:20px;background:linear-gradient(0deg,rgba(0,0,0,.8) 0%,transparent 100%);display:flex;align-items:center;justify-content:space-between;z-index:10;}
    .pill{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);backdrop-filter:blur(10px);padding:9px 16px;border-radius:50px;border:1px solid rgba(255,255,255,.15);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;}
    .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
    .dot.live{background:#34d399;animation:p 1.5s infinite;}
    .dot.wait{background:#fbbf24;animation:p .8s infinite;}
    .dot.err{background:#f87171;}
    @keyframes p{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(.7);}}
    .btn{background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);color:#fff;padding:10px 18px;border-radius:50px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;-webkit-tap-highlight-color:transparent;}
    .flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:100;transition:opacity .05s;}
    .flash.on{opacity:1;}
  </style>
</head>
<body>
  <div class="hdr"><span class="brand">&#128247; Photobooth</span></div>
  <video id="video" autoplay playsinline muted></video>
  <div class="ctrl">
    <div class="pill"><span id="dot" class="dot wait"></span><span id="stxt">Menghubungkan...</span></div>
    <button class="btn" onclick="flipCam()">Balik Kamera</button>
  </div>
  <div id="flash" class="flash"></div>
  <script>
    let ws,stream,prev=document.createElement('canvas'),pctx=prev.getContext('2d'),
        cap=document.createElement('canvas'),cctx=cap.getContext('2d'),
        si=null,face='environment',capturing=false,retryT=null;
    const vid=document.getElementById('video');
    function st(type,txt){document.getElementById('dot').className='dot '+type;document.getElementById('stxt').textContent=txt;}
    function flash(){const f=document.getElementById('flash');f.classList.add('on');setTimeout(()=>f.classList.remove('on'),150);}
    function connect(){
      if(retryT){clearTimeout(retryT);retryT=null;}
      ws=new WebSocket('wss://'+location.host);
      ws.onopen=()=>{ws.send(JSON.stringify({type:'role',role:'phone'}));st('live','Terhubung — Streaming aktif');startSend();};
      ws.onmessage=(e)=>{try{const m=JSON.parse(e.data);if(m.type==='capture')doCapture();}catch(_){}};
      ws.onclose=()=>{st('err','Terputus — Mencoba ulang...');stopSend();retryT=setTimeout(connect,3000);};
      ws.onerror=()=>st('err','Koneksi gagal');
    }
    function startSend(){
      if(si)return;
      si=setInterval(()=>{
        if(capturing||!stream||ws?.readyState!==1)return;
        if(!vid.videoWidth)return;
        prev.width=Math.min(vid.videoWidth,1280);prev.height=Math.min(vid.videoHeight,720);
        pctx.drawImage(vid,0,0,prev.width,prev.height);
        prev.toBlob(b=>{if(b&&ws?.readyState===1)ws.send(b);},'image/jpeg',.70);
      },100);
    }
    function stopSend(){if(si){clearInterval(si);si=null;}}
    function doCapture(){
      if(!stream)return;
      capturing=true;flash();
      cap.width=vid.videoWidth;cap.height=vid.videoHeight;
      cctx.drawImage(vid,0,0);
      cap.toBlob(b=>{
        if(!b){capturing=false;return;}
        const r=new FileReader();
        r.onload=()=>{if(ws?.readyState===1)ws.send(JSON.stringify({type:'capture_result',data:r.result}));capturing=false;};
        r.readAsDataURL(b);
      },'image/jpeg',.95);
    }
    async function startCam(){
      if(stream)stream.getTracks().forEach(t=>t.stop());
      try{
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:face,width:{ideal:4096},height:{ideal:3072}},audio:false});
        vid.srcObject=stream;st('wait','Kamera aktif — menunggu koneksi...');
      }catch(e){st('err','Kamera error: '+e.message);}
    }
    function flipCam(){face=face==='environment'?'user':'environment';startCam();}
    startCam().then(connect);
  </script>
</body>
</html>`;

async function setupPhoneCameraServer() {
  const localIP = getLocalIP();

  let pems;
  try {
    pems = await selfsigned.generate(
      [{ name: 'commonName', value: localIP }],
      {
        keySize: 2048,
        days: 365,
        algorithm: 'sha256',
        extensions: [{
          name: 'subjectAltName',
          altNames: [
            { type: 7, ip: localIP },
            { type: 7, ip: '127.0.0.1' },
          ],
        }],
      }
    );
  } catch (err) {
    console.error('[PhoneCam] Cert generation failed:', err.message);
    return;
  }

  const httpsServer = createHttpsServer({ key: pems.private, cert: pems.cert }, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(MOBILE_PAGE_HTML);
  });

  const wss = new WebSocketServer({ server: httpsServer });
  const phoneClients = new Set();
  const desktopClients = new Set();

  wss.on('connection', (client) => {
    let role = null;

    client.on('message', (data, isBinary) => {
      if (isBinary) {
        // JPEG preview frame: phone → desktop
        for (const d of desktopClients) {
          if (d.readyState === WS.OPEN) d.send(data, { binary: true });
        }
      } else {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'role') {
            role = msg.role;
            if (role === 'phone') {
              phoneClients.add(client);
              for (const d of desktopClients) {
                if (d.readyState === WS.OPEN) d.send(JSON.stringify({ type: 'phone_connected' }));
              }
              console.log('[PhoneCam] Phone connected');
            } else if (role === 'desktop') {
              desktopClients.add(client);
              if (phoneClients.size > 0) {
                client.send(JSON.stringify({ type: 'phone_connected' }));
              }
            }
          } else if (msg.type === 'capture') {
            // Desktop requests capture → phone
            for (const p of phoneClients) {
              if (p.readyState === WS.OPEN) p.send(JSON.stringify({ type: 'capture' }));
            }
          } else if (msg.type === 'capture_result') {
            // Full-res photo: phone → desktop
            for (const d of desktopClients) {
              if (d.readyState === WS.OPEN) d.send(JSON.stringify({ type: 'capture_result', data: msg.data }));
            }
          }
        } catch (_) { /* ignore */ }
      }
    });

    client.on('close', () => {
      if (role === 'phone') {
        phoneClients.delete(client);
        if (phoneClients.size === 0) {
          for (const d of desktopClients) {
            if (d.readyState === WS.OPEN) d.send(JSON.stringify({ type: 'phone_disconnected' }));
          }
          console.log('[PhoneCam] Phone disconnected');
        }
      } else if (role === 'desktop') {
        desktopClients.delete(client);
      }
    });

    client.on('error', () => { /* ignore */ });
  });

  httpsServer.listen(PHONE_CAM_PORT, '0.0.0.0', () => {
    phoneCamServerUrl = `https://${localIP}:${PHONE_CAM_PORT}`;
    console.log(`[PhoneCam] Ready at ${phoneCamServerUrl}`);
  });

  httpsServer.on('error', (err) => {
    console.error('[PhoneCam] Server error:', err.message);
  });
}

app.whenReady().then(() => {
  createWindow();

  // Initialize Camera Backend
  new CameraManagerBackend(mainWindow);

  // Initialize Phone Camera Server
  setupPhoneCameraServer();

  // Allow renderer to connect to wss://localhost:3456 (self-signed cert)
  mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    if (request.hostname === 'localhost' && request.port === PHONE_CAM_PORT) {
      return callback(0); // trust
    }
    callback(-3); // default
  });

  ipcMain.handle('get-phone-camera-url', () => phoneCamServerUrl);

  // Initialize Automated Hot Folder Bridge
  // Use userData (writable) in packaged app; project root in dev
  const capturesRoot = app.isPackaged ? app.getPath('userData') : path.join(__dirname, '..');
  let bridge = null;
  try {
    bridge = new FolderBridge(capturesRoot);
    bridge.start();
  } catch (e) {
    console.error('[FolderBridge] Failed to start:', e.message);
  }

  // Stop bridge on app quit
  app.on('will-quit', () => bridge?.stop());

  ipcMain.on('minimize-window', () => {
    if (!mainWindow) return;
    doMinimize();
  });

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
        console.log(`[lp] Specialized printing for Epson Matte on Mac: ${printerName}`);
        const tempDir = os.tmpdir();
        const fileName = `print_${Date.now()}.png`;
        const filePath = path.join(tempDir, fileName);

        try {
          if (imageUrl.startsWith('http')) {
             // Handle URL - Download image
             const response = await fetch(imageUrl);
             const buffer = Buffer.from(await response.arrayBuffer());
             await writeFileAsync(filePath, buffer);
          } else {
             // Handle Base64
             const base64Data = imageUrl.replace(/^data:image\/png;base64,/, '');
             await writeFileAsync(filePath, base64Data, 'base64');
          }

          const mediaOption = pageSize.toLowerCase() === 'a4' ? 'A4' : '4x6.FullBleed';
          const copiesOption = copies > 1 ? `-n ${copies}` : '';

          const lpCommand = `lp -d "${printerName}" ${copiesOption} -o media=${mediaOption} -o MediaType=Matte -o EP_MATTE=True "${filePath}"`;

          console.log(`[lp] Executing: ${lpCommand}`);
          await execAsync(lpCommand);
          console.log('[lp] Success: Command sent to CUPS');

          setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 5000);
          return true;
        } catch (err) {
          console.error('[lp] Failed:', err);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return false;
        }
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
          <p style="font-size:10px; color: #999; margin-top: 5px;">600 DPI Fine-Quality</p>
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
        dpi: { horizontal: 600, vertical: 600 },
        pageSize: pageSize.toLowerCase() === 'a4' ? 'A4' : { width: 101600, height: 152400 },
      }, (success, failureReason) => {
        if (!success) console.error('Print Failed:', failureReason);
        printWindow.close();
      });
    });
  });

  ipcMain.on('print-image', async (event, { imageUrl, copies = 1, printerName = '', pageSize = '4r', autoEpsonMatte = false }) => {
    console.log(`[Print] Request received. Printer: ${printerName || 'Default'}, Paper: ${pageSize}, Copies: ${copies}`);

    const lpSuccess = await printWithLp(imageUrl, printerName, pageSize, copies, autoEpsonMatte);
    if (lpSuccess) return;

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { 
        offscreen: true,
        contextIsolation: true,
        sandbox: false
      },
    });

    const html = `
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <style>
             * { margin: 0; padding: 0; box-sizing: border-box; }
             @page { size: ${pageSize.toLowerCase() === 'a4' ? '210mm 297mm' : '4in 6in'}; margin: 0; }
             html, body { width: 100%; height: 100%; overflow: hidden; background: white; }
             img { display: block; width: 100vw; height: 100vh; object-fit: fill; }
          </style>
          <img src="${imageUrl}" />
        </body>
      </html>
    `;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.on('did-finish-load', () => {
      console.log('[Print] Content loaded, starting hardware communication...');
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName || '',
        copies: copies,
        color: true,
        margins: { marginType: 'none' },
        dpi: { horizontal: 600, vertical: 600 },
        pageSize: pageSize.toLowerCase() === 'a4' ? 'A4' : { width: 101600, height: 152400 },
      }, (success, failureReason) => {
        if (!success) {
          console.error('[Print] Failed:', failureReason);
        } else {
          console.log('[Print] Success: Data sent to OS spooler');
        }
        printWindow.close();
      });
    });
  });

  // Delete all files inside captures/ folder after successful session upload
  ipcMain.handle('delete-captures', async () => {
    const capturesRoot = app.isPackaged ? app.getPath('userData') : path.join(__dirname, '..');
    const capturesDir = path.join(capturesRoot, 'captures');
    try {
      if (fs.existsSync(capturesDir)) {
        const files = fs.readdirSync(capturesDir);
        for (const file of files) {
          const filePath = path.join(capturesDir, file);
          try {
            if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
          } catch (_) { /* skip locked files */ }
        }
        console.log('[Captures] Cleaned up local captures folder');
      }
      return { success: true };
    } catch (err) {
      console.error('[Captures] Cleanup failed:', err.message);
      return { success: false };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});