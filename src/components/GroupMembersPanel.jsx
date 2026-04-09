import { haptics } from '../utils/haptics';

export default function GroupMembersPanel({ members, creatorId, deckSize, groupName, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          margin: '60px 16px 0',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          maxHeight: '60vh',
          overflowY: 'auto',
          animation: 'slideDown 0.25s ease-out',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
            {groupName || 'Group Members'}
          </h3>
          <button
            onClick={() => { haptics.light(); onClose(); }}
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              border: 'none', background: 'var(--bg-surface)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {members.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>
            No members yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {members.map(member => {
              const isHost = member.user_id === creatorId;
              const progress = deckSize > 0 ? Math.round((member.swipe_count / deckSize) * 100) : 0;
              const progressClamped = Math.min(progress, 100);

              return (
                <div
                  key={member.user_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--bg-surface)',
                  }}
                >
                  {/* Online indicator */}
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                    background: member.isOnline ? '#4CAF50' : 'var(--text-dim)',
                    boxShadow: member.isOnline ? '0 0 6px rgba(76,175,80,0.5)' : 'none',
                  }} />

                  {/* Name + role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '15px', fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {member.nickname || 'Anonymous'}
                      </span>
                      {isHost && (
                        <span style={{
                          fontSize: '10px', fontWeight: 700,
                          background: 'var(--accent-primary)', color: 'white',
                          padding: '1px 6px', borderRadius: '4px',
                          flexShrink: 0,
                        }}>HOST</span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div style={{
                      marginTop: '6px',
                      height: '4px', borderRadius: '2px',
                      background: 'var(--bg-card)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${progressClamped}%`,
                        height: '100%',
                        borderRadius: '2px',
                        background: progressClamped === 100
                          ? 'var(--accent-secondary)'
                          : 'var(--accent-primary)',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>

                  {/* Swipe count */}
                  <span style={{
                    fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
                    flexShrink: 0,
                  }}>
                    {member.swipe_count}/{deckSize}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
