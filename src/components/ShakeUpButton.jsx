import { useState } from 'react';
import { haptics } from '../utils/haptics';

export default function ShakeUpButton({ onShakeUp, disabled }) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (disabled || animating) return;
    setAnimating(true);
    haptics.shakeUp();
    onShakeUp();
    setTimeout(() => setAnimating(false), 800);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: 'none',
        background: animating
          ? 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)'
          : 'var(--bg-surface)',
        color: 'var(--accent-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        transform: animating ? 'rotate(180deg) scale(1.15)' : 'scale(1)',
        boxShadow: animating ? '0 0 24px var(--accent-secondary-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.6-8.6c.8-1.1 2-1.7 3.3-1.7H22"/>
        <path d="M18 2l4 4-4 4"/>
        <path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l6.6 8.6c.8 1.1 2 1.7 3.3 1.7H22"/>
        <path d="M18 14l4 4-4 4"/>
      </svg>
    </button>
  );
}
