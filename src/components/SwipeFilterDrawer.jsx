import { useState } from 'react';
import { haptics } from '../utils/haptics';
import { supabase } from '../utils/supabase';

const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];

export default function SwipeFilterDrawer({ filters, onApply, onClose, locationName, onLocationChange, canChangeLocation }) {
  const [maxDistance, setMaxDistance] = useState(filters.maxDistance ?? 20);
  const [selectedPrices, setSelectedPrices] = useState(filters.selectedPrices ?? []);
  const [openNow, setOpenNow] = useState(filters.openNow ?? false);

  // Location search state
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const togglePrice = (level) => {
    haptics.filterTap();
    setSelectedPrices(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleApply = () => {
    haptics.medium();
    onApply({ maxDistance, selectedPrices, openNow });
  };

  const handleLocationSearch = async () => {
    if (!locationQuery.trim()) return;
    setLocationLoading(true);
    setLocationError(null);
    try {
      const resp = await supabase.functions.invoke('geocode', {
        body: { query: locationQuery.trim() },
      });
      const result = resp.data;
      if (!result?.lat) {
        setLocationError(result?.error || 'Location not found');
        return;
      }
      onLocationChange({ lat: result.lat, lng: result.lng }, result.formattedAddress);
      setShowLocationInput(false);
      setLocationQuery('');
      haptics.medium();
    } catch {
      setLocationError('Location not found');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 50, display: 'flex', flexDirection: 'column',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'relative', marginTop: '60px',
        background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0',
        padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
        animation: 'fadeInUp 0.2s ease-out',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Filters</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '4px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Location selector */}
        {canChangeLocation && (
          <>
            <button
              onClick={() => { haptics.filterTap(); setShowLocationInput(!showLocationInput); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--bg-card)', border: 'none', borderRadius: '12px',
                padding: '12px 14px', cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={locationName ? 'var(--accent-secondary)' : 'var(--text-secondary)'} strokeWidth="2.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <span style={{
                fontSize: '14px', fontWeight: 700, flex: 1, textAlign: 'left',
                color: locationName ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              }}>
                {locationName || 'Near you'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Change</span>
            </button>

            {showLocationInput && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '10px',
                marginTop: '-12px',
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
              </div>
            )}
          </>
        )}

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

        {/* Price toggles */}
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

        {/* Apply button */}
        <button
          onClick={handleApply}
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius-btn)',
            border: 'none', background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
            color: 'white', fontSize: '15px', fontWeight: 800, cursor: 'pointer',
            fontFamily: 'Nunito', boxShadow: '0 4px 16px var(--accent-primary-glow)',
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
