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
    this.previewInterval = null;
  }

  async init() {
    this.isInitialized = true;
    console.log("Mock Camera Initialized");
    return Promise.resolve();
  }

  async startPreview(element) {
    this.isPreviewing = true;
    
    // For Mock, if element is a video, we can't easily play an image.
    // However, for the photobooth UI, we can just return a placeholder URL 
    // that the UI can use in an <img> or just ignore if it expects a stream.
    // In our system, if it's DSLR or Mock, the UI should use <img> if possible, 
    // but we'll try to be compatible.
    
    console.log("Mock Preview Started");
    return Promise.resolve();
  }

  async stopPreview() {
    this.isPreviewing = false;
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
      name: 'Mock Mode Active'
    };
  }
}
