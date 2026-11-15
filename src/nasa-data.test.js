import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSION_DAY, SOURCES, NASA, PROFILES, HAZARDS, TASKS } from './nasa-data.js';

test('NASA figures match the spec data sheet', () => {
  assert.equal(MISSION_DAY, 120);
  assert.deepEqual(NASA, {
    boneLossPctPerMonth: { min: 1, max: 1.5 }, boneLossValidDays: 180,
    sansEyeSwellingPct: 70, sunrisesPerDay: 16, exerciseMinPerDay: 120,
    careerLimitMsv: 600, speLimitMsv: 250, marsDelayMinOneWay: 20,
  });
});

test('mission profiles match spec 5.2', () => {
  const rows = PROFILES.map(p => [p.id, p.doseMsvPerDay, p.priorDoseMsv, p.stayDays, p.delaySecOneWay]);
  assert.deepEqual(rows, [
    ['iss', 0.45, 0, 180, 0],
    ['moon', 0.93, 0, 180, 1.3],
    ['mars-transit', 1.5, 0, 180, 1200],
    ['mars-surface', 0.5, 270, 730, 1200],
  ]);
});

test('every source is an https URL with a title', () => {
  for (const s of Object.values(SOURCES)) {
    assert.match(s.url, /^https:\/\//);
    assert.ok(s.title.length > 3);
  }
});

test('five hazards, each citing a known source', () => {
  assert.deepEqual(HAZARDS.map(h => h.id), ['radiation', 'isolation', 'distance', 'gravity', 'hostile']);
  for (const h of HAZARDS) assert.ok(SOURCES[h.source] && h.appResponse.length > 10, h.id);
  assert.deepEqual(HAZARDS.find(h => h.id === 'gravity').indicatorIds, ['bp', 'hr', 'vision', 'exercise']);
  assert.deepEqual(HAZARDS.find(h => h.id === 'isolation').indicatorIds, ['sleep', 'mood']);
  assert.deepEqual(HAZARDS.find(h => h.id === 'hostile').indicatorIds, ['temp', 'cabinCo2', 'cabinTemp']);
  assert.deepEqual(HAZARDS.find(h => h.id === 'radiation').indicatorIds, ['radiation']);
  assert.deepEqual(HAZARDS.find(h => h.id === 'distance').indicatorIds, []);
});

test('seven routine tasks; exercise adds up to NASA\'s two hours', () => {
  assert.deepEqual(TASKS.map(t => t.id), ['resistive', 'cardio', 'water', 'light', 'journal', 'winddown', 'checkin']);
  assert.equal(TASKS.reduce((n, t) => n + t.minutes, 0), NASA.exerciseMinPerDay);
  assert.deepEqual(TASKS.filter(t => t.auto).map(t => t.id), ['journal', 'checkin']);
  assert.deepEqual(Object.fromEntries(TASKS.map(t => [t.id, t.time])), {
    resistive: '10:00', cardio: '16:00', water: '12:30', light: '08:00',
    journal: '20:30', winddown: '21:30', checkin: '07:30',
  });
  for (const t of TASKS) assert.ok(SOURCES[t.source], t.id);
});
