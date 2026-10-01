import React from 'react';
import { X, Monitor, FileText } from 'lucide-react';
import { DocumentAttachment } from '../../../shared/types/index.js';

interface AttachmentPreviewsProps {
  imagePreview: string | null;
  screenshotPreview: string | null;
  isScreenSharing: boolean;
  activeDocument: DocumentAttachment | null;
  onClearImage: () => void;
  onClearScreenshot: () => void;
  onStopScreenShare: () => void;
  onClearDocument: () => void;
}

export const AttachmentPreviews: React.FC<AttachmentPreviewsProps> = ({
  imagePreview,
  screenshotPreview,
  isScreenSharing,
  activeDocument,
  onClearImage,
  onClearScreenshot,
  onStopScreenShare,
  onClearDocument
}) => {
  const hasAnyAttachment = Boolean(imagePreview || screenshotPreview || isScreenSharing || activeDocument);

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
