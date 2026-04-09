import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getUserId } from '../utils/supabase';
import { haptics } from '../utils/haptics';

export function useRealtimeSwipes(sessionId, isActive) {
  // Track all members' right swipes: Map<restaurantId, Set<userId>>
  const [otherRightSwipes, setOtherRightSwipes] = useState(new Map());
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [memberCount, setMemberCount] = useState(1);
  const [newPartnerMatch, setNewPartnerMatch] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  // Persistent members from DB: [{ user_id, nickname, joined_at, swipe_count, isOnline }]
  const [members, setMembers] = useState([]);
  const myRightSwipesRef = useRef(new Set());
  const myUserIdRef = useRef(null);
  const channelRef = useRef(null);
  const prevMemberCountRef = useRef(1);
  const onlineUsersRef = useRef(new Set());

  useEffect(() => {
    getUserId().then(id => { myUserIdRef.current = id; });
  }, []);

  // Load members from DB
  const fetchMembers = useCallback(async () => {
    if (!sessionId) return;

    // Fetch members
    const { data: memberRows } = await supabase
      .from('session_members')
      .select('user_id, nickname, joined_at')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (!memberRows) return;

    // Fetch swipe counts per user
    const { data: swipes } = await supabase
      .from('swipes')
      .select('user_id')
      .eq('session_id', sessionId);

    const countMap = {};
    for (const s of (swipes || [])) {
      countMap[s.user_id] = (countMap[s.user_id] || 0) + 1;
    }

    const online = onlineUsersRef.current;
    setMembers(memberRows.map(m => ({
      user_id: m.user_id,
      nickname: m.nickname,
      joined_at: m.joined_at,
      swipe_count: countMap[m.user_id] || 0,
      isOnline: online.has(m.user_id),
    })));
  }, [sessionId]);

  // Initial member load
  useEffect(() => {
    if (sessionId && isActive) {
      fetchMembers();
    }
  }, [sessionId, isActive, fetchMembers]);

  // Catch-up: load existing swipes when joining/reconnecting
  useEffect(() => {
    if (!sessionId || !isActive) return;

    async function catchUp() {
      const userId = await getUserId();
      myUserIdRef.current = userId;

      const { data: swipes } = await supabase
        .from('swipes')
        .select('user_id, restaurant_id, direction')
        .eq('session_id', sessionId);

      if (!swipes) return;

      const myRight = new Set();
      const othersMap = new Map();

      for (const s of swipes) {
        if (s.direction !== 'right') continue;
        if (s.user_id === userId) {
          myRight.add(s.restaurant_id);
        } else {
          if (!othersMap.has(s.restaurant_id)) {
            othersMap.set(s.restaurant_id, new Set());
          }
          othersMap.get(s.restaurant_id).add(s.user_id);
        }
      }

      myRightSwipesRef.current = myRight;
      setOtherRightSwipes(othersMap);
    }

    catchUp();
  }, [sessionId, isActive]);

  // Subscribe to realtime swipes + presence + members
  useEffect(() => {
    if (!sessionId || !isActive) return;

    const channel = supabase.channel(`session:${sessionId}`)
      .on('broadcast', { event: 'session_start' }, () => {
        setSessionStarted(true);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'swipes',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const swipe = payload.new;
        if (!swipe) return;

        // Update member swipe counts
        setMembers(prev => prev.map(m =>
          m.user_id === swipe.user_id
            ? { ...m, swipe_count: m.swipe_count + 1 }
            : m
        ));

        if (swipe.user_id === myUserIdRef.current) return;

        if (swipe.direction === 'right') {
          setOtherRightSwipes(prev => {
            const next = new Map(prev);
            if (!next.has(swipe.restaurant_id)) {
              next.set(swipe.restaurant_id, new Set());
            }
            next.get(swipe.restaurant_id).add(swipe.user_id);
            return next;
          });

          if (myRightSwipesRef.current.has(swipe.restaurant_id)) {
            setNewPartnerMatch(swipe.restaurant_id);
          }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_members',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const member = payload.new;
        if (!member) return;
        setMembers(prev => {
          if (prev.find(m => m.user_id === member.user_id)) return prev;
          return [...prev, {
            user_id: member.user_id,
            nickname: member.nickname,
            joined_at: member.joined_at,
            swipe_count: 0,
            isOnline: onlineUsersRef.current.has(member.user_id),
          }];
        });
        haptics.memberJoin();
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        const otherUsers = users.filter(u => u.user_id !== myUserIdRef.current);
        setPartnerConnected(otherUsers.length > 0);

        const onlineSet = new Set(users.map(u => u.user_id));
        onlineUsersRef.current = onlineSet;

        // Update member online status
        setMembers(prev => prev.map(m => ({
          ...m,
          isOnline: onlineSet.has(m.user_id),
        })));

        const total = users.length;
        setMemberCount(total);

        if (total > prevMemberCountRef.current) {
          haptics.memberJoin();
        }
        prevMemberCountRef.current = total;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const userId = myUserIdRef.current || await getUserId();
          await channel.track({ user_id: userId, joined_at: Date.now() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, isActive]);

  const recordSwipe = useCallback(async (restaurantId, direction) => {
    const userId = myUserIdRef.current;
    if (!userId || !sessionId) return { isMatch: false };

    if (direction === 'right') {
      myRightSwipesRef.current.add(restaurantId);
    }

    const { error } = await supabase.from('swipes').insert({
      session_id: sessionId,
      user_id: userId,
      restaurant_id: restaurantId,
      direction,
    });

    if (error) {
      console.error('Failed to record swipe:', error.message);
    }

    const voters = otherRightSwipes.get(restaurantId);
    const isMatch = direction === 'right' && voters && voters.size > 0;
    return { isMatch };
  }, [sessionId, otherRightSwipes]);

  const broadcastStart = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'session_start', payload: {} });
    }
  }, []);

  const clearPartnerMatch = useCallback(() => {
    setNewPartnerMatch(null);
  }, []);

  return {
    otherRightSwipes,
    partnerConnected,
    memberCount,
    members,
    newPartnerMatch,
    sessionStarted,
    broadcastStart,
    clearPartnerMatch,
    recordSwipe,
  };
}
