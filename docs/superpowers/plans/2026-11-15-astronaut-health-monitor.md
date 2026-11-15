# Astronaut Health Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A six-screen static website where an astronaut records daily health indicators, sees which body system needs attention, and gets NASA-sourced guidance on what to do and whom to tell.

**Architecture:** Pure logic (thresholds, projections, simulated history, alerts, space weather, storage) lives in small ES modules under `src/` that run unchanged in Node and the browser and are covered by Node's built-in test runner. Screens are thin render functions over that logic, switched by a hash router in `src/app.js`. There is no backend and no build step.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Chart.js 4.4.7 (one vendored file), Node 25 `node --test`, browser `localStorage`, NASA DONKI API.

**Spec:** `docs/superpowers/specs/2026-11-15-astronaut-health-monitor-design.md`. Read it before any task. Section 5 is the data sheet; every number in this plan comes from it.

## Global Constraints

- Work on branch `feat/health-monitor`. Commit locally after each task. **Never push.**
- No npm dependencies. The only third-party code is `vendor/chart.umd.js` (Chart.js 4.4.7, MIT).
- Every number shown on screen comes from `src/nasa-data.js` or `src/indicators.js`, each with its source URL. No number is typed into a screen file.
- Any cut-off the spec marks "App rule" is shown with the words "this app's own rule" next to its source.
- Status vocabulary, exact: `green` → "OK" ✓, `amber` → "Watch" !, `red` → "Act now" ✕, `none` → "No data" –. Status is never colour alone.
- Every screen shows the label "Simulated data" and the footer "Prototype for NASA Space Apps 2026. Decision support only, not a medical diagnosis."
- The app must keep working with no network after its first load (spec section 11, "Distance from Earth").
- User-entered text is rendered with `textContent`, never `innerHTML`.
- The personal NASA API key lives only in a git-ignored `.env` and is read only by `fetch-space-weather.mjs`. Browser code uses the literal `DEMO_KEY`. Never print the key.
- No NASA logos, mission patches or mission identifiers. English only.
- Guidance text is limited to: measure again, a countermeasure listed in spec 5.1, or an escalation. No drug doses.
- Each new folder gets an `AGENTS.md` of a few lines (repo rule).
- Month = 30 days. Mission day is `MISSION_DAY = 120`; "today" is day 120.

## Review Focus

1. **Skipped check-in steps:** saving with only some readings must store the partial entry and show "No data" for the rest, not crash or show `undefined`. (Tests in Tasks 2, 5, 6.)
2. **Corrupt or unavailable `localStorage`:** bad JSON, an old shape, or a browser that throws on access must fall back to the simulated demo state. (Test in Task 5.)
3. **No network:** a rate limit (HTTP 429), a malformed body or offline venue wifi must fall back to the space-weather snapshot, then to "Space weather unavailable", never a blank screen; and a reload with no connection must still show the whole app. (Tests in Task 7; offline step in Task 8.)
4. **Nonsense readings:** diastolic above systolic, negative numbers, text in number fields, values outside spec 5.4 must be rejected with a message at the field. (Test in Task 2.)
5. **Opened by double-click (`file://`):** module scripts do not load; the page must show how to start a local server instead of a blank page. (Step in Task 8.)

## File Structure

```
index.html                     shell: top bar, nav, <main>, footer, file:// notice
sw.js                          service worker: network first, cache as fallback
styles.css                     design tokens and all styling
package.json                   "type": "module", test and serve scripts, no dependencies
.gitignore  .env.example
fetch-space-weather.mjs        Node script: personal key -> src/space-weather-snapshot.json
vendor/chart.umd.js            Chart.js 4.4.7        vendor/AGENTS.md
src/AGENTS.md
src/nasa-data.js               NASA figures, sources, mission profiles, hazards, routine tasks
src/indicators.js              indicator metadata: thresholds, copy, sources, regions
src/rules.js                   classify, validateEntry, validateSymptom, latest, runs, baseline, escalation
src/projections.js             bone-loss range, radiation, exercise average, reply delay, reminders
src/simulate.js                seeded 119-day history
src/store.js                   localStorage overlay on the simulation, streak, weekly ring
src/alerts.js                  region statuses, alert list, ground report text, CSV export
src/space-weather.js           parse DONKI, summarize, load with cache and fallback
src/space-weather-snapshot.json
src/ui.js                      h() element helper, statusBadge()
src/app.js                     hash router, top bar wiring
src/screen-home.js  screen-checkin.js  screen-trends.js
src/screen-alerts.js  screen-routine.js  screen-library.js
src/*.test.js                  one test file per logic module
docs/submission.md             form-field drafts, 7-slide outline, checklist
```

Run tests with `npm test` (which runs `node --test "src/*.test.js"`). Serve with `npm run serve` (`python3 -m http.server 8000`) and open `http://localhost:8000`.

---

### Task 1: Project setup and NASA data module

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `src/AGENTS.md`, `src/nasa-data.js`, `src/nasa-data.test.js`
- Modify: `AGENTS.md` line 9 and the "Project-specific rules" section

**Interfaces:**
- Produces, all exported from `src/nasa-data.js`:
  - `MISSION_DAY = 120`
  - `SOURCES: Record<string, {title: string, url: string}>` with keys `hazards, radiationHazard, isolation, distance, gravity, hostile, radiationBrief, co2Brief, eclssBrief, std3001, boneRisk, sansRisk, sleepRisk, cardioRisk, behaviorRisk, exercise, moonFacts, donki`
  - `NASA = { boneLossPctPerMonth: {min: 1, max: 1.5}, boneLossValidDays: 180, sansEyeSwellingPct: 70, sunrisesPerDay: 16, exerciseMinPerDay: 120, careerLimitMsv: 600, speLimitMsv: 250, marsDelayMinOneWay: 20 }`
  - `PROFILES: Array<{id, name, gravity, doseMsvPerDay, priorDoseMsv, stayDays, delaySecOneWay, doseSource}>` with the four rows of spec 5.2
  - `HAZARDS: Array<{id, name, summary, effects: string[], indicatorIds: string[], appResponse: string, source: string}>`, five entries, `source` is a key of `SOURCES`
  - `TASKS: Array<{id, label, time: 'HH:MM', minutes: number, why, source, auto: boolean}>`, seven entries

- [ ] **Step 1: Branch and scaffold**

```bash
git switch -c feat/health-monitor
```

Create `package.json` with `"name": "astronaut-health-monitor"`, `"private": true`, `"type": "module"`, and scripts `"test": "node --test \"src/*.test.js\""`, `"serve": "python3 -m http.server 8000"`, `"weather": "node --env-file-if-exists=.env fetch-space-weather.mjs"`. Create `.gitignore` containing `.DS_Store` and `.env`. Create `.env.example` containing `NASA_API_KEY=`. Create `src/AGENTS.md` (under 15 lines): logic modules are pure and take storage, fetch and time as arguments; screens hold no numbers; tests sit beside the module as `*.test.js`.

