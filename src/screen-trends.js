import { INDICATORS } from './indicators.js';
import { NASA } from './nasa-data.js';
import { indicatorStates } from './alerts.js';
import { valueOf } from './rules.js';
import { boneLossRange, radiation, exerciseMinutes } from './projections.js';
import { h, statusLabel, reading, versusAverage } from './ui.js';

const GROUPS = [
  { title: 'Body', ids: ['bp', 'hr', 'glucose', 'temp', 'sleep', 'mood', 'vision'] },
  { title: 'Activity and exposure', ids: ['exercise', 'bone', 'radiation'] },
  { title: 'Cabin', ids: ['cabinCo2', 'cabinTemp'] },
];
const RANGES = [{ id: '7', label: '7 days', days: 7 }, { id: '30', label: '30 days', days: 30 }, { id: 'all', label: 'All', days: Infinity }];
// These cover a fixed span, so the time range does not apply to them.
const FIXED_SPAN = ['vision', 'bone', 'radiation'];
const LIMITS = { cabinCo2: [{ y: 3, label: 'NASA limit' }], cabinTemp: [{ y: 18, label: 'NASA lower limit' }, { y: 27, label: 'NASA upper limit' }] };
let range = '30';

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const flagged = status => status === 'amber' || status === 'red';
// Datasets named with a leading underscore are drawn but stay out of the legend and the tooltip.
const unlisted = label => label.startsWith('_');
const sample = (from, to) => {
  const out = [];
  for (let d = from; d < to; d += 10) out.push(d);
  return [...out, to];
};

