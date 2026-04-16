import { useState } from 'react';
import { haptics } from '../utils/haptics';

export default function GroupLinkScreen({ sessionId, memberCount, onContinue, onBack, onSolo, isJoiner, groupName: existingGroupName }) {
  const [copied, setCopied] = useState(false);
  const [nickname, setNickname] = useState('');
  const [groupName, setGroupName] = useState('');

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const link = `${window.location.origin}${base}/s/${sessionId}`;
  const displayLink = `${window.location.host}${base}/s/${sessionId}`;
  const hasMembers = memberCount > 1;

  const copyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    haptics.light();
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
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

  const initial = (nickname.trim() || 'Y')[0].toUpperCase();

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      <button
        onClick={() => { haptics.navTransition(); onBack(); }}
        style={{
          position: 'absolute', top: '16px', left: '16px', zIndex: 2,
          width: '40px', height: '40px', borderRadius: '12px',
          border: 'none', background: 'var(--bg-surface)',
          color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>

      {/* Configure your group — top section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '72px 28px 24px',
        gap: '20px',
        overflow: 'auto',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px',
            color: 'var(--accent-secondary)', textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            {isJoiner ? 'Joined' : 'Your Group'}
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.2, marginBottom: '8px' }}>
            {isJoiner
              ? (existingGroupName || "You're in!")
              : hasMembers ? `${memberCount} in the group` : 'Configure your group'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
            {isJoiner
              ? 'Swipe through restaurants and find ones the group agrees on.'
              : 'Everyone swipes the same restaurants. Matches are where you all say yes.'}
          </p>
        </div>

        {!isJoiner && (
          <input
            type="text"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="Group name (optional)"
            maxLength={40}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 'var(--radius-btn)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'Nunito',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-secondary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-hairline)'}
          />
        )}

        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={20}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 'var(--radius-btn)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '16px',
            fontWeight: 700,
            fontFamily: 'Nunito',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-secondary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-hairline)'}
        />

        {!isJoiner && (
          <div style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-btn)',
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{
              fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px',
              color: 'var(--text-dim)', textTransform: 'uppercase',
            }}>
              Invite link
            </div>
            <div
              onClick={copyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px',
                background: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px dashed var(--border-hairline)',
                cursor: 'pointer',
                minWidth: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              <span style={{
                fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}>
                {displayLink}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={copyLink}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: copied ? 'var(--accent-secondary-soft)' : 'var(--bg-surface)',
                  color: copied ? 'var(--accent-secondary)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px', fontWeight: 800,
                  fontFamily: 'Nunito',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={shareLink}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px', fontWeight: 800,
                  fontFamily: 'Nunito',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: '0 2px 10px var(--accent-secondary-glow)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Share
              </button>
            </div>
          </div>
        )}

        {/* Member avatars */}
        {memberCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '4px',
          }}>
            <div style={{ display: 'flex' }}>
              {Array.from({ length: Math.min(memberCount, 5) }).map((_, i) => (
                <div key={i} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: i === 0
                    ? 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)'
                    : 'var(--bg-surface)',
                  border: '2px solid var(--bg-primary)',
                  marginLeft: i === 0 ? 0 : '-10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === 0 ? 'white' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 900, fontFamily: 'Nunito',
                  animation: `matchPop 0.3s ease-out ${i * 0.08}s both`,
                }}>
                  {i === 0 ? initial : '•'}
                </div>
              ))}
            </div>
            <span style={{
              fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700,
            }}>
              {memberCount === 1 ? 'Just you — share the link!' : `${memberCount} in the group`}
            </span>
          </div>
        )}

        <button
          onClick={() => { haptics.medium(); onContinue(nickname.trim() || null, groupName.trim() || null); }}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 'var(--radius-btn)',
            border: 'none',
            background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '17px',
            fontWeight: 800,
            fontFamily: 'Nunito',
            boxShadow: '0 4px 20px var(--accent-primary-glow)',
            marginTop: 'auto',
          }}
        >
          Start Swiping!
        </button>
      </div>

      {/* Dining solo — bottom section */}
      {!isJoiner && onSolo && (
        <div style={{
          borderTop: '1px solid var(--border-hairline)',
          background: 'var(--bg-card)',
          padding: '16px 28px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            fontSize: '11px', fontWeight: 800, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '1.2px',
          }}>
            Dining solo?
          </div>
          <button
            onClick={() => { haptics.light(); onSolo(); }}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 'var(--radius-btn)',
              border: '1px solid var(--accent-secondary)',
              background: 'transparent',
              color: 'var(--accent-secondary)',
              fontSize: '15px',
              fontWeight: 800,
              fontFamily: 'Nunito',
              cursor: 'pointer',
            }}
          >
            Eat Alone
          </button>
        </div>
      )}
    </div>
  );
}
