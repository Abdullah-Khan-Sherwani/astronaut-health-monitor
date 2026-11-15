import { INDICATORS, REGIONS, SEVERITY_STATUS } from './indicators.js';

const BY_ID = Object.fromEntries(INDICATORS.map(i => [i.id, i]));
const NUMERIC_FIELDS = INDICATORS.flatMap(i => i.fields ?? []);
const RANK = { none: 0, green: 1, amber: 2, red: 3 };
const present = v => v !== undefined && v !== null && v !== '';

export function classify(id, value) {
  if (!present(value)) return 'none';
  return BY_ID[id]?.classify?.(value) ?? 'none';
}

export function valueOf(entry, id) {
  if (!entry) return undefined;
  if (id === 'bp') return present(entry.sys) && present(entry.dia) ? { sys: entry.sys, dia: entry.dia } : undefined;
  return present(entry[id]) ? entry[id] : undefined;
}

// Trust boundary for the check-in form: keeps known fields only, coerces numbers, rejects anything
// outside the ranges in the design data sheet, section 5.4.
export function validateEntry(raw) {
  const entry = {};
  const errors = {};
  for (const f of NUMERIC_FIELDS) {
    if (!present(raw?.[f.key])) continue;
    const n = Number(raw[f.key]);
    if (!Number.isFinite(n) || n < f.min || n > f.max) errors[f.key] = `Enter a number from ${f.min} to ${f.max}.`;
    else entry[f.key] = n;
  }
  if (present(raw?.mood)) {
    const n = Number(raw.mood);
    if (!Number.isInteger(n) || n < 1 || n > 5) errors.mood = 'Choose a mood from 1 to 5.';
    else entry.mood = n;
  }
  if (present(raw?.vision)) {
    if (!['none', 'slight', 'marked'].includes(raw.vision)) errors.vision = 'Choose one of the three options.';
    else entry.vision = raw.vision;
  }
  const hasSys = present(raw?.sys), hasDia = present(raw?.dia);
  if (hasSys !== hasDia) errors[hasSys ? 'dia' : 'sys'] = 'Enter both blood pressure numbers.';
  else if (entry.sys !== undefined && entry.dia !== undefined && entry.dia >= entry.sys) {
    errors.dia = 'The lower number must be below the upper number.';
  }
  const hasReading = Object.keys(entry).length > 0;
  if (typeof raw?.journal === 'string' && raw.journal.trim()) {
    const text = raw.journal.trim();
    if (text.length > 2000) errors.journal = 'Keep the journal entry under 2000 characters.';
    else entry.journal = text;
  }
  if (!hasReading && Object.keys(errors).length === 0) errors._ = 'Enter at least one reading.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, entry };
}

export function validateSymptom(raw) {
  const errors = {};
  const region = REGIONS.find(r => r.id === raw?.region && r.bodyPart);
  if (!region) errors.region = 'Choose a body region.';
  const text = typeof raw?.text === 'string' ? raw.text.trim() : '';
  if (text.length < 1 || text.length > 200) errors.text = 'Describe the symptom in 1 to 200 characters.';
  if (!Object.hasOwn(SEVERITY_STATUS, raw?.severity ?? '')) errors.severity = 'Choose mild, moderate or severe.';
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, symptom: { region: region.id, text, severity: raw.severity } };
}

// Newest reading of an indicator on or before `day`, so a skipped step keeps the last value in view.
export function latest(entries, id, day) {
  for (let d = day; d >= 1; d--) {
    const value = valueOf(entries[d], id);
    if (value !== undefined) return { day: d, value };
  }
  return null;
}

export function flaggedRun(entries, id, day) {
  const last = latest(entries, id, day);
  if (!last) return 0;
  let run = 0;
  for (let d = last.day; d >= 1; d--) {
    const status = classify(id, valueOf(entries[d], id));
    if (status !== 'amber' && status !== 'red') break;
    run++;
  }
  return run;
}

// Latest reading minus the wearer's own average over the 14 days before it. Information only.
export function baselineDelta(entries, id, day) {
  const ind = BY_ID[id];
  if (!ind || ind.derived || id === 'vision') return null;
  const last = latest(entries, id, day);
  if (!last) return null;
  const num = v => (id === 'bp' ? v.sys : v);
  const earlier = [];
  for (let d = last.day - 14; d < last.day; d++) {
    const v = valueOf(entries[d], id);
    if (v !== undefined) earlier.push(num(v));
  }
  if (earlier.length < 3) return null;
  const mean = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  return Math.round((num(last.value) - mean) * 10) / 10;
}

// App rule: red goes to the flight surgeon; amber that persists three days goes to the crew.
export function escalation(status, runDays) {
  if (status === 'red') return 'surgeon';
  if (status === 'amber') return runDays >= 3 ? 'crew' : 'self';
  return 'none';
}

export function worst(statuses) {
  return statuses.reduce((w, s) => (RANK[s] > RANK[w] ? s : w), 'none');
}
