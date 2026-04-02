export class WebcamDriver {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.isInitialized = false;
    this.isAvailable = false;
    this.error = null;
    this.availableDevices = [];
    this.selectedDeviceId = localStorage.getItem('pb_webcam_device_id') || null;
  }

  async init() {
    this.isInitialized = true;
    this.isAvailable = true; 
    
    // Auto-refresh when devices are plugged/unplugged
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        console.log("[WebcamDriver] Hardware change detected, refreshing list...");
        this.refreshDevices();
      });
    }

    await this.refreshDevices();
    return Promise.resolve();
  }

  async refreshDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      console.log("[WebcamDriver] Available Video Inputs:", videoInputs);
      
      this.availableDevices = videoInputs
        .filter(device => device.deviceId !== '')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Camera ${this.availableDevices.length + 1}`
        }));
    } catch (err) {
      console.warn("Could not enumerate devices:", err);
    }
  }

  async setDeviceId(id) {
    console.log("[WebcamDriver] Switching to device:", id);
    this.selectedDeviceId = id;
    localStorage.setItem('pb_webcam_device_id', id);
    if (this.videoElement) {
      this.stopPreview();
      await this.startPreview(this.videoElement);
    }
  }

  async startPreview(element) {
    this.videoElement = element;
    this.error = null;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Kamera API tidak didukung di sistem ini.");
      }

      const constraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false
      };

      if (this.selectedDeviceId) {
        constraints.video.deviceId = { exact: this.selectedDeviceId };
      } else {
        constraints.video.facingMode = 'user';
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
      }
    } catch (err) {
      console.error("Webcam Error:", err);
      let msg = "Kamera tidak dapat aktif.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Izin kamera ditolak. Mohon aktifkan di pengaturan sistem.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "Kamera tidak ditemukan. Pastikan sudah tercolok.";
      } else {
        msg = `Gagal akses kamera: ${err.message}`;
      }
      this.error = msg;
      throw new Error(msg);
    }
  }

  stopPreview() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  async capture() {
    if (!this.videoElement || !this.stream) {
      throw new Error("Kamera belum aktif.");
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Use video metadata or current video dimensions
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Standard mirror effect for photobooth
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(this.videoElement, 0, 0);

    return canvas.toDataURL('image/png');
  }

  getStatus() {
    return {
      active: !!this.stream,
      isAvailable: this.isAvailable,
      error: this.error,
      name: 'Webcam',
      availableDevices: this.availableDevices,
      selectedDeviceId: this.selectedDeviceId
    };
  }
}
