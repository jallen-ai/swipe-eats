export default function SessionScreen({ onStart, loading }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32px',
      gap: '24px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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

      <button
        onClick={() => onStart('solo')}
        style={{
          width: '100%',
          padding: '20px',
          borderRadius: 'var(--radius-btn)',
          border: 'none',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Solo Mode</div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Just you deciding tonight's dinner</div>
      </button>

      <button
        onClick={() => onStart('duo')}
        style={{
          width: '100%',
          padding: '20px',
          borderRadius: 'var(--radius-btn)',
          border: '2px solid var(--accent-primary)',
          background: 'transparent',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800 }}>Match With Partner</span>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            background: 'var(--accent-primary)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '6px',
          }}>DUO</span>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
          Both swipe, find your match
        </div>
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
          Finding restaurants near you...
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
          `}</style>
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
