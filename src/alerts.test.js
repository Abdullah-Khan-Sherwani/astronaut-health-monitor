import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.js';
import { indicatorStates, regionStatuses, buildAlerts, needsAttention, buildReport, buildCsv } from './alerts.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
const fresh = () => createStore(memory());

test('demo state: head red; heart, bones and cabin amber; rest green', () => {
  const state = fresh().get();
  const r = regionStatuses(state, null);
  assert.deepEqual(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.status])),
    { head: 'red', eyes: 'green', heart: 'amber', gut: 'green', bones: 'amber', body: 'green', cabin: 'amber' });
  const s = indicatorStates(state, null);
  assert.equal(s.bp.display, '131/82 mmHg');
  assert.equal(s.bp.day, 119);
  assert.ok(s.bp.delta > 10);                       // well above this wearer's own 14-day average
  assert.equal(s.cabinCo2.display, '3.4 mmHg');
  assert.equal(s.exercise.display, '60 min/day');
  assert.equal(s.exercise.delta, null);
  assert.equal(s.radiation.display, '54 of 600 mSv');
});

test('alerts are sorted, escalated and include the check-in reminder', () => {
  const alerts = buildAlerts(fresh().get(), null);
  assert.deepEqual(alerts.map(a => [a.id, a.status, a.escalation]), [
    ['sleep', 'red', 'surgeon'], ['mood', 'red', 'surgeon'],
    ['bp', 'amber', 'crew'],            // amber on days 116-119, four days running
    ['cabinCo2', 'amber', 'self'],      // above 3 mmHg on days 118-119, two days
    ['exercise', 'amber', 'self'],
    ['checkin', 'info', 'none'],
  ]);
  assert.equal(needsAttention(alerts), 5);
  assert.equal(alerts[0].delayText, 'Ground can answer in near real time.');
  assert.equal(alerts[2].delayText, null);
  for (const a of alerts) assert.ok(a.title && a.detail && a.source.url.startsWith('https://'), a.id);
});

test('a red reading today, Mars profile and a storm change the picture', () => {
  const store = fresh();
  store.setProfile('mars-surface');
  store.saveEntry({ sys: 150, dia: 95 });           // partial check-in: only blood pressure
  const state = store.get();
  const storm = { status: 'red', headline: 'Solar particle event in progress', events: [] };
  const alerts = buildAlerts(state, storm);
  assert.equal(alerts.find(a => a.id === 'bp').status, 'red');
  assert.match(alerts.find(a => a.id === 'bp').delayText, /40 minutes/);
  assert.equal(alerts.find(a => a.kind === 'weather').status, 'red');
  assert.equal(alerts.some(a => a.id === 'checkin'), false);
  assert.equal(regionStatuses(state, storm).body.status, 'red');
  assert.equal(regionStatuses(state, null).body.status, 'amber');   // projected 635 mSv
  assert.equal(indicatorStates(state, null).sleep.day, 119);        // skipped today, latest still shown
});

test('report is plain text with no holes', () => {
  const state = fresh().get();
  const alerts = buildAlerts(state, null);
  const report = buildReport(state, alerts);
  assert.match(report, /Mission day 120/);
  assert.match(report, /ISS/);
  assert.match(report, /SIMULATED DATA/);
  for (const a of alerts.filter(a => a.status !== 'info')) assert.ok(report.includes(a.title), a.id);
  assert.doesNotMatch(report, /undefined|null|NaN|\[object/);
});

test('symptoms on the body map raise the region and appear as alerts', () => {
  const store = fresh();
  store.addSymptom({ region: 'gut', text: 'Nausea after lunch', severity: 'mild' });
  store.addSymptom({ region: 'eyes', text: 'Sudden blur in left eye', severity: 'severe' });
  const state = store.get();
  const r = regionStatuses(state, null);
  assert.equal(r.gut.status, 'amber');
  assert.equal(r.eyes.status, 'red');
  assert.equal(r.gut.symptoms.length, 1);
  const alerts = buildAlerts(state, null);
  const eye = alerts.find(a => a.id === 'symptom-1');
  assert.deepEqual([eye.kind, eye.status, eye.escalation], ['symptom', 'red', 'surgeon']);
  assert.ok(eye.detail.includes('Sudden blur in left eye'));
  const gut = alerts.find(a => a.id === 'symptom-0');
  assert.deepEqual([gut.status, gut.escalation], ['amber', 'self']);
  assert.equal(needsAttention(alerts), 7);
  assert.ok(buildReport(state, alerts).includes('Sudden blur in left eye'));
});

test('CSV export of the health record', () => {
  const store = fresh();
  let lines = buildCsv(store.get()).split('\n');
  assert.equal(lines[0], 'day,sys,dia,hr,glucose,temp,sleep,mood,vision,cabinCo2,cabinTemp');
  assert.equal(lines.length, 118);                                  // header + 117 days with entries
  assert.ok(lines.at(-1).startsWith('119,131,82,'));
  store.saveEntry({ hr: 60, journal: 'private, with a comma' });
  lines = buildCsv(store.get()).split('\n');
  assert.equal(lines.at(-1), '120,,,60,,,,,,,');
});
