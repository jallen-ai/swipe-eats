import { useState } from 'react';
import { haptics } from '../utils/haptics';
import ConfettiCanvas from './ConfettiCanvas';

// Extract city from a full address like "1295 S Elmhurst Rd, Des Plaines, IL 60016"
function getCityFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  // City is typically the second-to-last part (before "STATE ZIP")
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}

function getMapsUrl(restaurant) {
  // Place ID linking was unreliable — Google would sometimes fail to resolve
  // the location. Name + city/zip search is more forgiving.
  const city = getCityFromAddress(restaurant.address);
  const zipMatch = (restaurant.address || '').match(/\b\d{5}\b/);
  const locale = city || (zipMatch ? zipMatch[0] : '');
  const query = encodeURIComponent(`${restaurant.name} ${locale}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getOpenTableUrl(restaurant) {
  // OpenTable's search ranker performs better with the restaurant name alone
  // than with "Name City" as a combined term (the city portion confuses matching
  // on unique names like "Cabra" in Chicago). When coordinates are available,
  // we pass them so OpenTable filters nearby results instead.
  const params = new URLSearchParams({ term: restaurant.name });
  if (restaurant.lat && restaurant.lng) {
    params.set('latitude', String(restaurant.lat));
    params.set('longitude', String(restaurant.lng));
  } else {
    const city = getCityFromAddress(restaurant.address);
    if (city) params.set('term', `${restaurant.name} ${city}`);
  }
  return `https://www.opentable.com/s?${params.toString()}`;
}

function getDeliveryUrl(app, restaurant) {
  // Search by name + city only — full addresses break delivery app search
  const city = getCityFromAddress(restaurant.address);
  const query = encodeURIComponent(`${restaurant.name} ${city}`.trim());
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

const secondaryButtonStyle = {
  width: '100%', padding: '14px', borderRadius: 'var(--radius-btn)',
  border: '1px solid var(--border-hairline)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: '14px', fontWeight: 800,
  cursor: 'pointer', fontFamily: 'Nunito',
};

function ActionButton({ href, onClick, icon, label, sublabel, variant = 'default', disabled = false }) {
  const isGradient = variant === 'primary';
  const style = {
    display: 'flex', alignItems: 'center', gap: '14px',
    width: '100%', padding: '14px 16px', borderRadius: '14px',
    border: 'none', cursor: disabled ? 'default' : 'pointer', textDecoration: 'none',
    fontFamily: 'Nunito', textAlign: 'left',
    opacity: disabled ? 0.35 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
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

export default function LockInScreen({
  restaurant,
  onBack,
  mode,
  // Group tentative-pick state. null/undefined = standard locked UI (solo or confirmed group).
  //   isCreator: show Lock It In + (optional) Spin Again buttons
  //   !isCreator: show "Waiting for <setByName>..." message
  // In either tentative case, the standard action buttons (Delivery/Reservation/Maps)
  // are hidden — they only make sense post-confirmation.
  tentative = null,
  // Optional banner shown at the top — used for late-joiner "group picked this" case.
  banner = null,
  // Lifecycle controls, shown only in the committed (non-tentative) state.
  //   role:     'solo' | 'creator' | 'member'
  //   onReopen: creator-only — unlock and send everyone back to review
  //   onClose:  creator-only — end the session for everyone
  //   onLeave:  member-only  — exit locally (session keeps running for others)
  //   onDone:   solo-only    — back to home
  lifecycle = null,
}) {
  // Suppress confetti in tentative state — only celebrate on real confirm.
  const showConfetti = !tentative;
  const [deliveryExpanded, setDeliveryExpanded] = useState(false);

  const isTentative = !!tentative;

  const handleReopen = () => {
    if (!lifecycle?.onReopen) return;
    const ok = window.confirm('Reopen swiping? Everyone will return to the matches list with their swipes intact.');
    if (!ok) return;
    haptics.medium();
    lifecycle.onReopen();
  };

  const handleClose = () => {
    if (!lifecycle?.onClose) return;
    const ok = window.confirm('Close this session for everyone? This cannot be undone.');
    if (!ok) return;
    haptics.medium();
    lifecycle.onClose();
  };

  const handleLeave = () => {
    if (!lifecycle?.onLeave) return;
    haptics.medium();
    lifecycle.onLeave();
  };

  const handleDone = () => {
    if (!lifecycle?.onDone) return;
    haptics.medium();
    lifecycle.onDone();
  };

  const modeLabel = isTentative
    ? 'TENTATIVE PICK'
    : mode === 'group' ? 'THE GROUP PICKED' : mode === 'duo' ? 'YOU BOTH PICKED' : "TONIGHT'S PICK";

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
          {restaurant.website ? (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptics.light()}
              style={{
                background: 'var(--bg-surface)', padding: '4px 12px',
                borderRadius: '20px', fontSize: '13px', fontWeight: 700,
                color: 'var(--accent-secondary)',
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}
            >
              Website
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H8M17 7v9"/>
              </svg>
            </a>
          ) : (
            <span style={{
              background: 'var(--bg-surface)', padding: '4px 12px',
              borderRadius: '20px', fontSize: '13px', fontWeight: 700,
              color: 'var(--accent-secondary)',
            }}>{restaurant.cuisine}</span>
          )}
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

        {banner && (
          <div style={{
            background: 'var(--accent-secondary-soft)',
            border: '1px solid var(--accent-secondary)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '14px',
            fontSize: '13px', fontWeight: 700,
            color: 'var(--accent-secondary)',
          }}>
            {banner}
          </div>
        )}

        {isTentative && tentative.isCreator && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <button
              onClick={() => { haptics.lockIn(); tentative.onConfirm?.(); }}
              style={{
                padding: '16px', borderRadius: 'var(--radius-btn)',
                border: 'none', cursor: 'pointer', fontFamily: 'Nunito',
                background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
                color: 'white', fontSize: '17px', fontWeight: 900,
                boxShadow: '0 4px 20px var(--accent-primary-glow)',
              }}
            >Lock it in</button>
            {tentative.onSpinAgain && (
              <button
                onClick={() => { haptics.heavy(); tentative.onSpinAgain?.(); }}
                style={{
                  padding: '14px', borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--bg-surface)',
                  background: 'var(--bg-card)', color: 'var(--text-primary)',
                  fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Nunito',
                }}
              >🎲 Spin again</button>
            )}
          </div>
        )}

        {isTentative && !tentative.isCreator && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Waiting for {tentative.setByName || 'the group creator'} to confirm…
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
              They can lock this in or spin again
            </div>
          </div>
        )}

        {/* Action buttons — hidden while the pick is tentative */}
        {!isTentative && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Order Delivery / Pickup - Primary */}
          {restaurant.delivery !== false && (
            <>
              <button
                onClick={() => { haptics.filterTap(); setDeliveryExpanded(!deliveryExpanded); }}
                disabled={restaurant.delivery === false && restaurant.takeout === false}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '14px 16px', borderRadius: '14px',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Nunito',
                  background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
                  color: 'white',
                  boxShadow: '0 4px 16px var(--accent-primary-glow)',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" rx="2"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>
                    {restaurant.delivery === true && restaurant.takeout !== false ? 'Delivery / Pickup' :
                     restaurant.delivery === true ? 'Order Delivery' :
                     restaurant.takeout === true ? 'Order Pickup' : 'Delivery / Pickup'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px', color: 'rgba(255,255,255,0.7)' }}>
                    Uber Eats, DoorDash, Grubhub
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
                  style={{
                    flexShrink: 0, transition: 'transform 0.2s',
                    transform: deliveryExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

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
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-secondary)' }}>Open →</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Make a Reservation */}
          <ActionButton
            href={restaurant.reservable !== false ? getOpenTableUrl(restaurant) : undefined}
            disabled={restaurant.reservable === false}
            label="Make a Reservation"
            sublabel={restaurant.reservable === false ? 'Not available' : 'Search on OpenTable'}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
          />

          {/* Google Maps */}
          <ActionButton
            href={getMapsUrl(restaurant)}
            label="View on Google Maps"
            sublabel="Directions, hours & reviews"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
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

        </div>
        )}
      </div>

      {/* Lifecycle footer — pinned outside the scrollable area so it's always
          visible on mobile (was getting cut off below the fold). */}
      {lifecycle && (
        <div style={{
          flexShrink: 0,
          padding: '12px 20px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex', flexDirection: 'column', gap: '8px',
          zIndex: 10,
        }}>
          {lifecycle.role === 'creator' && (
            <>
              <button onClick={handleReopen} style={secondaryButtonStyle}>
                🔄 Reopen swiping
              </button>
              <button
                onClick={handleClose}
                style={{ ...secondaryButtonStyle, color: '#F44336', borderColor: 'rgba(244,67,54,0.4)' }}
              >
                Close session
              </button>
            </>
          )}
          {lifecycle.role === 'member' && (
            <button onClick={handleLeave} style={secondaryButtonStyle}>
              Leave session
            </button>
          )}
          {lifecycle.role === 'solo' && (
            <button onClick={handleDone} style={secondaryButtonStyle}>
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}
