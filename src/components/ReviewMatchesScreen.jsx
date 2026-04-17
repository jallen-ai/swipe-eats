import { useState } from 'react';
import { haptics } from '../utils/haptics';

export default function ReviewMatchesScreen({ matches, mode, onSelect, onChooseForMe, onBack, isCreator = true }) {
  const [pressedId, setPressedId] = useState(null);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <button
          onClick={() => { haptics.navTransition(); onBack(); }}
          style={{
            width: '36px', height: '36px', borderRadius: '12px',
            border: 'none', background: 'var(--bg-surface)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>
            Your Matches
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600, margin: 0 }}>
            {matches.length} {matches.length === 1 ? 'restaurant' : 'restaurants'} matched
            {mode === 'group' ? ' by the group' : ''}
          </p>
        </div>
      </div>

      {/* Match list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '0 16px 16px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {matches.map((restaurant, i) => (
          <button
            key={restaurant.id}
            onClick={() => { haptics.medium(); onSelect(restaurant); }}
            onPointerDown={() => setPressedId(restaurant.id)}
            onPointerUp={() => setPressedId(null)}
            onPointerLeave={() => setPressedId(null)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px', marginBottom: '10px',
              background: 'var(--bg-card)', borderRadius: '16px',
              border: '1px solid transparent',
              cursor: 'pointer', textAlign: 'left',
              transition: 'transform 0.15s, border-color 0.15s',
              transform: pressedId === restaurant.id ? 'scale(0.97)' : 'scale(1)',
              animation: `matchListSlide 0.3s ease-out ${i * 0.05}s both`,
              fontFamily: 'inherit',
            }}
          >
            {/* Thumbnail */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '14px',
              overflow: 'hidden', flexShrink: 0,
              background: restaurant.color || 'var(--bg-surface)',
            }}>
              {restaurant.photo && (
                <img
                  src={restaurant.photo} alt={restaurant.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {restaurant.name}
              </div>
              <div style={{
                fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600,
                marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center',
              }}>
                <span>{restaurant.cuisine}</span>
                <span style={{ color: 'var(--text-dim)' }}>·</span>
                <span>{restaurant.price}</span>
                <span style={{ color: 'var(--text-dim)' }}>·</span>
                <span>{restaurant.distance}</span>
              </div>
              {restaurant.rating && (
                <div style={{
                  fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600,
                  marginTop: '4px',
                }}>
                  ⭐ {restaurant.rating}
                  {restaurant.ratingCount ? ` (${restaurant.ratingCount})` : ''}
                </div>
              )}
              {/* Vote count for group mode */}
              {restaurant.voteCount != null && restaurant.totalMembers != null && (
                <div style={{
                  fontSize: '11px', fontWeight: 700, marginTop: '4px',
                  color: restaurant.voteCount === restaurant.totalMembers
                    ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                }}>
                  {restaurant.voteCount === restaurant.totalMembers
                    ? '✅ Everyone liked this!'
                    : `👍 ${restaurant.voteCount}/${restaurant.totalMembers} liked this`}
                </div>
              )}
            </div>

            {/* Arrow */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-dim)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}
      </div>

      {/* Choose for Me button — creator-only in group mode (sole arbiter) */}
      {matches.length >= 2 && isCreator && (
        <div style={{ padding: '0 16px 32px' }}>
          <button
            onClick={() => { haptics.heavy(); onChooseForMe(); }}
            style={{
              width: '100%', padding: '18px', borderRadius: 'var(--radius-btn)',
              border: 'none', cursor: 'pointer', fontFamily: 'Nunito',
              background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
              color: 'white', fontSize: '17px', fontWeight: 900,
              boxShadow: '0 4px 20px var(--accent-primary-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              animation: 'chooseGlow 2s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '22px' }}>🎲</span>
            Choose for Me!
          </button>
        </div>
      )}
      {matches.length >= 2 && !isCreator && mode === 'group' && (
        <div style={{
          padding: '0 16px 32px',
          fontSize: '12px', fontWeight: 700,
          color: 'var(--text-dim)',
          textAlign: 'center',
        }}>
          The group creator picks the final restaurant
        </div>
      )}
    </div>
  );
}
