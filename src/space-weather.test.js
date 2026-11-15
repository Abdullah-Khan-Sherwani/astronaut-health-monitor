import test from 'node:test';
import assert from 'node:assert/strict';
import { donkiUrls, parseDonki, summarize, loadWeather } from './space-weather.js';

const NOW = Date.parse('2026-11-15T12:00Z');
const hoursAgo = h => new Date(NOW - h * 3600e3).toISOString().slice(0, 16) + 'Z';
const raw = (sepHours, cmeHours) => ({
  fetchedAt: new Date(NOW).toISOString(),
  sep: sepHours.map(h => ({ sepID: 'x', eventTime: hoursAgo(h), link: 'https://example.org/sep' })),
  cme: cmeHours.map(h => ({ activityID: 'y', startTime: hoursAgo(h), link: 'https://example.org/cme' })),
});
const status = (sep, cme, demo = false) => summarize(parseDonki(raw(sep, cme)), NOW, demo).status;

test('request URLs cover the last 30 days in UTC', () => {
  const u = donkiUrls(NOW, 'DEMO_KEY');
  assert.equal(u.sep, 'https://api.nasa.gov/DONKI/SEP?startDate=2026-10-16&endDate=2026-11-15&api_key=DEMO_KEY');
  assert.equal(u.cme, 'https://api.nasa.gov/DONKI/CME?startDate=2026-10-16&endDate=2026-11-15&api_key=DEMO_KEY');
});

test('status rules from spec 5.5', () => {
  assert.equal(status([24], []), 'red');             // particle event within 48 h
  assert.equal(status([120], []), 'amber');          // within 7 days
  assert.equal(status([200], []), 'green');
  assert.equal(status([], [24]), 'green');           // coronal mass ejections are listed, not alerted on
  assert.equal(status([], []), 'green');
  assert.equal(summarize(null, NOW, false).status, 'none');
});

test('demo switch forces a clearly labelled alert', () => {
  const s = summarize(parseDonki(raw([], [])), NOW, true);
  assert.equal(s.status, 'red');
  assert.match(s.headline, /Simulated/);
});

test('coronal mass ejections appear in the event list', () => {
  const s = summarize(parseDonki(raw([], [10, 30])), NOW, false);
  assert.deepEqual(s.events.map(e => e.type), ['cme', 'cme']);
  assert.equal(s.events[0].link, 'https://example.org/cme');
});

test('malformed input never throws', () => {
  for (const bad of [null, {}, { sep: 'oops', cme: 7 }, { sep: [null, { eventTime: 'not a date' }, 3], cme: [{}] }]) {
    assert.deepEqual(parseDonki(bad).events, []);
  }
  const s = summarize(parseDonki(raw([10, 30, 50, 70, 90, 110, 130], [])), NOW, false);
  assert.equal(s.events.length, 5);
  assert.ok(Date.parse(s.events[0].time) > Date.parse(s.events[1].time));
});

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), m }; };
const ok = body => ({ ok: true, status: 200, json: async () => body });
const fail = code => ({ ok: false, status: code, json: async () => ({ error: {} }) });

test('live, then cache, then snapshot, then none', async () => {
  const storage = memory();
  let calls = [];
  const live = async url => { calls.push(url); return ok(url.includes('/SEP') ? raw([24], []).sep : []); };
  const a = await loadWeather({ fetchFn: live, storage, nowMs: NOW });
  assert.equal(a.source, 'live');
  assert.equal(summarize(a.weather, NOW, false).status, 'red');
  assert.equal(calls.length, 2);
  assert.ok(calls.every(u => u.includes('api_key=DEMO_KEY')));

  calls = [];
  const b = await loadWeather({ fetchFn: live, storage, nowMs: NOW + 3600e3 });
  assert.equal(b.source, 'cache');
  assert.equal(calls.length, 0);

  const limited = async url => url.startsWith('https://') ? fail(429) : ok(raw([120], []));
  const c = await loadWeather({ fetchFn: limited, storage: memory(), nowMs: NOW });
  assert.equal(c.source, 'snapshot');
  assert.equal(summarize(c.weather, NOW, false).status, 'amber');

  const offline = async () => { throw new TypeError('Failed to fetch'); };
  assert.deepEqual(await loadWeather({ fetchFn: offline, storage: memory(), nowMs: NOW }), { source: 'none', weather: null });

  const garbage = async url => url.startsWith('https://') ? ok({ error: 'x' }) : ok('nonsense');
  const d = await loadWeather({ fetchFn: garbage, storage: memory(), nowMs: NOW });
  assert.equal(summarize(d.weather, NOW, false).status === 'none' || d.weather.events.length === 0, true);
});
