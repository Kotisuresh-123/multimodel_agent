import React, { useEffect, useRef } from 'react';
import { X, Bot, Trash2, Cpu } from 'lucide-react';
import { Message } from '../../../shared/types/index.js';

interface TranscriptPanelProps {
  isOpen: boolean;
  messages: Message[];
  onClose: () => void;
  onClear: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  isOpen,
  messages,
  onClose,
  onClear
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={`transcript-panel ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
      <div className="transcript-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={20} color="#6366f1" />
          <h2 className="transcript-title">Conversation Log</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="chip-remove-btn"
              title="Clear transcript"
              aria-label="Clear transcript"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="chip-remove-btn"
            title="Close log"
            aria-label="Close conversation log"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="transcript-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', marginTop: '3rem', fontSize: '0.9rem' }}>
            No conversation turns yet. Tap the orb or speak to start.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`transcript-msg ${msg.role}`}>
              <div className="msg-bubble">
                {msg.content}
              </div>
              <div className="msg-meta">
                <span>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                {msg.modelUsed && (
                  <span className="model-tag" title={`Model: ${msg.modelUsed}`}>
                    <Cpu size={10} style={{ display: 'inline', marginRight: 3 }} />
                    {msg.modelUsed.includes('/') ? msg.modelUsed.split('/')[1] : msg.modelUsed}
                  </span>
                )}
                {msg.modality && msg.modality !== 'text' && (
                  <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>
                    • {msg.modality}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
