import { useState } from 'react';

export default function DuoLinkScreen({ sessionId, partnerConnected, onContinue, onBack }) {
  const [copied, setCopied] = useState(false);

  // Use current origin + base path for the shareable link (works in dev and prod)
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const link = `${window.location.origin}${base}/s/${sessionId}`;
  const displayLink = `${window.location.host}${base}/s/${sessionId}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32px',
      gap: '24px',
      position: 'relative',
    }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: '16px', left: '16px',
          width: '40px', height: '40px', borderRadius: '12px',
          border: 'none', background: 'var(--bg-surface)',
          color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div style={{ fontSize: '56px' }}>{partnerConnected ? '✅' : '🔗'}</div>
      <h2 style={{ fontSize: '24px', fontWeight: 800, textAlign: 'center' }}>
        {partnerConnected ? 'Partner connected!' : 'Share with your partner'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '15px', fontWeight: 600 }}>
        {partnerConnected
          ? 'You\'re both ready. Start swiping to find your match!'
          : 'They\'ll get the same restaurants to swipe through. When you both swipe right on the same one, it\'s a match!'}
      </p>

      {!partnerConnected && (
        <button
          onClick={copyLink}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 'var(--radius-btn)',
            border: '1px solid var(--bg-surface)',
            background: 'var(--bg-card)',
            color: copied ? 'var(--accent-secondary)' : 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'Nunito',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s',
          }}
        >
          {copied ? '✓ Copied!' : `📋 ${displayLink}`}
        </button>
      )}

      <button
        onClick={onContinue}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: 'var(--radius-btn)',
          border: 'none',
          background: partnerConnected
            ? 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)'
            : 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '17px',
          fontWeight: 800,
          fontFamily: 'Nunito',
          boxShadow: partnerConnected
            ? '0 4px 20px var(--accent-secondary-glow)'
            : '0 4px 20px var(--accent-primary-glow)',
        }}
      >
        {partnerConnected ? 'Start Swiping!' : 'Start Swiping'}
      </button>

      {!partnerConnected && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600,
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--text-dim)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          Waiting for partner...
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
