import { simulate } from './simulate.js';
import { validateEntry, validateSymptom } from './rules.js';
import { PROFILES, MISSION_DAY, TASKS } from './nasa-data.js';

const KEY = 'ahm.v1';
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const emptyOverlay = () => ({ profileId: PROFILES[0].id, entries: {}, tasksDone: {}, symptoms: [], speDemo: false });

// Stored data is untrusted: anything that is not the expected shape falls back to the demo state.
function load(storage) {
  try {
    const raw = JSON.parse(storage.getItem(KEY));
    if (!isObject(raw) || !PROFILES.some(p => p.id === raw.profileId)) return emptyOverlay();
    if (!isObject(raw.entries) || !isObject(raw.tasksDone)) return emptyOverlay();
    const overlay = emptyOverlay();
    overlay.profileId = raw.profileId;
    overlay.speDemo = raw.speDemo === true;
    const today = isObject(raw.entries[MISSION_DAY]) ? validateEntry(raw.entries[MISSION_DAY]) : null;
    if (today?.ok) overlay.entries[MISSION_DAY] = today.entry;
    if (Array.isArray(raw.tasksDone[MISSION_DAY])) {
      overlay.tasksDone[MISSION_DAY] = TASKS.map(t => t.id).filter(id => raw.tasksDone[MISSION_DAY].includes(id));
    }
    if (Array.isArray(raw.symptoms)) {
      overlay.symptoms = raw.symptoms.map(validateSymptom).filter(r => r.ok).map(r => r.symptom);
    }
    return overlay;
  } catch {
    return emptyOverlay();
  }
}

// The simulation is the baseline; only what the user changes today is stored.
export function createStore(storage) {
  const sim = simulate();
  let overlay = load(storage);

  const persist = () => {
    try { storage.setItem(KEY, JSON.stringify(overlay)); } catch { /* storage unavailable: keep working in memory */ }
  };
  const setTask = (id, done) => {
    const today = new Set(overlay.tasksDone[MISSION_DAY] ?? []);
    if (done) today.add(id); else today.delete(id);
    overlay.tasksDone[MISSION_DAY] = TASKS.map(t => t.id).filter(t => today.has(t));
  };

  return {
    get() {
      return {
        day: MISSION_DAY,
        profileId: overlay.profileId,
        profile: PROFILES.find(p => p.id === overlay.profileId),
        entries: { ...sim.entries, ...overlay.entries },
        tasksDone: { ...sim.tasksDone, ...overlay.tasksDone },
        symptoms: [...overlay.symptoms],
        speDemo: overlay.speDemo,
        hasCheckedInToday: Boolean(overlay.entries[MISSION_DAY]),
      };
    },
    saveEntry(raw) {
      const result = validateEntry(raw);
      if (result.ok) {
        overlay.entries[MISSION_DAY] = result.entry;
        setTask('checkin', true);
        setTask('journal', Boolean(result.entry.journal));
        persist();
      }
      return result;
    },
    toggleTask(taskId) {
      const task = TASKS.find(t => t.id === taskId);
      if (!task || task.auto) return;
      setTask(taskId, !(overlay.tasksDone[MISSION_DAY] ?? []).includes(taskId));
      persist();
    },
    addSymptom(raw) {
      const result = validateSymptom(raw);
      if (result.ok) { overlay.symptoms.push(result.symptom); persist(); }
      return result;
    },
    removeSymptom(index) {
      if (index >= 0 && index < overlay.symptoms.length) { overlay.symptoms.splice(index, 1); persist(); }
    },
    setProfile(id) {
      if (!PROFILES.some(p => p.id === id)) return false;
      overlay.profileId = id;
      persist();
      return true;
    },
    setSpeDemo(on) {
      overlay.speDemo = on === true;
      persist();
    },
    reset() {
      overlay = emptyOverlay();
      try { storage.removeItem(KEY); } catch { /* nothing stored */ }
    },
  };
}

// Current run of daily check-ins (ending today, or yesterday if today is still open) and the longest run.
export function streak(entries, day) {
  let current = 0;
  for (let d = entries[day] ? day : day - 1; d >= 1 && entries[d]; d--) current++;
  let best = 0, run = 0;
  for (let d = 1; d <= day; d++) {
    run = entries[d] ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current, best };
}

export function weeklyCompletion(tasksDone, day) {
  let done = 0;
  for (let d = day - 6; d <= day; d++) done += TASKS.filter(t => tasksDone[d]?.includes(t.id)).length;
  return { done, total: TASKS.length * 7 };
}
