import { INDICATORS } from './indicators.js';
import { NASA } from './nasa-data.js';
import { indicatorStates } from './alerts.js';
import { valueOf } from './rules.js';
import { boneLossRange, radiation, exerciseMinutes } from './projections.js';
import { h, statusBadge, signed } from './ui.js';

const RANGES = [{ id: '7', label: '7 days', days: 7 }, { id: '30', label: '30 days', days: 30 }, { id: 'all', label: 'All', days: Infinity }];
const CHARTED = ['bp', 'hr', 'glucose', 'temp', 'sleep', 'mood', 'cabinCo2', 'cabinTemp'];
const LIMITS = { cabinCo2: [{ y: 3, label: 'NASA limit 3 mmHg' }], cabinTemp: [{ y: 18, label: 'NASA limit 18 °C' }, { y: 27, label: 'NASA limit 27 °C' }] };
let range = '30';

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function render(root, ctx) {
  const { state } = ctx;
  const states = indicatorStates(state, ctx.weather.summary);
  const charts = [];
  const colors = { ink: css('--ink'), muted: css('--muted'), line: css('--line'), series: css('--series'), series2: css('--series-2'), ok: css('--ok'), act: css('--act'), watch: css('--watch') };
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const base = extra => ({
    responsive: true, maintainAspectRatio: false, animation: calm ? false : { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: colors.ink, boxWidth: 14, filter: item => !item.text.startsWith('_') } },
      tooltip: { filter: item => !item.dataset.label.startsWith('_') },
    },
    ...extra,
  });
  const axis = (title, more = {}) => ({ title: { display: true, text: title, color: colors.muted }, ticks: { color: colors.muted }, grid: { color: colors.line }, ...more });
  const flat = (label, y, n, color, dash = [6, 4]) => ({ label, data: Array(n).fill(y), borderColor: color, borderDash: dash, borderWidth: 1.5, pointRadius: 0, fill: false });
  const bandPair = (green, n) => [
    { label: '_low', data: Array(n).fill(green.min), borderWidth: 0, pointRadius: 0, fill: false },
    { label: '_normal range', data: Array(n).fill(green.max), borderWidth: 0, pointRadius: 0, fill: '-1', backgroundColor: colors.ok + '26' },
  ];
  const draw = (canvas, config) => charts.push(new window.Chart(canvas, config));

  const figure = (id, title, canvasLabel, caption) => {
    const canvas = h('canvas', { role: 'img', 'aria-label': canvasLabel });
    const fig = h('figure', { id: `chart-${id}`, class: 'chart' },
      h('h3', null, title), h('div', { class: 'chart-box' }, canvas), h('figcaption', null, caption));
    return { fig, canvas };
  };
  const captionFor = id => {
    const s = states[id];
    return [
      h('span', null, `Latest: ${s.display} `), statusBadge(s.status),
      s.delta !== null ? h('span', { class: 'muted' }, ` ${signed(s.delta)}`) : null,
    ];
  };

  const span = RANGES.find(r => r.id === range).days;
  const first = Math.max(1, state.day - span + 1);
  const days = [];
  for (let d = first; d <= state.day; d++) days.push(d);
  const series = (key, id) => days.map(d => {
    const v = valueOf(state.entries[d], id);
    return v === undefined ? null : key ? v[key] : v;
  });

  const toggle = h('fieldset', { class: 'range' }, h('legend', null, 'Show'),
    RANGES.map(r => h('label', { class: 'option' },
      h('input', { type: 'radio', name: 'range', id: `range-${r.id}`, value: r.id, checked: range === r.id, onchange: () => { range = r.id; ctx.refresh(); } }),
      r.label)));

  const grid = h('div', { class: 'charts' });
  root.append(h('h1', null, 'Trends'), toggle, grid);

  for (const id of CHARTED) {
    const ind = INDICATORS.find(i => i.id === id);
    if (id === 'cabinCo2') grid.append(h('h2', { class: 'charts-heading' }, 'Cabin environment'));
    const { fig, canvas } = figure(id, ind.label, `${ind.label} over mission days ${first} to ${state.day}`, captionFor(id));
    grid.append(fig);
    const line = (label, data, color) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: days.length > 40 ? 0 : 2.5, spanGaps: false, stepped: id === 'mood', tension: 0 });
    const datasets = id === 'bp'
      ? [line('Systolic', series('sys', 'bp'), colors.series), line('Diastolic', series('dia', 'bp'), colors.series2), ...bandPair(ind.green.sys, days.length), ...bandPair(ind.green.dia, days.length)]
      : [line(ind.label, series(null, id), colors.series), ...bandPair(ind.green, days.length), ...(LIMITS[id] ?? []).map(l => flat(l.label, l.y, days.length, colors.act))];
    draw(canvas, {
      type: 'line', data: { labels: days, datasets },
      options: base({ scales: { x: axis('Mission day'), y: axis(ind.unit || 'Self-rating, 1 to 5', id === 'mood' ? { min: 1, max: 5, ticks: { color: colors.muted, stepSize: 1 } } : {}) } }),
    });
  }

  // Vision is a symptom report, so it is listed, not charted.
  const visionInd = INDICATORS.find(i => i.id === 'vision');
  const visionDays = days.filter(d => valueOf(state.entries[d], 'vision') !== undefined).slice(-3).reverse();
  grid.append(h('figure', { id: 'chart-vision', class: 'chart' },
    h('h3', null, 'Vision'),
    h('ul', null, visionDays.map(d => h('li', null, `Day ${d}: ${visionInd.format(state.entries[d].vision)}`))),
    h('figcaption', null, captionFor('vision'))));

  // Exercise
  {
    const { fig, canvas } = figure('exercise', 'Exercise minutes per day', 'Exercise minutes per day', captionFor('exercise'));
    grid.append(h('h2', { class: 'charts-heading' }, 'Bone, muscle and radiation'), fig);
    draw(canvas, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [
          { type: 'bar', label: 'Minutes', data: days.map(d => exerciseMinutes(state.tasksDone[d])), backgroundColor: colors.series },
          { type: 'line', ...flat(`NASA: about ${NASA.exerciseMinPerDay} minutes a day`, NASA.exerciseMinPerDay, days.length, colors.ok) },
        ],
      },
      options: base({ scales: { x: axis('Mission day'), y: axis('Minutes', { beginAtZero: true }) } }),
    });
  }

  // Bone-loss estimate: drawn only as far as NASA's data reaches.
  {
    const points = [];
    for (let d = 0; d <= NASA.boneLossValidDays; d += 10) points.push(d);
    const today = boneLossRange(state.day);
    const { fig, canvas } = figure('bone', 'Estimated bone density loss', 'Estimated bone density loss band from day 0 to day 180',
      [h('span', null, `Day ${state.day}: ${today.minPct}–${today.maxPct}% estimated. `),
        h('span', { class: 'muted' }, `NASA's average of ${NASA.boneLossPctPerMonth.min}–${NASA.boneLossPctPerMonth.max}% per month, not a measurement of you. In partial gravity the rate is not yet known.`)]);
    grid.append(fig);
    draw(canvas, {
      type: 'line',
      data: {
        datasets: [
          { label: 'Lower estimate', data: points.map(d => ({ x: d, y: boneLossRange(d).minPct })), borderColor: colors.series, borderWidth: 1.5, pointRadius: 0, fill: false },
          { label: 'Upper estimate', data: points.map(d => ({ x: d, y: boneLossRange(d).maxPct })), borderColor: colors.series, borderWidth: 1.5, pointRadius: 0, fill: '-1', backgroundColor: colors.series + '33' },
          { label: `Today (day ${state.day})`, data: [{ x: state.day, y: today.minPct }, { x: state.day, y: today.maxPct }], borderColor: colors.watch, backgroundColor: colors.watch, borderWidth: 3, pointRadius: 4 },
        ],
      },
      options: base({ scales: { x: axis('Mission day', { type: 'linear', min: 0, max: NASA.boneLossValidDays }), y: axis('Loss, % of bone mineral density', { beginAtZero: true }) } }),
    });
  }

  // Radiation: measured to today, projected to the end of the stay, against NASA's career limit.
  {
    const p = state.profile;
    const now = radiation(p, state.day);
    const dose = d => radiation(p, d).cumulativeMsv;
    const { fig, canvas } = figure('radiation', 'Cumulative radiation dose', `Cumulative radiation dose against the ${NASA.careerLimitMsv} mSv career limit`,
      [h('span', null, `Day ${state.day}: ${now.cumulativeMsv} of ${NASA.careerLimitMsv} mSv (${now.pctOfLimit}%). Projected at day ${p.stayDays}: ${now.projectedMsv} mSv. `),
        statusBadge(states.radiation.status),
        h('span', { class: 'muted' }, ' NASA dose rate for this mission, simulated dosimeter.')]);
    grid.append(fig);
    draw(canvas, {
      type: 'line',
      data: {
        datasets: [
          { label: 'Dose so far', data: [{ x: 0, y: dose(0) }, { x: state.day, y: dose(state.day) }], borderColor: colors.series, backgroundColor: colors.series, borderWidth: 2.5, pointRadius: 3 },
          { label: 'Projection', data: [{ x: state.day, y: dose(state.day) }, { x: p.stayDays, y: dose(p.stayDays) }], borderColor: colors.series, borderDash: [6, 4], borderWidth: 2, pointRadius: 0 },
          { label: `NASA career limit ${NASA.careerLimitMsv} mSv`, data: [{ x: 0, y: NASA.careerLimitMsv }, { x: p.stayDays, y: NASA.careerLimitMsv }], borderColor: colors.act, borderWidth: 1.5, pointRadius: 0 },
        ],
      },
      options: base({ scales: { x: axis('Mission day', { type: 'linear', min: 0, max: p.stayDays }), y: axis('mSv', { beginAtZero: true }) } }),
    });
  }

  const focus = ctx.params.get('focus');
  if (focus) document.getElementById(`chart-${focus}`)?.scrollIntoView({ block: 'center' });

  return () => charts.forEach(chart => chart.destroy());
}
