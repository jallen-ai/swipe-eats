import { haptics } from '../utils/haptics';

export default function MatchTray({ matches, onSelect, onRemove, onViewAll }) {
  if (matches.length === 0) return null;
  // When onSelect is null the thumbnails are display-only (group members).
  const interactable = typeof onSelect === 'function';

  return (
    <div style={{
      position: 'absolute',
      bottom: '100px',
      left: '16px',
      right: '16px',
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      overflowX: 'auto',
      padding: '8px 0',
      zIndex: 50,
    }}>
      {/* View All button */}
      <div style={{ flexShrink: 0, animation: 'matchPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}>
        <button
          onClick={() => { haptics.navTransition(); onViewAll(); }}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            border: '2px solid var(--accent-primary)',
            background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            boxShadow: '0 0 12px var(--accent-primary-glow)',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {matches.length}
          </span>
          <span style={{ fontSize: '7px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            matches
          </span>
        </button>
      </div>

      {/* Match thumbnails */}
      {matches.map((m, i) => (
        <div
          key={m.id}
          style={{
            position: 'relative',
            flexShrink: 0,
            animation: `matchPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${(i + 1) * 0.05}s both`,
          }}
        >
          <button
            onClick={interactable ? () => onSelect(m) : undefined}
            disabled={!interactable}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              border: '2px solid var(--accent-primary)',
              overflow: 'hidden',
              cursor: interactable ? 'pointer' : 'default',
              padding: 0,
              background: 'var(--bg-card)',
              boxShadow: '0 0 12px var(--accent-primary-glow)',
            }}
          >
            <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); haptics.light(); onRemove(m.id); }}
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              border: '2px solid var(--bg-primary)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              zIndex: 2,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
