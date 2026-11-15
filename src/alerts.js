import { INDICATORS, REGIONS, SEVERITY_STATUS, STATUS_LABEL } from './indicators.js';
import { NASA, SOURCES } from './nasa-data.js';
import { classify, latest, flaggedRun, baselineDelta, escalation, worst } from './rules.js';
import { radiation, exerciseAvg, replyDelay } from './projections.js';

export const ESCALATION_LABEL = {
  none: '',
  self: 'Self-care',
  crew: 'Tell the crew medical officer',
  surgeon: 'Contact the flight surgeon',
};

const CSV_COLUMNS = ['sys', 'dia', 'hr', 'glucose', 'temp', 'sleep', 'mood', 'vision', 'cabinCo2', 'cabinTemp'];
const ORDER = { red: 0, amber: 1, info: 2 };
const flagged = s => s === 'amber' || s === 'red';

export function indicatorStates(state, weather) {
  const out = {};
  for (const ind of INDICATORS) {
    const base = { id: ind.id, day: state.day, delta: null };
    if (ind.id === 'radiation') {
      const r = radiation(state.profile, state.day);
      out[ind.id] = {
        ...base, value: r.cumulativeMsv,
        // A solar particle event in progress outranks the dose projection.
        status: weather?.status === 'red' ? 'red' : r.status,
        display: `${r.cumulativeMsv} of ${NASA.careerLimitMsv} mSv`,
      };
    } else if (ind.id === 'exercise') {
      const avg = exerciseAvg(state.tasksDone, state.day);
      out[ind.id] = { ...base, value: avg, status: classify(ind.id, avg), display: ind.format(avg) };
    } else {
      const last = latest(state.entries, ind.id, state.day);
      out[ind.id] = last
        ? { ...base, day: last.day, value: last.value, status: classify(ind.id, last.value), display: ind.format(last.value), delta: baselineDelta(state.entries, ind.id, state.day) }
        : { ...base, day: null, value: null, status: 'none', display: 'No data' };
    }
  }
  return out;
}

export function regionStatuses(state, weather) {
  const states = indicatorStates(state, weather);
  const out = {};
  for (const region of REGIONS) {
    const symptoms = state.symptoms.filter(s => s.region === region.id);
    out[region.id] = {
      status: worst([...region.indicatorIds.map(id => states[id].status), ...symptoms.map(s => SEVERITY_STATUS[s.severity])]),
      indicatorIds: region.indicatorIds,
      symptoms,
    };
  }
  return out;
}

export function buildAlerts(state, weather) {
  const states = indicatorStates(state, weather);
  const delayText = replyDelay(state.profile).text;
  const alerts = [];
  const add = alert => alerts.push({ ...alert, delayText: alert.escalation === 'surgeon' ? delayText : null });
  const radiationInd = INDICATORS.find(i => i.id === 'radiation');

  if (weather && flagged(weather.status)) {
    add({
      id: 'weather', kind: 'weather', status: weather.status, title: weather.headline,
      detail: `NASA limits exposure from one solar particle event to ${NASA.speLimitMsv} mSv.`,
      actions: radiationInd.actions[weather.status],
      escalation: weather.status === 'red' ? 'surgeon' : 'self', source: SOURCES.donki,
    });
  }

  state.symptoms.forEach((symptom, i) => {
    const status = SEVERITY_STATUS[symptom.severity];
    add({
      id: `symptom-${i}`, kind: 'symptom', status,
      title: `${REGIONS.find(r => r.id === symptom.region).label}: symptom reported`,
      detail: `${symptom.text} (${symptom.severity})`,
      actions: [status === 'red' ? 'Tell the crew medical officer and contact the flight surgeon.' : 'Note it in your journal and re-check tomorrow.'],
      escalation: status === 'red' ? 'surgeon' : 'self', source: SOURCES.hazards,
    });
  });

  for (const ind of INDICATORS) {
    // The weather alert already covers a storm, so radiation is judged on its dose alone here.
    const status = ind.id === 'radiation' ? radiation(state.profile, state.day).status : states[ind.id].status;
    if (!flagged(status)) continue;
    const s = states[ind.id];
    const when = ind.derived ? '' : s.day === state.day ? ', recorded today' : `, recorded on day ${s.day}`;
    add({
      id: ind.id, kind: 'indicator', status, title: ind.label,
      detail: `${s.display}${when}`, actions: ind.actions[status],
      escalation: escalation(status, ind.derived ? 1 : flaggedRun(state.entries, ind.id, state.day)),
      source: ind.source,
    });
  }

  if (!state.hasCheckedInToday) {
    add({
      id: 'checkin', kind: 'checkin', status: 'info', title: 'Today\'s check-in is due',
      detail: 'Record today\'s readings so changes are caught early.', actions: [], escalation: 'none', source: SOURCES.hazards,
    });
  }
  return alerts.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}

export function needsAttention(alerts) {
  return alerts.filter(a => flagged(a.status)).length;
}

// Plain-text summary for the flight surgeon. Nothing is transmitted; the crew copies it.
export function buildReport(state, alerts) {
  const states = indicatorStates(state, null);
  const lines = ['SIMULATED DATA - PROTOTYPE', `Mission day ${state.day}, ${state.profile.name}`, '', 'NEEDS ATTENTION'];
  const open = alerts.filter(a => flagged(a.status));
  if (open.length === 0) lines.push('Nothing flagged today.');
  for (const a of open) {
    lines.push(`- ${a.title} (${STATUS_LABEL[a.status]})`, `  ${a.detail}`);
    if (ESCALATION_LABEL[a.escalation]) lines.push(`  ${ESCALATION_LABEL[a.escalation]}`);
  }
  lines.push('', 'LATEST READINGS');
  for (const ind of INDICATORS) lines.push(`${ind.label}: ${states[ind.id].display}`);
  return lines.join('\n');
}

// Readings only. Journal and symptom text stay out so free text cannot break the columns.
export function buildCsv(state) {
  const rows = Object.keys(state.entries).map(Number).sort((a, b) => a - b)
    .map(day => [day, ...CSV_COLUMNS.map(c => state.entries[day][c] ?? '')].join(','));
  return ['day,' + CSV_COLUMNS.join(','), ...rows].join('\n');
}
