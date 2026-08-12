import { useState, useEffect } from 'react';
import { haptics } from '../utils/haptics';
import { supabase } from '../utils/supabase';
import { CUISINE_FILTER_OPTIONS } from '../utils/cuisine';

const PRICE_LABELS = ['$', '$$', '$$$', '$$$$'];

const EXPERIENCES = [
  { id: 'pickup',   label: 'Pick Up'  },
  { id: 'delivery', label: 'Delivery' },
  { id: 'dinein',   label: 'Dine In'  },
];

const EXPERIENCE_DEFAULTS = {
  pickup:   { maxDistance: 2,  selectedPrices: [1, 2, 3], openNow: true, delivery: false, reservations: false },
  delivery: { maxDistance: 5,  selectedPrices: [1, 2, 3], openNow: true, delivery: true,  reservations: false },
  dinein:   { maxDistance: 5,  selectedPrices: [2, 3, 4], openNow: true, delivery: false, reservations: false },
};

export default function SessionScreen({
  onStart,
  loading,
  coords,
  onLocationChange,
  locationError: geoError,
  rejoinCandidate = null,
  onRejoin,
  onDismissRejoin,
}) {
  const [experience, setExperience] = useState('delivery');
  const [starting, setStarting] = useState(false);
  const [maxDistance, setMaxDistance] = useState(EXPERIENCE_DEFAULTS.delivery.maxDistance);
  const [selectedPrices, setSelectedPrices] = useState(EXPERIENCE_DEFAULTS.delivery.selectedPrices);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [openNow, setOpenNow] = useState(EXPERIENCE_DEFAULTS.delivery.openNow);
  const [delivery, setDelivery] = useState(EXPERIENCE_DEFAULTS.delivery.delivery);
  const [reservations, setReservations] = useState(EXPERIENCE_DEFAULTS.delivery.reservations);

  const locationDenied = geoError === 'location_denied' && !coords;

  // Add to Home Screen
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAddToHomeScreen = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

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

  const filters = { maxDistance, selectedPrices, selectedCuisines, openNow, delivery, reservations, experience };

  const togglePrice = (level) => {
    haptics.filterTap();
    setSelectedPrices(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleCuisine = (label) => {
    haptics.filterTap();
    setSelectedCuisines(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
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

  const cantStart = locationDenied || starting;

  const handleStartClick = async () => {
    if (cantStart) return;
    haptics.medium();
    setStarting(true);
    try {
      await onStart('group', filters);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 20px 24px',
      gap: '14px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <img
          src={`${import.meta.env.BASE_URL}images/logo-icon.png`}
          alt="Nosh Pit"
          style={{
            width: '72px',
            height: 'auto',
            filter: 'drop-shadow(0 0 12px rgba(232, 93, 58, 0.3))',
          }}
        />
        <h1 style={{
          fontFamily: '"Pirata One", "Nunito", serif',
          fontSize: '38px',
          fontWeight: 400,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: 'linear-gradient(135deg, var(--accent-primary), #FF8A65)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>Nosh Pit</h1>
      </div>

      {rejoinCandidate && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px',
          background: 'var(--accent-secondary-soft)',
          border: '1px solid var(--accent-secondary)',
          borderRadius: 'var(--radius-btn)',
          animation: 'fadeInUp 0.25s ease-out',
        }}>
          <button
            onClick={() => { haptics.medium(); onRejoin?.(); }}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              cursor: 'pointer', padding: 0, textAlign: 'left',
              fontFamily: 'Nunito', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--accent-secondary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3h4v4M14 10l7-7M21 14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Return to your group
              </div>
              <div style={{
                fontSize: '15px', fontWeight: 800,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {rejoinCandidate.groupName || 'Active group'}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '6px' }}>
                  · {rejoinCandidate.memberCount} {rejoinCandidate.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          <button
            onClick={() => { haptics.light(); onDismissRejoin?.(); }}
            aria-label="Dismiss"
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: 'var(--text-dim)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0, flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Experience selector */}
      <div style={{
        width: '100%', display: 'flex', gap: '6px',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-btn)',
        border: '1px solid var(--border-hairline)',
        padding: '5px',
      }}>
        {EXPERIENCES.map(exp => {
          const isActive = experience === exp.id;
          return (
            <button
              key={exp.id}
              onClick={() => { haptics.filterTap(); setExperience(exp.id); }}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: '10px',
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

      {/* Filters (location + distance + price + toggles) */}
      <div style={{
        width: '100%', background: 'var(--bg-card)', borderRadius: 'var(--radius-btn)',
        border: '1px solid var(--border-hairline)',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        {/* Location row */}
        <div>
          <button
            onClick={() => { haptics.filterTap(); setShowLocationInput(!showLocationInput); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', border: 'none',
              padding: 0, cursor: 'pointer', color: 'var(--text-primary)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={locationName ? 'var(--accent-secondary)' : 'var(--text-secondary)'} strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Location
            </div>
            <span style={{
              fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'right',
              color: locationName ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {locationName || 'Near you'}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{
              flexShrink: 0,
              transform: showLocationInput ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
            }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showLocationInput && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '8px',
              marginTop: '10px', animation: 'fadeInUp 0.2s ease-out',
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={locationQuery}
                  onChange={e => setLocationQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLocationSearch()}
                  placeholder="City or zip code..."
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '10px',
                    border: '2px solid var(--bg-surface)', background: 'var(--bg-surface)',
                    color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600,
                    fontFamily: 'Nunito', outline: 'none', minWidth: 0,
                  }}
                  autoFocus
                />
                <button
                  onClick={handleLocationSearch}
                  disabled={locationLoading || !locationQuery.trim()}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    border: 'none', background: 'var(--accent-secondary)',
                    color: 'white', fontSize: '13px', fontWeight: 800,
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
                    color: 'var(--accent-secondary)', fontSize: '12px', fontWeight: 700,
                    padding: 0, textAlign: 'left',
                  }}
                >
                  Use my location
                </button>
              )}
            </div>
          )}
        </div>

        {locationDenied && !showLocationInput && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '10px', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#F44336', margin: 0 }}>
              Location access was denied
            </p>
            <button
              onClick={() => setShowLocationInput(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-secondary)', fontSize: '12px', fontWeight: 700,
                padding: 0, textAlign: 'left', fontFamily: 'Nunito',
              }}
            >
              Enter a city or zip →
            </button>
          </div>
        )}

        <div style={{ height: '1px', background: 'var(--border-hairline)' }} />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Max Distance</label>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-secondary)' }}>{maxDistance} mi</span>
          </div>
          <input
            type="range" min="0.5" max="20" step="0.5" value={maxDistance}
            onChange={e => { setMaxDistance(Number(e.target.value)); haptics.filterTap(); }}
            style={{
              width: '100%', height: '4px', borderRadius: '2px',
              appearance: 'none', WebkitAppearance: 'none',
              background: `linear-gradient(to right, var(--accent-secondary) ${(maxDistance - 0.5) / 19.5 * 100}%, var(--bg-surface) ${(maxDistance - 0.5) / 19.5 * 100}%)`,
              outline: 'none', cursor: 'pointer',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Price {selectedPrices.length > 0 ? '' : '(all)'}
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {PRICE_LABELS.map((label, i) => {
              const level = i + 1;
              const isActive = selectedPrices.includes(level);
              return (
                <button
                  key={label}
                  onClick={() => togglePrice(level)}
                  style={{
                    flex: 1, padding: '6px', borderRadius: '10px',
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

        {/* Cuisine multi-select (collapsible) */}
        <div>
          <button
            onClick={() => { haptics.filterTap(); setCuisineOpen(o => !o); }}
            aria-expanded={cuisineOpen}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent', border: 'none', borderRadius: 0,
              padding: 0, cursor: 'pointer', color: 'var(--text-primary)',
              fontFamily: 'Nunito',
            }}
          >
            <span style={{
              fontSize: '13px', fontWeight: 700, flex: 1, textAlign: 'left',
              color: selectedCuisines.length > 0 ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            }}>
              Cuisine
            </span>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: selectedCuisines.length > 0 ? 'var(--accent-secondary)' : 'var(--text-dim)',
            }}>
              {selectedCuisines.length === 0
                ? 'All'
                : selectedCuisines.length === 1
                  ? selectedCuisines[0]
                  : `${selectedCuisines.length} selected`}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: cuisineOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {cuisineOpen && (
            <div style={{
              marginTop: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              animation: 'fadeInUp 0.18s ease-out',
            }}>
              {CUISINE_FILTER_OPTIONS.map(opt => {
                const isActive = selectedCuisines.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    onClick={() => toggleCuisine(opt.label)}
                    style={{
                      padding: '7px 4px', borderRadius: '10px',
                      border: isActive ? '2px solid var(--accent-secondary)' : '2px solid var(--bg-surface)',
                      background: isActive ? 'var(--accent-secondary-soft)' : 'transparent',
                      color: isActive ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                      fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                      fontFamily: 'Nunito',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <ToggleRow label="Open Now" value={openNow} onChange={setOpenNow} />
        <ToggleRow label="Delivery Available" value={delivery} onChange={setDelivery} />
        <ToggleRow label="Accepts Reservations" value={reservations} onChange={setReservations} />
      </div>

      {/* Let's Nosh (group share) */}
      <button
        onClick={handleStartClick}
        disabled={cantStart}
        style={{
          width: '100%', padding: '20px', borderRadius: 'var(--radius-btn)',
          border: 'none',
          background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
          color: 'white', cursor: cantStart ? 'default' : 'pointer',
          fontSize: '22px', fontWeight: 900, fontFamily: 'Nunito',
          letterSpacing: '0.5px',
          boxShadow: '0 6px 24px var(--accent-primary-glow)',
          opacity: cantStart && !starting ? 0.4 : 1,
          transition: 'transform 0.2s, opacity 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          flexShrink: 0,
        }}
        onPointerDown={e => !cantStart && (e.currentTarget.style.transform = 'scale(0.97)')}
        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {starting && (
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.35)',
            borderTopColor: 'white',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }} />
        )}
        {starting ? 'Getting ready…' : "Let's Nosh"}
      </button>


      <div style={{
        display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: '10px', paddingTop: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>Powered by</span>
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_light_color_74x24dp.png"
            alt="Google"
            style={{ height: '12px', opacity: 0.6 }}
          />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>·</span>
        <a
          href={`${import.meta.env.BASE_URL}privacy.html`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textDecoration: 'none' }}
        >
          Privacy Policy
        </a>
      </div>

      {!isInstalled && (deferredPrompt || isIOS) && (
        <div style={{ textAlign: 'center', paddingTop: '6px' }}>
          <button
            onClick={handleAddToHomeScreen}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700,
              textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
          >
            📲 Add to Home Screen
          </button>
        </div>
      )}

      {/* iOS instructions modal */}
      {showIOSModal && (
        <div
          onClick={() => setShowIOSModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
              padding: '28px 24px 40px', width: '100%', maxWidth: '480px',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
              Add to Home Screen
            </h3>
            <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
                Tap the <strong>Share</strong> button{' '}
                <span style={{ fontSize: '16px' }}>⎋</span>{' '}
                at the bottom of your browser
              </li>
              <li style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </li>
              <li style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
                Tap <strong>"Add"</strong> — Nosh Pit will appear on your home screen like an app
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              style={{
                marginTop: '24px', width: '100%', padding: '14px',
                borderRadius: '14px', border: 'none',
                background: 'var(--accent-primary)', color: 'white',
                fontSize: '15px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
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
          width: '40px', height: '22px', borderRadius: '12px',
          border: 'none', cursor: 'pointer', padding: '2px',
          background: value ? 'var(--accent-secondary)' : 'var(--bg-surface)',
          transition: 'background 0.2s',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'white',
          transform: value ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}
