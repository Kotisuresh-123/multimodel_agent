import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { AgentStatus, Message, DocumentAttachment, SystemStatusResponse } from '../../shared/types/index.js';
import { speechService } from './services/stt.js';
import { ttsService } from './services/tts.js';
import { screenService } from './services/screen.js';
import { apiService } from './services/api.js';
import { VoiceOrb } from './components/VoiceOrb.js';
import { ActionDock } from './components/ActionDock.js';
import { AttachmentPreviews } from './components/AttachmentPreviews.js';
import { TranscriptPanel } from './components/TranscriptPanel.js';
import { SettingsModal } from './components/SettingsModal.js';
import { ErrorBanner } from './components/ErrorBanner.js';

export const App: React.FC = () => {
  // Application State
  const [status, setStatus] = useState<AgentStatus>('IDLE');
  const [messages, setMessages] = useState<Message[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [activeDocument, setActiveDocument] = useState<DocumentAttachment | null>(null);

  // Panels & Modals
  const [isTranscriptOpen, setIsTranscriptOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // System & Audio Settings
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.05);

  // Connectivity & Errors
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Active turn tracking
  const currentConversationId = useRef<string>(`session_${Date.now()}`);
  const activeAbortController = useRef<AbortController | null>(null);
  const isAssistantSpeakingRef = useRef<boolean>(false);

  // Keep ref synchronized with status
  useEffect(() => {
    isAssistantSpeakingRef.current = (status === 'SPEAKING');
  }, [status]);

  // Load voices and system health on startup
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiService.getSystemStatus();
        setSystemStatus(res);
      } catch (err) {
        console.warn('Backend status check failed:', err);
      }
    };
    fetchStatus();

    const updateVoices = () => {
      const v = ttsService.getVoices();
      setVoices(v);
      if (v.length > 0 && !selectedVoiceName) {
        ttsService.autoSelectVoice();
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // Network connectivity listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      screenService.stopScreenSharing();
      ttsService.cancel();
      speechService.stop();
    };
  }, []);

  /**
   * IMMEDIATE INTERRUPTION:
   * Stops TTS immediately, cancels backend in-flight inference, and resets audio state
   */
  const handleInterrupt = useCallback(async () => {
    console.log('Interruption triggered by user.');
    // 1. Cancel browser TTS playback immediately
    ttsService.cancel();

    // 2. Abort client in-flight fetch
    if (activeAbortController.current) {
      activeAbortController.current.abort();
      activeAbortController.current = null;
    }

    // 3. Notify backend orchestrator to cancel active inference
    apiService.interruptAssistant(currentConversationId.current);

    setStatus('IDLE');
  }, []);

  /**
   * Core Multimodal Dispatch:
   * Sends user turn to backend orchestrator and handles voice response
   */
  const handleUserTurn = useCallback(async (userText: string) => {
    if (!userText.trim() && !imagePreview && !screenshotPreview && !activeDocument && !isScreenSharing) {
      return;
    }

    // Interrupt any ongoing speech
    handleInterrupt();
    setInterimTranscript('');
    speechService.stop();

    // Check if screen sharing frame should be snapped
    let effectiveScreenshot = screenshotPreview;
    if (!effectiveScreenshot && isScreenSharing) {
      const frame = screenService.captureFrameFromActiveShare();
      if (frame) {
        effectiveScreenshot = frame;
      }
    }

    // Determine initial analyzing status
    if (effectiveScreenshot) {
      setStatus('ANALYZING_SCREEN');
    } else if (imagePreview) {
      setStatus('ANALYZING_IMAGE');
    } else if (activeDocument) {
      setStatus('ANALYZING_DOCUMENT');
    } else {
      setStatus('PROCESSING');
    }

    // Append user message to transcript
    const userMessageId = `msg_user_${Date.now()}`;
    const newUserMsg: Message = {
      id: userMessageId,
      role: 'user',
      content: userText || (imagePreview ? '[Uploaded Image]' : effectiveScreenshot ? '[Captured Screenshot]' : '[Document Query]'),
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newUserMsg]);

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const controller = new AbortController();
    activeAbortController.current = controller;

    try {
      const result = await apiService.sendChatTurn({
        requestId,
        conversationId: currentConversationId.current,
        message: userText,
        image: imagePreview ? { dataUrl: imagePreview } : undefined,
        screenshot: effectiveScreenshot ? { dataUrl: effectiveScreenshot } : undefined,
        screenActive: isScreenSharing,
        documentId: activeDocument?.id,
        voiceMode: true
      }, controller.signal);

      // Append assistant message to transcript
      const assistantMsg: Message = {
        id: result.id,
        requestId: result.requestId,
        role: 'assistant',
        content: result.text,
        spokenText: result.spokenText,
        modelUsed: result.modelUsed,
        modality: result.modality,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Clear one-shot image/screenshot previews after successful turn
      if (imagePreview) setImagePreview(null);
      if (screenshotPreview) setScreenshotPreview(null);

      // Speak the response through TTS
      if (result.spokenText) {
        setStatus('SPEAKING');
        ttsService.speak(result.spokenText, {
          onStart: () => setStatus('SPEAKING'),
          onEnd: () => setStatus('IDLE'),
          onCancel: () => setStatus('IDLE'),
          onError: (ttsErr) => {
            console.warn('TTS playback error:', ttsErr);
            setStatus('IDLE');
          }
        });
      } else {
        setStatus('IDLE');
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError' || (err as Error).message.includes('interrupted')) {
        console.log('Turn aborted by interruption.');
        setStatus('IDLE');
        return;
      }

      console.error('Error during chat turn:', err);
      setError((err as Error).message || 'An error occurred while communicating with the assistant.');
      setStatus('ERROR');
      setTimeout(() => setStatus('IDLE'), 3500);
    } finally {
      activeAbortController.current = null;
    }
  }, [imagePreview, screenshotPreview, activeDocument, isScreenSharing, handleInterrupt]);

  /**
   * Start Microphone Listening
   */
  const startListening = useCallback(() => {
    // If assistant is currently speaking, stop it immediately!
    if (status === 'SPEAKING') {
      handleInterrupt();
    }

    setError(null);
    setInterimTranscript('');

    speechService.start({
      onStart: () => setStatus('LISTENING'),
      onResult: (finalText, interimText) => {
        setInterimTranscript(interimText || finalText);
        if (finalText && finalText.trim().length > 0) {
          handleUserTurn(finalText);
        }
      },
      onSpeechDetected: () => {
        // If speaking, user starting to talk interrupts assistant
        if (isAssistantSpeakingRef.current) {
          handleInterrupt();
        }
      },
      onError: (errMsg) => {
        setError(errMsg);
        setStatus('IDLE');
      },
      onEnd: () => {
        if (status === 'LISTENING') {
          setStatus('IDLE');
        }
      }
    });
  }, [status, handleInterrupt, handleUserTurn]);

  /**
   * Toggle Speech / Microphone
   */
  const handleMicToggle = useCallback(() => {
    if (status === 'LISTENING') {
      speechService.stop();
      setStatus('IDLE');
    } else {
      startListening();
    }
  }, [status, startListening]);

  /**
   * Orb Click Handler
   */
  const handleOrbClick = useCallback(() => {
    if (status === 'SPEAKING') {
      handleInterrupt();
      startListening();
    } else if (status === 'LISTENING') {
      speechService.stop();
      setStatus('IDLE');
    } else if (status === 'ERROR') {
      setError(null);
      setStatus('IDLE');
    } else {
      startListening();
    }
  }, [status, handleInterrupt, startListening]);

  /**
   * Handle Image Selection
   */
  const handleImageSelect = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Handle Screenshot Capture
   */
  const handleCaptureScreenshot = useCallback(async () => {
    setError(null);
    try {
      const dataUrl = await screenService.captureSingleScreenshot();
      setScreenshotPreview(dataUrl);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to capture screenshot');
    }
  }, []);

  /**
   * Handle Screen Sharing Toggle
   */
  const handleToggleScreenShare = useCallback(async () => {
    setError(null);
    if (isScreenSharing) {
      screenService.stopScreenSharing();
      setIsScreenSharing(false);
    } else {
      try {
        await screenService.startScreenSharing(() => {
          setIsScreenSharing(false);
        });
        setIsScreenSharing(true);
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to start screen sharing');
      }
    }
  }, [isScreenSharing]);

  /**
   * Handle Document Selection
   */
  const handleDocumentSelect = useCallback(async (file: File) => {
    setError(null);
    try {
      setStatus('ANALYZING_DOCUMENT');
      const res = await apiService.uploadDocument(file);
      setActiveDocument({
        type: 'document',
        id: res.document.id,
        name: res.document.name,
        mimeType: res.document.mimeType,
        size: res.document.size,
        extractedText: '',
        summary: res.document.summary
      });
      setStatus('IDLE');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to upload document');
      setStatus('IDLE');
    }
  }, []);

  /**
   * Reset Session
   */
  const handleResetSession = useCallback(async () => {
    handleInterrupt();
    setImagePreview(null);
    setScreenshotPreview(null);
    setActiveDocument(null);
    setMessages([]);
    currentConversationId.current = `session_${Date.now()}`;
    await apiService.resetConversation(currentConversationId.current);
  }, [handleInterrupt]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        isSettingsOpen
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleMicToggle();
      } else if (e.code === 'Escape') {
        handleInterrupt();
        setIsTranscriptOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMicToggle, handleInterrupt, isSettingsOpen]);

  return (
    <div className="app-container">
      {/* Offline & Error Banner */}
      <ErrorBanner
        error={error}
        isOffline={isOffline}
        onDismiss={() => setError(null)}
      />

      {/* Top Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">Multimodal Voice Assistant</h1>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Powered by NVIDIA Nemotron & OpenRouter</div>
          </div>
        </div>

        <div className="header-badges">
          <div className="badge primary-model">
            <span className="status-dot" />
            <span>NVIDIA Nemotron 3 Ultra</span>
          </div>

          {isScreenSharing && (
            <div className="badge screen-active">
              <span>● Live Screen Sharing</span>
            </div>
          )}

          <button
            type="button"
            className="transcript-toggle-btn"
            onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
            aria-label="Toggle transcript log"
          >
            <MessageSquare size={16} />
            <span>Transcript ({messages.length})</span>
          </button>
        </div>
      </header>

      {/* Center Interactive Voice Stage */}
      <main className="main-stage">
        <VoiceOrb
          status={status}
          interimTranscript={interimTranscript}
          onOrbClick={handleOrbClick}
          onInterrupt={handleInterrupt}
        />

        {/* Attachment Preview Tray */}
        <AttachmentPreviews
          imagePreview={imagePreview}
          screenshotPreview={screenshotPreview}
          isScreenSharing={isScreenSharing}
          activeDocument={activeDocument}
          onClearImage={() => setImagePreview(null)}
          onClearScreenshot={() => setScreenshotPreview(null)}
          onStopScreenShare={handleToggleScreenShare}
          onClearDocument={() => setActiveDocument(null)}
        />
      </main>

      {/* Bottom Floating Action Dock */}
      <ActionDock
        status={status}
        isScreenSharing={isScreenSharing}
        onMicClick={handleMicToggle}
        onImageSelect={handleImageSelect}
        onCaptureScreenshot={handleCaptureScreenshot}
        onToggleScreenShare={handleToggleScreenShare}
        onDocumentSelect={handleDocumentSelect}
        onSendTextMessage={handleUserTurn}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetSession={handleResetSession}
      />

      {/* Collapsible Transcript Panel */}
      <TranscriptPanel
        isOpen={isTranscriptOpen}
        messages={messages}
        onClose={() => setIsTranscriptOpen(false)}
        onClear={() => setMessages([])}
      />

      {/* Settings & System Information Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        status={systemStatus}
        voices={voices}
        selectedVoiceName={selectedVoiceName}
        onVoiceChange={(name) => {
          setSelectedVoiceName(name);
          ttsService.setVoiceByName(name);
        }}
        speechRate={speechRate}
        onSpeechRateChange={(rate) => {
          setSpeechRate(rate);
          ttsService.setRate(rate);
        }}
      />
    </div>
  );
};
