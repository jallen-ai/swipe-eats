import { useState } from 'react';
import { haptics } from '../utils/haptics';

function initialFromName(name) {
  const clean = (name || '').trim();
  return (clean[0] || '•').toUpperCase();
}

// Palette for non-creator member chips — keeps the creator chip visually
// distinct while still giving each joiner their own color.
const CHIP_COLORS = [
  '#3A6FE0', '#A95EE0', '#E08A3A', '#2FA39C', '#D14D8C',
];

function Roster({ members, myUserId }) {
  if (!members || members.length === 0) return null;
  // Stable color by index in member order.
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex' }}>
        {members.slice(0, 5).map((m, i) => {
          const isMe = m.user_id === myUserId;
          const bg = isMe
            ? 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)'
            : CHIP_COLORS[i % CHIP_COLORS.length];
          return (
            <div key={m.user_id || i} style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: bg,
              border: '2px solid var(--bg-primary)',
              marginLeft: i === 0 ? 0 : '-10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '12px', fontWeight: 900, fontFamily: 'Nunito',
              animation: `matchPop 0.3s ease-out ${i * 0.08}s both`,
            }}>
              {initialFromName(m.nickname || (isMe ? 'You' : ''))}
            </div>
          );
        })}
        {members.length > 5 && (
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '2px solid var(--bg-primary)',
            marginLeft: '-10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 900, fontFamily: 'Nunito',
          }}>
            +{members.length - 5}
          </div>
        )}
      </div>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700 }}>
        {members.length === 1
          ? 'Just you so far'
          : `${members.length} in · ${members.slice(0, 3).map(m => m.user_id === myUserId ? 'You' : (m.nickname?.trim() || 'Guest')).join(', ')}${members.length > 3 ? '…' : ''}`}
      </span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '11px', fontWeight: 800,
      color: 'var(--text-dim)', letterSpacing: '1.2px',
      textTransform: 'uppercase', marginBottom: '8px',
    }}>{children}</div>
  );
}

export default function GroupLinkScreen({
  sessionId, members = [], myUserId,
  onContinue, onBack, onSolo,
  isJoiner,
  groupName: existingGroupName, existingNickname,
  onGroupNameCommit,
}) {
  const [copied, setCopied] = useState(false);
  // Seed inputs from existing values so returning to this screen (creator
  // back from swiping, etc.) doesn't wipe out what the user already typed.
  const [nickname, setNickname] = useState(existingNickname || '');
  const [groupName, setGroupName] = useState(existingGroupName || '');

  // Persist the group name as soon as the creator commits it (blur or share).
  // Without this, the name isn't in the DB until "Start Swiping!" is tapped,
  // so joiners opening the invite link in the meantime see no group name.
  const commitGroupName = () => {
    if (!onGroupNameCommit) return;
    const trimmed = groupName.trim();
    if (trimmed === (existingGroupName || '')) return;
    onGroupNameCommit(trimmed || null);
  };

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const link = `${window.location.origin}${base}/s/${sessionId}`;
  const displayLink = `${window.location.host}${base}/s/${sessionId}`;

  const copyLink = () => {
    commitGroupName();
    navigator.clipboard?.writeText(link);
    setCopied(true);
    haptics.light();
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    haptics.light();
    commitGroupName();
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

  // Soft-gate the primary CTA on having a group name. Creator-only — joiners
  // don't control the group name.
  const groupNameReady = isJoiner || groupName.trim().length > 0;

  const handleStart = () => {
    if (!groupNameReady) {
      haptics.light();
      return;
    }
    haptics.medium();
    onContinue(nickname.trim() || null, groupName.trim() || null);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowY: 'auto',
    }}>
      <button
        onClick={() => { haptics.navTransition(); onBack(); }}
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: '16px', zIndex: 2,
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

      <div style={{
        display: 'flex', flexDirection: 'column',
        // Top padding clears the floating back button while honoring the iOS
        // safe-area (notch / Dynamic Island). Bottom honors the home indicator.
        padding: 'calc(env(safe-area-inset-top) + 56px) 24px max(24px, env(safe-area-inset-bottom))',
        gap: '20px',
      }}>
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1.2, margin: 0, marginBottom: '6px' }}>
            {isJoiner
              ? (existingGroupName ? `You're in — ${existingGroupName}` : "You're in!")
              : 'Set up your group'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
            {isJoiner
              ? 'Swipe the deck and find spots the group agrees on.'
              : 'Name it, invite friends, start swiping.'}
          </p>
        </div>

        {/* YOUR DETAILS */}
        <div>
          <SectionLabel>{isJoiner ? 'Your name' : 'Your details'}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!isJoiner && (
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name"
                maxLength={40}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent-secondary)'}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border-hairline)';
                  commitGroupName();
                }}
              />
            )}
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent-secondary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-hairline)'}
            />
          </div>
        </div>

        {/* INVITE FRIENDS — creator only */}
        {!isJoiner && (
          <div>
            <SectionLabel>Invite friends</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={copyLink}
                aria-label={copied ? 'Link copied' : 'Copy invite link'}
                style={{
                  width: '100%', padding: '14px 16px',
                  borderRadius: 'var(--radius-btn)',
                  border: `1.5px dashed ${copied ? 'var(--accent-secondary)' : 'var(--border-hairline)'}`,
                  background: 'var(--bg-card)',
                  color: copied ? 'var(--accent-secondary)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  fontFamily: 'Nunito',
                  transition: 'color 0.2s, border-color 0.2s',
                  textAlign: 'left',
                }}
              >
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{
                    fontSize: '14px', fontWeight: 700,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {displayLink}
                  </span>
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    color: copied ? 'var(--accent-secondary)' : 'var(--text-dim)',
                    letterSpacing: '0.3px',
                  }}>
                    {copied ? 'Copied to clipboard' : 'Tap to copy'}
                  </span>
                </div>
              </button>

              <button
                onClick={shareLink}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 'var(--radius-btn)',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-secondary), #1AAF8B)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '15px', fontWeight: 800,
                  fontFamily: 'Nunito',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 2px 12px var(--accent-secondary-glow)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Share invite
              </button>
            </div>
          </div>
        )}

        {/* WHO'S HERE — roster under whichever section came before */}
        <Roster members={members} myUserId={myUserId} />

        {/* PRIMARY CTA + escape hatch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={handleStart}
            aria-disabled={!groupNameReady}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: 'var(--radius-btn)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-primary), #FF7043)',
              color: 'white',
              cursor: groupNameReady ? 'pointer' : 'default',
              fontSize: '17px',
              fontWeight: 800,
              fontFamily: 'Nunito',
              boxShadow: groupNameReady ? '0 4px 20px var(--accent-primary-glow)' : 'none',
              opacity: groupNameReady ? 1 : 0.4,
              transition: 'opacity 0.2s, box-shadow 0.2s',
            }}
          >
            Start Swiping!
          </button>
          {!groupNameReady && (
            <div style={{
              fontSize: '12px', fontWeight: 700, textAlign: 'center',
              color: 'var(--text-dim)',
            }}>
              Give your group a name to get started
            </div>
          )}
          {!isJoiner && onSolo && (
            <button
              onClick={() => { haptics.light(); onSolo(); }}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, fontFamily: 'Nunito',
                padding: '6px', alignSelf: 'center',
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
            >
              or dine solo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
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
};
