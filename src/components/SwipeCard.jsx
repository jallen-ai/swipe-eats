import { useState, useRef, useCallback, useEffect } from 'react';
import { haptics } from '../utils/haptics';
import { isOpenNow } from '../utils/hours';

export default function SwipeCard({ restaurant, onSwipe, isTop, style }) {
  const cardRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const thresholdFired = useRef(false);
  const [dragState, setDragState] = useState({ x: 0, rotate: 0, opacity: 1 });
  const [exitAnim, setExitAnim] = useState(null);

  const handleStart = useCallback((clientX, clientY) => {
    if (!isTop) return;
    isDragging.current = true;
    thresholdFired.current = false;
    startX.current = clientX;
    startY.current = clientY;
    currentX.current = 0;
  }, [isTop]);

  const handleMove = useCallback((clientX) => {
    if (!isDragging.current) return;
    const dx = clientX - startX.current;
    currentX.current = dx;
    const rotate = dx * 0.08;
    const opacity = 1 - Math.abs(dx) / 600;
    setDragState({ x: dx, rotate, opacity: Math.max(0.6, opacity) });

    if (!thresholdFired.current && Math.abs(dx) > 80) {
      thresholdFired.current = true;
      haptics.thresholdCross();
    }
    if (thresholdFired.current && Math.abs(dx) < 60) {
      thresholdFired.current = false;
    }
  }, []);

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = currentX.current;
    const threshold = 80;

    if (Math.abs(dx) > threshold) {
      const direction = dx > 0 ? 'right' : 'left';
      if (direction === 'right') haptics.swipeRight();
      setExitAnim(direction);
      setTimeout(() => onSwipe(direction), 350);
    } else {
      setDragState({ x: 0, rotate: 0, opacity: 1 });
    }
  }, [onSwipe]);

  useEffect(() => {
    if (!isTop) return;
    const el = cardRef.current;
    if (!el) return;

    const onTouchStart = (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const onTouchEnd = () => handleEnd();
    const onMouseDown = (e) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isTop, handleStart, handleMove, handleEnd]);

  let transform, opacity, transition;
  if (exitAnim) {
    const exitX = exitAnim === 'right' ? 500 : -500;
    const exitRotate = exitAnim === 'right' ? 20 : -20;
    const exitY = exitAnim === 'left' ? 30 : -10;
    transform = `translate(${exitX}px, ${exitY}px) rotate(${exitRotate}deg) scale(${exitAnim === 'right' ? 0.95 : 0.92})`;
    opacity = exitAnim === 'right' ? 0.9 : 0.4;
    transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
  } else if (isDragging.current || dragState.x !== 0) {
    transform = `translate(${dragState.x}px, 0) rotate(${dragState.rotate}deg)`;
    opacity = dragState.opacity;
    transition = isDragging.current ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
  } else {
    transform = 'translate(0, 0) rotate(0deg)';
    opacity = 1;
    transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
  }

  const swipeProgress = Math.min(Math.abs(dragState.x) / 80, 1);
  const showRight = dragState.x > 20;
  const showLeft = dragState.x < -20;
  const hoursStatus = isOpenNow(restaurant.hours);

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        width: 'calc(100% - 32px)',
        left: '16px',
        height: '75vh',
        maxHeight: '580px',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        transform,
        opacity,
        transition,
        cursor: isTop ? 'grab' : 'default',
        userSelect: 'none',
        boxShadow: isTop ? 'var(--shadow-card)' : '0 4px 16px rgba(0,0,0,0.2)',
        zIndex: isTop ? 10 : 5,
        ...style,
      }}
    >
      {/* Photo section - 60% */}
      <div style={{
        position: 'relative',
        height: '60%',
        overflow: 'hidden',
        background: restaurant.color || '#333',
      }}>
        {restaurant.photo && (
          <img
            src={restaurant.photo}
            alt={restaurant.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            draggable={false}
          />
        )}
        {/* Gradient overlay for text readability */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        }} />

        {/* Floating info overlay on photo */}
        <div style={{
          position: 'absolute', bottom: '12px', left: '16px', right: '16px',
          zIndex: 2,
        }}>
          <h2 style={{
            fontSize: '24px', fontWeight: 900, color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            lineHeight: 1.2, marginBottom: '8px',
          }}>{restaurant.name}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
              padding: '4px 12px', borderRadius: '20px',
              fontSize: '13px', fontWeight: 700, color: 'white',
            }}>{restaurant.distance}</span>
            <span style={{
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
              padding: '4px 12px', borderRadius: '20px',
              fontSize: '13px', fontWeight: 700, color: 'white',
            }}>{restaurant.price}</span>
          </div>
        </div>

        {showRight && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `rgba(232, 93, 58, ${swipeProgress * 0.25})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s',
          }}>
            <div style={{
              border: '4px solid var(--accent-primary)',
              borderRadius: '12px',
              padding: '8px 24px',
              transform: `rotate(-20deg) scale(${0.8 + swipeProgress * 0.4})`,
              opacity: swipeProgress,
            }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '2px' }}>YUM</span>
            </div>
          </div>
        )}
        {showLeft && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `rgba(150, 150, 168, ${swipeProgress * 0.2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s',
          }}>
            <div style={{
              border: '4px solid var(--text-secondary)',
              borderRadius: '12px',
              padding: '8px 24px',
              transform: `rotate(20deg) scale(${0.8 + swipeProgress * 0.4})`,
              opacity: swipeProgress,
            }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '2px' }}>NAH</span>
            </div>
          </div>
        )}
      </div>

      {/* Info section - 40% */}
      <div style={{
        height: '40%',
        background: 'var(--bg-card)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            background: 'var(--bg-surface)',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--accent-secondary)',
          }}>{restaurant.cuisine}</span>
          {hoursStatus.isOpen !== null && (
            <span style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              background: hoursStatus.isOpen
                ? 'rgba(76, 175, 80, 0.15)'
                : 'rgba(244, 67, 54, 0.15)',
              color: hoursStatus.isOpen ? '#4CAF50' : '#F44336',
            }}>
              {hoursStatus.isOpen ? 'Open' : 'Closed'}
            </span>
          )}
          {restaurant.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-primary)" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>{restaurant.rating}</span>
              {restaurant.ratingCount && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>({restaurant.ratingCount})</span>
              )}
            </div>
          )}
        </div>
        {restaurant.address && (
          <p style={{
            fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600,
            lineHeight: 1.4, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            📍 {restaurant.address}
          </p>
        )}
        {hoursStatus.statusText && (
          <p style={{
            fontSize: '12px',
            color: hoursStatus.isOpen ? '#4CAF50' : '#F44336',
            fontWeight: 600, margin: 0,
          }}>
            {hoursStatus.statusText}
          </p>
        )}
      </div>
    </div>
  );
}
