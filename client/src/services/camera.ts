/**
 * Camera Service for Multimodal Voice Assistant
 * 
 * Manages local browser webcam access via getUserMedia,
 * maintains local preview, and provides on-demand single-frame capture
 * with dimension and JPEG compression optimizations.
 * 
 * STRICT ARCHITECTURE RULES:
 * - Local-first: Never continuously streams frames to the server/model.
 * - Captures only on-demand when user asks a visual/camera question.
 * - Releases camera hardware tracks cleanly when stopped.
 */

export const CAMERA_CONFIG = {
  maxWidth: 1280,
  maxHeight: 720,
  quality: 0.82
};

export type CameraState = 'OFF' | 'STARTING' | 'ON' | 'PROCESSING' | 'ERROR';

export interface CameraServiceCallbacks {
  onStatusChange?: (status: CameraState, error?: string | null) => void;
  onEnded?: () => void;
}

export class CameraCaptureService {
  private activeStream: MediaStream | null = null;
  private previewVideoElement: HTMLVideoElement | null = null;
  private internalVideoElement: HTMLVideoElement | null = null;
  private status: CameraState = 'OFF';
  private lastError: string | null = null;
  private callbacks: CameraServiceCallbacks = {};

  /**
   * Check if getUserMedia is supported in the current browser environment
   */
  public isSupported(): boolean {
    return Boolean(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Register service-level callbacks
   */
  public setCallbacks(callbacks: CameraServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  private updateStatus(newStatus: CameraState, error: string | null = null): void {
    this.status = newStatus;
    this.lastError = error;
    this.callbacks.onStatusChange?.(newStatus, error);
  }

  public getStatus(): CameraState {
    return this.status;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public isActive(): boolean {
    return Boolean(
      this.activeStream &&
      this.activeStream.active &&
      this.activeStream.getVideoTracks().some(t => t.readyState === 'live')
    );
  }

  /**
   * Start local camera stream with audio disabled (video only)
   * Binds stream to the provided preview element or internally managed video element
   */
  public async startCamera(previewEl?: HTMLVideoElement | null): Promise<MediaStream> {
    if (!this.isSupported()) {
      const err = 'Camera access is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.';
      this.updateStatus('ERROR', err);
      throw new Error(err);
    }

    // Clean up existing stream if any
    this.stopCamera();

    this.updateStatus('STARTING');

    try {
      // Request ONLY video permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAMERA_CONFIG.maxWidth },
          height: { ideal: CAMERA_CONFIG.maxHeight },
          facingMode: 'user'
        },
        audio: false
      });

      this.activeStream = stream;

      // Bind to preview video element if provided or previously registered
      const targetPreview = previewEl || this.previewVideoElement;
      if (targetPreview) {
        this.previewVideoElement = targetPreview;
        targetPreview.srcObject = stream;
        targetPreview.muted = true;
        targetPreview.playsInline = true;
        targetPreview.play().catch((err) => {
          console.warn('Camera preview auto-play warning in startCamera:', err);
        });
      }

      // Internal fallback video element for canvas capturing
      const internalVideo = document.createElement('video');
      internalVideo.srcObject = stream;
      internalVideo.muted = true;
      internalVideo.playsInline = true;
      internalVideo.play().catch(console.warn);
      this.internalVideoElement = internalVideo;

      // Handle external cancellation / hardware disconnect
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopCamera();
          this.callbacks.onEnded?.();
        };
      }

      this.updateStatus('ON');
      return stream;
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      let friendlyError = 'Failed to access camera.';

      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        friendlyError = 'Camera permission was denied. Please allow camera access in your browser site permissions.';
      } else if (errorObj.name === 'NotFoundError' || errorObj.name === 'DevicesNotFoundError') {
        friendlyError = 'No camera device found on this system.';
      } else if (errorObj.name === 'NotReadableError' || errorObj.name === 'TrackStartError') {
        friendlyError = 'Camera is already in use by another application or unavailable.';
      } else if (errorObj.name === 'OverconstrainedError') {
        friendlyError = 'Camera does not support the requested video resolution.';
      } else if (errorObj.message) {
        friendlyError = `Camera error: ${errorObj.message}`;
      }

      this.updateStatus('ERROR', friendlyError);
      throw new Error(friendlyError);
    }
  }

  /**
   * Return the active MediaStream instance
   */
  public getStream(): MediaStream | null {
    return this.activeStream;
  }

  /**
   * Bind an active video element for display
   */
  public attachPreview(previewEl: HTMLVideoElement | null): void {
    if (!previewEl) return;
    this.previewVideoElement = previewEl;
    if (this.activeStream) {
      if (previewEl.srcObject !== this.activeStream) {
        previewEl.srcObject = this.activeStream;
      }
      previewEl.muted = true;
      previewEl.playsInline = true;
      
      const playPromise = previewEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Camera preview video play warning:', err);
        });
      }
    }
  }

  /**
   * Captures the latest single frame on demand.
   * Scales down to max dimensions and encodes as JPEG with quality optimization.
   */
  public captureLatestFrame(): string | null {
    if (!this.isActive()) {
      return null;
    }

    const video = (this.previewVideoElement && this.previewVideoElement.videoWidth > 0)
      ? this.previewVideoElement
      : this.internalVideoElement;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      let width = video.videoWidth;
      let height = video.videoHeight;

      // Scale down if larger than max dimensions to minimize latency & token usage
      const maxWidth = CAMERA_CONFIG.maxWidth;
      const maxHeight = CAMERA_CONFIG.maxHeight;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Draw the video frame
      ctx.drawImage(video, 0, 0, width, height);

      // Export as compressed JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', CAMERA_CONFIG.quality);

      // Clean up canvas
      canvas.width = 0;
      canvas.height = 0;

      return dataUrl;
    } catch (e) {
      console.warn('Failed to capture frame from camera:', e);
      return null;
    }
  }

  /**
   * Determines if a user query requires visual camera context
   */
  public shouldCaptureForQuery(text: string): boolean {
    if (!text) return true;
    const lower = text.toLowerCase().trim();

    // Screen specific requests shouldn't capture camera
    if (lower.includes('on my screen') || lower.includes('screenshot') || lower.includes('in this window') || lower.includes('on the display')) {
      return false;
    }

    const visualCues = [
      'holding',
      'what is this',
      'what are these',
      'what am i',
      'what color',
      'color of',
      'look at',
      'can you see',
      'what do you see',
      'read this',
      'read the text',
      'what is written',
      'in front of me',
      'showing',
      'camera',
      'identify',
      'damaged',
      'inspect',
      'see this',
      'look here',
      'view',
      'what does it say',
      'describe this',
      'tell me about what i'
    ];

    return visualCues.some(cue => lower.includes(cue));
  }

  /**
   * Stop camera stream, release hardware tracks, and reset preview
   */
  public stopCamera(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
      this.activeStream = null;
    }

    if (this.previewVideoElement) {
      this.previewVideoElement.srcObject = null;
    }

    if (this.internalVideoElement) {
      this.internalVideoElement.srcObject = null;
      this.internalVideoElement = null;
    }

    this.updateStatus('OFF');
  }
}

export const cameraService = new CameraCaptureService();
