import React from 'react';
import { X, Volume2, ShieldCheck, Cpu, Sliders } from 'lucide-react';
import { SystemStatusResponse } from '../../../shared/types/index.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatusResponse | null;
  voices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  onVoiceChange: (voiceName: string) => void;
  speechRate: number;
  onSpeechRateChange: (rate: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  voices,
  selectedVoiceName,
  onVoiceChange,
  speechRate,
  onSpeechRateChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} color="#6366f1" />
            <h2 id="settings-title" className="modal-title">Settings & System Info</h2>
          </div>
          <button type="button" onClick={onClose} className="chip-remove-btn" aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        {/* System Model Status */}
        <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600 }}>
            <Cpu size={16} />
            <span>AI Architecture & Models</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div><strong>Primary Reasoning:</strong> {status?.primaryModel || 'nvidia/nemotron-3-ultra-550b-a55b:free'}</div>
            <div><strong>Vision Model:</strong> {status?.visionModel || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: status?.hasApiKey ? '#34d399' : '#f87171' }}>
              <ShieldCheck size={14} />
              <span>{status?.hasApiKey ? 'OpenRouter API Key: Verified on Server' : 'API Key: Missing on Server (.env)'}</span>
            </div>
          </div>
        </div>

        {/* TTS Voice Selection */}
        <div className="form-group">
          <label className="form-label" htmlFor="voice-select">
            <Volume2 size={14} style={{ display: 'inline', marginRight: 4 }} />
            Speech Voice
          </label>
          <select
            id="voice-select"
            className="form-select"
            value={selectedVoiceName}
            onChange={(e) => onVoiceChange(e.target.value)}
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Speech Rate */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <label className="form-label" htmlFor="speech-rate">Speaking Speed</label>
            <span style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>{speechRate}x</span>
          </div>
          <input
            id="speech-rate"
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={speechRate}
            onChange={(e) => onSpeechRateChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.65rem',
            background: 'var(--accent-primary)',
            color: '#fff',
            borderRadius: '0.6rem',
            fontWeight: 600,
            marginTop: '0.5rem'
          }}
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
