/**
 * CanonGPhoto2Driver
 * Controls Canon (and most PTP cameras) directly via USB using gphoto2.
 * No EOS Webcam Utility needed — camera appears as PTP device.
 *
 * Prerequisites (one-time setup on Mac):
 *   brew install gphoto2
 *
 * The Electron main process handles the actual gphoto2 subprocess via IPC.
 * This driver is the renderer-side interface.
 */
export class CanonGPhoto2Driver {
  constructor() {
    this.isInitialized = false;
    this.isPreviewing = false;
    this.lastFrame = null;
    this.cameraModel = null;
    this.errorMessage = null;
    this.previewFrames = 0;
    this._onFrameCleanup = null;
    this._previewElement = null;
  }

  get api() {
    return window.electronAPI;
  }

  async init() {
    if (!this.api?.canonDetect) {
      this.errorMessage = 'Fitur ini hanya tersedia di aplikasi desktop (Electron).';
      return { success: false };
    }

    const result = await this.api.canonDetect();
    if (!result.success) {
      this.errorMessage = result.error || 'Kamera tidak terdeteksi.';
      this.isInitialized = false;
      return { success: false, error: this.errorMessage };
    }

    this.cameraModel = result.cameras[0]?.model || 'Canon Camera';
    this.isInitialized = true;
    this.errorMessage = null;
    console.log(`[Canon gphoto2] Connected: ${this.cameraModel}`);
    return { success: true };
  }

  async startPreview(element, onFrameNotify) {
    // Try to init, but don't bail out if it fails —
    // on Windows DCC might not be ready yet; preview stream will just produce no frames
    // until DCC starts, then frames will arrive automatically.
    if (!this.isInitialized) {
      await this.init().catch(() => {});
    }

    this._previewElement = element;
    this.isPreviewing = true;
    this.previewFrames = 0;

    this._onFrameCleanup = () => this.api?.offCanonPreviewFrame?.();
    this.api?.onCanonPreviewFrame?.((frameBase64) => {
      if (!this.isPreviewing) return;
      this.previewFrames++;
      this.lastFrame = frameBase64;
      if (element && element.tagName === 'IMG') {
        element.src = frameBase64;
      }
      if (onFrameNotify) onFrameNotify();
    });

    // Start the preview stream regardless of init result —
    // main process will poll DCC/gphoto2 and send frames when camera is ready.
    await this.api?.canonStartPreview?.();
  }

  async stopPreview() {
    this.isPreviewing = false;
    this._previewElement = null;
    this.api?.offCanonPreviewFrame?.();
    this._onFrameCleanup = null;
    await this.api?.canonStopPreview?.();
  }

  async capture() {
    const result = await this.api?.canonCapturePhoto?.();
    if (!result?.success) {
      throw new Error(result?.error || 'Gagal mengambil foto dari kamera Canon.');
    }
    this.lastFrame = result.data;
    return result.data; // base64 data URL
  }

  getStatus() {
    const available = this.isInitialized;
    return {
      active: available,
      isAvailable: available,
      error: this.errorMessage,
      name: available ? this.cameraModel : 'Canon — Tidak Terdeteksi',
      lastCapturedImage: this.lastFrame,
    };
  }
}
