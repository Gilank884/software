const PHONE_CAM_WS = 'wss://localhost:3456';

export class PhoneCameraDriver {
  constructor(onStatusChange = () => {}) {
    this.onStatusChange = onStatusChange;
    this._shutterCbs = [];
    this._frameProcessing = false;
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
    this._pendingCaptureId = null; // ID unik per capture untuk mencegah hasil lama masuk
    this._captureSeq = 0;          // counter untuk generate ID
    this._reconnectTimer = null;
    this._stopReconnect = false;
  }

  async init() {
    this.isAvailable = !!window.electronAPI;
    this.error = null;
    return Promise.resolve();
  }

  subscribeShutter(cb) {
    this._shutterCbs.push(cb);
    return () => { this._shutterCbs = this._shutterCbs.filter(c => c !== cb); };
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
            if (msg.type === 'phone_shutter') {
              this._shutterCbs.forEach(cb => cb());
            } else if (msg.type === 'phone_connected') {
              this.isConnected = true;
              this.onStatusChange();
              // Re-trigger play in case the video element stalled while waiting
              if (this.videoElement) this.videoElement.play().catch(() => {});
            } else if (msg.type === 'phone_disconnected') {
              this.isConnected = false;
              this.onStatusChange();
              // Redraw waiting state on both surfaces
              if (this.internalCtx) this._drawWaitingOn(this.internalCtx, this.internalCanvas.width, this.internalCanvas.height);
              if (this.previewCanvas) this._drawWaitingOn(this.previewCanvas.getContext('2d'), this.previewCanvas.width, this.previewCanvas.height);
            } else if (msg.type === 'capture_result') {
              // Abaikan jika ID tidak cocok (hasil dari capture yang sudah timeout)
              if (msg.id !== this._pendingCaptureId) return;
              if (this.pendingCaptureResolve) {
                this.pendingCaptureResolve(msg.data);
                this.pendingCaptureResolve = null;
                this.pendingCaptureReject = null;
                this._pendingCaptureId = null;
              }
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

  _drawBitmapFit(ctx, bitmap, canvasW, canvasH) {
    // object-cover: scale up to fill, crop the overflow from center
    const scale = Math.max(canvasW / bitmap.width, canvasH / bitmap.height);
    const dw = bitmap.width * scale;
    const dh = bitmap.height * scale;
    const dx = (canvasW - dw) / 2;
    const dy = (canvasH - dh) / 2;
    ctx.drawImage(bitmap, dx, dy, dw, dh);
  }

  _drawFrame(blob) {
    // Drop frame if still decoding the previous one — prevents backlog
    if (this._frameProcessing) return;
    this._frameProcessing = true;

    createImageBitmap(blob).then(bitmap => {
      this._frameProcessing = false;

      if (this.internalCtx && this.internalCanvas) {
        this._drawBitmapFit(this.internalCtx, bitmap, this.internalCanvas.width, this.internalCanvas.height);
      }

      if (this.previewCanvas) {
        const ctx = this.previewCanvas.getContext('2d');
        if (this.previewCanvas.width !== 1280) this.previewCanvas.width = 1280;
        if (this.previewCanvas.height !== 720) this.previewCanvas.height = 720;
        this._drawBitmapFit(ctx, bitmap, 1280, 720);
      }

      bitmap.close();
    }).catch(() => { this._frameProcessing = false; });
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
      this._pendingCaptureId = null;
    }
  }

  async capture() {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('HP belum terhubung. Scan QR dan izinkan kamera di HP terlebih dahulu.');
    }

    // Jika masih ada capture yang pending, tolak yang baru — jangan overwrite promise lama
    if (this.pendingCaptureResolve) {
      throw new Error('Capture sedang berlangsung, tunggu sebentar.');
    }

    const captureId = ++this._captureSeq;
    this._pendingCaptureId = captureId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Hanya reject jika ID masih sama (belum ada capture baru)
        if (this._pendingCaptureId === captureId) {
          this.pendingCaptureResolve = null;
          this.pendingCaptureReject = null;
          this._pendingCaptureId = null;
          reject(new Error('Timeout: HP tidak merespons dalam 25 detik.'));
        }
      }, 25000);

      this.pendingCaptureResolve = (dataUrl) => {
        clearTimeout(timeout);
        resolve(dataUrl);
      };
      this.pendingCaptureReject = (err) => {
        clearTimeout(timeout);
        reject(err);
      };

      this.ws.send(JSON.stringify({ type: 'capture', id: captureId }));
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
