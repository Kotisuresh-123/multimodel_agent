import React from 'react';
import { Mic, StopCircle, Sparkles, AlertCircle } from 'lucide-react';
import { AgentStatus } from '../../../shared/types/index.js';

interface VoiceOrbProps {
  status: AgentStatus;
  interimTranscript: string;
  onOrbClick: () => void;
  onInterrupt: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  status,
  interimTranscript,
  onOrbClick,
  onInterrupt
}) => {
  // Determine state class and labels
  let stateClass = 'orb-idle';
  let primaryLabel = 'Tap to speak';
  let subLabel = 'Press Space or click the orb to talk';
  let ariaLabel = 'Voice assistant ready. Tap to speak.';

  switch (status) {
    case 'LISTENING':
      stateClass = 'orb-listening';
      primaryLabel = 'Listening...';
      subLabel = 'Speak your question or instruction';
      ariaLabel = 'Listening to microphone. Tap to finish.';
      break;
    case 'PROCESSING':
      stateClass = 'orb-processing';
      primaryLabel = 'Thinking...';
      subLabel = 'Reasoning with NVIDIA Nemotron';
      ariaLabel = 'Processing your request.';
      break;
    case 'ANALYZING_IMAGE':
      stateClass = 'orb-analyzing';
      primaryLabel = 'Analyzing image...';
      subLabel = 'Inspecting visual details with vision model';
      ariaLabel = 'Analyzing image.';
      break;
    case 'ANALYZING_SCREEN':
      stateClass = 'orb-analyzing';
      primaryLabel = 'Looking at your screen...';
      subLabel = 'Examining UI, text, and active window';
      ariaLabel = 'Analyzing screen capture.';
      break;
    case 'ANALYZING_DOCUMENT':
      stateClass = 'orb-analyzing';
      primaryLabel = 'Reading document...';
      subLabel = 'Searching relevant sections and context';
      ariaLabel = 'Reading document.';
      break;
    case 'SPEAKING':
      stateClass = 'orb-speaking';
      primaryLabel = 'Speaking...';
      subLabel = 'Tap to interrupt or speak over';
      ariaLabel = 'Assistant is speaking. Tap to interrupt.';
      break;
    case 'ERROR':
      stateClass = 'orb-error';
      primaryLabel = 'Attention';
      subLabel = 'Tap to reset and try again';
      ariaLabel = 'Error state. Tap to reset.';
      break;
  }

  return (
    <div className="orb-wrapper" onClick={onOrbClick} role="button" aria-label={ariaLabel} tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onOrbClick();
        }
      }}
    >
      <div className={`orb-container ${stateClass}`}>
        <div className="orb-glow-layer" />
        <div className="orb-core">
          {status === 'SPEAKING' ? (
            <div className="equalizer-bars">
              <span className="eq-bar" />
              <span className="eq-bar" />
              <span className="eq-bar" />
              <span className="eq-bar" />
              <span className="eq-bar" />
            </div>
          ) : status === 'LISTENING' ? (
            <Mic size={44} color="#ffffff" />
          ) : status === 'PROCESSING' ? (
            <Sparkles size={40} color="#ffffff" />
          ) : status === 'ERROR' ? (
            <AlertCircle size={44} color="#ffffff" />
          ) : (
            <Mic size={40} color="#c7d2fe" />
          )}
        </div>
      </div>

      <div className="orb-status-text">
        {primaryLabel}
      </div>
      <div className="orb-subtext">
        {subLabel}
      </div>

      {/* Live Interim Transcript Bubble */}
      {interimTranscript && (
        <div className="live-speech-preview">
          "{interimTranscript}"
        </div>
      )}

      {/* Instant Interruption Button */}
      {status === 'SPEAKING' && (
        <button
          type="button"
          className="interrupt-button"
          onClick={(e) => {
            e.stopPropagation();
            onInterrupt();
          }}
          aria-label="Interrupt assistant speech"
        >
          <StopCircle size={16} />
          <span>Stop Speaking (Interrupt)</span>
        </button>
      )}
    </div>
  );
};
