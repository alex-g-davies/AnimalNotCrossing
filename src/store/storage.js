// The only module that touches localStorage. Every access is guarded, because
// private browsing, full disks and home-screen app quirks all throw.

const PREFIX = 'anc.';

export const KEYS = {
  settings: 'settings',
  game: 'game',
  stats: 'stats',
  seeds: 'seeds',
  cycles: 'cycles',
  climb: 'climb',
  feedback: 'feedback',
  next: 'next',
};

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // nothing to do
  }
}

// Everything we store, as one object (for export) and back (for import).
export function dumpAll() {
  const out = {};
  for (const key of Object.values(KEYS)) {
    const value = load(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

export function restoreAll(data) {
  for (const key of Object.values(KEYS)) {
    if (key in data) save(key, data[key]);
  }
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch {
    // ignore
  }
  return false;
}
