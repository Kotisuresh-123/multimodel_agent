import React from 'react';
import { X, Monitor, FileText, Video } from 'lucide-react';
import { DocumentAttachment } from '../../../shared/types/index.js';

interface AttachmentPreviewsProps {
  imagePreview: string | null;
  screenshotPreview: string | null;
  isScreenSharing: boolean;
  isCameraActive?: boolean;
  activeDocument: DocumentAttachment | null;
  onClearImage: () => void;
  onClearScreenshot: () => void;
  onStopScreenShare: () => void;
  onStopCamera?: () => void;
  onClearDocument: () => void;
}

export const AttachmentPreviews: React.FC<AttachmentPreviewsProps> = ({
  imagePreview,
  screenshotPreview,
  isScreenSharing,
  isCameraActive,
  activeDocument,
  onClearImage,
  onClearScreenshot,
  onStopScreenShare,
  onStopCamera,
  onClearDocument
}) => {
  const hasAnyAttachment = Boolean(imagePreview || screenshotPreview || isScreenSharing || isCameraActive || activeDocument);

  if (!hasAnyAttachment) return null;

  return (
    <div className="attachments-tray">
      {/* Uploaded Image Preview */}
      {imagePreview && (
        <div className="attachment-chip">
          <img src={imagePreview} alt="Uploaded attachment" />
          <span>Image Attached</span>
          <button
            type="button"
            className="chip-remove-btn"
            onClick={onClearImage}
            title="Remove image"
            aria-label="Remove uploaded image"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Captured Screenshot Preview */}
      {screenshotPreview && (
        <div className="attachment-chip">
          <img src={screenshotPreview} alt="Screenshot capture" />
          <span>Screenshot Ready</span>
          <button
            type="button"
            className="chip-remove-btn"
            onClick={onClearScreenshot}
            title="Remove screenshot"
            aria-label="Remove screenshot"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Active Screen Share Badge */}
      {isScreenSharing && (
        <div className="attachment-chip" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
          <Monitor size={16} color="#10b981" />
          <span style={{ color: '#6ee7b7' }}>Screen Sharing Active</span>
          <button
            type="button"
            className="chip-remove-btn"
            onClick={onStopScreenShare}
            title="Stop Screen Share"
            aria-label="Stop screen sharing"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Active Camera Badge */}
      {isCameraActive && (
        <div className="attachment-chip" style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}>
          <Video size={16} color="#3b82f6" />
          <span style={{ color: '#93c5fd' }}>Camera Active</span>
          {onStopCamera && (
            <button
              type="button"
              className="chip-remove-btn"
              onClick={onStopCamera}
              title="Stop Camera"
              aria-label="Stop camera"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Active Document Badge */}
      {activeDocument && (
        <div className="attachment-chip" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          <FileText size={16} color="#f59e0b" />
          <span title={activeDocument.name}>
            {activeDocument.name.length > 20 
              ? activeDocument.name.substring(0, 18) + '...' 
              : activeDocument.name}
          </span>
          <button
            type="button"
            className="chip-remove-btn"
            onClick={onClearDocument}
            title="Remove document"
            aria-label="Remove active document"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
