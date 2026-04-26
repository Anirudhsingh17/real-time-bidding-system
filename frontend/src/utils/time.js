/**
 * Helper to ensure a date string is parsed as UTC.
 * If it doesn't have a timezone offset, appends 'Z'.
 */
function parseUTC(dateString) {
  if (!dateString) return new Date(NaN);
  let str = dateString;
  if (!str.includes('Z') && !str.includes('+') && !str.match(/-\d{2}:\d{2}$/)) {
    str += 'Z';
  }
  return new Date(str);
}

/**
 * Format a UTC ISO string as IST for display.
 * Goal: "25 Apr 2026, 03:30 PM IST"
 */
export function toIST(utcString) {
  const date = parseUTC(utcString);
  if (isNaN(date.getTime())) return '—';
  
  const day = new Intl.DateTimeFormat('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }).format(date);
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).format(date);
  const year = new Intl.DateTimeFormat('en-IN', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date);
  
  const timeStr = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(date);

  const parts = timeStr.split(/\s+/);
  const time = parts[0];
  const ampm = parts[1] || '';
  return `${day} ${month} ${year}, ${time} ${ampm.toUpperCase()} IST`;
}

/**
 * Format only the time portion in IST
 */
export function toISTTime(utcString) {
  const date = parseUTC(utcString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

let serverOffset = 0;

/**
 * Sync the local clock with the server time.
 */
export function syncServerTime(serverUtcSync) {
  const serverTime = new Date(serverUtcSync).getTime();
  const localTime = Date.now();
  serverOffset = serverTime - localTime;
  console.log(`[TimeSync] Server offset: ${serverOffset}ms`);
}

/**
 * Returns the current adjusted server time.
 */
export function getNow() {
  return new Date(Date.now() + serverOffset);
}

/**
 * Check if a time has passed.
 */
export function isExpired(utcString) {
  const date = parseUTC(utcString);
  if (isNaN(date.getTime())) return true;
  return date.getTime() <= getNow().getTime();
}

/**
 * Get seconds remaining.
 */
export function secondsUntil(utcString) {
  const date = parseUTC(utcString);
  if (isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((date.getTime() - getNow().getTime()) / 1000));
}

/**
 * Format seconds as HH:MM:SS
 */
export function formatCountdown(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Parses a local datetime-local string (YYYY-MM-DDTHH:mm) as IST.
 * Returns a UTC ISO string.
 */
export function parseLocalAsIST(localDateString) {
  if (!localDateString) return null;
  // Explode numbers to avoid browser interpretation
  const [datePart, timePart] = localDateString.split('T');
  const [y, mm, dd] = datePart.split('-').map(Number);
  const [h, m] = timePart.split(':').map(Number);
  
  // Create Date treat numbers as UTC
  const d = new Date(Date.UTC(y, mm - 1, dd, h, m));
  // Subtract 5.5 hours to move from IST numbers to real UTC
  d.setMinutes(d.getMinutes() - 330);
  return d.toISOString();
}

/**
 * Converts a UTC ISO string into a YYYY-MM-DDTHH:mm string in IST.
 * Suitable for <input type="datetime-local">.
 */
export function utctoISTLocal(utcString) {
  const date = parseUTC(utcString);
  if (isNaN(date.getTime())) return '';
  
  // Shift by 5.5 hours to get IST numbers
  const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  // Return YYYY-MM-DDTHH:mm
  return istTime.toISOString().slice(0, 16);
}
