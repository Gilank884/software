import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * GPhoto2Driver
 * Communicates directly with Canon (and other PTP cameras) via gphoto2 CLI.
 * No EOS Webcam Utility or other third-party software required.
 *
 * Install: brew install gphoto2
 */
export class GPhoto2Driver {
  constructor() {
    this.isAvailable = false;
    this.cameraModel = null;
    this.previewProcess = null;
    this.isStreamingPreview = false;
    this.frameCallback = null;
    this.capturesDir = null;
    this._frameBuffer = [];
    this._frameTimer = null;
  }

  setCapturesDir(dir) {
    this.capturesDir = dir;
  }

  // Check if gphoto2 is installed
  async checkInstalled() {
    try {
      await execAsync('which gphoto2');
      return true;
    } catch {
      return false;
    }
  }

  // Detect connected cameras — returns array of { model, port }
  async detect() {
    const installed = await this.checkInstalled();
    if (!installed) {
      return { success: false, error: 'gphoto2 not installed. Run: brew install gphoto2', cameras: [] };
    }

    try {
      const { stdout } = await execAsync('gphoto2 --auto-detect 2>/dev/null', { timeout: 8000 });
      const lines = stdout.trim().split('\n').slice(2); // skip header lines
      const cameras = lines
        .filter(l => l.trim().length > 0)
        .map(l => {
          // Format: "Canon EOS 700D                    usb:020,011"
          const match = l.match(/^(.+?)\s{2,}(usb:\S+|\S+)$/);
          if (!match) return null;
          return { model: match[1].trim(), port: match[2].trim() };
        })
        .filter(Boolean);

      if (cameras.length === 0) {
        return { success: false, error: 'No camera detected. Make sure camera is on and USB cable is connected.', cameras: [] };
      }

      this.isAvailable = true;
      this.cameraModel = cameras[0].model;
      return { success: true, cameras };
    } catch (err) {
      return { success: false, error: err.message, cameras: [] };
    }
  }

  // Capture a single preview frame (JPEG from camera's live view buffer)
  async capturePreviewFrame() {
    const tmpFile = path.join(os.tmpdir(), `pb_preview_${Date.now()}.jpg`);
    try {
      await execAsync(`gphoto2 --capture-preview --filename="${tmpFile}" --force-overwrite 2>/dev/null`, { timeout: 3000 });
      if (!fs.existsSync(tmpFile)) return null;
      const data = fs.readFileSync(tmpFile);
      fs.unlinkSync(tmpFile);
      return `data:image/jpeg;base64,${data.toString('base64')}`;
    } catch {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      return null;
    }
  }

  // Start sending preview frames via callback (roughly 5fps to avoid blocking)
  startPreviewStream(onFrame) {
    if (this.isStreamingPreview) return;
    this.isStreamingPreview = true;
    this.frameCallback = onFrame;

    const loop = async () => {
      if (!this.isStreamingPreview) return;
      try {
        const frame = await this.capturePreviewFrame();
        if (frame && this.frameCallback) {
          this.frameCallback(frame);
        }
      } catch {
        // Camera busy or disconnected — keep trying
      }
      if (this.isStreamingPreview) {
        this._frameTimer = setTimeout(loop, 200); // ~5fps
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
  }

  // Trigger shutter and download the full-resolution photo
  async capturePhoto() {
    const tmpFile = path.join(os.tmpdir(), `pb_shot_${Date.now()}.jpg`);
    try {
      // Pause preview temporarily so gphoto2 isn't busy
      const wasStreaming = this.isStreamingPreview;
      if (wasStreaming) this.stopPreviewStream();

      // Exit Live View before still capture — many Canon EOS refuse
      // `--capture-image-and-download` while the viewfinder/live view is active.
      try {
        await execAsync(`gphoto2 --set-config viewfinder=0`, { timeout: 3000 });
      } catch { /* not all models expose viewfinder config — ignore */ }

      await execAsync(
        `gphoto2 --capture-image-and-download --filename="${tmpFile}" --force-overwrite`,
        { timeout: 20000 }
      );

      if (!fs.existsSync(tmpFile)) {
        throw new Error('Photo file not found after capture');
      }

      const data = fs.readFileSync(tmpFile);
      fs.unlinkSync(tmpFile);

      const base64 = `data:image/jpeg;base64,${data.toString('base64')}`;

      // Resume preview
      if (wasStreaming && this.frameCallback) {
        this.startPreviewStream(this.frameCallback);
      }

      return { success: true, data: base64 };
    } catch (err) {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      return { success: false, error: err.message };
    }
  }

  getStatus() {
    return {
      available: this.isAvailable,
      model: this.cameraModel,
      isPreviewing: this.isStreamingPreview,
    };
  }
}
