# Nosh Pit — Testing Notes

Log of issues found during manual testing. Each item has a status so we can triage and fix together.

Status key: 🆕 new · 🔎 investigating · 🛠 fixing · ✅ fixed · 🚫 won't fix

---

## Session 1 — 2026-04-17

### 1. 🛠 Group name missing on invitee's landing screen
**Repro:** Create a group (e.g. "Formal Test"), share invite link, friend opens it.
**Observed:** Screen says *"You're in. Swipe the deck and find spots the group agrees on"* then prompts for nickname and starts swiping. The group name is never shown.
**Expected:** Group name ("Formal Test") should appear on the landing screen so the invitee knows what they're joining.
**Fix:** Creator now persists the group name to the DB on input blur and on Copy/Share, so joiners see the name as soon as the creator has set it. `GroupLinkScreen` calls `onGroupNameCommit` via the new `updateGroupName` exported from `useSession`.

### 2. 🛠 Group name pill doesn't update for partner until creator swipes; "2" suffix still appended
**Repro:** Creator shares invite. Partner opens link and starts swiping *before* creator begins.
**Observed:**
- Partner's top pill doesn't show the group name until the creator starts swiping.
- Once it does appear, the group name has a trailing "2" appended.

**Expected:** Group name should be present immediately on join, and should render without the "2" suffix.
**Fix:** Name now lands in the DB on blur (per #1), so the realtime `UPDATE` fires before the creator starts swiping. The member-count suffix was removed from the pill — tap it to open the members panel for the count.

### 3. 🛠 Match notifications interrupt users mid-swipe
**Repro:** User A is looking at restaurant X. User B swipes right on restaurant Y, which User A had previously swiped right on. Both users get the same prominent match notification.
**Observed:** The user who *didn't just swipe* gets a disruptive notification for a restaurant that isn't on their current card.
**Proposed:**
- The swiper who completed the match gets the prominent notification.
- Other group members get a quieter indicator near the matches tray (e.g. badge bump, subtle toast) rather than a center-screen interruption.

**Fix:** The big `MatchNotification` now only fires for the user whose own swipe completed the match. Partner-triggered matches add to the tray (which plays its `matchPop` animation on the new thumbnail) and fire a haptic — no center-screen overlay.

### 4. 🛠 No way to end a session after leaving the app
**Repro:** Solo or group — reach lock-in, tap "View on Google Maps" or "Call restaurant," return to Nosh Pit.
**Observed:** No affordance to end/close the session from the lock-in screen.
**Expected:** A clear "End session" / "Done" action on the lock-in screen (especially for the creator in group mode).
**Fix:** Added a bottom "Done" / "End session" button on the committed lock-in screen. Group creators get a confirm prompt; everyone's stored active-session entry is cleared so the home rejoin banner doesn't re-offer it.

### 5. 🛠 Match count desync between devices
**Repro:** Two devices in the same group, swiping concurrently.
**Observed:** One device shows 2 matches, the other shows 1. Not yet reproduced deterministically — need to capture steps.
**Next step:** Try to repro with timestamps on each swipe; check realtime subscription + `session_matches` view behavior.
**Fix (likely root cause):** `useRealtimeSwipes` was storing the newly matched restaurant in a single state slot (`newPartnerMatch`). React batches state updates, so two rapid realtime events would overwrite each other and the first match would be dropped. Replaced with `newPartnerMatches` (array) plus a `clearPartnerMatches()` drain that consumes the whole queue in App.jsx.

### 6. 🛠 Lock-in action buttons differ between creator and members (Dine In mode)
**Repro:** Group session with mode = "Dine In." Creator locks in a pick.
**Observed:**
- **Members see:** Delivery · Reservation · View on Google Maps
- **Creator sees:** Reservation · View on Google Maps · Call restaurant

**Expected:** Everyone should see the same buttons for the chosen mode. For Dine In specifically, Delivery shouldn't appear at all.
**Fix (parity):** Root cause was `mapDbRestaurant` in [useSession.js](src/hooks/useSession.js) dropping `phone`, `delivery`, `takeout`, `reservable`, `dineIn`, and `editorialSummary` when members loaded the deck from the DB. Creator kept these fields because their deck came straight from `useRestaurants.mapRestaurant`. Added the missing fields so both roles now see the same buttons.
**Still open:** Hiding Delivery for Dine-In specifically requires persisting the chosen experience (Pickup/Delivery/Dine In) on the session so members know which mode was selected. Deferred — not a correctness bug, just a refinement.

---

## How we'll work through this
1. Add new findings under the current session heading.
2. Triage together — decide order, any that are really one root cause.
3. Fix one at a time, flipping status as we go.
