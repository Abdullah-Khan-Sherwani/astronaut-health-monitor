import { TASKS } from './nasa-data.js';

// Deterministic generator so the demo history is identical on every load.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_TASKS = TASKS.map(t => t.id);

// Scripted episodes from the design, section 7. Everything else stays inside the green bands.
const FEVER = { 84: 37.6, 85: 38.3, 86: 37.5 };
const SLEEP = { 112: 6.6, 113: 6.4, 114: 6.5, 115: 6.2, 116: 6.3, 117: 6.0, 118: 5.9, 119: 5.8 };
const MOOD = { 112: 3, 113: 3, 114: 3, 115: 3, 116: 2, 117: 3, 118: 2, 119: 2 };
const BP = { 116: [124, 78], 117: [127, 79], 118: [129, 81], 119: [131, 82] };
const CO2 = { 118: 3.2, 119: 3.4 };
const MISSED_CHECKIN = [98, 99];
const SKIPPED = { 114: ['resistive'], 116: ['resistive'], 117: ['resistive'], 118: ['resistive', 'cardio'], 119: ['resistive', 'cardio'] };

export function simulate() {
  const rand = mulberry32(2026);
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
  const dec = (min, max) => Math.round((min + rand() * (max - min)) * 10) / 10;
  const entries = {};
  const tasksDone = {};
  for (let day = 1; day <= 119; day++) {
    // Draw every value on every day so the sequence does not shift around the scripted days.
    const e = {
      sys: int(106, 118), dia: int(66, 78), hr: int(52, 66), glucose: int(78, 96),
      temp: dec(36.4, 37.0), sleep: dec(7.0, 8.2), mood: int(4, 5), vision: 'none',
      cabinCo2: dec(2.0, 2.8), cabinTemp: dec(21.5, 23.5),
    };
    if (FEVER[day]) { e.temp = FEVER[day]; e.hr += 12; }
    if (SLEEP[day]) e.sleep = SLEEP[day];
    if (MOOD[day]) e.mood = MOOD[day];
    if (BP[day]) [e.sys, e.dia] = BP[day];
    if (CO2[day]) e.cabinCo2 = CO2[day];
    const missed = MISSED_CHECKIN.includes(day);
    if (!missed) entries[day] = e;
    const skipped = [...(SKIPPED[day] ?? []), ...(missed ? ['checkin'] : [])];
    tasksDone[day] = ALL_TASKS.filter(id => !skipped.includes(id));
  }
  return { entries, tasksDone };
}