In `AGENTS.md` set line 9 to `- **Production with real users:** no` and under "Project-specific rules" add: static site, no build, no npm dependencies; run `npm test`; never push from an agent session; the spec and plan are in `docs/superpowers/`.

- [ ] **Step 2: Write the failing test** in `src/nasa-data.test.js`

```js
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
```

- [ ] **Step 3: Run it** with `npm test`. Expected: FAIL, cannot find module `nasa-data.js`.

- [ ] **Step 4: Implement `src/nasa-data.js`**

URLs for `SOURCES` are in spec 5.1; `donki` is `https://ccmc.gsfc.nasa.gov/tools/DONKI/`, `std3001` is `https://www.nasa.gov/reference/nasa-std-3001v1/`, and `cardioRisk`, `behaviorRisk` are `https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/` and `https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/`. Hazard `summary` and `effects` paraphrase only what the hazard pages say (research notes are in the spec's source list): radiation → cancer risk, nervous-system damage, altered cognition and motor function; isolation → sleep loss, body-clock disruption, work overload, mood; distance → 20-minute delay, self-sufficiency, menu fatigue; gravity → bone and muscle loss, fluid shift to the head affecting vision, dizziness, fainting on return to gravity, kidney-stone risk from dehydration; hostile → raised stress hormones, immune changes, microbes spreading more easily, and cabin temperature, pressure, light and noise as things to monitor. Each hazard's `appResponse` is the "App response" cell for that hazard in spec section 11. Task `minutes` are 60, 60, 0, 0, 0, 0, 0. Task sources: `exercise`, `exercise`, `gravity`, `sleepRisk`, `behaviorRisk`, `sleepRisk`, `hazards`.

- [ ] **Step 5: Run `npm test`.** Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore .env.example AGENTS.md src/AGENTS.md src/nasa-data.js src/nasa-data.test.js docs/superpowers
git commit -m "feat: project setup and NASA data module"
```

---

### Task 2: Indicators, classification and validation

**Files:**
- Create: `src/indicators.js`, `src/rules.js`, `src/rules.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces from `src/indicators.js`:
  - `INDICATORS: Array<{id, label, unit, region, derived: boolean, why, howTo: string[], actions: {amber: string[], red: string[]}, source: {title, url}, appRuleNote: string | null}>` with ids in this order: `bp, hr, glucose, temp, sleep, mood, vision, cabinCo2, cabinTemp, exercise, radiation`. The first nine have `derived: false` and are entered in the check-in.
  - `CHECKIN_STEPS = [['bp'], ['hr'], ['glucose'], ['temp'], ['sleep'], ['mood'], ['vision'], ['cabinCo2', 'cabinTemp']]` (the two cabin readings share one step)
  - `REGIONS: Array<{id, label, indicatorIds, bodyPart: boolean}>`: `head` [sleep, mood], `eyes` [vision], `heart` [bp, hr], `gut` [glucose], `bones` [exercise], `body` [temp, radiation], `cabin` [cabinCo2, cabinTemp]. `bodyPart` is false only for `cabin`.
  - `SEVERITY_STATUS = { mild: 'amber', moderate: 'amber', severe: 'red' }`
  - `STATUS_LABEL = { green: 'OK', amber: 'Watch', red: 'Act now', none: 'No data' }`
- Produces from `src/rules.js`:
  - `classify(id: string, value: unknown): 'green' | 'amber' | 'red' | 'none'`. Value is `{sys, dia}` for `bp`, a string for `vision`, a number otherwise. Missing value → `'none'`. Does not handle `radiation`.
  - `valueOf(entry: object | undefined, id: string): unknown` (for `bp` returns `{sys, dia}` only when both are present)
  - `validateEntry(raw: object): {ok: true, entry: object} | {ok: false, errors: Record<string, string>}`
  - `validateSymptom(raw: object): {ok: true, symptom: {region, text, severity}} | {ok: false, errors: Record<string, string>}` (region must be a `REGIONS` id with `bodyPart: true`)
  - `baselineDelta(entries, id: string, day: number): number | null` (latest value minus the mean of the values on the 14 days before it, rounded to 1 decimal; `bp` uses systolic; `null` for `vision`, for derived indicators, or when fewer than 3 earlier values exist)
  - `latest(entries: Record<number, object>, id: string, day: number): {day: number, value: unknown} | null`
  - `flaggedRun(entries, id, day): number` (consecutive days, counting back from the latest day that has a value, whose status is amber or red; a day with no value ends the run)
  - `escalation(status, runDays: number): 'none' | 'self' | 'crew' | 'surgeon'`
  - `worst(statuses: string[]): 'green' | 'amber' | 'red' | 'none'` (red > amber > green > none)

- [ ] **Step 1: Write the failing tests** in `src/rules.test.js`

```js
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
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, cannot find `indicators.js`.

- [ ] **Step 3: Implement `src/indicators.js`**

Thresholds and sources are spec 5.3. Keep each indicator's bands as data beside its copy so `classify` reads them from here. Validation ranges (spec 5.4) also live here as `range: {min, max, step}` per numeric field, because the check-in form reuses them as `min`/`max`/`step` attributes. Copy to write, per indicator:

| id | `why` (one sentence, paraphrasing) | `howTo` | `actions.amber` | `actions.red` |
|---|---|---|---|---|
| bp | NASA: weightlessness changes circulation; low pressure raises fainting risk at landing | sit and rest 5 min; cuff on bare upper arm at heart level; stay still | measure again after 5 min rest; keep up exercise and fluids | measure again after 5 min rest; tell the crew medical officer and contact the flight surgeon |
| hr | NASA: heart and vessels adapt to weightlessness; rhythm changes are a named risk | rest 5 min; read the monitor or count pulse for 60 s | rest and measure again in 15 min | measure again; tell the crew medical officer and contact the flight surgeon |
| glucose | the challenge lists blood sugar as an indicator; NASA lists inadequate nutrition as a risk | before eating; clean fingertip; apply drop to strip | eat your scheduled meals; measure again tomorrow before eating | below 70: take 15 g of fast-acting carbohydrate and re-measure after 15 min; contact the flight surgeon |
| temp | NASA: immune changes and easier spread of microbes in a closed habitat | thermometer under the tongue until it signals | measure again in 1 hour; rest and drink fluids | measure again; tell the crew medical officer and contact the flight surgeon |
| sleep | NASA: 16 sunrises a day disrupt the body clock; sleep loss lowers performance | enter hours actually asleep last night | use the bright-light period and wind-down time; avoid shifting bedtime | tell the crew medical officer; ask the flight surgeon about your schedule |
| mood | NASA: isolation and confinement can bring anxiety and low mood | choose the number that fits today overall | write a journal entry; contact family; spend time at a window or with the plants | tell the crew medical officer and contact the flight surgeon |
| vision | NASA: fluid shifts toward the head; about 70% of ISS astronauts have eye swelling | cover one eye at a time and read a familiar label | report it at the next ground contact; re-check tomorrow | contact the flight surgeon now for an eye exam |
| cabinCo2 | NASA limits cabin CO2 to a 1-hour average of 3 mmHg; crews have reported headaches from 2.8 mmHg | read the 1-hour average from the cabin air monitor | move to a well-ventilated spot; check that air is flowing at your sleep station | tell the crew; check the CO2 removal system; contact the flight surgeon |
| cabinTemp | NASA's crew health limits are 18–27 °C, with 20–25 °C for comfort and performance | read the cabin thermometer away from equipment | adjust the cabin temperature setting; re-check in 1 hour | tell the crew; check the thermal control system; contact ground |
| exercise | NASA: bones lose 1–1.5% density a month without loading; crews exercise about 2 hours a day | (derived from routine tasks) | complete both exercise blocks today | tell the crew medical officer; plan make-up sessions with the flight surgeon |
| radiation | NASA limits career dose to 600 mSv and 250 mSv per solar particle event | (read from the dosimeter; simulated here) | review projected dose with the flight surgeon | move to the shelter area; contact the flight surgeon |

`appRuleNote` text for hr: "Above 120 as the red cut-off is this app's own rule." Write the others in the same form from the "App rule" notes in spec 5.3; `null` where the spec gives none.

- [ ] **Step 4: Implement `src/rules.js`** to the signatures above. `validateEntry` coerces numeric strings with `Number`, keeps only known fields, trims `journal`, and returns `{_: 'Enter at least one reading.'}` when no reading field is present (a journal alone does not count).

- [ ] **Step 5: Run `npm test`.** Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/indicators.js src/rules.js src/rules.test.js
git commit -m "feat: indicator thresholds, classification and input validation"
```

---

### Task 3: Projections

**Files:**
- Create: `src/projections.js`, `src/projections.test.js`

**Interfaces:**
- Consumes: `NASA`, `PROFILES`, `TASKS` from `nasa-data.js`.
- Produces:
  - `boneLossRange(day: number): {minPct: number, maxPct: number, beyondData: boolean}`
  - `radiation(profile, day: number): {cumulativeMsv, projectedMsv, pctOfLimit, daysToLimit, status: 'green' | 'amber' | 'red'}` (mSv values and percent rounded to 1 decimal)
  - `exerciseMinutes(doneIds: string[] | undefined): number`
  - `exerciseAvg(tasksDone: Record<number, string[]>, day: number): number` (mean over days `day-7` to `day-1`, today excluded, rounded to a whole minute)
  - `replyDelay(profile): {roundTripSec: number, text: string}`
  - `reminders(doneIds: string[] | undefined, nowMinutes: number): {overdue: string[], next: string | null}` (`nowMinutes` is minutes since local midnight; `overdue` lists undone task ids whose time has passed, earliest first; `next` is the earliest undone task still ahead)

- [ ] **Step 1: Write the failing tests** in `src/projections.test.js`

```js
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
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, cannot find `projections.js`.

- [ ] **Step 3: Implement `src/projections.js`**

`radiation`: `cumulative = prior + rate × day`; `projected = prior + rate × stayDays`; `daysToLimit = max(0, ceil((600 − cumulative) / rate))`; status red when `cumulative ≥ 600`, amber when `projected ≥ 600`, else green. Compute `daysToLimit` from the unrounded cumulative. `replyDelay`: 0 → near-real-time text; under 60 s round trip → "about N seconds" with N rounded; otherwise minutes, using `Math.round(roundTripSec / 60)` and half of it for "each way".

- [ ] **Step 4: Run `npm test`.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/projections.js src/projections.test.js
git commit -m "feat: bone-loss, radiation, exercise and reply-delay projections"
```

---

### Task 4: Simulated history

**Files:**
- Create: `src/simulate.js`, `src/simulate.test.js`

**Interfaces:**
- Consumes: `classify`, `valueOf` (tests only), `exerciseAvg` (tests only), `TASKS`.
- Produces: `simulate(): {entries: Record<number, object>, tasksDone: Record<number, string[]>}` covering days 1–119. Same output on every call.

- [ ] **Step 1: Write the failing tests** in `src/simulate.test.js`

```js
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
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, cannot find `simulate.js`.

- [ ] **Step 3: Implement `src/simulate.js`**

Use a seeded generator (mulberry32, seed `2026`) so output never changes. Ordinary-day ranges, uniform, all inside the green bands: sys 106–118, dia 66–78, heart rate 52–66, blood sugar 78–96, temperature 36.4–37.0 (1 decimal), sleep 7.0–8.2 (1 decimal), mood 4 or 5, vision `none`, cabin CO2 2.0–2.8 (1 decimal), cabin temperature 21.5–23.5 (1 decimal). Then overwrite the scripted values from spec section 7; heart rate on days 84–86 is the generated value plus 12. Every day lists all seven task ids in `tasksDone`, minus the scripted skips, minus `checkin` on days 98–99.

- [ ] **Step 4: Run `npm test`.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/simulate.js src/simulate.test.js
git commit -m "feat: seeded simulated mission history"
```

---

### Task 5: Store, streak and weekly ring

**Files:**
- Create: `src/store.js`, `src/store.test.js`

**Interfaces:**
- Consumes: `simulate()`, `validateEntry`, `validateSymptom`, `PROFILES`, `MISSION_DAY`, `TASKS`.
- Produces:
  - `createStore(storage: {getItem, setItem, removeItem}): Store`. Persists only the user's overlay under key `ahm.v1` as `{profileId, entries, tasksDone, symptoms, speDemo}`.
  - `Store.get(): {day: 120, profileId, profile, entries, tasksDone, symptoms: Array<{region, text, severity}>, speDemo: boolean, hasCheckedInToday: boolean}` where `entries` and `tasksDone` are the simulation with the overlay applied per day, and `symptoms` are today's reports.
  - `Store.addSymptom(raw): ReturnType<typeof validateSymptom>` and `Store.removeSymptom(index: number): void`. Reporting a symptom does not count as a check-in.
  - `Store.saveEntry(raw): ReturnType<typeof validateEntry>` (on success stores the entry for day 120 and marks `checkin`, plus `journal` when the entry has journal text)
  - `Store.toggleTask(taskId: string): void` (today only; ignores unknown ids and tasks with `auto: true`)
  - `Store.setProfile(id: string): boolean`, `Store.setSpeDemo(on: boolean): void`, `Store.reset(): void`
  - `streak(entries, day): {current: number, best: number}` (current run of days with an entry, ending today if today has one, otherwise yesterday)
  - `weeklyCompletion(tasksDone, day): {done: number, total: 49}` (days `day-6` to `day`, today included)

- [ ] **Step 1: Write the failing tests** in `src/store.test.js`

```js
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
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, cannot find `store.js`.

- [ ] **Step 3: Implement `src/store.js`.** Load once inside `try/catch`, validating the shape (object; known `profileId`; `entries` and `tasksDone` plain objects; `symptoms` an array) and falling back to an empty overlay on any failure. Wrap every `setItem`/`removeItem` in `try/catch` so a throwing storage degrades to in-memory state.

- [ ] **Step 4: Run `npm test`.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/store.js src/store.test.js
git commit -m "feat: local storage overlay, streak and weekly completion"
```

---

### Task 6: Region statuses, alerts and ground report

**Files:**
- Create: `src/alerts.js`, `src/alerts.test.js`

**Interfaces:**
- Consumes: `Store.get()` state; `INDICATORS`, `REGIONS`, `SEVERITY_STATUS`; `classify`, `valueOf`, `latest`, `flaggedRun`, `baselineDelta`, `escalation`, `worst`; `radiation`, `exerciseAvg`, `replyDelay`; a weather summary `{status, headline, events}` or `null` (shape from Task 7).
- Produces:
  - `indicatorStates(state, weather): Record<string, {id, status, value, day, display: string, delta: number | null}>` for all eleven indicators. `display` is the human text, for example `"131/82 mmHg"`, `"5.8 h"`, `"3.4 mmHg"`, `"60 min/day"`, `"54 of 600 mSv"`, or `"No data"`. `delta` is `baselineDelta(...)`. Radiation status is the worse of `radiation(...).status` and the weather status when that is red.
  - `regionStatuses(state, weather): Record<regionId, {status, indicatorIds, symptoms: Array}>` for all seven regions. A region's status is the worst of its indicators and of today's symptoms reported on it.
  - `buildAlerts(state, weather): Array<{id, kind: 'indicator' | 'symptom' | 'weather' | 'checkin', status: 'red' | 'amber' | 'info', title, detail, actions: string[], escalation, delayText: string | null, source: {title, url}}>`, sorted red, amber, info. One alert per amber or red indicator; one `symptom` alert per reported symptom (id `symptom-<index>`); a `weather` alert when the weather status is amber or red; a `checkin` alert with status `info` when `hasCheckedInToday` is false. `delayText` is `replyDelay(profile).text` when escalation is `surgeon`, else `null`.
  - `needsAttention(alerts): number` (amber plus red)
  - `buildReport(state, alerts): string`
  - `buildCsv(state): string` (header `day,sys,dia,hr,glucose,temp,sleep,mood,vision,cabinCo2,cabinTemp`, one line per day that has an entry, empty cells for skipped readings, journal text excluded)
  - `ESCALATION_LABEL = { none: '', self: 'Self-care', crew: 'Tell the crew medical officer', surgeon: 'Contact the flight surgeon' }`

- [ ] **Step 1: Write the failing tests** in `src/alerts.test.js`

```js
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
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, cannot find `alerts.js`.

- [ ] **Step 3: Implement `src/alerts.js`.** For check-in indicators the status comes from `latest(...)` (the newest day that has a value, so a skipped step keeps yesterday's reading visible with its day). Escalation uses `flaggedRun`; derived indicators (`exercise`, `radiation`) pass a run of 1. Alert `title` is `"<Indicator label>: <Status label>"`, `detail` is the `display` text plus the day it was taken, `actions` are the indicator's actions for that status. Order: red, then amber, then info; within one status the weather alert comes first, then symptoms in the order reported, then indicators in `INDICATORS` order. A symptom alert's title is `"<Region label>: symptom reported"`, its detail is the symptom text and severity, its status comes from `SEVERITY_STATUS`, its escalation is `surgeon` when severe and `self` otherwise, its actions are "Note it in your journal and re-check tomorrow." (amber) or "Tell the crew medical officer and contact the flight surgeon." (red), and its source is `SOURCES.hazards`. The weather alert uses the summary's `headline` as its title, the radiation indicator's actions for that status, escalation `surgeon` when red and `self` when amber, and `SOURCES.donki`.

`buildReport` returns plain text whose first line is `SIMULATED DATA - PROTOTYPE`, second line `Mission day 120, <profile name>`, then one block per amber or red alert (title, detail, escalation label), then the latest value of every indicator using its `display` text.

- [ ] **Step 4: Run `npm test`.** Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/alerts.js src/alerts.test.js
git commit -m "feat: region statuses, alerts, escalation and ground report"
```

---

### Task 7: NASA space weather

**Files:**
- Create: `fetch-space-weather.mjs`, `src/space-weather.js`, `src/space-weather.test.js`, `src/space-weather-snapshot.json`

**Interfaces:**
- Produces:
  - `donkiUrls(nowMs: number, apiKey: string): {sep: string, flr: string}` (last 30 days, UTC `YYYY-MM-DD`)
  - `parseDonki(raw: {fetchedAt?: string, sep?: unknown, flr?: unknown} | null): {fetchedAt: string | null, events: Array<{type: 'sep' | 'flare', time: string, classType: string | null, link: string | null}>}` (skips anything without a parseable time; never throws)
  - `summarize(weather, nowMs: number, speDemo: boolean): {status: 'green' | 'amber' | 'red' | 'none', headline: string, events: Array}` (events newest first, at most 5)
  - `loadWeather({fetchFn, storage, nowMs}): Promise<{source: 'live' | 'cache' | 'snapshot' | 'none', weather: object | null}>`. Cache key `ahm.weather.v1`, lifetime 6 hours.
- Snapshot file shape: `{ "fetchedAt": ISO string, "sep": [...raw DONKI...], "flr": [...raw DONKI...] }`.

- [ ] **Step 1: Write `fetch-space-weather.mjs` and capture the snapshot**

The script reads `process.env.NASA_API_KEY`, falling back to `DEMO_KEY`, imports `donkiUrls` from `src/space-weather.js`, fetches both endpoints, and writes `src/space-weather-snapshot.json`. It prints only `Saved N solar particle events and M flares (key: personal|demo)` and exits non-zero with the HTTP status on failure. It never prints the key or a URL containing it. Implement `donkiUrls` first so the script can run:

```
https://api.nasa.gov/DONKI/SEP?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=KEY
https://api.nasa.gov/DONKI/FLR?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=KEY
```

Run: `npm run weather`
Expected: `Saved N solar particle events and M flares (key: personal)`. If `.env` is absent the line ends `(key: demo)`; if it then fails with 429, wait for the hourly limit or ask the team for `.env`.

- [ ] **Step 2: Confirm the field names against the snapshot**

Open `src/space-weather-snapshot.json`. The plan assumes solar particle events carry `eventTime` and `link`, and flares carry `peakTime`, `classType` (for example `"X1.2"`) and `link`. These names were not confirmed during planning because the demo key was rate-limited. If the real names differ, use the real ones in the parser and in the fixture below, and note the change in the commit message. If both arrays are empty, widen the script's window to 180 days for the snapshot only and re-run.

- [ ] **Step 3: Write the failing tests** in `src/space-weather.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { donkiUrls, parseDonki, summarize, loadWeather } from './space-weather.js';

const NOW = Date.parse('2026-11-15T12:00Z');
const hoursAgo = h => new Date(NOW - h * 3600e3).toISOString().slice(0, 16) + 'Z';
const raw = (sepHours, flares) => ({
  fetchedAt: new Date(NOW).toISOString(),
  sep: sepHours.map(h => ({ sepID: 'x', eventTime: hoursAgo(h), link: 'https://example.org/sep' })),
  flr: flares.map(([h, c]) => ({ flrID: 'y', peakTime: hoursAgo(h), classType: c, link: 'https://example.org/flr' })),
});
const status = (sep, flr, demo = false) => summarize(parseDonki(raw(sep, flr)), NOW, demo).status;

test('request URLs cover the last 30 days in UTC', () => {
  const u = donkiUrls(NOW, 'DEMO_KEY');
  assert.equal(u.sep, 'https://api.nasa.gov/DONKI/SEP?startDate=2026-10-16&endDate=2026-11-15&api_key=DEMO_KEY');
  assert.equal(u.flr, 'https://api.nasa.gov/DONKI/FLR?startDate=2026-10-16&endDate=2026-11-15&api_key=DEMO_KEY');
});

test('status rules from spec 5.5', () => {
  assert.equal(status([24], []), 'red');             // particle event within 48 h
  assert.equal(status([120], []), 'amber');          // within 7 days
  assert.equal(status([200], []), 'green');
  assert.equal(status([], [[24, 'X1.2']]), 'amber'); // X-class flare within 48 h
  assert.equal(status([], [[24, 'M5.0']]), 'green');
  assert.equal(status([], [[60, 'X2.0']]), 'green');
  assert.equal(status([], []), 'green');
  assert.equal(summarize(null, NOW, false).status, 'none');
});

test('demo switch forces a clearly labelled alert', () => {
  const s = summarize(parseDonki(raw([], [])), NOW, true);
  assert.equal(s.status, 'red');
  assert.match(s.headline, /Simulated/);
});

test('malformed input never throws', () => {
  for (const bad of [null, {}, { sep: 'oops', flr: 7 }, { sep: [null, { eventTime: 'not a date' }, 3], flr: [{}] }]) {
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
```

- [ ] **Step 4: Run `npm test`.** Expected: the new tests FAIL (functions not exported).

- [ ] **Step 5: Implement the rest of `src/space-weather.js`.** `loadWeather` order: a cache entry younger than 6 hours → `cache`; otherwise fetch both DONKI URLs with `DEMO_KEY` and, when both are `ok` and both bodies are arrays, parse, cache and return `live`; otherwise fetch the relative path `src/space-weather-snapshot.json` and return `snapshot`; otherwise `{source: 'none', weather: null}`. Cached and returned `weather` is always the parsed shape. `summarize` with `speDemo` true returns the red demo result even when `weather` is null. Headlines: red → "Solar particle event detected in the last 48 hours"; amber → the triggering event in words; green → "No solar particle events in the last 7 days"; demo → "Simulated solar particle event (demo)".

- [ ] **Step 6: Run `npm test`.** Expected: all pass.

- [ ] **Step 7: Commit** (confirm `.env` is not staged)

```bash
git status --short
git add fetch-space-weather.mjs src/space-weather.js src/space-weather.test.js src/space-weather-snapshot.json
git commit -m "feat: NASA DONKI space weather with cache and snapshot fallback"
```

---

### Task 8: App shell, design system and router

Before writing any markup or CSS in this task, load the `frontend-design:frontend-design` skill and follow it. Direction from the spec: dark, calm, readable at arm's length on a projector, not a generic dashboard template.

**Files:**
- Create: `index.html`, `sw.js`, `styles.css`, `src/ui.js`, `src/app.js`, six `src/screen-*.js` files (stubs in this task), `vendor/chart.umd.js`, `vendor/AGENTS.md`

**Interfaces:**
- Consumes: `createStore`, `loadWeather`, `summarize`, `PROFILES`, `STATUS_LABEL`.
- Produces:
  - `h(tag: string, attrs?: object, ...children: Array<Node | string>): HTMLElement` in `src/ui.js`. Strings become text nodes. Attributes starting with `on` attach listeners. There is no HTML-string path.
  - `statusBadge(status: string): HTMLElement` (icon, word and a `data-status` attribute; the word comes from `STATUS_LABEL`)
  - `sourceLink(source: {title, url}): HTMLElement` (`target="_blank"`, `rel="noopener"`)
  - Each screen module exports `render(root: HTMLElement, ctx: Ctx): void | (() => void)`; a returned function is called before the next render (used to destroy charts).
  - `Ctx = { store, state, weather: {source, summary, fetchedAt}, navigate(hash: string), refresh() }`. `refresh()` re-reads the store and re-renders the current screen.
  - Routes: `#/` home, `#/checkin`, `#/trends`, `#/alerts`, `#/routine`, `#/library`. Unknown hashes go home. `#/trends?focus=<indicatorId>` scrolls to that chart.

- [ ] **Step 1: Vendor Chart.js**

```bash
mkdir -p vendor
curl -fL https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.js -o vendor/chart.umd.js
head -c 200 vendor/chart.umd.js
```

Expected: the header comment names `Chart.js v4.4.7` and the MIT licence. `vendor/AGENTS.md`: third-party files, do not edit; Chart.js 4.4.7, MIT, source URL.

- [ ] **Step 2: Build the shell**

`index.html`: a skip link; a header with the product name, "Mission day 120", a `<select>` of the four profiles showing gravity and delay beside it, the "Simulated data" label and a "Reset demo" button; a `<nav>` of six links with `aria-current` on the active one; `<main id="app" tabindex="-1">`; the footer line from Global Constraints. Load `vendor/chart.umd.js` with a classic script, then `src/app.js` as a module.

File-protocol notice (Review Focus 5): a classic inline script, placed before the module script, that when `location.protocol === 'file:'` replaces `<main>` content with: "This page needs a local server. In this folder run: python3 -m http.server 8000, then open http://localhost:8000".

`styles.css`: colour, type, spacing and radius tokens on `:root`; status tokens `--ok`, `--watch`, `--act`, `--nodata`, each meeting 4.5:1 contrast for text on the page background; visible `:focus-visible` outlines; `prefers-reduced-motion` turns off transitions; layout works from 360 px wide to a projector.

`src/app.js`: create the store with `window.localStorage` (inside `try/catch`, falling back to an in-memory object with the same three methods), render immediately with no weather data, then `await loadWeather({fetchFn: url => fetch(url), storage, nowMs: Date.now()})` and refresh (pass the arrow function, not bare `fetch`, which throws "Illegal invocation" when called detached). On every render compute `ctx.weather.summary = summarize(weatherData, Date.now(), state.speDemo)`; screens pass `ctx.weather.summary` wherever Task 6 functions take `weather`. On every render, move focus to `<main>` after navigation. Screen stubs render only an `<h1>`.

Offline (spec section 11): `sw.js` at the repo root handles same-origin `GET` requests network first, storing each successful response in a cache named `ahm-v1` and answering from that cache when the network fails; it ignores cross-origin requests (the NASA feed has its own fallback). `src/app.js` registers it when `'serviceWorker' in navigator`, then fetches every file in the File Structure list once so the cache is complete after the first visit. The header shows "Offline: using saved data" while `navigator.onLine` is false, updated on the `online` and `offline` events.

- [ ] **Step 3: Verify in a browser**

Run: `npm run serve`, open `http://localhost:8000`.
Expected, all true:
- Six nav links each show their heading; the back button works; an unknown hash shows home.
- Changing the profile to Mars surface, then reloading, keeps Mars surface. "Reset demo" returns to ISS.
- Tab reaches the skip link, selector, reset button and every nav link with a visible outline.
- The console has no errors. The Network panel shows either two `api.nasa.gov` requests or none (cache), and no request contains a key other than `DEMO_KEY`.
- Opening `index.html` by double-click shows the local-server notice.
- After one normal load, set the browser's dev tools to Offline and reload: every route still renders, the header shows "Offline: using saved data", and the console has no uncaught errors.

- [ ] **Step 4: Commit**

```bash
git add index.html sw.js styles.css src/ui.js src/app.js src/screen-*.js vendor
git commit -m "feat: app shell, design tokens, router and vendored Chart.js"
```

---

### Task 9: Body map (home)

**Files:**
- Modify: `src/screen-home.js`, `styles.css`

**Interfaces:**
- Consumes: `regionStatuses`, `indicatorStates`, `buildAlerts`, `needsAttention`, `ESCALATION_LABEL`, `INDICATORS`, `REGIONS`, `SEVERITY_STATUS`, `reminders`, `TASKS`, `Store.addSymptom`, `Store.removeSymptom`, `h`, `statusBadge`, `sourceLink`.

- [ ] **Step 1: Build the screen**

- Summary strip: "N need attention" from `needsAttention`; the first alert's title with a link to `#/alerts`; "Next: <task label> at HH:MM" from `reminders(...)` using the device clock, with "N overdue" linking to `#/routine` when any are; and, when `hasCheckedInToday` is false, a primary button "Start today's check-in" → `#/checkin`.
- Figure: an inline SVG, `viewBox="0 0 200 440"`, an original stylised human outline drawn with paths (no photo, no imported asset). Five hit areas (`head`, `eyes`, `heart`, `gut`, `bones` as the legs and arms) plus the outline itself as `body`. Each region is an SVG group with `role="button"`, `tabindex="0"`, `data-region`, `data-status`, and `aria-label` like "Heart: Watch". Enter and Space activate it. The selected region has `aria-pressed="true"`.
- Because small SVG targets are hard to hit, repeat the regions as a list of buttons beside the figure, each with its `statusBadge`. The list has a seventh item, "Cabin", which is not drawn on the body; show it as a frame or ring around the figure. Figure and list stay in sync.
- Detail panel for the selected region (default: the worst region, ties broken by `REGIONS` order): for each indicator in the region show label, `display`, "day N" when the reading is not from today, `statusBadge`, the change from the 14-day average when `delta` is not null (for example "+16 vs your 14-day average"), `why`, `howTo` as a numbered list, the actions for its status when amber or red, the escalation label, `sourceLink`, the `appRuleNote` when present, and a link "See trend" → `#/trends?focus=<id>`.
- Symptom reporting, for the six body regions only: under the indicators, list today's symptoms for the region (text, severity, a "Remove" button) and a small form "Report a symptom or discomfort here" with a labelled text input (`maxlength="200"`), a severity `<select>` (Mild, Moderate, Severe) and an "Add" button. It calls `store.addSymptom({region, text, severity})`, shows any error beside the field, then `ctx.refresh()`. A note reads "Severity colours are this app's own rule." Symptom text is rendered with `textContent`.
- For `exercise` add the bone-loss line: "Estimated bone density loss so far: 4–6% (NASA average, not a measurement of you)" from `boneLossRange(120)`.

- [ ] **Step 2: Verify in a browser**

Expected with a fresh demo on ISS: the strip reads "5 need attention"; head is red; heart, bones and cabin amber; eyes, gut and whole body green; the panel opens on Head showing sleep 5.8 h (day 119) and mood 2. Selecting Cabin shows CO2 3.4 mmHg with NASA's 3 mmHg limit as the reason. Selecting Gut and adding the symptom "Nausea" with severity Severe turns Gut red and the strip to "6 need attention"; removing it reverses both; adding `<i>x</i>` shows that literal text. Keyboard: Tab to a region, Enter selects it. Switching to Mars surface turns Whole body amber with "330 of 600 mSv". Each status shows an icon and a word as well as colour.

- [ ] **Step 3: Commit**

```bash
git add src/screen-home.js styles.css
git commit -m "feat: body map home screen"
```

---

### Task 10: Daily check-in

**Files:**
- Modify: `src/screen-checkin.js`, `styles.css`

**Interfaces:**
- Consumes: `INDICATORS` (the nine with `derived: false`, including each field's `range`), `CHECKIN_STEPS`, `classify`, `Store.saveEntry`, `ctx.navigate`, `h`, `statusBadge`, `sourceLink`.

- [ ] **Step 1: Build the wizard**

- Ten steps: the eight entries of `CHECKIN_STEPS` in order (the last holds both cabin readings under the heading "Cabin environment"), an optional journal step, then review. A progress line reads "Step 3 of 10". Buttons: Back, Skip, Next. The draft lives in memory in this module only.
- Each indicator step shows the question, `howTo` as numbered steps, `why` with `sourceLink`, and native inputs: `<input type="number" inputmode="decimal">` with `min`, `max`, `step` from `range` and a visible unit; blood pressure has two labelled inputs; mood is five labelled radio buttons (1 "Very low", 2 "Low", 3 "Okay", 4 "Good", 5 "Very good"); vision is three radios ("No change", "Slight blur", "Clear change or loss"). Every input has a `<label>`.
- As soon as a step has a valid value, show its `statusBadge` live.
- Journal step: a `<textarea maxlength="2000">` labelled "Journal (optional)", with one line citing NASA's journaling advice.
- Review step: every indicator with its value and badge, or "Skipped". "Save check-in" calls `store.saveEntry(draft)`. On `ok: false`, go to the first step named in `errors`, show the message next to the field with `aria-describedby`, and focus the field. On success, navigate to `#/`.
- When today already has an entry, the heading is "Update today's check-in" and the draft starts from it.

- [ ] **Step 2: Verify in a browser**

Expected, all true:
- Entering 150 and 95 for blood pressure shows "Act now" on the step; skipping every other step and saving returns home with heart red, still "5 need attention", and no check-in button.
- Entering cabin CO2 5.0 shows "Act now" on the cabin step.
- Entering systolic 80, diastolic 95 and saving returns to the blood-pressure step with the message at the diastolic field.
- Skipping every step and saving shows "Enter at least one reading." and stores nothing.
- Typing `<b>hi</b>` in the journal and saving shows that literal text wherever the journal appears, not bold text.
- The whole wizard can be completed with the keyboard alone.

- [ ] **Step 3: Commit**

```bash
git add src/screen-checkin.js styles.css
git commit -m "feat: guided daily check-in"
```

---

### Task 11: Trends

Before writing chart code in this task, load the `dataviz` skill and follow it for colours, axes and legends.

**Files:**
- Modify: `src/screen-trends.js`, `styles.css`

**Interfaces:**
- Consumes: global `Chart` from `vendor/chart.umd.js`; `state.entries`, `state.tasksDone`; `INDICATORS` bands; `indicatorStates`; `boneLossRange`; `radiation`; `exerciseMinutes`; `NASA`; `sourceLink`.
- Produces: `render` returns a cleanup function that calls `.destroy()` on every chart it created.

- [ ] **Step 1: Build the charts**

- A range toggle (7 days, 30 days, all; default 30) as a radio group. It applies to the indicator charts only.
- One chart per check-in indicator, x axis "Mission day": blood pressure (two lines), heart rate, blood sugar, temperature, sleep, mood (stepped line, y from 1 to 5). Shade the green band from spec 5.3 behind each line using two boundary datasets with fill between them, hidden from the legend. Days with no reading leave a gap (`spanGaps: false`). Vision has no chart; show its last three reports as text.
- Cabin CO2 and cabin temperature: one chart each under a "Cabin environment" heading, with NASA's limits drawn as labelled lines (3 mmHg; 18 °C and 27 °C) and the green band shaded as for the other indicators.
- Exercise: bars of minutes per day with a line at 120.
- Bone loss: x from day 0 to 180, a filled band between `minPct` and `maxPct`, a marker at day 120. Caption, exact: "Estimate from NASA's average of 1–1.5% per month on four-to-six month missions. Not a measurement of you. In partial gravity the rate is not yet known."
- Radiation: solid line of cumulative dose from day 0 to 120, dashed projection to `stayDays`, horizontal line at 600 mSv labelled "NASA career limit". Caption, exact: "Dose rate for this mission profile from NASA's radiation standard brief. Dosimeter readings are simulated."
- Each chart sits in a `<figure>` whose `<canvas>` has `role="img"` and an `aria-label`, with a `<figcaption>` giving the latest value, its `statusBadge`, the change from the 14-day average when `delta` is not null, and `sourceLink`. The figure's id is `chart-<indicatorId>`; `?focus=` scrolls to it.
- Turn animation off when `prefers-reduced-motion` matches.

- [ ] **Step 2: Verify in a browser**

Expected: the 30-day sleep chart shows the decline from day 112 dropping below the shaded band; blood pressure shows the rise on days 116–119; a gap appears at days 98–99 in "all"; the temperature spike sits at day 85 in "all"; cabin CO2 crosses the 3 mmHg line on days 118–119. On Mars surface the dashed radiation projection crosses the 600 line. Switching range five times and navigating away and back leaves no "Canvas is already in use" error in the console.

- [ ] **Step 3: Commit**

```bash
git add src/screen-trends.js styles.css
git commit -m "feat: trend charts with normal bands, bone-loss and radiation projections"
```

---

### Task 12: Alerts and actions

**Files:**
- Modify: `src/screen-alerts.js`, `styles.css`

**Interfaces:**
- Consumes: `buildAlerts`, `buildReport`, `buildCsv`, `ESCALATION_LABEL`, `ctx.weather`, `Store.setSpeDemo`, `NASA`, `SOURCES`, `h`, `statusBadge`, `sourceLink`.

- [ ] **Step 1: Build the screen**

- Alert cards in the order `buildAlerts` returns: `statusBadge`, title, detail, numbered actions, the escalation label, `delayText` when present, `sourceLink`. The check-in reminder is a plain card with a link to `#/checkin`. With no amber or red alerts show "Nothing needs attention today."
- Space-weather card: headline with `statusBadge`; a source line that reads "Live from NASA DONKI, fetched HH:MM", "Saved copy from <date>" (for `cache` and `snapshot`), or "Space weather unavailable"; up to five recent events with type, time (UTC) and a link; the two limits "250 mSv per event, 600 mSv career (NASA)" with `sourceLink`; the note, exact: "DONKI reports events observed from near Earth. A real vehicle would also use its own dosimeters."; and a checkbox "Simulate a solar particle event (demo)" wired to `store.setSpeDemo` then `ctx.refresh()`.
- Report: a button "Build report for ground" fills a read-only `<textarea>` with `buildReport(...)` and shows a "Copy" button (`navigator.clipboard.writeText` inside `try/catch`; on failure select the text). Beneath it, exact: "Prototype: nothing is transmitted."
- Health record: a button "Download health record (CSV)" that saves `buildCsv(state)` as `health-record-day-120.csv` using a `Blob` and a temporary `<a download>`. A line beside it reads "Your record is stored on this device and works without a connection."

- [ ] **Step 2: Verify in a browser**

Expected on a fresh demo: six cards in the order sleep, mood, blood pressure, cabin CO2, exercise, check-in reminder; the downloaded CSV opens in a spreadsheet with 11 columns and 117 data rows; sleep says "Contact the flight surgeon" with "Ground can answer in near real time."; on Mars surface that line reads "A reply takes at least 40 minutes (20 each way). Start the onboard steps now." Ticking the demo checkbox adds a red weather card at the top marked "Simulated" and turns Whole body red on home; unticking reverses it. With the network offline in dev tools and site data cleared, the card reads "Saved copy from …".

- [ ] **Step 3: Commit**

```bash
git add src/screen-alerts.js styles.css
git commit -m "feat: alerts, space weather card and ground report"
```

---

### Task 13: Routine and rewards

**Files:**
- Modify: `src/screen-routine.js`, `styles.css`

**Interfaces:**
- Consumes: `TASKS`, `SOURCES`, `state.tasksDone`, `Store.toggleTask`, `streak`, `weeklyCompletion`, `exerciseMinutes`, `reminders`, `NASA`, `h`, `sourceLink`.

- [ ] **Step 1: Build the screen**

- Today's seven tasks in time order as native checkboxes with labels, each showing its scheduled time, its `why` and `sourceLink`. Tasks in `reminders(...).overdue` carry the word "Overdue"; the one in `next` carries "Next". Use the device clock (`new Date()`), minutes since local midnight. The two `auto` tasks are disabled and read "Done in the check-in" with a link to `#/checkin`. Toggling calls `store.toggleTask(id)` then `ctx.refresh()`.
- A line "Exercise today: N of 120 minutes" from `exerciseMinutes`.
- Rewards: "Check-in streak: N days", "Personal best: N days", and a weekly ring (SVG circle using `stroke-dasharray`) with the text "N of 49 tasks this week" inside it. When the current streak equals the best, add "New personal best".
- No badges, patches or leaderboards.

- [ ] **Step 2: Verify in a browser**

Expected on a fresh demo: streak 20, personal best 97, ring "35 of 49"; tasks are listed from 07:30 to 21:30 and those earlier than the current time are marked "Overdue" until ticked. Ticking both exercise tasks shows "120 of 120 minutes" and "37 of 49"; reloading keeps them ticked. After a check-in the streak reads 21 and the check-in task is ticked.

- [ ] **Step 3: Commit**

```bash
git add src/screen-routine.js styles.css
git commit -m "feat: daily routine with streak and weekly ring"
```

---

### Task 14: Hazard library

**Files:**
- Modify: `src/screen-library.js`, `styles.css`

**Interfaces:**
- Consumes: `HAZARDS`, `SOURCES`, `INDICATORS`, `indicatorStates`, `replyDelay`, `h`, `statusBadge`, `sourceLink`.

- [ ] **Step 1: Build the screen**

Five cards in `HAZARDS` order. Each shows the name, the summary, the effects as a list, `sourceLink`, a line "How this app responds:" with `appResponse`, and "Tracked here:" followed by one chip per `indicatorIds` entry showing the indicator label and its current `statusBadge`, linking to `#/trends?focus=<id>`. The Distance card has no indicators; instead it shows the current profile's `replyDelay(...).text` and links to `#/alerts`. An intro line credits NASA's Human Research Program as the source of the five hazards. Text is a paraphrase with the link, not copied paragraphs.

- [ ] **Step 2: Verify in a browser**

Expected: five cards; the Gravity card lists blood pressure, heart rate, vision and exercise with live statuses; the Hostile environment card lists body temperature, cabin CO2 and cabin temperature; every source link opens the matching nasa.gov page in a new tab; the Distance card changes wording when the profile changes.

- [ ] **Step 3: Commit**

```bash
git add src/screen-library.js styles.css
git commit -m "feat: hazard library linked to tracked indicators"
```

---

### Task 15: Documentation, submission pack and final check

**Files:**
- Modify: `README.md`
- Create: `docs/submission.md`

- [ ] **Step 1: Write `README.md`**

What it is (two sentences); how to run (`npm run serve`), test (`npm test`) and refresh the space-weather snapshot (`cp .env.example .env`, add the key, `npm run weather`); a data-sources table copied from spec 5.1 and 5.3; a line that crew readings are simulated; a line that the code was written with AI assistance (Claude) and reviewed by the team; Chart.js 4.4.7 (MIT).

- [ ] **Step 2: Write `docs/submission.md`**

Drafts, in English, for each form field: Project Name; High-Level Project Summary; Detailed Project Description; NASA Data (the five-hazards pages, the risk pages, NASA-STD-3001 and its technical briefs OCHMO-TB-020 radiation, OCHMO-TB-004 carbon dioxide and OCHMO-TB-002 life support, and DONKI, each with one line on how it is used); Space Agency Partner and Other Data (CDC, NHLBI, MedlinePlus, American Diabetes Association, Chart.js); Use of AI. Leave team name and member names as the two fields for the team to fill.

Seven-slide outline:
1. Title: project name, team name, members, the challenge chosen.
2. The problem: the crew must spot changes themselves; a reply from Mars takes 40 minutes; medical resources on board are limited.
3. The product: body-map screenshot with a red and an amber region.
4. The user experience: check-in → status → action → escalation, as four screenshots.
5. Five hazards, five responses: the table from spec section 11, one row per hazard.
6. How NASA data made it possible and why it is valid: NASA-STD-3001 limits (600 mSv, 250 mSv, 3 mmHg CO2, 18–27 °C), 1–1.5% bone loss, live DONKI feed; every threshold has a source, app rules are labelled, readings are simulated and say so.
7. What comes next: wearable and dosimeter input, crew medical officer view.

Judge question prep: one or two sentences answering each of the ten "Questions you should understand" in the Karachi challenge guide, each naming the screen that demonstrates the answer. The ten questions: monitoring physical and psychological health; which indicators matter most; identifying unusual changes; monitoring the five hazards; records during communication delays or network disruptions; simple charts; reminders and alerts; guidance without replacing diagnosis; sleep, mood and behavioural health; staying user-friendly and reliable in space.

Checklist: public link opens in a private window; slides link opens in a private window; no NASA logos; AI disclosure present; all fields in English; "Submit for Judging" pressed before 23:59 and the confirmation banner seen.

Deployment note (for the repo owner, not for an agent): push the branch, merge to `main`, then in the GitHub repository choose Settings → Pages → Deploy from a branch → `main` / root. The site needs no build.

- [ ] **Step 3: Final verification**

```bash
npm test
grep -rn "api_key" index.html src fetch-space-weather.mjs
git status --short
```

Expected: all tests pass; every `api_key` hit is either `DEMO_KEY` or the `NASA_API_KEY` environment read in `fetch-space-weather.mjs`; `.env` does not appear in `git status`.

Then run the demo path once in the browser after "Reset demo": home shows 5 needing attention → open Head → open Cabin (CO2 3.4 mmHg against NASA's 3 mmHg limit) → report a symptom on Gut, then remove it → start check-in → enter 150/95 → save → heart is red → Alerts lists blood pressure as "Act now" with "Contact the flight surgeon" → switch to Mars surface → reply delay changes and Whole body turns amber → Trends shows the radiation projection crossing 600 → tick the solar-event demo → Whole body turns red → Routine shows streak 21 → download the CSV → switch dev tools to Offline, reload, and confirm the app still works. Record any step that does not behave this way as a bug and fix it before committing.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/submission.md
git commit -m "docs: README, submission pack and slide outline"
```
