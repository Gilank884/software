const PHONE_CAM_WS = 'wss://localhost:3456';

export class PhoneCameraDriver {
  constructor() {
    this.ws = null;
    this.internalCanvas = null;   // offscreen canvas for capture()
    this.internalCtx = null;
    this.previewCanvas = null;    // external <canvas> element (diagnostic modal)
    this.videoElement = null;     // external <video> element (capture screen)
    this.mediaStream = null;
    this.isConnected = false;
    this.isAvailable = true;
    this.error = null;
    this.pendingCaptureResolve = null;
    this.pendingCaptureReject = null;
    this._reconnectTimer = null;
    this._stopReconnect = false;
  }

  async init() {
    this.isAvailable = !!window.electronAPI;
    this.error = null;
    return Promise.resolve();
  }

  _ensureInternalCanvas() {
    if (this.internalCanvas) return;
    this.internalCanvas = document.createElement('canvas');
    this.internalCanvas.width = 1280;
    this.internalCanvas.height = 720;
    this.internalCtx = this.internalCanvas.getContext('2d');
    this._drawWaitingOn(this.internalCtx, 1280, 720);
  }

  _drawWaitingOn(ctx, w, h) {
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6366f1';
    ctx.font = `bold ${Math.round(w / 55)}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Scan QR Code untuk menghubungkan HP', w / 2, h / 2);
  }

  // Called with a <canvas> element — used by Camera Diagnostic modal
  async startPreview(element) {
    if (!window.electronAPI) return;

    this.error = null;
    this._stopReconnect = false;

    const tag = element?.tagName?.toUpperCase();

    if (tag === 'CANVAS') {
      this.previewCanvas = element;
      this.videoElement = null;
      // Draw initial waiting state directly onto the canvas element
      this.previewCanvas.width = 1280;
      this.previewCanvas.height = 720;
      this._drawWaitingOn(this.previewCanvas.getContext('2d'), 1280, 720);
    } else if (tag === 'VIDEO') {
      // Used by CaptureScreen — keep MediaStream approach
      this.videoElement = element;
      this.previewCanvas = null;
      this._ensureInternalCanvas();
      this._attachStreamToVideo();
    }

    this._connectWS();
  }

  _attachStreamToVideo() {
    if (!this.videoElement || !this.internalCanvas) return;
    try {
      if (this.internalCanvas.captureStream) {
        if (!this.mediaStream) {
          this.mediaStream = this.internalCanvas.captureStream(15);
        }
        this.videoElement.srcObject = this.mediaStream;
        this.videoElement.play().catch(() => {});
      }
    } catch (err) {
      console.warn('[PhoneCameraDriver] captureStream failed:', err.message);
    }
  }

  _connectWS() {
    if (this._stopReconnect) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    if (!window.electronAPI) return;

    try {
      this.ws = new WebSocket(PHONE_CAM_WS);

      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ type: 'role', role: 'desktop' }));
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          this._drawFrame(event.data);
        } else {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'phone_connected') {
              this.isConnected = true;
            } else if (msg.type === 'phone_disconnected') {
              this.isConnected = false;
              // Redraw waiting state on both surfaces
              if (this.internalCtx) this._drawWaitingOn(this.internalCtx, this.internalCanvas.width, this.internalCanvas.height);
              if (this.previewCanvas) this._drawWaitingOn(this.previewCanvas.getContext('2d'), this.previewCanvas.width, this.previewCanvas.height);
            } else if (msg.type === 'capture_result' && this.pendingCaptureResolve) {
              this.pendingCaptureResolve(msg.data);
              this.pendingCaptureResolve = null;
              this.pendingCaptureReject = null;
            }
          } catch (_) { /* ignore */ }
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (!this._stopReconnect) {
          this._reconnectTimer = setTimeout(() => this._connectWS(), 3000);
        }
      };

      this.ws.onerror = () => {
        this.error = 'Tidak dapat terhubung ke server Phone Camera.';
      };
    } catch (err) {
      this.error = err.message;
    }
  }

  _drawFrame(blob) {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1280;
      const h = img.naturalHeight || 720;

      // Draw to internal canvas (for captureStream → video in CaptureScreen)
      if (this.internalCtx && this.internalCanvas) {
        if (this.internalCanvas.width !== w) this.internalCanvas.width = w;
        if (this.internalCanvas.height !== h) this.internalCanvas.height = h;
        this.internalCtx.drawImage(img, 0, 0);
      }

      // Draw directly to preview canvas (no captureStream needed)
      if (this.previewCanvas) {
        const ctx = this.previewCanvas.getContext('2d');
        if (this.previewCanvas.width !== w) this.previewCanvas.width = w;
        if (this.previewCanvas.height !== h) this.previewCanvas.height = h;
        ctx.drawImage(img, 0, 0);
      }

      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  stopPreview() {
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.previewCanvas = null;
  }

  stopHardware() {
    this._stopReconnect = true;
    clearTimeout(this._reconnectTimer);

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.previewCanvas = null;
    this.isConnected = false;

    if (this.pendingCaptureReject) {
      this.pendingCaptureReject(new Error('Koneksi terputus.'));
      this.pendingCaptureResolve = null;
      this.pendingCaptureReject = null;
    }
  }

  async capture() {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('HP belum terhubung. Scan QR dan izinkan kamera di HP terlebih dahulu.');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCaptureResolve = null;
        this.pendingCaptureReject = null;
        reject(new Error('Timeout: HP tidak merespons dalam 10 detik.'));
      }, 10000);

      this.pendingCaptureResolve = (dataUrl) => {
        clearTimeout(timeout);
        resolve(dataUrl);
      };
      this.pendingCaptureReject = (err) => {
        clearTimeout(timeout);
        reject(err);
      };

      this.ws.send(JSON.stringify({ type: 'capture' }));
    });
  }

  getStatus() {
    const isElectron = !!window.electronAPI;
    return {
      active: this.isConnected,
      isAvailable: isElectron,
      error: this.error,
      name: !isElectron
        ? 'Phone Camera (Desktop Only)'
        : this.isConnected
          ? 'Phone Camera — Connected'
          : 'Phone Camera — Menunggu HP',
      isConnected: this.isConnected,
      availableDevices: [],
    };
  }
}
