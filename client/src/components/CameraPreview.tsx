import React, { useState, useEffect } from 'react';
import { Camera, X, Minimize2, Maximize2, AlertCircle, RefreshCw } from 'lucide-react';
import { CameraState, cameraService } from '../services/camera.js';

export interface CameraPreviewProps {
  isActive: boolean;
  status: CameraState;
  error: string | null;
  onStop: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  isActive,
  status,
  error,
  onStop,
  videoRef
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Ensure the local video stream is attached to the video element whenever mounted or active
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isActive && cameraService.isActive()) {
      cameraService.attachPreview(videoEl);
    }
  }, [isActive, status, isMinimized, videoRef]);

  // If camera is completely off and has no error, do not render preview
  if (status === 'OFF' && !isActive && !error) {
    return null;
  }

  // Minimized Floating Pill
  if (isMinimized && isActive) {
    return (
      <div className="camera-pip-minimized" onClick={() => setIsMinimized(false)}>
        <span className={`pip-status-dot dot-${status.toLowerCase()}`} />
        <Camera size={16} />
        <span>Camera Active</span>
        <button
          type="button"
          className="pip-mini-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          title="Expand preview"
          aria-label="Expand camera preview"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          className="pip-mini-btn danger"
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          title="Stop camera"
          aria-label="Stop camera"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="camera-preview-card" role="region" aria-label="Camera live preview">
      {/* Header Bar */}
      <div className="camera-preview-header">
        <div className="camera-preview-status">
          <span className={`pip-status-dot dot-${status.toLowerCase()}`} />
          <span className="camera-status-text">
            {status === 'STARTING' && 'STARTING CAMERA...'}
            {status === 'ON' && 'LIVE CAMERA'}
            {status === 'PROCESSING' && 'ANALYZING FRAME...'}
            {status === 'ERROR' && 'CAMERA ERROR'}
            {status === 'OFF' && 'CAMERA OFF'}
          </span>
        </div>

        <div className="camera-header-actions">
          <button
            type="button"
            className="camera-ctrl-btn"
            onClick={() => setIsMinimized(true)}
            title="Minimize preview"
            aria-label="Minimize camera preview"
          >
            <Minimize2 size={15} />
          </button>
          <button
            type="button"
            className="camera-ctrl-btn danger"
            onClick={onStop}
            title="Stop camera"
            aria-label="Stop camera stream"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="camera-video-wrapper">
        <video
          ref={videoRef}
          id="cameraPreview"
          className="camera-video-stream"
          autoPlay
          playsInline
          muted
          onCanPlay={(e) => {
            const video = e.currentTarget;
            if (video.paused) {
              video.play().catch(console.warn);
            }
          }}
        />

        {/* Starting / Loading Overlay */}
        {status === 'STARTING' && (
          <div className="camera-overlay-state">
            <RefreshCw size={28} className="spin-animation" color="#60a5fa" />
            <span>Requesting camera permission...</span>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="camera-overlay-state error">
            <AlertCircle size={30} color="#f87171" />
            <p className="camera-error-message">{error}</p>
            <button
              type="button"
              className="camera-error-dismiss"
              onClick={onStop}
            >
              Close Camera
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="camera-preview-footer">
        <span className="camera-hint">
          Local preview • AI inspects when you ask visual questions
        </span>
      </div>
    </div>
  );
};
