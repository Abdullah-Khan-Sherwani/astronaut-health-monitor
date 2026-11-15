import { NASA, TASKS } from './nasa-data.js';

const round1 = n => Math.round(n * 10) / 10;
const minutesOf = hhmm => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

// NASA's average of 1-1.5% per month comes from four-to-six month missions, so the estimate
// stops at day 180 instead of extrapolating.
export function boneLossRange(day) {
  const months = Math.min(day, NASA.boneLossValidDays) / 30;
  return {
    minPct: round1(months * NASA.boneLossPctPerMonth.min),
    maxPct: round1(months * NASA.boneLossPctPerMonth.max),
    beyondData: day > NASA.boneLossValidDays,
  };
}

export function radiation(profile, day) {
  const limit = NASA.careerLimitMsv;
  const cumulative = profile.priorDoseMsv + profile.doseMsvPerDay * day;
  const projected = profile.priorDoseMsv + profile.doseMsvPerDay * profile.stayDays;
  const status = round1(cumulative) >= limit ? 'red' : round1(projected) >= limit ? 'amber' : 'green';
  return {
    cumulativeMsv: round1(cumulative),
    projectedMsv: round1(projected),
    pctOfLimit: round1((cumulative / limit) * 100),
    daysToLimit: Math.max(0, Math.ceil(round1(limit - cumulative) / profile.doseMsvPerDay)),
    status,
  };
}

export function exerciseMinutes(doneIds) {
  return TASKS.filter(t => doneIds?.includes(t.id)).reduce((n, t) => n + t.minutes, 0);
}

// Mean over the seven days before today; today is left out so the figure does not sag each morning.
export function exerciseAvg(tasksDone, day) {
  let total = 0;
  for (let d = day - 7; d < day; d++) total += exerciseMinutes(tasksDone[d]);
  return Math.round(total / 7);
}

export function replyDelay(profile) {
  const roundTripSec = round1(profile.delaySecOneWay * 2);
  if (roundTripSec === 0) return { roundTripSec, text: 'Ground can answer in near real time.' };
  if (roundTripSec < 60) return { roundTripSec, text: `A reply takes about ${Math.round(roundTripSec)} seconds.` };
  const minutes = Math.round(roundTripSec / 60);
  return { roundTripSec, text: `A reply takes at least ${minutes} minutes (${minutes / 2} each way). Start the onboard steps now.` };
}

export function reminders(doneIds, nowMinutes) {
  const undone = TASKS.filter(t => !doneIds?.includes(t.id)).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  return {
    overdue: undone.filter(t => minutesOf(t.time) <= nowMinutes).map(t => t.id),
    next: undone.find(t => minutesOf(t.time) > nowMinutes)?.id ?? null,
  };
}
