import { useState } from 'react';
import { haptics } from '../utils/haptics';

const CUISINE_OPTIONS = [
  'American', 'Chinese', 'Greek', 'Indian', 'Irish', 'Italian',
  'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Seafood', 'Thai', 'Uzbek',
];

const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];

export default function SessionScreen({ onStart, loading }) {
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState(10);
  const [priceRange, setPriceRange] = useState([1, 4]); // min/max price level
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [cuisineDropdownOpen, setCuisineDropdownOpen] = useState(false);

  const filters = { maxDistance, priceRange, selectedCuisines };

  const toggleCuisine = (cuisine) => {
    haptics.filterTap();
    setSelectedCuisines(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    );
  };

  const hasActiveFilters = maxDistance < 10 || priceRange[0] > 1 || priceRange[1] < 4 || selectedCuisines.length > 0;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32px',
      gap: '20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '8px',
          filter: 'drop-shadow(0 0 12px rgba(232, 93, 58, 0.5))',
        }}>🍽️</div>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 900,
          background: 'linear-gradient(135deg, var(--accent-primary), #FF8A65)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>SwipeEats</h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '16px',
          fontWeight: 600,
        }}>Swipe your way to dinner</p>
      </div>

      {/* Mode buttons */}
      <button
        onClick={() => { haptics.medium(); onStart('solo', filters); }}
        style={{
          width: '100%', padding: '20px', borderRadius: 'var(--radius-btn)',
          border: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)',
          cursor: 'pointer', textAlign: 'left',
          transition: 'transform 0.2s',
        }}
        onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Solo Mode</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Just you deciding tonight's dinner</div>
      </button>

      <button
        onClick={() => { haptics.medium(); onStart('group', filters); }}
        style={{
          width: '100%', padding: '20px', borderRadius: 'var(--radius-btn)',
          border: '2px solid var(--accent-primary)', background: 'transparent',
          color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
          transition: 'transform 0.2s',
        }}
        onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800 }}>Start a Group</span>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            background: 'var(--accent-primary)', color: 'white',
            padding: '2px 8px', borderRadius: '6px',
          }}>GROUP</span>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
          Everyone swipes, find what the group agrees on
        </div>
      </button>

      {/* Filters toggle */}
      <button
        onClick={() => { haptics.filterTap(); setShowFilters(!showFilters); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: hasActiveFilters ? 'var(--accent-secondary)' : 'var(--text-secondary)',
          fontSize: '14px', fontWeight: 700, padding: '4px 0',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
          <circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/><circle cx="16" cy="6" r="2" fill="currentColor"/>
        </svg>
        Filters {hasActiveFilters ? '(active)' : ''}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          width: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-btn)',
          padding: '20px', animation: 'fadeInUp 0.2s ease-out',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          {/* Distance slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Max Distance</label>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)' }}>{maxDistance} mi</span>
            </div>
            <input
              type="range" min="1" max="10" value={maxDistance}
              onChange={e => { setMaxDistance(Number(e.target.value)); haptics.filterTap(); }}
              style={{
                width: '100%', height: '4px', borderRadius: '2px',
                appearance: 'none', WebkitAppearance: 'none',
                background: `linear-gradient(to right, var(--accent-primary) ${(maxDistance - 1) / 9 * 100}%, var(--bg-surface) ${(maxDistance - 1) / 9 * 100}%)`,
                outline: 'none', cursor: 'pointer',
              }}
            />
          </div>

          {/* Price range */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Price Range</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PRICE_LABELS.map((label, i) => {
                const level = i + 1;
                const isActive = level >= priceRange[0] && level <= priceRange[1];
                return (
                  <button
                    key={label}
                    onClick={() => {
                      haptics.filterTap();
                      if (isActive && priceRange[0] === level && priceRange[1] === level) {
                        setPriceRange([1, 4]); // reset
                      } else if (isActive) {
                        // Narrow the range
                        setPriceRange([level, level]);
                      } else {
                        // Expand to include this level
                        setPriceRange([
                          Math.min(priceRange[0], level),
                          Math.max(priceRange[1], level),
                        ]);
                      }
                    }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '10px',
                      border: isActive ? '2px solid var(--accent-primary)' : '2px solid var(--bg-surface)',
                      background: isActive ? 'rgba(232, 93, 58, 0.15)' : 'transparent',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-dim)',
                      fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                      fontFamily: 'Nunito',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuisine multi-select */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Cuisine</label>
            <button
              onClick={() => { haptics.filterTap(); setCuisineDropdownOpen(!cuisineDropdownOpen); }}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1px solid var(--bg-surface)', background: 'var(--bg-surface)',
                color: selectedCuisines.length > 0 ? 'var(--text-primary)' : 'var(--text-dim)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                textAlign: 'left', fontFamily: 'Nunito',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCuisines.length > 0 ? selectedCuisines.join(', ') : 'All cuisines'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                style={{ flexShrink: 0, transform: cuisineDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {cuisineDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                marginTop: '4px', background: 'var(--bg-surface)',
                borderRadius: '12px', padding: '8px',
                maxHeight: '180px', overflowY: 'auto',
                zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                WebkitOverflowScrolling: 'touch',
              }}>
                {CUISINE_OPTIONS.map(cuisine => (
                  <button
                    key={cuisine}
                    onClick={() => toggleCuisine(cuisine)}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: selectedCuisines.includes(cuisine) ? 'rgba(232, 93, 58, 0.15)' : 'transparent',
                      border: 'none', borderRadius: '8px',
                      color: selectedCuisines.includes(cuisine) ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontSize: '14px', fontWeight: selectedCuisines.includes(cuisine) ? 700 : 600,
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontFamily: 'Nunito',
                    }}
                  >
                    {cuisine}
                    {selectedCuisines.includes(cuisine) && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600,
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--accent-secondary)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          Finding restaurants near you...
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: '16px',
        fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600,
      }}>
        Powered by Google
      </div>
    </div>
  );
}
