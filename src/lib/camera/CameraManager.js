import { WebcamDriver } from './drivers/WebcamDriver';
import { DSLRFolderDriver } from './drivers/DSLRFolderDriver';
import { MockDriver } from './drivers/MockDriver';
import { PhoneCameraDriver } from './drivers/PhoneCameraDriver';

export class CameraManager {
  static INSTANCE = null;
  
  constructor() {
    this.drivers = {
      webcam: new WebcamDriver(),
      dslr: new DSLRFolderDriver(),
      mock: new MockDriver(),
      phone: new PhoneCameraDriver(() => this.notify()),
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
        // 2. Try Webcam
        else {
          try {
            await this.drivers.webcam.init();
            this.currentSource = 'webcam';
            console.log("Auto-Detected: Webcam");
          } catch (err) {
            // 3. Final Fallback: Mock
            console.warn("Webcam failed or not available, falling back to Mock mode.");
            await this.drivers.mock.init();
            this.currentSource = 'mock';
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
      await this.drivers[this.currentSource].startPreview(element);
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

  async stopPreview() {
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
