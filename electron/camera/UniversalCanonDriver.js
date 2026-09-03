import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

const execAsync = promisify(exec);
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

const DIGICAM_PORT = 5513;
const DIGICAM_BASE = `http://localhost:${DIGICAM_PORT}`;

/**
 * UniversalCanonDriver
 * Cross-platform Canon camera control without EOS Webcam Utility.
 *
 * Mac/Linux → gphoto2  (brew install gphoto2)
 * Windows   → digiCamControl REST API  (digicamcontrol.com, free & open-source)
 *
 * How to install:
 *   Mac:     brew install gphoto2
 *   Windows: Download & install digiCamControl from https://digicamcontrol.com
 *            Start digiCamControl → it auto-enables the web server on port 5513
 */
export class UniversalCanonDriver {
  constructor() {
    this.isAvailable = false;
    this.cameraModel = null;
    this.isStreamingPreview = false;
    this.frameCallback = null;
    this._frameTimer = null;
    this._backend = IS_WIN ? 'digicamcontrol' : 'gphoto2';
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  async detect() {
    if (IS_WIN) return this._detectWindows();
    return this._detectMac();
  }

  async capturePreviewFrame() {
    if (IS_WIN) return this._previewFrameWindows();
    return this._previewFrameMac();
  }

  async capturePhoto() {
    if (IS_WIN) return this._captureWindows();
    return this._captureMac();
  }

  // ── gphoto2 shell mode: keeps USB open for fast continuous frames ──────────

  _ensureShell() {
    if (this._shell && !this._shell.killed) return;
    if (IS_MAC) {
      try { execSync('pkill -f PTPCamera 2>/dev/null; true'); } catch { /* ok */ }
    }
    const bin = this._gphoto2Path();
    // gphoto2 shell saves to capture_preview.jpg in its CWD
    this._shellCwd = os.tmpdir();

    const spawnCmd = bin.startsWith('sudo ') ? 'sudo' : bin;
    const spawnArgs = bin.startsWith('sudo ') ? [bin.replace('sudo ', ''), '--shell'] : ['--shell'];

    this._shell = spawn(spawnCmd, spawnArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this._shellCwd,
    });
    this._shellBuf = '';
    this._shellPending = null;

    this._shell.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      this._shellBuf += text;

      if (!this._shellPending) return;

      // Answer overwrite prompts automatically
      if (this._shellBuf.includes('[y|n]') || this._shellBuf.includes('[y/n]')) {
        this._shell.stdin.write('y\n');
        this._shellBuf = '';
        return;
      }

      if (
        this._shellBuf.includes('Saving file as') ||
        this._shellBuf.includes('*** Error') ||
        this._shellBuf.includes('Error (')
      ) {
        const resolve = this._shellPending;
        this._shellPending = null;
        this._shellBuf = '';
        resolve();
      }
    });

    this._shell.on('exit', () => { this._shell = null; });
    this._shell.on('error', () => { this._shell = null; });
    console.log('[Canon] gphoto2 shell started, cwd:', this._shellCwd);
  }

  async _capturePreviewShell() {
    this._ensureShell();
    if (!this._shell) return null;

    // gphoto2 shell always saves to capture_preview.jpg in CWD
    const outFile = path.join(this._shellCwd, 'capture_preview.jpg');

    // Delete previous file so gphoto2 doesn't ask to overwrite
    try { if (fs.existsSync(outFile)) fs.unlinkSync(outFile); } catch { /* ok */ }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this._shellPending = null;
        resolve(null);
      }, 4000);

      this._shellPending = () => {
        clearTimeout(timeout);
        try {
          if (!fs.existsSync(outFile)) { resolve(null); return; }
          const buf = fs.readFileSync(outFile);
          resolve(`data:image/jpeg;base64,${buf.toString('base64')}`);
        } catch { resolve(null); }
      };

      try {
        this._shell.stdin.write('capture-preview\n');
      } catch {
        clearTimeout(timeout);
        this._shellPending = null;
        this._shell = null;
        resolve(null);
      }
    });
  }

  startPreviewStream(onFrame) {
    if (this.isStreamingPreview) return;
    this.isStreamingPreview = true;
    this.frameCallback = onFrame;
    this._streamId = (this._streamId || 0) + 1;
    const myId = this._streamId;
    console.log(`[Canon] Preview stream started (id=${myId}, platform=${IS_WIN ? 'win' : 'mac'})`);

    if (IS_WIN) {
      // Windows: poll digiCamControl liveview.jpg.
      // Keeps retrying even when DCC isn't ready yet — frames start arriving once
      // the user opens DCC and the camera is connected, no need to re-click Canon.
      const loop = async () => {
        if (!this.isStreamingPreview || this._streamId !== myId) return;
        try {
          const frame = await this._previewFrameWindows();
          if (frame && this.frameCallback) {
            this.frameCallback(frame);
            // Update availability once frames start arriving
            if (!this.isAvailable) {
              this.isAvailable = true;
              console.log('[DCC] Live view frames started arriving');
            }
          }
        } catch { /* DCC not ready yet — keep polling */ }
        if (this.isStreamingPreview && this._streamId === myId) {
          // Slower poll when no frames (DCC not ready), faster when streaming
          this._frameTimer = setTimeout(loop, this.isAvailable ? 100 : 500);
        }
      };
      loop();
      return;
    }

    // Mac/Linux: gphoto2 shell mode for fast continuous capture
    let frameCount = 0;
    const loop = async () => {
      if (!this.isStreamingPreview || this._streamId !== myId) return;
      try {
        const frame = await this._capturePreviewShell();
        if (frame && this.frameCallback) {
          this.frameCallback(frame);
          frameCount++;
          if (frameCount === 1 || frameCount % 30 === 0) {
            console.log(`[Canon] Frame #${frameCount} (${Math.round(frame.length * 0.75 / 1024)}KB)`);
          }
        }
      } catch (err) {
        console.log(`[Canon] Loop error (id=${myId}):`, err.message);
      }
      if (this.isStreamingPreview && this._streamId === myId) {
        setImmediate(loop);
      }
    };
    loop();
  }

  stopPreviewStream() {
    this.isStreamingPreview = false;
    this.frameCallback = null;
    if (this._frameTimer) {
      clearTimeout(this._frameTimer);
      this._frameTimer = null;
    }
    // Keep shell alive for reuse; it will be cleaned up on app quit
  }

  getStatus() {
    return {
      available: this.isAvailable,
      model: this.cameraModel,
      isPreviewing: this.isStreamingPreview,
      backend: this._backend,
    };
  }

  // ── Mac/Linux — gphoto2 ─────────────────────────────────────────────────────

  _gphoto2Path() {
    // Homebrew on Apple Silicon installs to /opt/homebrew/bin, Intel to /usr/local/bin
    for (const p of ['/opt/homebrew/bin/gphoto2', '/usr/local/bin/gphoto2']) {
      if (fs.existsSync(p)) return p;
    }
    return 'gphoto2';
  }

  async _checkGphoto2() {
    try { await execAsync(`${this._gphoto2Path()} --version`); return true; } catch { return false; }
  }

  // macOS: kill all services that can claim USB cameras, then wait for kernel to release
  async _killPTPCamera() {
    if (!IS_MAC) return;
    try {
      await execAsync([
        'pkill -f PTPCamera 2>/dev/null',
        'pkill -f imagecaptureextension 2>/dev/null',
        'pkill -f "Image Capture" 2>/dev/null',
        'launchctl remove com.apple.PTPCamera 2>/dev/null',
        'true',
      ].join('; '));
      await new Promise(r => setTimeout(r, 1200));
    } catch { /* ignore */ }
  }

  async _detectMac() {
    // If shell is already running, the camera is connected — return cached result
    // to avoid USB conflict with the persistent shell process
    if (this._shell && !this._shell.killed && this.cameraModel) {
      return { success: true, cameras: [{ model: this.cameraModel, port: 'USB (shell)' }] };
    }

    const gphoto2 = this._gphoto2Path();
    if (!(await this._checkGphoto2())) {
      return {
        success: false,
        error: 'gphoto2 belum terinstall. Jalankan: brew install gphoto2',
        cameras: [],
      };
    }
    try {
      await this._killPTPCamera();
      const { stdout } = await execAsync(`${gphoto2} --auto-detect 2>/dev/null`, { timeout: 8000 });
      const cameras = stdout.trim().split('\n').slice(2)
        .filter(l => l.trim())
        .map(l => {
          const m = l.match(/^(.+?)\s{2,}(usb:\S+|\S+)$/);
          return m ? { model: m[1].trim(), port: m[2].trim() } : null;
        })
        .filter(Boolean);

      if (!cameras.length) {
        return { success: false, error: 'Kamera tidak terdeteksi. Pastikan kabel USB terhubung dan kamera menyala.', cameras: [] };
      }
      this.isAvailable = true;
      this.cameraModel = cameras[0].model;

      // Pre-warm shell immediately after detection so first preview frame is fast
      this._ensureShell();

      return { success: true, cameras };
    } catch (err) {
      return { success: false, error: err.message, cameras: [] };
    }
  }

  async _previewFrameMac() {
    const gphoto2 = this._gphoto2Path();
    const baseName = `pb_prev_${Date.now()}.jpg`;
    const tmp = path.join(os.tmpdir(), baseName);
    const thumbTmp = path.join(os.tmpdir(), `thumb_${baseName}`);
    try {
      await execAsync(`${gphoto2} --capture-preview --filename="${tmp}" --force-overwrite 2>/dev/null`, { timeout: 3000 });
    } catch {
      // gphoto2 exits code 1 even on success when it saves with "thumb_" prefix — fall through
    }
    // Check both possible filenames regardless of exit code
    const actualFile = fs.existsSync(tmp) ? tmp : fs.existsSync(thumbTmp) ? thumbTmp : null;
    if (!actualFile) return null;
    const buf = fs.readFileSync(actualFile);
    fs.unlinkSync(actualFile);
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  }

  async _closeShell() {
    if (!this._shell || this._shell.killed) return;
    try { this._shell.stdin.write('exit\n'); } catch { /* ok */ }
    this._shell.kill();
    this._shell = null;
    this._shellPending = null;
    // Wait briefly for the USB interface to be released by the kernel
    await new Promise(r => setTimeout(r, 600));
  }

  async _captureMac() {
    const gphoto2 = this._gphoto2Path();
    const tmpDir = os.tmpdir();
    const ts = Date.now();
    const tmp = path.join(tmpDir, `pb_shot_${ts}.jpg`);
    const savedCallback = this.frameCallback;
    const wasStreaming = this.isStreamingPreview;

    const resume = () => {
      if (wasStreaming && savedCallback) this.startPreviewStream(savedCallback);
    };

    // All possible paths gphoto2 might use depending on Canon model/protocol
    const candidates = [
      tmp,
      path.join(tmpDir, `thumb_pb_shot_${ts}.jpg`),
      path.join(tmpDir, `pb_shot_${ts}.CR2`),
      path.join(tmpDir, `pb_shot_${ts}.cr2`),
      ...['capt0000.jpg', 'capt0001.jpg', 'capt0002.jpg', 'capt0003.jpg',
          'capt0000.CR2', 'capt0001.CR2'].map(f => path.join(tmpDir, f)),
    ];

    try {
      if (wasStreaming) this.stopPreviewStream();
      await this._closeShell();
      await this._killPTPCamera();

      // Run viewfinder=0 AND capture in ONE gphoto2 call so USB is never released
      // between commands (prevents PTPCamera from reclaiming the interface).
      // gphoto2 continues to subsequent commands even if --set-config fails.
      let gphotoError = null;
      try {
        await execAsync(
          `${gphoto2} --set-config viewfinder=0 --capture-image-and-download --filename="${tmp}" --force-overwrite`,
          { timeout: 25000, cwd: tmpDir }
        );
      } catch (err) {
        gphotoError = err.message;
        console.warn('[Canon] gphoto2 exited with error (scanning for file anyway):', gphotoError);
      }

      // Also scan tmpDir for any new image file created around capture time
      try {
        const recentFiles = fs.readdirSync(tmpDir)
          .map(f => path.join(tmpDir, f))
          .filter(f => {
            try {
              const st = fs.statSync(f);
              return st.isFile() && st.size > 1000 &&
                (Date.now() - st.mtimeMs) < 30000 &&
                /\.(jpg|jpeg|cr2|cr3|nef|arw)$/i.test(f);
            } catch { return false; }
          });
        console.log('[Canon] Recent image files in tmpDir:', recentFiles);
        for (const f of recentFiles) {
          if (!candidates.includes(f)) candidates.push(f);
        }
      } catch { /* scan failure is non-fatal */ }

      // Search all candidate paths — gphoto2 location varies by camera model
      const actualFile = candidates.find(f => {
        try { return fs.existsSync(f) && fs.statSync(f).size > 1000; } catch { return false; }
      });

      if (!actualFile) {
        throw new Error(
          gphotoError
            ? `gphoto2 error: ${gphotoError}`
            : 'File foto tidak ditemukan. Pastikan kamera menyala, mode JPEG (bukan RAW only), dan tidak sleep.'
        );
      }

      console.log('[Canon] Captured file:', actualFile);
      const buf = fs.readFileSync(actualFile);
      try { fs.unlinkSync(actualFile); } catch { /* ok */ }

      const base64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
      resume(); // restart preview (preview loop re-enables live view via shell)
      return { success: true, data: base64 };
    } catch (err) {
      candidates.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ok */ } });
      resume();
      return { success: false, error: err.message };
    }
  }

  // ── Windows — digiCamControl REST API ───────────────────────────────────────

  _httpGet(urlStr, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const req = http.get(urlStr, { timeout: timeoutMs }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  async _detectWindows() {
    // Try multiple endpoints — DCC versions differ in API structure.
    // Success = any HTTP response from port 5513 (server is running).
    const endpoints = [
      `${DIGICAM_BASE}/api/camera`,
      `${DIGICAM_BASE}/`,
    ];
    for (const url of endpoints) {
      try {
        const { status, body } = await this._httpGet(url, 4000);
        if (status < 200 || status >= 500) continue;
        let model = 'Canon Camera (digiCamControl)';
        try {
          const data = JSON.parse(body.toString());
          model = data.Model || data.DisplayName || data.Name || model;
        } catch { /* HTML response is fine — server is up */ }
        this.isAvailable = true;
        this.cameraModel = model;
        console.log(`[DCC] Connected via ${url}: ${model}`);
        return { success: true, cameras: [{ model, port: 'USB (digiCamControl)' }] };
      } catch { /* try next endpoint */ }
    }
    return {
      success: false,
      error: 'digiCamControl tidak terdeteksi di port 5513.\n\n• Pastikan digiCamControl sudah dibuka\n• Kamera terhubung & menyala di dalam digiCamControl\n• Coba klik "Canon" lagi setelah DCC terbuka',
      cameras: [],
    };
  }

  async _previewFrameWindows() {
    try {
      const { status, body } = await this._httpGet(`${DIGICAM_BASE}/liveview.jpg`, 2000);
      if (status !== 200 || !body.length) return null;
      return `data:image/jpeg;base64,${body.toString('base64')}`;
    } catch {
      return null;
    }
  }

  // Collect all image files recursively from a directory
  _scanImageFiles(dir, result = []) {
    try {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        try {
          const st = fs.statSync(full);
          if (st.isDirectory()) this._scanImageFiles(full, result);
          else if (/\.(jpg|jpeg|cr2|cr3|nef|arw)$/i.test(f)) {
            result.push({ path: full, mtime: st.mtimeMs, size: st.size });
          }
        } catch { /* skip locked/inaccessible */ }
      }
    } catch { /* dir might not exist */ }
    return result;
  }

  async _captureWindows() {
    const savedCallback = this.frameCallback;
    const wasStreaming = this.isStreamingPreview;
    const resume = () => { if (wasStreaming && savedCallback) this.startPreviewStream(savedCallback); };

    try {
      if (wasStreaming) this.stopPreviewStream();

      // Snapshot all existing image files in DCC output folders BEFORE capture
      const dccFolders = [
        path.join(os.homedir(), 'Pictures', 'digiCamControl'),
        path.join(os.homedir(), 'Pictures', 'Digicam Control'),
        path.join(os.homedir(), 'Documents', 'digiCamControl'),
        'C:\\Users\\Public\\Pictures\\digiCamControl',
      ];
      const beforePaths = new Set();
      for (const folder of dccFolders) {
        this._scanImageFiles(folder).forEach(f => beforePaths.add(f.path));
      }
      const captureStartedAt = Date.now();

      // Trigger shutter — digiCamControl uses GET /capture (not /api/capture)
      const { status, body } = await this._httpGet(`${DIGICAM_BASE}/capture`, 20000);
      if (status !== 200) {
        throw new Error(
          `digiCamControl tidak merespons (HTTP ${status}).\n` +
          'Pastikan digiCamControl terbuka dan kamera menyala.'
        );
      }

      // Log whatever digiCamControl returned (helps debugging)
      let dccResponse = '';
      try { dccResponse = body.toString().trim(); } catch { /* ok */ }
      console.log('[DCC] Capture response:', dccResponse);

      // Wait for camera to write image to disk (Canon needs ~2-3s after shutter)
      await new Promise(r => setTimeout(r, 2500));

      // Find new image files that appeared after capture
      const newFiles = [];
      for (const folder of dccFolders) {
        this._scanImageFiles(folder).forEach(f => {
          if (!beforePaths.has(f.path) && f.mtime >= captureStartedAt - 5000 && f.size > 50000) {
            newFiles.push(f);
          }
        });
      }

      // Also check if dccResponse contains a file path (some DCC versions return it)
      if (dccResponse) {
        const pathCandidates = [
          dccResponse,
          ...dccFolders.map(d => path.join(d, dccResponse)),
        ];
        for (const p of pathCandidates) {
          try {
            const st = fs.statSync(p);
            if (st.size > 50000 && !newFiles.find(f => f.path === p)) {
              newFiles.unshift({ path: p, mtime: st.mtimeMs, size: st.size });
            }
          } catch { /* not a valid path */ }
        }
      }

      newFiles.sort((a, b) => b.mtime - a.mtime);

      if (newFiles.length === 0) {
        throw new Error(
          'Foto tidak ditemukan setelah capture.\n' +
          'Pastikan:\n• digiCamControl terbuka & kamera terdeteksi\n' +
          '• Kamera tidak dalam mode sleep\n• Ada memori card di kamera (Canon butuh card untuk capture)\n' +
          '• Folder output digiCamControl ada di Pictures\\digiCamControl'
        );
      }

      console.log('[DCC] Captured file:', newFiles[0].path);
      const buf = fs.readFileSync(newFiles[0].path);
      const base64 = `data:image/jpeg;base64,${buf.toString('base64')}`;

      resume();
      return { success: true, data: base64 };
    } catch (err) {
      resume();
      return { success: false, error: err.message };
    }
  }
}
