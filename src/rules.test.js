import test from 'node:test';
import assert from 'node:assert/strict';
import { INDICATORS, REGIONS, CHECKIN_STEPS } from './indicators.js';
import { classify, valueOf, validateEntry, validateSymptom, baselineDelta, latest, flaggedRun, escalation, worst } from './rules.js';

const cases = {
  bp: [[{ sys: 119, dia: 79 }, 'green'], [{ sys: 120, dia: 79 }, 'amber'], [{ sys: 119, dia: 80 }, 'amber'],
       [{ sys: 139, dia: 89 }, 'amber'], [{ sys: 140, dia: 70 }, 'red'], [{ sys: 118, dia: 90 }, 'red'],
       [{ sys: 89, dia: 70 }, 'red'], [{ sys: 100, dia: 59 }, 'red']],
  hr: [[40, 'green'], [100, 'green'], [101, 'amber'], [120, 'amber'], [121, 'red'], [39, 'red']],
  glucose: [[70, 'green'], [99, 'green'], [100, 'amber'], [125, 'amber'], [126, 'red'], [69, 'red']],
  temp: [[36.1, 'green'], [37.2, 'green'], [37.3, 'amber'], [38.0, 'amber'], [38.1, 'red'], [36.0, 'amber']],
  sleep: [[7, 'green'], [6.9, 'amber'], [6, 'amber'], [5.9, 'red']],
  mood: [[5, 'green'], [4, 'green'], [3, 'amber'], [2, 'red'], [1, 'red']],
  vision: [['none', 'green'], ['slight', 'amber'], ['marked', 'red']],
  cabinCo2: [[3.0, 'green'], [3.1, 'amber'], [4.5, 'amber'], [4.6, 'red']],
  cabinTemp: [[20, 'green'], [25, 'green'], [19.9, 'amber'], [18, 'amber'], [25.1, 'amber'], [27, 'amber'], [17.9, 'red'], [27.1, 'red']],
  exercise: [[120, 'green'], [119, 'amber'], [60, 'amber'], [59, 'red']],
};
for (const [id, rows] of Object.entries(cases)) {
  test(`classify ${id} at every boundary in spec 5.3`, () => {
    for (const [value, expected] of rows) assert.equal(classify(id, value), expected, JSON.stringify(value));
  });
}

test('missing values classify as none', () => {
  for (const id of ['bp', 'hr', 'vision']) {
    assert.equal(classify(id, undefined), 'none');
    assert.equal(classify(id, null), 'none');
  }
  assert.equal(valueOf({ sys: 120 }, 'bp'), undefined);
  assert.deepEqual(valueOf({ sys: 120, dia: 80 }, 'bp'), { sys: 120, dia: 80 });
});

