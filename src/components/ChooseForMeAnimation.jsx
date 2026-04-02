import { useState, useEffect, useRef, useCallback } from 'react';
import { haptics } from '../utils/haptics';

export default function ChooseForMeAnimation({ matches, onChosen }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef(null);
  const tickCountRef = useRef(0);

  const startSpin = useCallback(() => {
    const winnerIdx = Math.floor(Math.random() * matches.length);
    const totalTicks = 10 + (winnerIdx % matches.length);
    const startTime = Date.now();
    const maxDuration = 2500;

    let tick = 0;
    const spin = () => {
      tick++;
      tickCountRef.current = tick;
      const idx = tick % matches.length;
      setActiveIndex(idx);
      haptics.spinTick();

      const elapsed = Date.now() - startTime;
      if (tick >= totalTicks || elapsed >= maxDuration) {
        clearInterval(intervalRef.current);
        setActiveIndex(winnerIdx % matches.length);
        haptics.spinReveal();
        // Go directly to lock-in screen
        setTimeout(() => onChosen(matches[winnerIdx]), 400);
        return;
      }

      const progress = elapsed / maxDuration;
      if (progress > 0.4) {
        clearInterval(intervalRef.current);
        const newDelay = 80 + progress * 300;
        intervalRef.current = setInterval(spin, newDelay);
      }
    };

    intervalRef.current = setInterval(spin, 60);
  }, [matches, onChosen]);

  useEffect(() => {
    startSpin();
    return () => clearInterval(intervalRef.current);
  }, [startSpin]);

  // Spinning phase
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '32px',
    }}>
      <div style={{
        fontSize: '14px', fontWeight: 800, color: 'var(--text-secondary)',
        letterSpacing: '3px',
      }}>
        CHOOSING...
      </div>

      {/* Cycling card */}
      <div style={{
        width: '240px', height: '160px', borderRadius: '18px',
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 0 40px var(--accent-primary-glow)',
        transition: 'transform 0.08s',
      }}>
        {matches[activeIndex]?.photo ? (
          <img
            src={matches[activeIndex].photo}
            alt={matches[activeIndex].name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: matches[activeIndex]?.color || 'var(--bg-surface)',
          }} />
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        }}>
          <div style={{
            fontSize: '18px', fontWeight: 900, color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {matches[activeIndex]?.name}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {matches.map((_, i) => (
          <div
            key={i}
            style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: i === activeIndex ? 'var(--accent-primary)' : 'var(--bg-surface)',
              transition: 'background 0.1s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
