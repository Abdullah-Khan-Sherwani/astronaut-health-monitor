import { INDICATORS, REGIONS, STATUS_LABEL } from './indicators.js';
import { TASKS } from './nasa-data.js';
import { regionStatuses, indicatorStates, buildAlerts, needsAttention, ESCALATION_LABEL } from './alerts.js';
import { flaggedRun, escalation } from './rules.js';
import { boneLossRange, reminders } from './projections.js';
import { h, svg, statusBadge, sourceLink, signed } from './ui.js';

const RANK = { red: 3, amber: 2, green: 1, none: 0 };
let selected = null;
let symptomError = null;

// Original stylised figure. Each shape group is one selectable region.
const SHAPES = {
  cabin: () => [svg('rect', { x: 6, y: 6, width: 188, height: 428, rx: 28, class: 'cabin-ring' })],
  bones: () => [
    svg('rect', { x: 34, y: 96, width: 20, height: 130, rx: 10 }),
    svg('rect', { x: 146, y: 96, width: 20, height: 130, rx: 10 }),
    svg('rect', { x: 68, y: 236, width: 28, height: 176, rx: 14 }),
    svg('rect', { x: 104, y: 236, width: 28, height: 176, rx: 14 }),
  ],
  body: () => [svg('path', { d: 'M62 104 Q62 88 78 88 H122 Q138 88 138 104 L132 232 Q131 244 119 244 H81 Q69 244 68 232 Z' })],
  head: () => [svg('circle', { cx: 100, cy: 50, r: 30 })],
  gut: () => [svg('ellipse', { cx: 100, cy: 196, rx: 24, ry: 20 })],
  heart: () => [svg('path', { d: 'M112 142 C96 130 96 114 106 114 C110 114 112 117 112 120 C112 117 114 114 118 114 C128 114 128 130 112 142 Z' })],
  eyes: () => [svg('ellipse', { cx: 89, cy: 48, rx: 7, ry: 5 }), svg('ellipse', { cx: 111, cy: 48, rx: 7, ry: 5 })],
};
const DRAW_ORDER = ['cabin', 'bones', 'body', 'head', 'gut', 'heart', 'eyes'];

export function render(root, ctx) {
  const { state, store } = ctx;
  const weather = ctx.weather.summary;
  const regions = regionStatuses(state, weather);
  const states = indicatorStates(state, weather);
  const alerts = buildAlerts(state, weather);
  const count = needsAttention(alerts);

  if (!selected || !regions[selected]) {
    selected = REGIONS.reduce((best, r) => (RANK[regions[r.id].status] > RANK[regions[best].status] ? r.id : best), REGIONS[0].id);
  }
  const select = id => { selected = id; symptomError = null; ctx.refresh(); };
  const label = id => REGIONS.find(r => r.id === id).label;

  // Summary strip
  const now = new Date();
  const due = reminders(state.tasksDone[state.day], now.getHours() * 60 + now.getMinutes());
  const nextTask = TASKS.find(t => t.id === due.next);
  const strip = h('section', { class: 'strip', 'aria-label': 'Today' },
    h('p', { class: 'strip-count' }, h('strong', null, String(count)), count === 1 ? ' needs attention' : ' need attention'),
    alerts[0] && alerts[0].status !== 'info'
      ? h('p', null, h('a', { href: '#/alerts' }, alerts[0].title))
      : h('p', null, 'Nothing is flagged today.'),
    h('p', null,
      nextTask ? `Next: ${nextTask.label} at ${nextTask.time}` : 'All of today\'s tasks are done or past.',
      due.overdue.length ? h('span', null, ' ', h('a', { href: '#/routine' }, `${due.overdue.length} overdue`)) : null),
    state.hasCheckedInToday ? null : h('a', { class: 'button', href: '#/checkin' }, 'Start today\'s check-in'));

  // Figure
  const figure = svg('svg', { viewBox: '0 0 200 440', class: 'figure', role: 'group', 'aria-label': 'Body map' },
    DRAW_ORDER.map(id => svg('g', {
      id: `figure-${id}`, class: 'region', 'data-region': id, 'data-status': regions[id].status,
      role: 'button', tabindex: '0', 'aria-pressed': String(selected === id),
      'aria-label': `${label(id)}: ${STATUS_LABEL[regions[id].status]}`,
      onclick: () => select(id),
      onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } },
    }, SHAPES[id]())));

  const list = h('ul', { class: 'region-list' },
    REGIONS.map(r => h('li', null,
      h('button', { type: 'button', id: `region-${r.id}`, class: 'region-button', 'aria-pressed': String(selected === r.id), onclick: () => select(r.id) },
        h('span', null, r.label), statusBadge(regions[r.id].status)))));

  root.append(
    h('h1', null, 'Body map'),
    strip,
    h('div', { class: 'home' },
      h('div', { class: 'home-figure' }, figure, list),
      detailPanel(ctx, REGIONS.find(r => r.id === selected), regions[selected], states)));
}

