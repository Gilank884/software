/**
 * DSLRFolderDriver simulates a DSLR via a 'hot folder'.
 * It polls a local API (typically scripts/camera-mock-server.js) 
 * for the latest image.
 */
export class DSLRFolderDriver {
  constructor() {
    this.apiUrl = 'http://localhost:3001';
    this.latestImageUrl = null;
    this.isInitialized = false;
    this.isPreviewing = false;
    this.pollInterval = null;
  }

  async init() {
    try {
      const statusRes = await fetch(`${this.apiUrl}/status`, { signal: AbortSignal.timeout(1000) });
      const statusData = await statusRes.json();
      if (statusData.status !== 'ok') {
        return { success: false, error: 'Server not OK' };
      }

      // FolderBridge always runs in Electron — only switch to DSLR mode
      // if there are actual photos in the captures folder (evidence of a real camera).
      const latestRes = await fetch(`${this.apiUrl}/latest`, { signal: AbortSignal.timeout(1000) });
      const latestData = await latestRes.json();
      if (!latestData.url) {
        console.log("DSLR Folder Bridge running but captures folder is empty — staying on webcam.");
        this.isInitialized = false;
        return { success: false, error: 'No camera output detected' };
      }

      this.isInitialized = true;
      this.latestImageUrl = latestData.url;
      console.log("DSLR Folder Driver connected to localhost:3001 with active output.");
      return { success: true };
    } catch (err) {
      console.warn("DSLR Folder Server not reachable at localhost:3001");
      this.isInitialized = false;
      return { success: false, error: 'Server Not Reachable' };
    }
  }

  async startPreview(element) {
    this.isPreviewing = true;
    
    // For DSLR Folder, start polling for the latest image
    if (this.pollInterval) clearInterval(this.pollInterval);
    
    this.pollInterval = setInterval(async () => {
      if (!this.isPreviewing) return;
      
      try {
        const response = await fetch(`${this.apiUrl}/latest`, { signal: AbortSignal.timeout(1000) });
        const data = await response.json();
        if (data.url && data.url !== this.latestImageUrl) {
          this.latestImageUrl = data.url;
          console.log("New image detected from hot folder:", data.url);
          // The UI will consume this via the getStatus notification
        }
      } catch (err) {
        // Silently fail polling
      }
    }, 1000); // Check every second

    return { success: true };
  }

  async stopPreview() {
    this.isPreviewing = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    return { success: true };
  }

  async capture() {
    // In DSLR Folder mode, 'capture' usually means waiting for the latest 
    // image to appear or just returning the current latest one.
    // For this implementation, we return the current latest one or trigger a 
    // fetch to ensure we have the most recent data.
    
    try {
      const response = await fetch(`${this.apiUrl}/latest`, { signal: AbortSignal.timeout(1000) });
      const data = await response.json();
      if (data.url) {
        this.latestImageUrl = data.url;
        return data.url;
      }
      throw new Error("No image found in hot folder");
    } catch (err) {
      throw new Error("Failed to capture from DSLR Folder: " + err.message);
    }
  }

  getStatus() {
    return {
      active: this.isInitialized,
      isAvailable: this.isInitialized,
      error: null,
      name: 'DSLR Folder Connected',
      lastCapturedImage: this.latestImageUrl
    };
  }
}
