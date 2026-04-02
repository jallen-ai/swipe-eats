import { useState } from 'react';
import ConfettiCanvas from './ConfettiCanvas';

function getMapsUrl(restaurant) {
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.address || ''}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getDeliveryUrl(app, restaurant) {
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.address || ''}`);
  switch (app) {
    case 'Uber Eats':
      return `https://www.ubereats.com/search?q=${query}`;
    case 'DoorDash':
      return `https://www.doordash.com/search/store/${query}`;
    case 'Grubhub':
      return `https://www.grubhub.com/search?queryText=${query}`;
    default:
      return '#';
  }
}

export default function LockInScreen({ restaurant, onBack, mode }) {
  const [showConfetti] = useState(true);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      <ConfettiCanvas active={showConfetti} />

      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: '16px', left: '16px',
          zIndex: 110,
          width: '40px', height: '40px', borderRadius: '12px',
          border: 'none', background: 'rgba(0,0,0,0.5)',
          color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      <div style={{ height: '50%', position: 'relative', overflow: 'hidden' }}>
        {restaurant.photo && (
          <img
            src={restaurant.photo} alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(transparent, var(--bg-primary))',
        }} />
      </div>

      <div style={{ padding: '0 24px', marginTop: '-40px', position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)',
          letterSpacing: '2px', marginBottom: '8px',
        }}>
          {mode === 'duo' ? "YOU BOTH PICKED" : "TONIGHT'S PICK"}
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '8px' }}>{restaurant.name}</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{
            background: 'var(--bg-surface)', padding: '4px 14px',
            borderRadius: '20px', fontSize: '14px', fontWeight: 600,
            color: 'var(--accent-secondary)',
          }}>{restaurant.cuisine}</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>{restaurant.price}</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>{restaurant.distance}</span>
        </div>

        {restaurant.address && (
          <p style={{
            fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600,
            marginBottom: '16px', lineHeight: 1.4,
          }}>
            {restaurant.address}
          </p>
        )}

        {/* Primary CTA - Google Maps */}
        <a
          href={getMapsUrl(restaurant)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '16px', borderRadius: 'var(--radius-btn)', border: 'none',
            background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
            color: 'white', fontSize: '16px', fontWeight: 800, cursor: 'pointer',
            textDecoration: 'none', marginBottom: '12px', fontFamily: 'Nunito',
            boxShadow: '0 4px 16px var(--accent-primary-glow)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          View on Google Maps
        </a>

        {/* Delivery apps */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-btn)',
          padding: '20px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '14px' }}>
            ORDER DELIVERY
          </div>
          {['Uber Eats', 'DoorDash', 'Grubhub'].map((app, i) => (
            <div
              key={app}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0',
                borderTop: i > 0 ? '1px solid var(--bg-surface)' : 'none',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '15px' }}>{app}</span>
              <a
                href={getDeliveryUrl(app, restaurant)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'var(--bg-surface)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--accent-secondary)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >Open</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
