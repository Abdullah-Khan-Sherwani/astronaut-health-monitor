import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES } from './nasa-data.js';
import { boneLossRange, radiation, exerciseMinutes, exerciseAvg, replyDelay, reminders } from './projections.js';

const profile = id => PROFILES.find(p => p.id === id);

test('bone loss follows 1-1.5% per 30 days and stops at day 180', () => {
  assert.deepEqual(boneLossRange(0), { minPct: 0, maxPct: 0, beyondData: false });
  assert.deepEqual(boneLossRange(120), { minPct: 4, maxPct: 6, beyondData: false });
  assert.deepEqual(boneLossRange(180), { minPct: 6, maxPct: 9, beyondData: false });
  assert.deepEqual(boneLossRange(200), { minPct: 6, maxPct: 9, beyondData: true });
});

test('radiation against the 600 mSv career limit', () => {
  assert.deepEqual(radiation(profile('iss'), 120),
    { cumulativeMsv: 54, projectedMsv: 81, pctOfLimit: 9, daysToLimit: 1214, status: 'green' });
  assert.deepEqual(radiation(profile('mars-surface'), 120),
    { cumulativeMsv: 330, projectedMsv: 635, pctOfLimit: 55, daysToLimit: 540, status: 'amber' });
  assert.equal(radiation(profile('mars-transit'), 120).status, 'green');   // 270 projected
  assert.equal(radiation(profile('mars-surface'), 660).status, 'red');     // 600 reached
  assert.equal(radiation(profile('mars-surface'), 660).daysToLimit, 0);
});

test('exercise minutes and 7-day average', () => {
  assert.equal(exerciseMinutes(['resistive', 'cardio', 'water']), 120);
  assert.equal(exerciseMinutes(undefined), 0);
  const done = { 1: ['resistive', 'cardio'], 2: ['cardio'], 3: [], 8: ['resistive', 'cardio'] };
  assert.equal(exerciseAvg(done, 8), 26);   // (120 + 60 + 0 + 0 + 0 + 0 + 0) / 7 = 25.7; day 8 excluded
});

test('reply delay wording per profile', () => {
  assert.deepEqual(replyDelay(profile('iss')), { roundTripSec: 0, text: 'Ground can answer in near real time.' });
  assert.deepEqual(replyDelay(profile('moon')), { roundTripSec: 2.6, text: 'A reply takes about 3 seconds.' });
  assert.deepEqual(replyDelay(profile('mars-surface')),
    { roundTripSec: 2400, text: 'A reply takes at least 40 minutes (20 each way). Start the onboard steps now.' });
});

test('reminders follow the task schedule', () => {
  assert.deepEqual(reminders(['checkin'], 11 * 60), { overdue: ['light', 'resistive'], next: 'water' });
  assert.deepEqual(reminders(undefined, 7 * 60), { overdue: [], next: 'checkin' });
  assert.deepEqual(reminders(['checkin', 'light', 'resistive', 'water', 'cardio', 'journal', 'winddown'], 23 * 60),
    { overdue: [], next: null });
});