function detailPanel(ctx, region, regionState, states) {
  const { state, store } = ctx;
  const panel = h('section', { class: 'panel', 'aria-live': 'polite' },
    h('h2', null, region.label, ' ', statusBadge(regionState.status)));

  for (const id of region.indicatorIds) {
    const ind = INDICATORS.find(i => i.id === id);
    const s = states[id];
    const flagged = s.status === 'amber' || s.status === 'red';
    const level = flagged ? escalation(s.status, ind.derived ? 1 : flaggedRun(state.entries, id, state.day)) : 'none';
    panel.append(h('article', { class: 'reading' },
      h('h3', null, ind.label),
      h('p', { class: 'reading-value' },
        h('span', { class: 'value' }, s.display), ' ', statusBadge(s.status),
        s.day && s.day !== state.day && !ind.derived ? h('span', { class: 'muted' }, ` day ${s.day}`) : null),
      s.delta !== null ? h('p', { class: 'muted' }, signed(s.delta)) : null,
      id === 'exercise' ? boneLine(state.day) : null,
      h('p', null, ind.why),
      flagged ? h('div', { class: 'action', 'data-status': s.status },
        h('h4', null, 'What to do now'),
        h('ol', null, ind.actions[s.status].map(a => h('li', null, a))),
        h('p', { class: 'escalation' }, ESCALATION_LABEL[level])) : null,
      h('details', null,
        h('summary', null, 'How to measure it'),
        h('ol', null, ind.howTo.map(step => h('li', null, step)))),
      h('p', { class: 'meta' },
        sourceLink(ind.source), ' ',
        id === 'radiation' ? null : h('a', { href: `#/trends?focus=${id}` }, 'See trend')),
      ind.appRuleNote ? h('p', { class: 'muted' }, ind.appRuleNote) : null));
  }

  if (region.bodyPart) panel.append(symptomBlock(ctx, region, regionState));
  return panel;
}

function boneLine(day) {
  const loss = boneLossRange(day);
  return h('p', null, `Estimated bone density loss so far: ${loss.minPct}–${loss.maxPct}% (NASA average, not a measurement of you).`);
}

function symptomBlock(ctx, region, regionState) {
  const { state, store } = ctx;
  const textId = `symptom-text-${region.id}`;
  const text = h('input', { id: textId, type: 'text', maxlength: '200', autocomplete: 'off', 'aria-describedby': 'symptom-error' });
  const severity = h('select', { id: `symptom-severity-${region.id}` },
    ['mild', 'moderate', 'severe'].map(v => h('option', { value: v }, v[0].toUpperCase() + v.slice(1))));
  const submit = e => {
    e.preventDefault();
    const result = store.addSymptom({ region: region.id, text: text.value, severity: severity.value });
    symptomError = result.ok ? null : Object.values(result.errors)[0];
    ctx.refresh();
  };
  return h('section', { class: 'symptoms' },
    h('h3', null, 'Symptoms reported today'),
    regionState.symptoms.length
      ? h('ul', null, regionState.symptoms.map(s => h('li', null,
        h('span', null, s.text), ' ', h('span', { class: 'muted' }, `(${s.severity})`), ' ',
        h('button', { type: 'button', class: 'quiet', onclick: () => { store.removeSymptom(state.symptoms.indexOf(s)); ctx.refresh(); document.getElementById(textId)?.focus(); } }, 'Remove'))))
      : h('p', { class: 'muted' }, 'None.'),
    h('form', { class: 'symptom-form', onsubmit: submit },
      h('label', { for: textId }, 'Report a symptom or discomfort here'),
      h('div', { class: 'row' }, text,
        h('label', { class: 'visually-hidden', for: severity.id }, 'Severity'), severity,
        h('button', { type: 'submit', id: `symptom-add-${region.id}` }, 'Add')),
      h('p', { id: 'symptom-error', class: 'error' }, symptomError ?? ''),
      h('p', { class: 'muted' }, 'Mild and moderate show as Watch, severe as Act now. Severity colours are this app\'s own rule.')));
}
