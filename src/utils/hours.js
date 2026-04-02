// Parse Google Places regularOpeningHours and determine open/closed status

/**
 * Check if a restaurant is currently open based on Google Places hours data.
 * @param {object|null} hours - regularOpeningHours from Google Places API
 * @returns {{ isOpen: boolean|null, statusText: string|null }}
 *   isOpen = true/false/null (null means unknown/no data)
 */
export function isOpenNow(hours) {
  if (!hours || !hours.periods || hours.periods.length === 0) {
    return { isOpen: null, statusText: null };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const period of hours.periods) {
    if (!period.open) continue;

    // 24-hour place: has open but no close
    if (!period.close) {
      return { isOpen: true, statusText: 'Open 24 hours' };
    }

    const openDay = period.open.day;
    const openMin = period.open.hour * 60 + (period.open.minute || 0);
    const closeDay = period.close.day;
    const closeMin = period.close.hour * 60 + (period.close.minute || 0);

    // Same-day period
    if (openDay === closeDay) {
      if (currentDay === openDay && currentMinutes >= openMin && currentMinutes < closeMin) {
        return { isOpen: true, statusText: `Closes at ${formatTime(period.close)}` };
      }
    } else {
      // Overnight period (e.g., open Fri, close Sat)
      if (currentDay === openDay && currentMinutes >= openMin) {
        return { isOpen: true, statusText: `Closes at ${formatTime(period.close)}` };
      }
      if (currentDay === closeDay && currentMinutes < closeMin) {
        return { isOpen: true, statusText: `Closes at ${formatTime(period.close)}` };
      }
    }
  }

  // Not in any open period — find next opening
  const nextOpen = findNextOpen(hours.periods, currentDay, currentMinutes);
  return { isOpen: false, statusText: nextOpen };
}

function findNextOpen(periods, currentDay, currentMinutes) {
  let best = null;
  let bestDelta = Infinity;

  for (const period of periods) {
    if (!period.open) continue;
    const openDay = period.open.day;
    const openMin = period.open.hour * 60 + (period.open.minute || 0);

    let dayDelta = openDay - currentDay;
    if (dayDelta < 0) dayDelta += 7;
    if (dayDelta === 0 && openMin <= currentMinutes) dayDelta = 7;

    const totalDelta = dayDelta * 1440 + (openMin - currentMinutes);
    if (totalDelta < bestDelta) {
      bestDelta = totalDelta;
      best = period.open;
    }
  }

  if (!best) return null;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const bestDay = best.day;
  const dayDelta = (bestDay - currentDay + 7) % 7 || (best.hour * 60 + (best.minute || 0) > currentMinutes ? 0 : 7);

  if (dayDelta === 0) {
    return `Opens at ${formatTime(best)}`;
  } else if (dayDelta === 1) {
    return `Opens tomorrow ${formatTime(best)}`;
  }
  return `Opens ${dayNames[bestDay]} ${formatTime(best)}`;
}

function formatTime({ hour, minute }) {
  const m = minute || 0;
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return m === 0 ? `${h} ${period}` : `${h}:${m.toString().padStart(2, '0')} ${period}`;
}
