import React from 'react';
import { AlertTriangle, WifiOff, X } from 'lucide-react';

interface ErrorBannerProps {
  error: string | null;
  isOffline: boolean;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  isOffline,
  onDismiss
}) => {
  if (isOffline) {
    return (
      <div style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(239, 68, 68, 0.9)',
        backdropFilter: 'blur(8px)',
        color: '#ffffff',
        padding: '0.6rem 1.25rem',
        borderRadius: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 200,
        fontSize: '0.9rem',
        fontWeight: 500
      }}>
        <WifiOff size={18} />
        <span>No internet connection. Voice assistant requires an active network.</span>
      </div>
    );
  }

  if (!error) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(24, 27, 40, 0.95)',
      border: '1px solid rgba(239, 68, 68, 0.5)',
      color: '#fca5a5',
      padding: '0.65rem 1.25rem',
      borderRadius: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      zIndex: 200,
      maxWidth: '90vw',
      fontSize: '0.9rem',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{error}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="chip-remove-btn"
        aria-label="Dismiss alert"
      >
        <X size={18} />
      </button>
    </div>
  );
};
