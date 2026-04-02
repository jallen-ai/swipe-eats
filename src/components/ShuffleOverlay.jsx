import { useEffect } from 'react';

export default function ShuffleOverlay({ active, onDone }) {
  useEffect(() => {
    if (active) {
      const timer = setTimeout(onDone, 1200);
      return () => clearTimeout(timer);
    }
  }, [active, onDone]);

  if (!active) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80,
      background: 'rgba(20, 20, 32, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'shuffleFade 1.2s ease-out',
    }}>
      <div style={{
        fontSize: '48px',
        animation: 'shuffleSpin 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}>🎲</div>
      <div style={{
        marginTop: '16px',
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--accent-secondary)',
        letterSpacing: '3px',
        textTransform: 'uppercase',
        animation: 'shuffleText 1.2s ease-out',
      }}>SHAKING IT UP</div>
    </div>
  );
}
