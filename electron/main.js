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

// Disable unused Chromium features to reduce RAM usage
app.commandLine.appendSwitch('disable-spell-checking');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-component-extensions-with-background-pages');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('no-default-browser-check');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-hang-monitor');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-web-bluetooth');
app.commandLine.appendSwitch('disable-webgl');
app.commandLine.appendSwitch('disable-webgl2');
app.commandLine.appendSwitch('disable-features', 'TranslateUI,AutofillServerCommunication,MediaRouter,PasswordGeneration');

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

// ─── macOS Printer Discovery (online only via system_profiler + lpstat) ──────
const getMacPrinters = async () => {
  const result = new Map();
  try {
    // Step 1: CUPS name → URI dari lpstat -v
    const { stdout: lpOut } = await execAsync('lpstat -v 2>/dev/null || true');
    const cupsUriMap = {}; // uri → [cupsName, ...]
    lpOut.trim().split('\n').filter(Boolean).forEach(line => {
      const m = line.match(/^device for ([^:]+):\s+(.+)$/);
      if (!m) return;
      const uri = m[2].trim();
      if (!cupsUriMap[uri]) cupsUriMap[uri] = [];
      cupsUriMap[uri].push(m[1].trim());
    });

    // Step 2: status fisik printer dari system_profiler JSON
    const { stdout: spOut } = await execAsync('system_profiler SPPrintersDataType -json');
    const spPrinters = JSON.parse(spOut).SPPrintersDataType || [];

    // Step 3: hanya yang status='idle' (terhubung secara fisik)
    spPrinters.forEach(p => {
      if (p.status !== 'idle' || !p.uri) return;
      const cupsNames = cupsUriMap[p.uri] || [];
      cupsNames.forEach(cupsName => {
        result.set(cupsName, { name: cupsName, displayName: p._name, isDefault: false, status: 0 });
      });
    });

    // Step 4: tandai default printer jika ada di list
    const { stdout: defOut } = await execAsync('lpstat -d 2>/dev/null || echo ""');
    const defMatch = defOut.match(/system default destination:\s+(.+)/);
    if (defMatch && result.has(defMatch[1].trim())) {
      result.get(defMatch[1].trim()).isDefault = true;
    }

    console.log(`[Printer] macOS: ${result.size} online printer(s)`, [...result.keys()]);
  } catch (e) {
    console.warn('[Printer] macOS discovery failed:', e.message);
  }
  return result;
};

// ─── Windows Printer Discovery (online only) ─────────────────────────────────