test('indicator metadata is complete', () => {
  assert.deepEqual(INDICATORS.map(i => i.id),
    ['bp', 'hr', 'glucose', 'temp', 'sleep', 'mood', 'vision', 'cabinCo2', 'cabinTemp', 'exercise', 'radiation']);
  assert.deepEqual(CHECKIN_STEPS.flat(), INDICATORS.filter(i => !i.derived).map(i => i.id));
  assert.deepEqual(REGIONS.filter(r => !r.bodyPart).map(r => r.id), ['cabin']);
  for (const i of INDICATORS) {
    assert.match(i.source.url, /^https:\/\//, i.id);
    assert.ok(i.why && i.howTo.length && i.actions.amber.length && i.actions.red.length, i.id);
    assert.ok(REGIONS.some(r => r.id === i.region && r.indicatorIds.includes(i.id)), i.id);
  }
  for (const id of ['hr', 'sleep', 'mood', 'vision', 'exercise']) {
    assert.match(INDICATORS.find(i => i.id === id).appRuleNote, /this app's own rule/);
  }
});

test('validateEntry accepts a partial entry and rejects nonsense', () => {
  assert.deepEqual(validateEntry({ hr: '58', sleep: 7.5 }), { ok: true, entry: { hr: 58, sleep: 7.5 } });
  assert.equal(validateEntry({}).ok, false);
  assert.ok(validateEntry({ sys: 80, dia: 95 }).errors.dia);      // dia must be below sys
  assert.ok(validateEntry({ sys: 120 }).errors.dia);              // both or neither
  assert.ok(validateEntry({ hr: -5 }).errors.hr);
  assert.ok(validateEntry({ hr: 'abc' }).errors.hr);
  assert.ok(validateEntry({ temp: 50 }).errors.temp);
  assert.ok(validateEntry({ mood: 2.5 }).errors.mood);
  assert.ok(validateEntry({ vision: 'x' }).errors.vision);
  assert.ok(validateEntry({ hr: 60, journal: 'a'.repeat(2001) }).errors.journal);
  assert.deepEqual(validateEntry({ hr: 60, journal: '  ok  ', extra: 1 }), { ok: true, entry: { hr: 60, journal: 'ok' } });
  assert.deepEqual(validateEntry({ cabinCo2: '3.4' }), { ok: true, entry: { cabinCo2: 3.4 } });
  assert.ok(validateEntry({ cabinTemp: 80 }).errors.cabinTemp);
});

test('validateSymptom', () => {
  assert.deepEqual(validateSymptom({ region: 'head', text: '  Headache behind the eyes ', severity: 'moderate' }),
    { ok: true, symptom: { region: 'head', text: 'Headache behind the eyes', severity: 'moderate' } });
  assert.ok(validateSymptom({ region: 'cabin', text: 'x', severity: 'mild' }).errors.region);
  assert.ok(validateSymptom({ region: 'head', text: '   ', severity: 'mild' }).errors.text);
  assert.ok(validateSymptom({ region: 'head', text: 'a'.repeat(201), severity: 'mild' }).errors.text);
  assert.ok(validateSymptom({ region: 'head', text: 'ache', severity: 'agony' }).errors.severity);
});

test('baselineDelta compares the latest reading with the wearer\'s own 14-day average', () => {
  const entries = {};
  for (let d = 1; d <= 14; d++) entries[d] = { hr: 60, sys: 110, dia: 70, vision: 'none' };
  entries[15] = { hr: 72, sys: 131, dia: 82, vision: 'slight' };
  assert.equal(baselineDelta(entries, 'hr', 15), 12);
  assert.equal(baselineDelta(entries, 'bp', 15), 21);
  assert.equal(baselineDelta(entries, 'vision', 15), null);
  assert.equal(baselineDelta(entries, 'exercise', 15), null);
  assert.equal(baselineDelta({ 1: { hr: 60 }, 2: { hr: 60 }, 3: { hr: 70 } }, 'hr', 3), null);   // only 2 earlier values
  assert.equal(baselineDelta(entries, 'glucose', 15), null);                                      // never recorded
});

test('latest, flaggedRun, escalation, worst', () => {
  const entries = { 1: { sleep: 8 }, 2: { sleep: 6.5 }, 3: { sleep: 6.2 }, 4: { hr: 60 }, 5: { sleep: 5 } };
  assert.deepEqual(latest(entries, 'sleep', 4), { day: 3, value: 6.2 });
  assert.equal(latest(entries, 'glucose', 5), null);
  assert.equal(flaggedRun(entries, 'sleep', 3), 2);
  assert.equal(flaggedRun(entries, 'sleep', 5), 1);   // day 4 has no sleep value, so the run restarts
  assert.equal(escalation('green', 9), 'none');
  assert.equal(escalation('none', 0), 'none');
  assert.equal(escalation('amber', 2), 'self');
  assert.equal(escalation('amber', 3), 'crew');
  assert.equal(escalation('red', 1), 'surgeon');
  assert.equal(worst(['green', 'none', 'amber']), 'amber');
  assert.equal(worst(['none', 'none']), 'none');
  assert.equal(worst([]), 'none');
});
