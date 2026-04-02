import { useEffect } from 'react';

export default function MatchNotification({ restaurant, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute',
        top: '60px',
        left: '16px',
        right: '16px',
        background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        zIndex: 200,
        cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(232, 93, 58, 0.4)',
        animation: 'slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        overflow: 'hidden', flexShrink: 0,
      }}>
        <img src={restaurant.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, opacity: 0.85 }}>IT'S A MATCH!</div>
        <div style={{ fontSize: '17px', fontWeight: 800 }}>{restaurant.name}</div>
      </div>
    </div>
  );
}