// Gunakan -EncodedCommand (Base64) untuk menghindari masalah quoting di cmd.exe
const runPS = (command) => {
  const fullCmd = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`;
  const encoded = Buffer.from(fullCmd, 'utf16le').toString('base64');
  return execWithTimeout(`powershell -ExecutionPolicy Bypass -NoProfile -EncodedCommand ${encoded}`, 10000)
    .catch(() => execWithTimeout(`"${POWERSHELL_PATH}" -ExecutionPolicy Bypass -NoProfile -EncodedCommand ${encoded}`, 10000));
};

const parsePSJson = (stdout) => {
  // Strip BOM jika ada (Windows PowerShell kadang menambahkan BOM di output)
  const text = stdout?.replace(/^﻿/, '').trim();
  if (!text || text === 'null') return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch { return []; }
};

const getWindowsPrinters = async () => {
  const result = new Map();

  // Method A: Get-Printer dengan filter WorkOffline=$false
  // PrinterStatus TIDAK dipakai karena WMI statusnya tidak reliable
  try {
    const { stdout } = await runPS(
      "Get-Printer | Select-Object Name,IsDefault,WorkOffline | ConvertTo-Json -Compress -Depth 2"
    );
    const printers = parsePSJson(stdout);
    printers.forEach(p => {
      if (p?.Name && p.WorkOffline !== true) {
        result.set(p.Name.trim(), { name: p.Name.trim(), displayName: p.Name.trim(), isDefault: !!p.IsDefault, status: 0 });
      }
    });
    console.log(`[Printer] Get-Printer: ${printers.length} total, ${result.size} online`);
    if (result.size > 0) return result;
  } catch (e) { console.warn('[Printer] Get-Printer failed:', e.message); }

  // Method B: WMI — filter WorkOffline saja, PrinterStatus tidak reliable
  try {
    const { stdout } = await runPS(
      "Get-WmiObject Win32_Printer | Select-Object Name,Default,WorkOffline | ConvertTo-Json -Compress -Depth 2"
    );
    const printers = parsePSJson(stdout);
    printers.forEach(p => {
      if (p?.Name && p.WorkOffline !== true) {
        result.set(p.Name.trim(), { name: p.Name.trim(), displayName: p.Name.trim(), isDefault: !!p.Default, status: 0 });
      }
    });
    console.log(`[Printer] WMI: ${printers.length} total, ${result.size} online`);
    if (result.size > 0) return result;
  } catch (e) { console.warn('[Printer] WMI fallback failed:', e.message); }

  // Method C: tanpa filter WorkOffline — tampilkan semua printer yang terinstall
  // (fallback jika Windows salah melaporkan WorkOffline=true untuk printer yang sebenarnya ON)
  try {
    const { stdout } = await runPS(
      "Get-Printer | Select-Object Name,IsDefault,WorkOffline | ConvertTo-Json -Compress -Depth 2"
    );
    const printers = parsePSJson(stdout);
    printers.forEach(p => {
      if (p?.Name) {
        result.set(p.Name.trim(), { name: p.Name.trim(), displayName: p.Name.trim(), isDefault: !!p.IsDefault, status: 0 });
      }
    });
    console.log(`[Printer] Get-Printer (no filter): ${printers.length} total`);
  } catch (e) { console.warn('[Printer] Get-Printer no-filter failed:', e.message); }

  return result;
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
    .ctrl{position:absolute;bottom:0;left:0;right:0;padding:28px 24px 36px;background:linear-gradient(0deg,rgba(0,0,0,.88) 0%,transparent 100%);display:flex;align-items:center;justify-content:space-between;z-index:10;gap:16px;}
    .pill{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);backdrop-filter:blur(10px);padding:9px 14px;border-radius:50px;border:1px solid rgba(255,255,255,.15);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;flex-shrink:0;max-width:140px;}
    .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
    .dot.live{background:#34d399;animation:p 1.5s infinite;}
    .dot.wait{background:#fbbf24;animation:p .8s infinite;}
    .dot.err{background:#f87171;}
    @keyframes p{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(.7);}}
    .shutter{width:80px;height:80px;border-radius:50%;border:4px solid rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .1s,opacity .2s;box-shadow:0 0 24px rgba(255,255,255,.15),0 4px 16px rgba(0,0,0,.4);flex-shrink:0;}
    .shutter:active{transform:scale(.88);}
    .shutter-inner{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.92);transition:background .15s;}
    .shutter.off{opacity:.3;pointer-events:none;}
    .shutter.off .shutter-inner{background:rgba(255,255,255,.3);}
    .flip-btn{background:rgba(255,255,255,.13);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);color:#fff;width:52px;height:52px;border-radius:50%;font-size:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;flex-shrink:0;transition:transform .1s;}
    .flip-btn:active{transform:scale(.9);}
    .flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:100;transition:opacity .05s;}
    .flash.on{opacity:1;}
  </style>
</head>
<body>
  <div class="hdr"><span class="brand">&#128247; Photobooth</span></div>
  <video id="video" autoplay playsinline muted></video>
  <div class="ctrl">
    <div class="pill"><span id="dot" class="dot wait"></span><span id="stxt">Menghubungkan...</span></div>
    <div id="shutter" class="shutter off" onclick="pressShutter()">
      <div class="shutter-inner"></div>
    </div>
    <button class="flip-btn" onclick="flipCam()">&#8645;</button>
  </div>
  <div id="flash" class="flash"></div>
  <script>
    let ws,stream,prev=document.createElement('canvas'),pctx=prev.getContext('2d'),
        cap=document.createElement('canvas'),cctx=cap.getContext('2d'),
        si=null,face='environment',capturing=false,retryT=null,captureId=0;
    const MAX_CAP_W=2048,MAX_CAP_H=1536; // batas resolusi foto — cukup tinggi tapi tidak terlalu besar
    const vid=document.getElementById('video');
    const shutterEl=document.getElementById('shutter');
    function st(type,txt){document.getElementById('dot').className='dot '+type;document.getElementById('stxt').textContent=txt;}
    function setShutter(enabled){shutterEl.className='shutter'+(enabled?'':' off');}
    function flash(){const f=document.getElementById('flash');f.classList.add('on');setTimeout(()=>f.classList.remove('on'),150);}
    function pressShutter(){
      if(ws?.readyState!==1)return;
      flash();
      const inner=shutterEl.querySelector('.shutter-inner');
      if(inner){inner.style.background='#a78bfa';setTimeout(()=>inner.style.background='',200);}
      ws.send(JSON.stringify({type:'phone_shutter'}));
    }
    function connect(){
      if(retryT){clearTimeout(retryT);retryT=null;}
      ws=new WebSocket('wss://'+location.host);
      ws.onopen=()=>{ws.send(JSON.stringify({type:'role',role:'phone'}));st('live','Terhubung');setShutter(true);startSend();};
      ws.onmessage=(e)=>{try{const m=JSON.parse(e.data);if(m.type==='capture')doCapture(m.id);}catch(_){}};
      ws.onclose=()=>{st('err','Terputus...');setShutter(false);stopSend();capturing=false;retryT=setTimeout(connect,3000);};
      ws.onerror=()=>{st('err','Koneksi gagal');setShutter(false);};
    }
    function startSend(){if(si)return;si=true;scheduleFrame();}
    function stopSend(){si=false;}
    function scheduleFrame(){
      if(!si)return;
      if(capturing||!stream||ws?.readyState!==1||!vid.videoWidth){setTimeout(scheduleFrame,50);return;}
      const vw=vid.videoWidth,vh=vid.videoHeight;
      const scale=Math.min(1280/vw,720/vh,1);
      prev.width=Math.round(vw*scale);prev.height=Math.round(vh*scale);
      pctx.drawImage(vid,0,0,prev.width,prev.height);
      prev.toBlob(b=>{
        if(b&&ws?.readyState===1)ws.send(b);
        setTimeout(scheduleFrame,0);
      },'image/jpeg',.85);
    }
    function doCapture(id){
      if(!stream||capturing)return; // abaikan jika sedang proses foto sebelumnya
      capturing=true;
      captureId=id||0;
      flash();
      const vw=vid.videoWidth,vh=vid.videoHeight;
      const scale=Math.min(MAX_CAP_W/vw,MAX_CAP_H/vh,1);
      cap.width=Math.round(vw*scale);cap.height=Math.round(vh*scale);
      cctx.drawImage(vid,0,0,cap.width,cap.height);
      cap.toBlob(b=>{
        if(!b){capturing=false;return;}
        const r=new FileReader();
        r.onload=()=>{
          if(ws?.readyState===1)ws.send(JSON.stringify({type:'capture_result',id:captureId,data:r.result}));
          capturing=false;
        };
        r.onerror=()=>{capturing=false;}; // jangan sampai capturing stuck karena error
        r.readAsDataURL(b);
      },'image/jpeg',.92);
    }
    async function startCam(){
      if(stream)stream.getTracks().forEach(t=>t.stop());
      try{
        // Minta resolusi tinggi tapi tidak 4K — 2048x1536 sudah cukup untuk foto
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:face,width:{ideal:2048},height:{ideal:1536}},audio:false});
        vid.srcObject=stream;st('wait','Kamera aktif...');
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
            // Desktop requests capture → phone (teruskan capture ID agar bisa dicocokkan)
            for (const p of phoneClients) {
              if (p.readyState === WS.OPEN) p.send(JSON.stringify({ type: 'capture', id: msg.id }));
            }
          } else if (msg.type === 'phone_shutter') {
            // Phone shutter button pressed → notify desktop to trigger capture
            for (const d of desktopClients) {
              if (d.readyState === WS.OPEN) d.send(JSON.stringify({ type: 'phone_shutter' }));
            }
          } else if (msg.type === 'capture_result') {
            // Full-res photo: phone → desktop (teruskan ID untuk matching)
            for (const d of desktopClients) {
              if (d.readyState === WS.OPEN) d.send(JSON.stringify({ type: 'capture_result', id: msg.id, data: msg.data }));
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

  // Trust self-signed cert for local phone camera server (localhost + LAN IP)
  mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    const h = request.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.startsWith('172.')) {
      return callback(0); // trust all local network addresses
    }
    callback(-3); // default verification for everything else
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
    console.log('[Printer] Starting discovery (online only)...');
    const allPrinters = new Map();

    if (process.platform === 'win32') {
      // Windows: gunakan PowerShell dengan filter WorkOffline
      // Electron API di Windows mengembalikan SEMUA printer termasuk offline — tidak dipakai
      const osPrinters = await getWindowsPrinters();
      osPrinters.forEach((val, key) => allPrinters.set(key.trim(), val));

      // Jika PowerShell sama sekali gagal, fallback ke Electron API
      if (allPrinters.size === 0) {
        console.warn('[Printer] PowerShell failed, falling back to Electron API (may include offline)');
        try {
          const printers = await event.sender.getPrintersAsync();
          printers?.forEach(p => {
            if (p?.name) allPrinters.set(p.name, { name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault, status: p.status || 0 });
          });
        } catch (e) { console.warn('[Printer] Electron API fallback failed:', e.message); }
      }
    } else if (process.platform === 'darwin') {
      // macOS: system_profiler + lpstat — satu-satunya cara akurat cek printer fisik online
      const macPrinters = await getMacPrinters();
      macPrinters.forEach((val, key) => allPrinters.set(key, val));

      // Jika system_profiler gagal, fallback ke Electron API
      if (allPrinters.size === 0) {
        console.warn('[Printer] macOS discovery failed, using Electron API fallback');
        try {
          const printers = await event.sender.getPrintersAsync();
          printers?.forEach(p => {
            if (p?.name) allPrinters.set(p.name, { name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault, status: 0 });
          });
        } catch (e) { console.warn('[Printer] Electron API fallback failed:', e.message); }
      }
    } else {
      // Linux: Electron API
      try {
        const printers = await event.sender.getPrintersAsync();
        printers?.filter(p => p.status === 0).forEach(p => {
          allPrinters.set(p.name, { name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault, status: 0 });
        });
      } catch (e) { console.warn('[Printer] Electron API failed:', e.message); }
    }

    const results = Array.from(allPrinters.values());
    console.log(`[Printer] Online printers: ${results.length}`, results.map(p => p.name));
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

  // ─── Windows Direct Print via System.Drawing.Printing ────────────────────────
  // Uses PowerShell to print borderless. Searches for a "Borderless" paper size
  // variant in the printer driver first, then compensates hardware margins.
  const printWithWindows = async (imageUrl, printerName, pageSize, copies) => {
    if (process.platform !== 'win32') return false;

    const tempDir = os.tmpdir();
    const ts = Date.now();
    const imgFile = path.join(tempDir, `pb_print_${ts}.png`);
    const psFile  = path.join(tempDir, `pb_print_${ts}.ps1`);

    try {
      // Save base64 data URL to a PNG temp file
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      await writeFileAsync(imgFile, base64Data, 'base64');

      const isA4 = pageSize.toLowerCase() === 'a4';
      // PaperSize unit = hundredths of an inch  (4x6in = 400x600, A4 = 827x1169)
      const paperW = isA4 ? 827 : 400;
      const paperH = isA4 ? 1169 : 600;

      // PowerShell single-quoted strings: backslashes are LITERAL (no escaping needed).
      // Only single quotes need to be escaped by doubling them.
      const safeImg     = imgFile.replace(/'/g, "''");
      const safePrinter = (printerName || '').replace(/'/g, "''");
      const safeCopies  = Math.max(1, parseInt(copies, 10) || 1);

      const psScript = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${safeImg}')
$pd  = New-Object System.Drawing.Printing.PrintDocument
${safePrinter ? `$pd.PrinterSettings.PrinterName = '${safePrinter}'` : ''}
$pd.PrinterSettings.Copies = [int16]${safeCopies}
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)

# --- Find best paper size: prefer Borderless variant from driver ---
$targetW = ${paperW}
$targetH = ${paperH}
$selected = $null

# Pass 1: look for a borderless paper size close to our target
foreach ($ps in $pd.PrinterSettings.PaperSizes) {
    $n = $ps.PaperName.ToLower()
    $wOk = [Math]::Abs($ps.Width  - $targetW) -lt 100
    $hOk = [Math]::Abs($ps.Height - $targetH) -lt 100
    if ($wOk -and $hOk -and ($n -match 'borderless|bleed|full|bl[^a-z]')) {
        $selected = $ps
        break
    }
}

# Pass 2: closest available size if no borderless found
if (-not $selected) {
    $bestDiff = [int]::MaxValue
    foreach ($ps in $pd.PrinterSettings.PaperSizes) {
        $diff = [Math]::Abs($ps.Width - $targetW) + [Math]::Abs($ps.Height - $targetH)
        if ($diff -lt $bestDiff) { $bestDiff = $diff; $selected = $ps }
    }
}
if ($selected) { $pd.DefaultPageSettings.PaperSize = $selected }

$pd.add_PrintPage({
    param($s, $e)
    $g = $e.Graphics
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    # Draw image to fill the entire printable area — no cropping, no extra margins.
    # PageBounds = the area the printer can actually print on (excludes hardware margins).
    $g.DrawImage($img, $e.PageBounds)
    $e.HasMorePages = $false
})
$pd.Print()
$img.Dispose()
$pd.Dispose()
`;

      await writeFileAsync(psFile, psScript, 'utf8');
      await execWithTimeout(
        `"${POWERSHELL_PATH}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psFile}"`,
        30000
      );

      console.log('[WinPrint] Success: sent to spooler');
      setTimeout(() => {
        try { fs.unlinkSync(imgFile) } catch (_) {}
        try { fs.unlinkSync(psFile)  } catch (_) {}
      }, 15000);
      return true;
    } catch (err) {
      console.error('[WinPrint] Failed:', err.message);
      try { fs.unlinkSync(imgFile) } catch (_) {}
      try { fs.unlinkSync(psFile)  } catch (_) {}
      return false;
    }
  };

  ipcMain.on('print-test-page', async (event, { printerName, autoEpsonMatte = false } = {}) => {
    // Always A4 for test — offscreen:true removed (breaks print() in Electron 28)
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, sandbox: false },
    });

    const testPattern = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:210mm 297mm;margin:0;}
  html,body{width:210mm;height:297mm;background:#fff;overflow:hidden;font-family:Arial,sans-serif;}
  .page{position:relative;width:210mm;height:297mm;}
  /* 10mm grid */
  .grid{
    position:absolute;inset:0;
    background-image:linear-gradient(rgba(0,0,0,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.09) 1px,transparent 1px);
    background-size:10mm 10mm;
  }
  /* Thick 5mm grid every 5cm */
  .grid2{
    position:absolute;inset:0;
    background-image:linear-gradient(rgba(0,0,0,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.18) 1px,transparent 1px);
    background-size:50mm 50mm;
    pointer-events:none;
  }
  /* Outer print boundary at 3mm */
  .b-outer{position:absolute;top:3mm;left:3mm;right:3mm;bottom:3mm;border:1.5px solid #111;}
  /* Safe zone at 10mm */
  .b-safe{position:absolute;top:10mm;left:10mm;right:10mm;bottom:10mm;border:1px dashed #777;}
  /* Corner L-marks */
  .c{position:absolute;width:10mm;height:10mm;}
  .c.tl{top:0;left:0;border-top:2px solid #000;border-left:2px solid #000;}
  .c.tr{top:0;right:0;border-top:2px solid #000;border-right:2px solid #000;}
  .c.bl{bottom:0;left:0;border-bottom:2px solid #000;border-left:2px solid #000;}
  .c.br{bottom:0;right:0;border-bottom:2px solid #000;border-right:2px solid #000;}
  /* Center info */
  .info{
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    background:#fff;border:1px solid #ccc;padding:10mm 14mm;text-align:center;
    min-width:90mm;box-shadow:0 0 0 1mm rgba(0,0,0,.04);
  }
  .info h1{font-size:22pt;font-weight:900;letter-spacing:.08em;color:#000;}
  .info hr{border:none;border-top:1.5px solid #000;margin:4mm 0;}
  .info p{font-size:8.5pt;color:#444;line-height:1.9;}
  .info .leg{font-size:7.5pt;color:#888;margin-top:5mm;line-height:1.7;font-family:monospace;}
  /* Dimension labels */
  .dim-w{position:absolute;top:1mm;left:50%;transform:translateX(-50%);font-size:6pt;color:#666;letter-spacing:.05em;}
  .dim-h{position:absolute;top:50%;left:1mm;transform:translateY(-50%) rotate(-90deg);font-size:6pt;color:#666;letter-spacing:.05em;white-space:nowrap;}
</style>
</head>
<body>
<div class="page">
  <div class="grid"></div>
  <div class="grid2"></div>
  <div class="b-outer"></div>
  <div class="b-safe"></div>
  <div class="c tl"></div><div class="c tr"></div>
  <div class="c bl"></div><div class="c br"></div>
  <span class="dim-w">210 mm</span>
  <span class="dim-h">297 mm</span>
  <div class="info">
    <h1>TEST PRINT</h1>
    <hr>
    <p>A4 &nbsp;·&nbsp; 210 × 297 mm<br>Grid: setiap 10 mm &nbsp;·&nbsp; Garis tebal: 50 mm</p>
    <div class="leg">
      ▬ Garis luar: batas cetak (3mm dari tepi)<br>
      ╌ Garis putus: zona aman (10mm dari tepi)<br>
      ⌐ Tanda sudut: pojok halaman fisik<br>
      Printer: ${printerName || 'Default System Printer'}<br>
      Latarcerita Photobooth
    </div>
  </div>
</div>
</body>
</html>`;

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(testPattern)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName || '',
        color: false,
        margins: { marginType: 'none' },
        dpi: { horizontal: 300, vertical: 300 },
        pageSize: 'A4',
      }, (success, failureReason) => {
        if (!success) console.error('[PrintTest] Failed:', failureReason);
        printWindow.close();
      });
    });
  });

  ipcMain.on('print-image', async (event, { imageUrl, copies = 1, printerName = '', pageSize = '4r', autoEpsonMatte = false }) => {
    console.log(`[Print] Request received. Printer: ${printerName || 'Default'}, Paper: ${pageSize}, Copies: ${copies}`);

    const lpSuccess = await printWithLp(imageUrl, printerName, pageSize, copies, autoEpsonMatte);
    if (lpSuccess) return;

    const winSuccess = await printWithWindows(imageUrl, printerName, pageSize, copies);
    if (winSuccess) return;

    // Fallback: Electron BrowserWindow print (used on Mac non-lp path)
    // offscreen:true removed — breaks print() in Electron 28
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
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