import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getUserId } from '../utils/supabase';

export function useRealtimeSwipes(sessionId, isActive) {
  const [partnerRightSwipes, setPartnerRightSwipes] = useState(new Set());
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [newPartnerMatch, setNewPartnerMatch] = useState(null); // restaurant_id that just matched
  const myRightSwipesRef = useRef(new Set());
  const myUserIdRef = useRef(null);
  const channelRef = useRef(null);

  // Initialize user ID
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
      const partnerRight = new Set();

      for (const s of swipes) {
        if (s.direction !== 'right') continue;
        if (s.user_id === userId) {
          myRight.add(s.restaurant_id);
        } else {
          partnerRight.add(s.restaurant_id);
        }
      }

      myRightSwipesRef.current = myRight;
      setPartnerRightSwipes(partnerRight);
    }

    catchUp();
  }, [sessionId, isActive]);

  // Subscribe to realtime swipes + presence
  useEffect(() => {
    if (!sessionId || !isActive) return;

    const channel = supabase.channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'swipes',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const swipe = payload.new;
        if (!swipe || swipe.user_id === myUserIdRef.current) return;

        if (swipe.direction === 'right') {
          setPartnerRightSwipes(prev => {
            const next = new Set(prev);
            next.add(swipe.restaurant_id);
            return next;
          });

          // Check if I also swiped right on this restaurant
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

    // Check if partner already swiped right on this
    const isMatch = direction === 'right' && partnerRightSwipes.has(restaurantId);
    return { isMatch };
  }, [sessionId, partnerRightSwipes]);

  // Clear the match notification after it's been consumed
  const clearPartnerMatch = useCallback(() => {
    setNewPartnerMatch(null);
  }, []);

  return {
    partnerRightSwipes,
    partnerConnected,
    newPartnerMatch,
    clearPartnerMatch,
    recordSwipe,
  };
}
