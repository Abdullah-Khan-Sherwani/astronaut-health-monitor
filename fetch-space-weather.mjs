// Saves a snapshot of NASA DONKI space weather for the app's offline fallback.
// Usage: npm run weather   (reads NASA_API_KEY or API_NASA_GOV_WEATHER from .env; falls back to NASA's public DEMO_KEY)
import { writeFile } from 'node:fs/promises';
import { donkiUrls } from './src/space-weather.js';

const envKey = process.env.NASA_API_KEY || process.env.API_NASA_GOV_WEATHER;
const personal = Boolean(envKey);
const key = envKey || 'DEMO_KEY';
// 60 days is the longest range the API accepts; the live call in the browser uses 30.
const urls = donkiUrls(Date.now(), key, 60);

async function get(name, url) {
  const res = await fetch(url);
  // The URL holds the key, so only the endpoint name and status are ever printed.
  if (!res.ok) throw new Error(`${name} request failed with HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error(`${name} response was not a list`);
  return body;
}

try {
  const [sep, cme] = await Promise.all([get('SEP', urls.sep), get('CME', urls.cme)]);
  await writeFile('src/space-weather-snapshot.json', JSON.stringify({ fetchedAt: new Date().toISOString(), sep, cme: cme.map(({ activityID, startTime, link }) => ({ activityID, startTime, link })) }, null, 1) + '\n');
  console.log(`Saved ${sep.length} solar particle events and ${cme.length} coronal mass ejections (key: ${personal ? 'personal' : 'demo'})`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
