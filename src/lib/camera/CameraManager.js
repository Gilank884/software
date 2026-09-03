import { WebcamDriver } from './drivers/WebcamDriver';
import { DSLRFolderDriver } from './drivers/DSLRFolderDriver';
import { MockDriver } from './drivers/MockDriver';
import { PhoneCameraDriver } from './drivers/PhoneCameraDriver';
import { CanonGPhoto2Driver } from './drivers/CanonGPhoto2Driver';

export class CameraManager {
  static INSTANCE = null;
  
  constructor() {
    this.drivers = {
      webcam: new WebcamDriver(),
      dslr: new DSLRFolderDriver(),
      mock: new MockDriver(),
      phone: new PhoneCameraDriver(() => this.notify()),
      canon: new CanonGPhoto2Driver(),
    };
    this.currentSource = 'webcam'; // Default source
    this.isAutoDetect = true;
    this.isInitialized = false;
    this.previewElement = null;
    this.lastCapturedImage = null;
    this.cameraZoom = parseFloat(localStorage.getItem('pb_camera_zoom') || '1.0');

    // Environment Detection
    this.isElectron = !!window.electronAPI;

    // Subscriber for camera status changes
    this.subscribers = [];
  }

  static getInstance() {
    if (!CameraManager.INSTANCE) {
      CameraManager.INSTANCE = new CameraManager();
    }
    return CameraManager.INSTANCE;
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  notify() {
    const status = this.getStatus();
    this.subscribers.forEach(s => s(status));
  }

  async init(overrideSource = null) {
    if (overrideSource) {
      this.isAutoDetect = false;
      this.currentSource = overrideSource;
    }

    try {
      if (this.isAutoDetect) {
        // 1. Try DSLR Folder (Local API)
        const dslrRes = await this.drivers.dslr.init();
        if (dslrRes && dslrRes.success) {
          this.currentSource = 'dslr';
          console.log("Auto-Detected: DSLR Folder");
        }
        // 2. Try Canon via gphoto2 (USB DSLR)
        else {
          try {
            const canonRes = await this.drivers.canon.init();
            if (canonRes && canonRes.success) {
              this.currentSource = 'canon';
              console.log("Auto-Detected: Canon USB");
            } else {
              throw new Error('Canon not found');
            }
          } catch {
            // 3. Try Webcam
            try {
              await this.drivers.webcam.init();
              this.currentSource = 'webcam';
              console.log("Auto-Detected: Webcam");
            } catch (err) {
              // 4. Final Fallback: Mock
              console.warn("Webcam failed, falling back to Mock mode.");
              await this.drivers.mock.init();
              this.currentSource = 'mock';
            }
          }
        }
      } else {
        // Source explicitly set
        await this.drivers[this.currentSource].init();
      }
      this.isInitialized = true;
    } catch (err) {
      console.error("Camera Initialization Failed:", err);
      throw err;
    } finally {
      this.notify();
    }
  }

  async startPreview(element) {
    this.previewElement = element;
    if (!this.isInitialized) await this.init();

    try {
      // Pass notify callback so Canon frame updates propagate to React state
      const notifyFn = this.currentSource === 'canon' ? () => this.notify() : undefined;
      await this.drivers[this.currentSource].startPreview(element, notifyFn);

      // Watchdog: a Canon still appears in gphoto2 --auto-detect even when it is
      // OFF/standby (USB stays alive). If no live-view frame arrives, fall back to
      // webcam so the screen never stays black with "connected but no preview".
      // Only arm watchdog during auto-detect — if user manually chose Canon,
      // never revert. Show "no preview" instead of silently switching sources.
      if (this.currentSource === 'canon' && this.isAutoDetect) {
        this._armCanonWatchdog();
      }
    } catch (err) {
      if (this.isAutoDetect && this.currentSource === 'dslr') {
        console.warn("DSLR Preview failed, switching back to Webcam.");
        this.currentSource = 'webcam';
        await this.drivers.webcam.init();
        await this.drivers.webcam.startPreview(element);
      } else {
        throw err;
      }
    } finally {
      this.notify();
    }
  }

  _armCanonWatchdog() {
    this._clearCanonWatchdog();
    const canon = this.drivers.canon;
    const framesAtStart = canon.previewFrames;
    // 20s: DMG production needs extra time for PTPCamera kill (800ms) + gphoto2 shell startup
    this._canonWatchdog = setTimeout(async () => {
      if (this.currentSource !== 'canon' || canon.previewFrames > framesAtStart) return;
      console.warn("[Camera] Canon produced no live-view frames — camera likely off. Falling back to Webcam.");
      this.isAutoDetect = false;
      this.currentSource = 'webcam';
      try { await this.drivers.canon.stopPreview(); } catch { /* ignore */ }
      try { await this.drivers.webcam.init(); } catch (err) { console.warn("[Camera] Webcam init failed on fallback:", err); }
      this.notify();
    }, 20000);
  }

  _clearCanonWatchdog() {
    if (this._canonWatchdog) {
      clearTimeout(this._canonWatchdog);
      this._canonWatchdog = null;
    }
  }

  async stopPreview() {
    this._clearCanonWatchdog();
    await this.drivers[this.currentSource].stopPreview();
    this.notify();
  }

  async capture() {
    try {
      const data = await this.drivers[this.currentSource].capture();
      const zoomed = await this._applyZoom(data);
      this.lastCapturedImage = zoomed;
      return zoomed;
    } catch (err) {
      console.error("Capture Failed:", err);
      throw err;
    }
  }

  async _applyZoom(dataUrl) {
    if (this.cameraZoom <= 1.0) return dataUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const drawW = canvas.width * this.cameraZoom;
        const drawH = canvas.height * this.cameraZoom;
        ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);  // fallback to original if zoom fails
      img.src = dataUrl;
    });
  }

  getStatus() {
    const driverStatus = this.drivers[this.currentSource]?.getStatus() || { 
      active: false, 
      error: "No Driver", 
      name: "None" 
    };
    
    // Professional status string implementation
    let statusName = "No Camera Detected";
    if (driverStatus.isAvailable) {
      if (this.currentSource === 'dslr') {
        statusName = "DSLR Folder Connected";
      } else if (this.currentSource === 'webcam') {
        statusName = "Webcam Ready";
      } else if (this.currentSource === 'phone') {
        statusName = driverStatus.isConnected ? "Phone Camera — Connected" : "Phone Camera — Menunggu HP";
      } else if (this.currentSource === 'mock') {
        statusName = "Mock Mode Active";
      } else if (this.currentSource === 'canon') {
        statusName = driverStatus.name || "Canon — USB Connected";
      }
    }

    return {
      source: this.currentSource,
      isAutoDetect: this.isAutoDetect,
      isElectron: this.isElectron,
      lastCapturedImage: this.lastCapturedImage || driverStatus.lastCapturedImage,
      ...driverStatus,
      webcamDevices: this.drivers.webcam.availableDevices,
      currentWebcamId: this.drivers.webcam.selectedDeviceId,
      cameraZoom: this.cameraZoom,
      name: statusName // Override with requested names
    };
  }

  async setSource(source) {
    this._clearCanonWatchdog();
    const oldSource = this.currentSource;
    
    if (source === 'auto') {
      this.isAutoDetect = true;
      await this.init();
    } else if (this.drivers[source]) {
      this.isAutoDetect = false;
      
      // Stop old source if it's different
      if (oldSource !== source) {
        if (this.drivers[oldSource]?.stopHardware) {
          this.drivers[oldSource].stopHardware();
        } else {
          await this.drivers[oldSource].stopPreview();
        }
      }
      
      this.currentSource = source;
      await this.init();
    }
    
    // If already previewing, restart preview on the new source
    if (this.previewElement) {
      // Note: we don't call this.stopPreview() here because we already stopped 
      // the old hardware above if the source changed.
      await this.startPreview(this.previewElement);
    }
    
    this.notify();
  }

  async setWebcamDevice(deviceId) {
    await this.drivers.webcam.setDeviceId(deviceId);
    this.notify();
  }

  subscribePhoneShutter(cb) {
    return this.drivers.phone.subscribeShutter(cb);
  }

  setCameraZoom(value) {
    this.cameraZoom = value;
    localStorage.setItem('pb_camera_zoom', String(value));
    this.notify();
  }
}

export const camera = CameraManager.getInstance();
