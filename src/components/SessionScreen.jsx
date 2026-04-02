import { useState } from 'react';
import { haptics } from '../utils/haptics';
import { supabase } from '../utils/supabase';

const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];

export default function SessionScreen({ onStart, loading, coords, onLocationChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState(20);
  const [selectedPrices, setSelectedPrices] = useState([]); // empty = all
  const [openNow, setOpenNow] = useState(true);

  // Location search state
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationName, setLocationName] = useState(null); // null = "Near you"
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const filters = { maxDistance, selectedPrices, openNow };

  const togglePrice = (level) => {
    haptics.filterTap();
    setSelectedPrices(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleLocationSearch = async () => {
    if (!locationQuery.trim()) return;
    setLocationLoading(true);
    setLocationError(null);
    try {
      const resp = await supabase.functions.invoke('clever-api', {
        body: { query: locationQuery.trim() },
      });
      const result = resp.data;
      if (!result?.lat) {
        setLocationError(result?.error || 'Location not found');
        return;
      }
      setLocationName(resp.data.formattedAddress);
      onLocationChange({ lat: resp.data.lat, lng: resp.data.lng });
      setShowLocationInput(false);
      setLocationQuery('');
      haptics.medium();
    } catch {
      setLocationError('Location not found');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    setLocationName(null);
    setShowLocationInput(false);
    setLocationQuery('');
    onLocationChange(null); // signals "use geolocation"
    haptics.medium();
  };

  const hasActiveFilters = maxDistance < 20 || selectedPrices.length > 0 || openNow;

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

      {/* Location selector */}
      <button
        onClick={() => { haptics.filterTap(); setShowLocationInput(!showLocationInput); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-card)', border: 'none', borderRadius: 'var(--radius-btn)',
          padding: '12px 16px', cursor: 'pointer', color: 'var(--text-primary)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={locationName ? 'var(--accent-secondary)' : 'var(--text-secondary)'} strokeWidth="2.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 700, flex: 1, textAlign: 'left',
          color: locationName ? 'var(--accent-secondary)' : 'var(--text-secondary)',
        }}>
          {locationName || 'Near you'}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Change</span>
      </button>

      {showLocationInput && (
        <div style={{
          width: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-btn)',
          padding: '16px', animation: 'fadeInUp 0.2s ease-out',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLocationSearch()}
              placeholder="City or zip code..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '10px',
                border: '2px solid var(--bg-surface)', background: 'var(--bg-surface)',
                color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600,
                fontFamily: 'Nunito', outline: 'none',
              }}
              autoFocus
            />
            <button
              onClick={handleLocationSearch}
              disabled={locationLoading || !locationQuery.trim()}
              style={{
                padding: '10px 16px', borderRadius: '10px',
                border: 'none', background: 'var(--accent-primary)',
                color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Nunito',
                opacity: locationLoading || !locationQuery.trim() ? 0.5 : 1,
              }}
            >
              {locationLoading ? '...' : 'Go'}
            </button>
          </div>
          {locationError && (
            <span style={{ fontSize: '12px', color: '#F44336', fontWeight: 600 }}>{locationError}</span>
          )}
          {locationName && (
            <button
              onClick={handleUseMyLocation}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-secondary)', fontSize: '13px', fontWeight: 700,
                padding: 0, textAlign: 'left',
              }}
            >
              Use my location
            </button>
          )}
        </div>
      )}

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
              type="range" min="1" max="20" value={maxDistance}
              onChange={e => { setMaxDistance(Number(e.target.value)); haptics.filterTap(); }}
              style={{
                width: '100%', height: '4px', borderRadius: '2px',
                appearance: 'none', WebkitAppearance: 'none',
                background: `linear-gradient(to right, var(--accent-primary) ${(maxDistance - 1) / 19 * 100}%, var(--bg-surface) ${(maxDistance - 1) / 19 * 100}%)`,
                outline: 'none', cursor: 'pointer',
              }}
            />
          </div>

          {/* Price toggles - simple on/off */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Price {selectedPrices.length > 0 ? '' : '(all)'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PRICE_LABELS.map((label, i) => {
                const level = i + 1;
                const isActive = selectedPrices.includes(level);
                return (
                  <button
                    key={label}
                    onClick={() => togglePrice(level)}
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

          {/* Open Now toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Open Now</label>
            <button
              onClick={() => { haptics.filterTap(); setOpenNow(!openNow); }}
              style={{
                width: '44px', height: '24px', borderRadius: '12px',
                border: 'none', cursor: 'pointer', padding: '2px',
                background: openNow ? 'var(--accent-primary)' : 'var(--bg-surface)',
                transition: 'background 0.2s',
                display: 'flex', alignItems: 'center',
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'white',
                transform: openNow ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
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
          {locationName ? `Finding restaurants near ${locationName.split(',')[0]}...` : 'Finding restaurants near you...'}
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
