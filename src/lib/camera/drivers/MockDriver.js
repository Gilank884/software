/**
 * MockDriver simulates a camera using predefined images.
 * Useful for development and demos without hardware.
 */
export class MockDriver {
  constructor() {
    this.isInitialized = false;
    this.isPreviewing = false;
    this.mockPhotos = [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1000'
    ];
    this.currentPreviewIndex = 0;
    this.previewTimer = null;
    this.lastCapturedImage = null;
    this._previewElement = null;
  }

  async init() {
    this.isInitialized = true;
    console.log("Mock Camera Initialized");
    return Promise.resolve();
  }

  async startPreview(element) {
    this.isPreviewing = true;
    console.log("Mock Preview Started");
    // Keep the preview populated so the viewport is never blank
    if (element && element.tagName === 'IMG') {
      this._previewElement = element;
      this._showFrame();
    }
    return Promise.resolve();
  }

  _showFrame() {
    this.currentPreviewIndex = (this.currentPreviewIndex + 1) % this.mockPhotos.length;
    this.lastCapturedImage = this.mockPhotos[this.currentPreviewIndex];
    if (this._previewElement) this._previewElement.src = this.lastCapturedImage;
    if (this.isPreviewing) {
      this.previewTimer = setTimeout(() => this._showFrame(), 1000);
    }
  }

  async stopPreview() {
    this.isPreviewing = false;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
    this._previewElement = null;
    console.log("Mock Preview Stopped");
    return Promise.resolve();
  }

  async capture() {
    // Simulate shutter delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Pick a random photo
    const randomIndex = Math.floor(Math.random() * this.mockPhotos.length);
    const photoUrl = this.mockPhotos[randomIndex];
    
    console.log("Mock Capture Successful:", photoUrl);
    return photoUrl;
  }

  getStatus() {
    return {
      active: this.isInitialized,
      isAvailable: true,
      error: null,
      name: 'Mock Mode Active',
      lastCapturedImage: this.lastCapturedImage
    };
  }
}
