import { useState } from 'react';
import { haptics } from '../utils/haptics';
import ConfettiCanvas from './ConfettiCanvas';

function getMapsUrl(restaurant) {
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.address || ''}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getOpenTableUrl(restaurant) {
  const query = encodeURIComponent(`${restaurant.name} ${restaurant.address || ''}`);
  return `https://www.opentable.com/s?term=${query}`;
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

function ActionButton({ href, onClick, icon, label, sublabel, variant = 'default' }) {
  const isGradient = variant === 'primary';
  const style = {
    display: 'flex', alignItems: 'center', gap: '14px',
    width: '100%', padding: '14px 16px', borderRadius: '14px',
    border: 'none', cursor: 'pointer', textDecoration: 'none',
    fontFamily: 'Nunito', textAlign: 'left',
    background: isGradient
      ? 'linear-gradient(135deg, var(--accent-primary), #FF7043)'
      : 'var(--bg-card)',
    color: isGradient ? 'white' : 'var(--text-primary)',
    boxShadow: isGradient ? '0 4px 16px var(--accent-primary-glow)' : 'none',
  };

  const content = (
    <>
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: isGradient ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: 800 }}>{label}</div>
        {sublabel && (
          <div style={{
            fontSize: '12px', fontWeight: 600, marginTop: '2px',
            color: isGradient ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)',
          }}>{sublabel}</div>
        )}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke={isGradient ? 'rgba(255,255,255,0.6)' : 'var(--text-dim)'}
        strokeWidth="2.5" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </>
  );

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={style} onClick={() => haptics.medium()}>{content}</a>;
  }
  return <button onClick={onClick} style={style}>{content}</button>;
}

export default function LockInScreen({ restaurant, onBack, mode }) {
  const [showConfetti] = useState(true);
  const [deliveryExpanded, setDeliveryExpanded] = useState(false);

  const modeLabel = mode === 'group' ? "THE GROUP PICKED" : mode === 'duo' ? "YOU BOTH PICKED" : "TONIGHT'S PICK";

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ConfettiCanvas active={showConfetti} />

      {/* Back button */}
      <button
        onClick={() => { haptics.navTransition(); onBack(); }}
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

      {/* Hero photo - 45% of screen */}
      <div style={{ height: '45%', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {restaurant.photo ? (
          <img
            src={restaurant.photo} alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: restaurant.color || 'var(--bg-surface)' }} />
        )}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(transparent, var(--bg-primary))',
        }} />
      </div>

      {/* Scrollable content area */}
      <div style={{
        flex: 1, overflowY: 'auto', marginTop: '-48px',
        position: 'relative', zIndex: 10,
        padding: '0 20px 32px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Restaurant info */}
        <div style={{
          fontSize: '11px', fontWeight: 800, color: 'var(--accent-primary)',
          letterSpacing: '2.5px', marginBottom: '8px',
        }}>
          {modeLabel}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '10px', lineHeight: 1.1 }}>
          {restaurant.name}
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{
            background: 'var(--bg-surface)', padding: '4px 12px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 700,
            color: 'var(--accent-secondary)',
          }}>{restaurant.cuisine}</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700 }}>{restaurant.price}</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700 }}>{restaurant.distance}</span>
          {restaurant.rating && (
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 700 }}>
              ⭐ {restaurant.rating}
            </span>
          )}
        </div>

        {restaurant.address && (
          <p style={{
            fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600,
            marginBottom: '20px', lineHeight: 1.4,
          }}>
            📍 {restaurant.address}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Google Maps - Primary */}
          <ActionButton
            variant="primary"
            href={getMapsUrl(restaurant)}
            label="View on Google Maps"
            sublabel="Directions, hours & reviews"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            }
          />

          {/* Make a Reservation */}
          <ActionButton
            href={getOpenTableUrl(restaurant)}
            label="Make a Reservation"
            sublabel="Search on OpenTable"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
          />

          {/* Call Restaurant */}
          {restaurant.phone && (
            <ActionButton
              href={`tel:${restaurant.phone}`}
              label="Call Restaurant"
              sublabel={restaurant.phone}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              }
            />
          )}

          {/* Order Delivery - Expandable */}
          <button
            onClick={() => { haptics.filterTap(); setDeliveryExpanded(!deliveryExpanded); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              width: '100%', padding: '14px 16px', borderRadius: '14px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              background: 'var(--bg-card)', color: 'var(--text-primary)',
              fontFamily: 'Nunito',
            }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'var(--bg-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 800 }}>Order Delivery</div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px', color: 'var(--text-dim)' }}>
                Uber Eats, DoorDash, Grubhub
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-dim)" strokeWidth="2.5"
              style={{
                flexShrink: 0, transition: 'transform 0.2s',
                transform: deliveryExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          {/* Delivery apps expanded */}
          {deliveryExpanded && (
            <div style={{
              background: 'var(--bg-card)', borderRadius: '14px',
              padding: '4px 16px', marginTop: '-6px',
              animation: 'fadeInUp 0.2s ease-out',
            }}>
              {['Uber Eats', 'DoorDash', 'Grubhub'].map((app, i) => (
                <a
                  key={app}
                  href={getDeliveryUrl(app, restaurant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => haptics.light()}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0', textDecoration: 'none',
                    borderTop: i > 0 ? '1px solid var(--bg-surface)' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{app}</span>
                  <span style={{
                    fontSize: '13px', fontWeight: 700,
                    color: 'var(--accent-secondary)',
                  }}>Open →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
