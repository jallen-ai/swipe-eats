import { useState, useEffect, useRef, useCallback } from 'react';
import { haptics } from '../utils/haptics';
import ConfettiCanvas from './ConfettiCanvas';

export default function ChooseForMeAnimation({ matches, onChosen }) {
  const [phase, setPhase] = useState('spinning'); // spinning | reveal
  const [activeIndex, setActiveIndex] = useState(0);
  const [winner, setWinner] = useState(null);
  const intervalRef = useRef(null);
  const tickCountRef = useRef(0);

  const startSpin = useCallback(() => {
    // Pick the winner upfront
    const winnerIdx = Math.floor(Math.random() * matches.length);
    // Keep it fast — ~15 ticks total, landing on winner
    const totalTicks = 10 + (winnerIdx % matches.length);
    const startTime = Date.now();
    const maxDuration = 2500; // 2.5s spinning, then reveal

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
        // Land on winner
        setActiveIndex(winnerIdx % matches.length);
        setWinner(matches[winnerIdx]);
        setTimeout(() => {
          setPhase('reveal');
          haptics.spinReveal();
        }, 250);
        return;
      }

      // Decelerate: increase interval as we go
      const progress = elapsed / maxDuration;
      if (progress > 0.4) {
        clearInterval(intervalRef.current);
        const newDelay = 80 + progress * 300; // 80ms → 380ms
        intervalRef.current = setInterval(spin, newDelay);
      }
    };

    intervalRef.current = setInterval(spin, 60);
  }, [matches]);

  useEffect(() => {
    startSpin();
    return () => clearInterval(intervalRef.current);
  }, [startSpin]);

  // Auto-advance to lock-in after reveal
  useEffect(() => {
    if (phase === 'reveal' && winner) {
      const timer = setTimeout(() => onChosen(winner), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, winner, onChosen]);

  if (phase === 'reveal' && winner) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--bg-primary)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: 'revealFlash 0.4s ease-out',
      }}>
        <ConfettiCanvas active={true} />

        <div style={{
          fontSize: '14px', fontWeight: 800, color: 'var(--accent-primary)',
          letterSpacing: '3px', marginBottom: '16px',
          animation: 'fadeInUp 0.5s ease-out',
        }}>
          TONIGHT YOU'RE EATING AT
        </div>

        <div style={{
          width: '280px', borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(232, 93, 58, 0.5)',
          animation: 'revealCard 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div style={{ height: '200px', position: 'relative' }}>
            {winner.photo ? (
              <img src={winner.photo} alt={winner.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: winner.color || 'var(--bg-surface)',
              }} />
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '50%',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            }} />
          </div>
          <div style={{
            padding: '20px', background: 'var(--bg-card)',
            textAlign: 'center',
          }}>
            <h2 style={{
              fontSize: '24px', fontWeight: 900, margin: '0 0 8px',
              color: 'var(--text-primary)',
            }}>
              {winner.name}
            </h2>
            <div style={{
              fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600,
              display: 'flex', gap: '8px', justifyContent: 'center',
            }}>
              <span>{winner.cuisine}</span>
              <span>·</span>
              <span>{winner.price}</span>
              <span>·</span>
              <span>{winner.distance}</span>
            </div>
          </div>
        </div>

        <p style={{
          marginTop: '24px', fontSize: '13px', color: 'var(--text-dim)',
          fontWeight: 600, animation: 'fadeInUp 0.8s ease-out',
        }}>
          Loading details...
        </p>
      </div>
    );
  }

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
