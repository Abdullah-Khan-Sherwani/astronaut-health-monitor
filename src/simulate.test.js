import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './simulate.js';
import { classify, valueOf } from './rules.js';
import { exerciseAvg } from './projections.js';

const CHECKIN = ['bp', 'hr', 'glucose', 'temp', 'sleep', 'mood', 'vision', 'cabinCo2', 'cabinTemp'];
const EPISODE = d => (d >= 84 && d <= 86) || (d >= 112 && d <= 119);

test('deterministic, days 1-119, with the two missed check-ins', () => {
  const a = simulate(), b = simulate();
  assert.deepEqual(a, b);
  assert.equal(Object.keys(a.entries).length, 117);
  for (const d of [98, 99, 120]) assert.equal(a.entries[d], undefined);
  assert.ok(a.entries[1] && a.entries[119]);
});

test('ordinary days are green on every indicator', () => {
  const { entries } = simulate();
  for (const [day, e] of Object.entries(entries)) {
    if (EPISODE(+day)) continue;
    for (const id of CHECKIN) assert.equal(classify(id, valueOf(e, id)), 'green', `day ${day} ${id}`);
  }
});

test('scripted episodes match spec section 7', () => {
  const { entries, tasksDone } = simulate();
  assert.deepEqual([84, 85, 86].map(d => entries[d].temp), [37.6, 38.3, 37.5]);
  assert.deepEqual([112, 113, 114, 115, 116, 117, 118, 119].map(d => entries[d].sleep),
    [6.6, 6.4, 6.5, 6.2, 6.3, 6.0, 5.9, 5.8]);
  assert.deepEqual([112, 113, 114, 115, 116, 117, 118, 119].map(d => entries[d].mood), [3, 3, 3, 3, 2, 3, 2, 2]);
  assert.deepEqual([116, 117, 118, 119].map(d => [entries[d].sys, entries[d].dia]),
    [[124, 78], [127, 79], [129, 81], [131, 82]]);
  assert.deepEqual([117, 118, 119].map(d => entries[d].cabinCo2 > 3), [false, true, true]);
  assert.deepEqual([118, 119].map(d => entries[d].cabinCo2), [3.2, 3.4]);
  assert.ok(!tasksDone[118].includes('resistive') && !tasksDone[118].includes('cardio'));
  assert.ok(!tasksDone[114].includes('resistive') && tasksDone[114].includes('cardio'));
  assert.ok(!tasksDone[98].includes('checkin') && tasksDone[98].includes('water'));
  assert.equal(tasksDone[50].length, 7);
  assert.equal(exerciseAvg(tasksDone, 120), 60);
});
