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

      {/* Configure your group — top section (~80%) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        gap: '16px',
        overflow: 'auto',
      }}>
        <div style={{ fontSize: '48px' }}>{isJoiner ? '✋' : '👥'}</div>

        <h2 style={{ fontSize: '22px', fontWeight: 800, textAlign: 'center' }}>
          {isJoiner
            ? (existingGroupName || "You're in!")
            : hasMembers ? `${memberCount} members joined!` : 'Configure your group'}
        </h2>

        {isJoiner && existingGroupName && (
          <p style={{ color: 'var(--accent-secondary)', textAlign: 'center', fontSize: '14px', fontWeight: 700, margin: '-4px 0 0' }}>
            You're in!
          </p>
        )}

        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '14px', fontWeight: 600, margin: 0 }}>
          {isJoiner
            ? 'Swipe through restaurants and find ones the group agrees on!'
            : hasMembers
              ? 'Everyone swipes independently. Restaurants the group agrees on become matches!'
              : 'Share this link with friends. Everyone gets the same restaurants to swipe through.'}
        </p>

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
              fontWeight: 600,
              fontFamily: 'Nunito',
              outline: 'none',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
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
            fontWeight: 600,
            fontFamily: 'Nunito',
            outline: 'none',
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-hairline)'}
        />

        {!isJoiner && (
          <div style={{ width: '100%', display: 'flex', gap: '10px' }}>
            <button
              onClick={copyLink}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--bg-card)',
                color: copied ? 'var(--accent-secondary)' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'Nunito',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s',
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {copied ? '✓ Copied!' : `📋 ${displayLink}`}
            </button>

            <button
              onClick={shareLink}
              style={{
                width: '52px',
                flexShrink: 0,
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          </div>
        )}

        {memberCount > 0 && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            {Array.from({ length: memberCount }).map((_, i) => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--accent-secondary)',
                animation: `matchPop 0.3s ease-out ${i * 0.1}s both`,
              }} />
            ))}
            <span style={{
              fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: '4px',
            }}>
              {memberCount === 1 ? 'Just you so far' : `${memberCount} in group`}
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
            background: (isJoiner || hasMembers)
              ? 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)'
              : 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '17px',
            fontWeight: 800,
            fontFamily: 'Nunito',
            boxShadow: (isJoiner || hasMembers)
              ? '0 4px 20px var(--accent-secondary-glow)'
              : '0 4px 20px var(--accent-primary-glow)',
          }}
        >
          Start Swiping!
        </button>

        {!isJoiner && !hasMembers && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600,
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--text-dim)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            Waiting for others to join...
          </div>
        )}
      </div>

      {/* Dining solo — bottom section (~18%) */}
      {!isJoiner && onSolo && (
        <div style={{
          borderTop: '1px solid var(--border-hairline)',
          background: 'var(--bg-card)',
          padding: '18px 32px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            fontSize: '12px', fontWeight: 800, color: 'var(--text-dim)',
            textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Dining solo?
          </div>
          <button
            onClick={() => { haptics.light(); onSolo(); }}
            style={{
              width: '100%',
              padding: '14px',
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