export function render(root, ctx) {
  const { state } = ctx;
  const states = indicatorStates(state, ctx.weather.summary);
  const boneNow = boneLossRange(state.day);
  const metric = id => {
    if (id === 'bone') return { id, label: 'Bone density loss', display: `${boneNow.minPct}–${boneNow.maxPct}%`, status: 'none', delta: null };
    const ind = INDICATORS.find(i => i.id === id);
    return { ...states[id], id, ind, label: ind.label };
  };
  const ids = GROUPS.flatMap(g => g.ids);
  const focus = ctx.params.get('focus');
  const current = metric(ids.includes(focus) ? focus : ids[0]);

  const span = RANGES.find(r => r.id === range).days;
  const first = Math.max(1, state.day - span + 1);
  const days = Array.from({ length: state.day - first + 1 }, (_, i) => first + i);

  const c = { ink: css('--ink'), muted: css('--muted'), line: css('--line'), raised: css('--raised'), series: css('--series'), series2: css('--series-2') };
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  const axis = (text, more) => ({ title: { display: true, text, color: c.muted }, ticks: { color: c.muted, maxTicksLimit: 8 }, border: { display: false }, grid: { color: c.line }, ...more });
  const dayAxis = more => axis('Mission day', { grid: { display: false }, ...more });
  const line = (label, data, color, more) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, cubicInterpolationMode: 'monotone', ...more });
  const reference = (label, data, more) => line(label, data, c.muted, { borderWidth: 1.5, borderDash: [6, 4], pointHoverRadius: 0, ...more });
  const band = (label, low, high, color) => [
    { label: '_low', data: low, borderWidth: 0, pointRadius: 0, pointHoverRadius: 0 },
    { label, data: high, borderWidth: 0, pointRadius: 0, pointHoverRadius: 0, fill: '-1', backgroundColor: color },
  ];
  const level = y => Array(days.length).fill(y);
  const healthy = green => band('_healthy range', level(green.min), level(green.max), c.muted + '1F');
  const values = (id, key) => days.map(d => {
    const v = valueOf(state.entries[d], id);
    return v === undefined ? null : key ? v[key] : v;
  });
  // Charts on a numeric day axis give points as {x, y}; the rest plot one value per listed day.
  const config = (type, data, scales, { linear = false, legend = false } = {}) => ({
    type, data,
    options: {
      responsive: true, maintainAspectRatio: false, animation: calm ? false : { duration: 300 },
      interaction: linear ? { mode: 'nearest', axis: 'x', intersect: false } : { mode: 'index', intersect: false },
      scales,
      plugins: {
        legend: { display: legend, align: 'end', labels: { color: c.ink, usePointStyle: true, pointStyle: 'line', filter: item => !unlisted(item.text) } },
        tooltip: {
          backgroundColor: c.raised, borderColor: c.line, borderWidth: 1, titleColor: c.ink, bodyColor: c.ink, padding: 10, boxPadding: 4, usePointStyle: true,
          filter: item => !unlisted(item.dataset.label),
          callbacks: { title: items => (items.length ? `Day ${linear ? items[0].parsed.x : items[0].label}` : '') },
        },
      },
    },
  });

  // What to draw for the chosen reading, and the one line that explains it.
  const view = () => {
    const { id, ind } = current;
    if (id === 'vision') {
      const reported = Object.keys(state.entries).map(Number).filter(d => valueOf(state.entries[d], 'vision') !== undefined).sort((a, b) => b - a).slice(0, 7);
      return {
        body: h('ul', { class: 'rows' }, reported.map(d => h('li', null, `Day ${d}`, h('span', null, ind.format(state.entries[d].vision))))),
        note: 'Vision is a report of what you notice, so it is listed, not charted.',
      };
    }
    if (id === 'exercise') {
      return {
        chart: config('bar', {
          labels: days,
          datasets: [
            { label: 'Minutes', data: days.map(d => exerciseMinutes(state.tasksDone[d])), backgroundColor: c.series, borderRadius: 3, maxBarThickness: 16 },
            { type: 'line', ...reference('NASA guidance', level(NASA.exerciseMinPerDay)) },
          ],
        }, { x: dayAxis(), y: axis('Minutes', { beginAtZero: true }) }),
        note: `The dashed line is NASA's guidance of about ${NASA.exerciseMinPerDay} minutes a day.`,
      };
    }
    if (id === 'bone') {
      const points = sample(0, NASA.boneLossValidDays);
      const at = key => points.map(d => ({ x: d, y: boneLossRange(d)[key] }));
      return {
        chart: config('line', {
          datasets: [
            ...band('NASA average range', at('minPct'), at('maxPct'), c.series + '40'),
            line(`Today, day ${state.day}`, [{ x: state.day, y: boneNow.minPct }, { x: state.day, y: boneNow.maxPct }], c.ink, { pointRadius: 3.5 }),
          ],
        }, { x: dayAxis({ type: 'linear', min: 0, max: NASA.boneLossValidDays }), y: axis('Loss, % of bone mineral density', { beginAtZero: true }) }, { linear: true }),
        note: `The band is NASA's average loss of ${NASA.boneLossPctPerMonth.min}–${NASA.boneLossPctPerMonth.max}% per month and the marker is today. It is not a measurement of you. In partial gravity the rate is not yet known.`,
      };
    }
    if (id === 'radiation') {
      const p = state.profile;
      const dose = d => ({ x: d, y: radiation(p, d).cumulativeMsv });
      return {
        chart: config('line', {
          datasets: [
            line('Dose so far', sample(0, state.day).map(dose), c.series),
            line('Projection', sample(state.day, p.stayDays).map(dose), c.series, { borderDash: [6, 4] }),
            reference('NASA career limit', [{ x: 0, y: NASA.careerLimitMsv }, { x: p.stayDays, y: NASA.careerLimitMsv }], { borderDash: [2, 3] }),
          ],
        }, { x: dayAxis({ type: 'linear', min: 0, max: p.stayDays }), y: axis('mSv', { beginAtZero: true }) }, { linear: true }),
        note: `Solid line: dose so far. Dashed: projection to day ${p.stayDays}, ${radiation(p, state.day).projectedMsv} mSv. Dotted: NASA's career limit of ${NASA.careerLimitMsv} mSv. NASA dose rate for this mission, simulated dosimeter.`,
      };
    }
    const limits = LIMITS[id] ?? [];
    const datasets = id === 'bp'
      ? [line('Systolic', values('bp', 'sys'), c.series), line('Diastolic', values('bp', 'dia'), c.series2), ...healthy(ind.green.sys), ...healthy(ind.green.dia)]
      : [line(ind.label, values(id), c.series, { stepped: id === 'mood' }), ...healthy(ind.green), ...limits.map(l => reference(l.label, level(l.y)))];
    return {
      chart: config('line', { labels: days, datasets }, {
        x: dayAxis(),
        y: axis(ind.unit || 'Self-rating, 1 to 5', id === 'mood' ? { min: 1, max: 5, ticks: { color: c.muted, stepSize: 1 } } : {}),
      }, { legend: id === 'bp' }),
      note: id === 'bp' ? 'The shaded bands are the healthy ranges for each number.'
        : `The shaded band is the healthy range.${limits.length ? ' The dashed line is NASA\'s limit for the cabin.' : ''}`,
    };
  };
  const { chart, body, note } = view();

  const canvas = chart ? h('canvas', { role: 'img', 'aria-label': `${current.label} by mission day` }) : null;
  const nav = h('nav', { class: 'metrics', 'aria-label': 'Readings' },
    GROUPS.flatMap(g => [
      h('h2', null, g.title),
      h('ul', null, g.ids.map(metric).map(m => h('li', null,
        h('a', { id: `metric-${m.id}`, href: `#/trends?focus=${m.id}`, 'aria-current': m.id === current.id ? 'true' : null },
          h('span', null, m.label),
          flagged(m.status) ? statusLabel(m.status) : null,
          h('span', { class: 'metric-value' }, m.display))))),
    ]));
  root.append(
    h('h1', null, 'Trends'),
    h('div', { class: 'trends' },
      nav,
      h('section', { class: 'panel', 'aria-label': current.label },
        h('header', { class: 'chart-head' },
          h('div', null,
            h('h2', null, current.label),
            h('p', { class: 'chart-reading' }, reading(current.display, current.ind?.unit), current.ind ? statusLabel(current.status) : null),
            h('p', { class: 'muted small' }, current.ind ? (current.delta !== null ? versusAverage(current.delta) : null) : `Estimated for day ${state.day}`)),
          FIXED_SPAN.includes(current.id) ? null : h('fieldset', { class: 'segmented', 'aria-label': 'Time range' },
            RANGES.map(r => h('label', null,
              h('input', { type: 'radio', name: 'range', id: `range-${r.id}`, value: r.id, checked: range === r.id, onchange: () => { range = r.id; ctx.refresh(); } }),
              r.label)))),
        canvas ? h('div', { class: 'chart-box' }, canvas) : body,
        h('p', { class: 'chart-note muted small' }, note))));

  // On a narrow screen the list is one scrolling row; keep the chosen reading in view.
  const here = document.getElementById(`metric-${current.id}`);
  nav.scrollLeft = here.offsetLeft - nav.offsetLeft - (nav.clientWidth - here.offsetWidth) / 2;

  const drawn = chart ? new window.Chart(canvas, chart) : null;
  return () => drawn?.destroy();
}
