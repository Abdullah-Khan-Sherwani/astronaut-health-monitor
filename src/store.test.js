import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, streak, weeklyCompletion } from './store.js';

const memory = (initial = {}) => {
  const m = new Map(Object.entries(initial));
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), m };
};
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };

test('fresh store shows the simulated demo state', () => {
  const s = createStore(memory()).get();
  assert.equal(s.day, 120);
  assert.equal(s.profileId, 'iss');
  assert.equal(s.hasCheckedInToday, false);
  assert.equal(s.entries[119].sys, 131);
  assert.deepEqual(streak(s.entries, 120), { current: 20, best: 97 });
  assert.deepEqual(weeklyCompletion(s.tasksDone, 120), { done: 35, total: 49 });
});

test('corrupt, old-shape or throwing storage falls back to the demo state', () => {
  for (const storage of [memory({ 'ahm.v1': '{not json' }), memory({ 'ahm.v1': '"a string"' }),
                         memory({ 'ahm.v1': '{"profileId":"pluto","entries":7}' }), throwing]) {
    const store = createStore(storage);
    assert.equal(store.get().profileId, 'iss');
    assert.equal(store.get().entries[119].sys, 131);
    assert.equal(store.saveEntry({ hr: 60 }).ok, true);     // still usable in memory
    assert.equal(store.get().entries[120].hr, 60);
  }
});

test('saveEntry validates, stores a partial entry, and extends the streak', () => {
  const storage = memory();
  const store = createStore(storage);
  assert.equal(store.saveEntry({ sys: 80, dia: 95 }).ok, false);
  assert.equal(store.get().hasCheckedInToday, false);
  assert.equal(store.saveEntry({ sys: 150, dia: 95, journal: 'tired' }).ok, true);
  const s = store.get();
  assert.deepEqual(s.entries[120], { sys: 150, dia: 95, journal: 'tired' });
  assert.ok(s.tasksDone[120].includes('checkin') && s.tasksDone[120].includes('journal'));
  assert.equal(streak(s.entries, 120).current, 21);
  assert.equal(createStore(storage).get().entries[120].sys, 150);   // survives reload
});

test('tasks, profile, demo flag and reset', () => {
  const storage = memory();
  const store = createStore(storage);
  store.toggleTask('water'); store.toggleTask('checkin'); store.toggleTask('nope');
  assert.deepEqual(store.get().tasksDone[120], ['water']);
  store.toggleTask('water');
  assert.deepEqual(store.get().tasksDone[120], []);
  assert.equal(store.setProfile('pluto'), false);
  assert.equal(store.setProfile('mars-surface'), true);
  store.saveEntry({ hr: 61 });
  assert.equal(store.get().profile.stayDays, 730);
  assert.equal(store.get().entries[120].hr, 61);            // entries survive a profile switch
  store.setSpeDemo(true);
  assert.equal(createStore(storage).get().speDemo, true);
  store.reset();
  assert.equal(store.get().profileId, 'iss');
  assert.equal(store.get().hasCheckedInToday, false);
});

test('symptoms are validated, stored for today and removable', () => {
  const storage = memory();
  const store = createStore(storage);
  assert.deepEqual(store.get().symptoms, []);
  assert.equal(store.addSymptom({ region: 'cabin', text: 'x', severity: 'mild' }).ok, false);
  assert.equal(store.addSymptom({ region: 'gut', text: 'Nausea after lunch', severity: 'mild' }).ok, true);
  assert.equal(store.addSymptom({ region: 'head', text: '<b>Headache</b>', severity: 'severe' }).ok, true);
  assert.equal(store.get().hasCheckedInToday, false);
  assert.deepEqual(createStore(storage).get().symptoms.map(s => s.region), ['gut', 'head']);
  assert.equal(store.get().symptoms[1].text, '<b>Headache</b>');   // stored as typed; screens render it as text
  store.removeSymptom(0); store.removeSymptom(9);
  assert.deepEqual(store.get().symptoms.map(s => s.region), ['head']);
  store.reset();
  assert.deepEqual(store.get().symptoms, []);
});
