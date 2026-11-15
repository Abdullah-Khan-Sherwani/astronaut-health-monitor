// NASA DONKI space weather: solar energetic particle (SEP) events and coronal mass ejections (CME).
// Status cut-offs are this app's own rule (design, section 5.5).

const API = 'https://api.nasa.gov/DONKI';
const SNAPSHOT = 'src/space-weather-snapshot.json';
const CACHE_KEY = 'ahm.weather.v1';
const CACHE_MS = 6 * 3600e3;
const HOUR = 3600e3;
const ymd = ms => new Date(ms).toISOString().slice(0, 10);

export function donkiUrls(nowMs, apiKey, days = 30) {
  const range = `startDate=${ymd(nowMs - days * 24 * HOUR)}&endDate=${ymd(nowMs)}&api_key=${apiKey}`;
  return { sep: `${API}/SEP?${range}`, cme: `${API}/CME?${range}` };
}

// Never throws: the feed is external, so anything malformed is skipped.
export function parseDonki(raw) {
  const events = [];
  const take = (list, type, timeKey) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const time = item?.[timeKey];
      if (typeof time !== 'string' || Number.isNaN(Date.parse(time))) continue;
      events.push({
        type, time,
        link: typeof item.link === 'string' && item.link.startsWith('https://') ? item.link : null,
      });
    }
  };
  take(raw?.sep, 'sep', 'eventTime');
  take(raw?.cme, 'cme', 'startTime');
  return { fetchedAt: typeof raw?.fetchedAt === 'string' ? raw.fetchedAt : null, events };
}

export function summarize(weather, nowMs, speDemo) {
  if (speDemo) return { status: 'red', headline: 'Simulated solar particle event (demo)', events: [] };
  if (!weather || !Array.isArray(weather.events)) return { status: 'none', headline: 'Space weather unavailable', events: [] };
  const events = [...weather.events].sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  const within = (e, hours) => nowMs - Date.parse(e.time) <= hours * HOUR;
  const sep = events.filter(e => e.type === 'sep');
  let status = 'green', headline = 'No solar particle events in the last 7 days';
  if (sep.some(e => within(e, 48))) {
    status = 'red'; headline = 'Solar particle event detected in the last 48 hours';
  } else if (sep.some(e => within(e, 7 * 24))) {
    status = 'amber'; headline = 'Solar particle event detected in the last 7 days';
  }
  return { status, headline, events: events.slice(0, 5) };
}

// Cache, then the live feed with NASA's public demo key, then the saved snapshot.
export async function loadWeather({ fetchFn, storage, nowMs }) {
  try {
    const cached = JSON.parse(storage.getItem(CACHE_KEY));
    if (cached && nowMs - cached.savedAt < CACHE_MS && Array.isArray(cached.weather?.events)) {
      return { source: 'cache', weather: cached.weather };
    }
  } catch { /* no usable cache */ }

  try {
    const urls = donkiUrls(nowMs, 'DEMO_KEY');
    const [sepRes, cmeRes] = await Promise.all([fetchFn(urls.sep), fetchFn(urls.cme)]);
    if (sepRes.ok && cmeRes.ok) {
      const [sep, cme] = await Promise.all([sepRes.json(), cmeRes.json()]);
      if (Array.isArray(sep) && Array.isArray(cme)) {
        const weather = parseDonki({ fetchedAt: new Date(nowMs).toISOString(), sep, cme });
        try { storage.setItem(CACHE_KEY, JSON.stringify({ savedAt: nowMs, weather })); } catch { /* cache is optional */ }
        return { source: 'live', weather };
      }
    }
  } catch { /* offline or blocked: fall through to the snapshot */ }

  try {
    const res = await fetchFn(SNAPSHOT);
    if (res.ok) return { source: 'snapshot', weather: parseDonki(await res.json()) };
  } catch { /* snapshot missing */ }
  return { source: 'none', weather: null };
}
