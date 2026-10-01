export class ScreenCaptureService {
  private activeStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  public isSupported(): boolean {
    return Boolean(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator.mediaDevices as any).getDisplayMedia
    );
  }

  /**
   * One-click Screenshot Capture:
   * Requests permission for a screen frame, captures canvas, then automatically stops the stream.
   */
  public async captureSingleScreenshot(): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('Screen capture is not supported in this browser. Please use Chrome, Edge, or Firefox.');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve());
        };
      });

      // Wait a frame for rendering
      await new Promise(r => setTimeout(r, 100));

      const canvas = document.createElement('canvas');
      // Downscale if wider than 1920 to keep upload fast
      const maxDim = 1920;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Clean up stream tracks immediately
      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;

      return dataUrl;
    } catch (err: unknown) {
      if ((err as Error).name === 'NotAllowedError') {
        throw new Error('Screen capture permission was cancelled or denied.');
      }
      throw err;
    }
  }

  /**
   * Persistent Screen Sharing:
   * Keeps a permission-based stream active so user can ask questions about their screen anytime.
   */
  public async startScreenSharing(onEnded?: () => void): Promise<MediaStream> {
    if (!this.isSupported()) {
      throw new Error('Screen sharing is not supported in this browser.');
    }

    // Stop existing if any
    this.stopScreenSharing();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always'
        },
        audio: false
      });

      this.activeStream = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(console.warn);
      this.videoElement = video;

      // Handle user stopping share via browser native UI banner
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenSharing();
          onEnded?.();
        };
      }

      return stream;
    } catch (err: unknown) {
      if ((err as Error).name === 'NotAllowedError') {
        throw new Error('Screen sharing permission was cancelled or denied.');
      }
      throw err;
    }
  }

  /**
   * Captures a single frame from the active screen share stream on demand
   */
  public captureFrameFromActiveShare(): string | null {
    if (!this.activeStream || !this.videoElement || this.videoElement.videoWidth === 0) {
      return null;
    }

    const video = this.videoElement;
    const canvas = document.createElement('canvas');

    const maxDim = 1920;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  public isSharingActive(): boolean {
    return Boolean(
      this.activeStream && 
      this.activeStream.active && 
      this.activeStream.getVideoTracks().some(t => t.readyState === 'live')
    );
  }

  public stopScreenSharing(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(t => t.stop());
      this.activeStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}

export const screenService = new ScreenCaptureService();
