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
  const myRightSwipesRef = useRef(new Set());
  const myUserIdRef = useRef(null);
  const channelRef = useRef(null);
  const prevMemberCountRef = useRef(1);

  useEffect(() => {
    getUserId().then(id => { myUserIdRef.current = id; });
  }, []);

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

  // Subscribe to realtime swipes + presence
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
        if (!swipe || swipe.user_id === myUserIdRef.current) return;

        if (swipe.direction === 'right') {
          setOtherRightSwipes(prev => {
            const next = new Map(prev);
            if (!next.has(swipe.restaurant_id)) {
              next.set(swipe.restaurant_id, new Set());
            }
            next.get(swipe.restaurant_id).add(swipe.user_id);
            return next;
          });

          // Check if I also swiped right → it's a match
          if (myRightSwipesRef.current.has(swipe.restaurant_id)) {
            setNewPartnerMatch(swipe.restaurant_id);
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        const otherUsers = users.filter(u => u.user_id !== myUserIdRef.current);
        setPartnerConnected(otherUsers.length > 0);
        const total = users.length;
        setMemberCount(total);

        // Haptic when new member joins
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

  // Record a swipe to the database
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

    // Check if any other member already swiped right on this
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
    newPartnerMatch,
    sessionStarted,
    broadcastStart,
    clearPartnerMatch,
    recordSwipe,
  };
}
