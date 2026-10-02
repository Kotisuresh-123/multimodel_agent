import React, { useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Image as ImageIcon,
  Camera,
  Video,
  VideoOff,
  Monitor,
  FileUp,
  MessageSquare,
  Settings,
  RotateCcw,
  Send
} from 'lucide-react';
import { AgentStatus } from '../../../shared/types/index.js';

interface ActionDockProps {
  status: AgentStatus;
  isScreenSharing: boolean;
  isCameraActive: boolean;
  cameraStatus?: string;
  onMicClick: () => void;
  onImageSelect: (file: File) => void;
  onCaptureScreenshot: () => void;
  onToggleScreenShare: () => void;
  onToggleCamera: () => void;
  onDocumentSelect: (file: File) => void;
  onSendTextMessage: (text: string) => void;
  onOpenSettings: () => void;
  onResetSession: () => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  status,
  isScreenSharing,
  isCameraActive,
  cameraStatus: _cameraStatus,
  onMicClick,
  onImageSelect,
  onCaptureScreenshot,
  onToggleScreenShare,
  onToggleCamera,
  onDocumentSelect,
  onSendTextMessage,
  onOpenSettings,
  onResetSession
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const isListening = status === 'LISTENING';

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSendTextMessage(textInput.trim());
      setTextInput('');
    }
  };

  return (
    <div className="action-dock-container">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        style={{ display: 'none' }}
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onImageSelect(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
      <input
        type="file"
        ref={docInputRef}
        style={{ display: 'none' }}
        accept=".pdf,.docx,.txt,.md,application/pdf"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onDocumentSelect(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Optional Collapsible Text Fallback Bar */}
      {showTextInput && (
        <form className="text-fallback-bar" onSubmit={handleTextSubmit}>
          <input
            type="text"
            className="text-fallback-input"
            placeholder="Type a message or question..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="send-text-btn" aria-label="Send message" disabled={!textInput.trim()}>
            <Send size={16} />
          </button>
        </form>
      )}

      {/* Main Floating Action Dock */}
      <div className="action-dock">
        {/* Upload Image */}
        <button
          type="button"
          className="dock-btn"
          onClick={() => imageInputRef.current?.click()}
          title="Upload image (PNG, JPG, WEBP)"
          aria-label="Upload image"
        >
          <ImageIcon size={20} />
        </button>

        {/* Capture Screenshot */}
        <button
          type="button"
          className="dock-btn"
          onClick={onCaptureScreenshot}
          title="Capture Screenshot"
          aria-label="Capture screenshot"
        >
          <Camera size={20} />
        </button>

        {/* Live Camera Toggle */}
        <button
          type="button"
          className={`dock-btn ${isCameraActive ? 'active' : ''}`}
          onClick={onToggleCamera}
          title={isCameraActive ? 'Stop Camera' : 'Start Camera'}
          aria-label={isCameraActive ? 'Stop camera' : 'Start camera'}
        >
          {isCameraActive ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Screen Sharing Toggle */}
        <button
          type="button"
          className={`dock-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
          aria-label="Toggle screen sharing"
        >
          <Monitor size={20} />
        </button>

        {/* Primary Microphone Button */}
        <button
          type="button"
          className={`dock-btn dock-btn-main ${isListening ? 'listening' : ''}`}
          onClick={onMicClick}
          title={isListening ? 'Stop listening' : 'Start listening (Space)'}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? <MicOff size={26} /> : <Mic size={26} />}
        </button>

        {/* Upload Document */}
        <button
          type="button"
          className="dock-btn"
          onClick={() => docInputRef.current?.click()}
          title="Upload Document (PDF, DOCX, TXT)"
          aria-label="Upload document"
        >
          <FileUp size={20} />
        </button>

        {/* Toggle Text Input Bar */}
        <button
          type="button"
          className={`dock-btn ${showTextInput ? 'active' : ''}`}
          onClick={() => setShowTextInput(!showTextInput)}
          title="Toggle Text Input Fallback"
          aria-label="Toggle text input fallback"
        >
          <MessageSquare size={20} />
        </button>

        {/* Reset Conversation Memory */}
        <button
          type="button"
          className="dock-btn"
          onClick={onResetSession}
          title="Reset conversation context"
          aria-label="Reset conversation"
        >
          <RotateCcw size={19} />
        </button>

        {/* Settings Modal */}
        <button
          type="button"
          className="dock-btn"
          onClick={onOpenSettings}
          title="Settings & System Status"
          aria-label="Open settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};
