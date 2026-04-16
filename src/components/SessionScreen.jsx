import { useState, useEffect } from 'react';
import { haptics } from '../utils/haptics';
import { supabase } from '../utils/supabase';

const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];

const EXPERIENCES = [
  { id: 'pickup',   label: 'Pick Up'  },
  { id: 'delivery', label: 'Delivery' },
  { id: 'dinein',   label: 'Dine In'  },
];

const EXPERIENCE_DEFAULTS = {
  pickup:   { maxDistance: 3,  selectedPrices: [1, 2, 3], openNow: true, delivery: false, reservations: false },
  delivery: { maxDistance: 5,  selectedPrices: [1, 2, 3], openNow: true, delivery: true,  reservations: false },
  dinein:   { maxDistance: 20, selectedPrices: [2, 3, 4], openNow: true, delivery: false, reservations: true  },
};

export default function SessionScreen({ onStart, loading, coords, onLocationChange, locationError: geoError }) {
  const [experience, setExperience] = useState('delivery');
  const [maxDistance, setMaxDistance] = useState(EXPERIENCE_DEFAULTS.delivery.maxDistance);
  const [selectedPrices, setSelectedPrices] = useState(EXPERIENCE_DEFAULTS.delivery.selectedPrices);
  const [openNow, setOpenNow] = useState(EXPERIENCE_DEFAULTS.delivery.openNow);
  const [delivery, setDelivery] = useState(EXPERIENCE_DEFAULTS.delivery.delivery);
  const [reservations, setReservations] = useState(EXPERIENCE_DEFAULTS.delivery.reservations);

  const locationDenied = geoError === 'location_denied' && !coords;

  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationName, setLocationName] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    const d = EXPERIENCE_DEFAULTS[experience];
    setMaxDistance(d.maxDistance);
    setSelectedPrices(d.selectedPrices);
    setOpenNow(d.openNow);
    setDelivery(d.delivery);
    setReservations(d.reservations);
  }, [experience]);

  const filters = { maxDistance, selectedPrices, openNow, delivery, reservations, experience };

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
      const resp = await supabase.functions.invoke('geocode', {
        body: { query: locationQuery.trim() },
      });
      const result = resp.data;
      if (!result?.lat) {
        setLocationError(result?.error || 'Location not found');
        return;
      }
      setLocationName(resp.data.formattedAddress);
      onLocationChange({ lat: resp.data.lat, lng: resp.data.lng }, resp.data.formattedAddress);
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
    onLocationChange(null);
    haptics.medium();
  };

  const cantStart = locationDenied || loading;

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 32px 96px',
      gap: '18px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <img
          src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
          alt="Nosh Pit"
          style={{
            width: '120px',
            height: 'auto',
            marginBottom: '4px',
            filter: 'drop-shadow(0 0 16px rgba(232, 93, 58, 0.3))',
          }}
        />
        <h1 style={{
          fontSize: '32px',
          fontWeight: 900,
          background: 'linear-gradient(135deg, var(--accent-primary), #FF8A65)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px',
        }}>Nosh Pit</h1>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          fontWeight: 600,
        }}>Jump on in and pick what's for dinner</p>
      </div>

      {/* Experience selector */}
      <div style={{
        width: '100%', display: 'flex', gap: '8px',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-btn)',
        border: '1px solid var(--border-hairline)',
        padding: '6px',
      }}>
        {EXPERIENCES.map(exp => {
          const isActive = experience === exp.id;
          return (
            <button
              key={exp.id}
              onClick={() => { haptics.filterTap(); setExperience(exp.id); }}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: '10px',
                border: 'none',
                background: isActive
                  ? 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)'
                  : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                fontFamily: 'Nunito',
                boxShadow: isActive ? '0 2px 8px var(--accent-secondary-glow)' : 'none',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {exp.label}
            </button>
          );
        })}
      </div>

      {/* Location selector */}
      <button
        onClick={() => { haptics.filterTap(); setShowLocationInput(!showLocationInput); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-card)', border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-btn)',
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

      {locationDenied && !showLocationInput && (
        <div style={{
          width: '100%', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)',
          borderRadius: 'var(--radius-btn)', padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#F44336', margin: 0 }}>
            Location access was denied
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
            Enter a city or zip code above so we can find restaurants near you.
          </p>
          <button
            onClick={() => setShowLocationInput(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent-secondary)', fontSize: '13px', fontWeight: 700,
              padding: 0, textAlign: 'left', fontFamily: 'Nunito',
            }}
          >
            Enter location →
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{
        width: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-btn)',
        border: '1px solid var(--border-hairline)',
        padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '18px',
      }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Max Distance</label>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-secondary)' }}>{maxDistance} mi</span>
          </div>
          <input
            type="range" min="1" max="20" value={maxDistance}
            onChange={e => { setMaxDistance(Number(e.target.value)); haptics.filterTap(); }}
            style={{
              width: '100%', height: '4px', borderRadius: '2px',
              appearance: 'none', WebkitAppearance: 'none',
              background: `linear-gradient(to right, var(--accent-secondary) ${(maxDistance - 1) / 19 * 100}%, var(--bg-surface) ${(maxDistance - 1) / 19 * 100}%)`,
              outline: 'none', cursor: 'pointer',
            }}
          />
        </div>

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
                    border: isActive ? '2px solid var(--accent-secondary)' : '2px solid var(--bg-surface)',
                    background: isActive ? 'var(--accent-secondary-soft)' : 'transparent',
                    color: isActive ? 'var(--accent-secondary)' : 'var(--text-dim)',
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

        <ToggleRow label="Open Now" value={openNow} onChange={setOpenNow} />
        <ToggleRow label="Delivery Available" value={delivery} onChange={setDelivery} />
        <ToggleRow label="Accepts Reservations" value={reservations} onChange={setReservations} />
      </div>

      {/* Let's Nosh (group share) */}
      <button
        onClick={() => { if (!cantStart) { haptics.medium(); onStart('group', filters); } }}
        disabled={cantStart}
        style={{
          width: '100%', padding: '22px', borderRadius: 'var(--radius-btn)',
          border: 'none',
          background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
          color: 'white', cursor: cantStart ? 'default' : 'pointer',
          fontSize: '22px', fontWeight: 900, fontFamily: 'Nunito',
          letterSpacing: '0.5px',
          boxShadow: '0 6px 24px var(--accent-primary-glow)',
          opacity: cantStart ? 0.4 : 1,
          transition: 'transform 0.2s',
        }}
        onPointerDown={e => !cantStart && (e.currentTarget.style.transform = 'scale(0.97)')}
        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        Let's Nosh
      </button>

      {/* Eat Alone (solo escape) */}
      <button
        onClick={() => { if (!cantStart) { haptics.light(); onStart('solo', filters); } }}
        disabled={cantStart}
        style={{
          background: 'none', border: 'none', cursor: cantStart ? 'default' : 'pointer',
          color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 700,
          fontFamily: 'Nunito', padding: '4px 8px',
          textDecoration: 'underline', textDecorationColor: 'var(--text-dim)',
          textUnderlineOffset: '3px',
          opacity: cantStart ? 0.4 : 1,
        }}
      >
        Eat Alone
      </button>

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
        marginTop: 'auto', paddingTop: '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>Powered by</span>
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_light_color_74x24dp.png"
            alt="Google"
            style={{ height: '14px', opacity: 0.6 }}
          />
        </div>
        <a
          href={`${import.meta.env.BASE_URL}privacy.html`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textDecoration: 'none' }}
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</label>
      <button
        onClick={() => { haptics.filterTap(); onChange(!value); }}
        style={{
          width: '44px', height: '24px', borderRadius: '12px',
          border: 'none', cursor: 'pointer', padding: '2px',
          background: value ? 'var(--accent-secondary)' : 'var(--bg-surface)',
          transition: 'background 0.2s',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: 'white',
          transform: value ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}
