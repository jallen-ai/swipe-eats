import { useState } from 'react';
import { haptics } from '../utils/haptics';

export default function GroupMembersPanel({
  members,
  creatorId,
  deckSize,
  groupName,
  sessionId,
  isCreator,
  onClose,
  // Creator-only callback to terminally close the session for everyone.
  onCloseSession,
}) {
  const handleCloseSession = () => {
    if (!onCloseSession) return;
    const ok = window.confirm('Close this session for everyone? This cannot be undone.');
    if (!ok) return;
    haptics.medium();
    onCloseSession();
  };
  const [copied, setCopied] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const link = sessionId ? `${window.location.origin}${base}/s/${sessionId}` : null;
  const displayLink = sessionId ? `${window.location.host}${base}/s/${sessionId}` : null;

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    haptics.light();
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!link) return;
    haptics.light();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nosh Pit',
          text: 'Join my Nosh Pit group and help pick where to eat!',
          url: link,
        });
      } catch (e) {
        if (e.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 300,
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
          maxHeight: '75vh',
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

        {isCreator && link && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <div style={{
              fontSize: '11px', fontWeight: 800, color: 'var(--text-dim)',
              letterSpacing: '1.2px', textTransform: 'uppercase',
            }}>
              Invite link
            </div>
            <button
              onClick={copyLink}
              style={{
                width: '100%', padding: '12px 14px',
                borderRadius: '12px',
                border: '1px dashed var(--border-hairline)',
                background: 'var(--bg-surface)',
                color: copied ? 'var(--accent-secondary)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontFamily: 'Nunito',
                transition: 'color 0.2s, border-color 0.2s',
                borderColor: copied ? 'var(--accent-secondary)' : 'var(--border-hairline)',
              }}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              )}
              <span style={{
                fontSize: '13px', fontWeight: 700,
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                textAlign: 'left',
              }}>
                {copied ? 'Copied to clipboard' : displayLink}
              </span>
            </button>
            <button
              onClick={shareLink}
              style={{
                width: '100%', padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px', fontWeight: 800,
                fontFamily: 'Nunito',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 2px 10px var(--accent-secondary-glow)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share invite
            </button>
          </div>
        )}

        {(!members || members.length === 0) ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>
            Loading members…
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

        {isCreator && onCloseSession && (
          <div style={{
            marginTop: '16px', paddingTop: '16px',
            borderTop: '1px solid var(--border-hairline)',
          }}>
            <button
              onClick={handleCloseSession}
              style={{
                width: '100%', padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(244,67,54,0.4)',
                background: 'transparent',
                color: '#F44336',
                fontSize: '14px', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Nunito',
              }}
            >
              Close session for everyone
            </button>
            <p style={{
              margin: '8px 4px 0',
              fontSize: '11px', fontWeight: 600,
              color: 'var(--text-dim)', textAlign: 'center',
              lineHeight: 1.4,
            }}>
              Ends the session immediately for all members. This cannot be undone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
