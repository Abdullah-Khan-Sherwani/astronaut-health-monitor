import { INDICATORS, REGIONS, STATUS_LABEL } from './indicators.js';
import { TASKS } from './nasa-data.js';
import { regionStatuses, indicatorStates, buildAlerts, needsAttention, ESCALATION_LABEL } from './alerts.js';
import { flaggedRun, escalation } from './rules.js';
import { boneLossRange, reminders } from './projections.js';
import { h, svg, statusBadge, signed } from './ui.js';

const RANK = { red: 3, amber: 2, green: 1, none: 0 };
let selected = null;
let symptomError = null;
let symptomOpen = false;

// Original drawing: a front-facing figure in a 300 by 640 box. The left limbs are mirrored for the right.
const HEAD = 'M150 16C132 16 123 30 123 48C123 66 132 84 150 88C168 84 177 66 177 48C177 30 168 16 150 16Z';
const NECK = 'M137 76L135 98L165 98L163 76Z';
const TORSO = 'M134 98C124 108 106 110 94 114C96 130 98 146 99 160C101 190 106 220 105 246C104 266 97 284 96 306L96 318C110 326 135 334 150 346C165 334 190 326 204 318L204 306C203 284 196 266 195 246C194 220 199 190 201 160C202 146 204 130 206 114C194 110 176 108 166 98Z';
const ARM = 'M94 114C82 114 72 122 71 138C69 168 68 200 63 236C58 262 53 292 50 318C46 330 43 346 46 362C48 370 56 370 58 362C61 348 64 334 66 320C72 294 80 266 83 240C88 212 96 188 99 160C98 146 96 130 94 114Z';
const LEG = 'M96 304C91 340 93 400 102 450C98 480 100 520 110 580C106 596 98 606 100 614C108 620 126 620 131 613C132 602 129 592 128 580C134 540 136 490 133 452C138 420 146 380 150 346C135 334 110 326 96 318Z';
const HEART = 'M166 164C150 152 150 136 160 136C164 136 166 139 166 142C166 139 168 136 172 136C182 136 182 152 166 164Z';
const MIRROR = 'translate(300 0) scale(-1 1)';
const path = (d, transform) => svg('path', { d, transform });
const cabin = cls => svg('rect', { class: cls, x: 8, y: 4, width: 284, height: 632, rx: 44 });

const SHAPES = {
  cabin: () => [cabin('cabin-ring'), cabin('cabin-hit')],
  bones: () => [path(ARM), path(ARM, MIRROR), path(LEG), path(LEG, MIRROR)],
  body: () => [path(TORSO)],
  head: () => [path(NECK), path(HEAD)],
  gut: () => [svg('ellipse', { cx: 150, cy: 262, rx: 24, ry: 22 })],
  heart: () => [path(HEART)],
  eyes: () => [svg('ellipse', { cx: 140, cy: 50, rx: 5.5, ry: 3.2 }), svg('ellipse', { cx: 160, cy: 50, rx: 5.5, ry: 3.2 })],
};
const DRAW_ORDER = ['cabin', 'bones', 'body', 'head', 'gut', 'heart', 'eyes'];
const KIND = { cabin: 'cabin', bones: 'part', body: 'part', head: 'part', gut: 'organ', heart: 'organ', eyes: 'organ' };

// Where each label's leader line touches the figure, and the height its label sits at.
const CALLOUTS = {
  head: { at: [124, 40], y: 40 },
  eyes: { at: [134, 51], y: 104 },
  heart: { at: [158, 148], y: 168 },
  body: { at: [108, 214], y: 232 },
  gut: { at: [127, 262], y: 296 },
  bones: { at: [95, 400], y: 400 },
  cabin: { at: [8, 520], y: 520 },
};
const VIEW = { x: -70, width: 440, height: 640 };

const silhouette = () => [...SHAPES.bones(), ...SHAPES.body(), ...SHAPES.head()];

const defs = () => svg('defs', null,
  // Keeps only a bright rim just inside the outline of whatever it is applied to.
  svg('filter', { id: 'rim', x: '-20%', y: '-20%', width: '140%', height: '140%', 'color-interpolation-filters': 'sRGB' },
    svg('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 9, result: 'blur' }),
    svg('feComposite', { in: 'SourceAlpha', in2: 'blur', operator: 'arithmetic', k2: 1.8, k3: -1.8, result: 'edge' }),
    svg('feFlood', { 'flood-color': '#A9D2FF' }),
    svg('feComposite', { in2: 'edge', operator: 'in' })),
  svg('filter', { id: 'glow', x: '-80%', y: '-80%', width: '260%', height: '260%' },
    svg('feGaussianBlur', { stdDeviation: 3.5, result: 'soft' }),
    svg('feMerge', null, svg('feMergeNode', { in: 'soft' }), svg('feMergeNode', { in: 'SourceGraphic' }))),
  svg('linearGradient', { id: 'scan-fade', x1: 0, y1: 0, x2: 0, y2: 1 },
    svg('stop', { offset: 0, 'stop-color': '#9CCBFF', 'stop-opacity': 0 }),
    svg('stop', { offset: 1, 'stop-color': '#DCEBFF', 'stop-opacity': 0.55 })),
  svg('clipPath', { id: 'body-clip' }, silhouette()));

function leader(id, status) {
  const { at: [x, y], y: labelY } = CALLOUTS[id];
  const elbowX = x - Math.abs(labelY - y);
  return svg('g', { class: 'leader', 'data-status': status, 'aria-hidden': 'true' },
    svg('polyline', { points: `${x},${y} ${elbowX},${labelY} ${VIEW.x},${labelY}` }),
    svg('circle', { cx: x, cy: y, r: 2.6 }));
}

export function render(root, ctx) {
  const { state } = ctx;
  const weather = ctx.weather.summary;
  const regions = regionStatuses(state, weather);
  const states = indicatorStates(state, weather);
  const alerts = buildAlerts(state, weather);
  const count = needsAttention(alerts);

  if (!selected || !regions[selected]) {
    selected = REGIONS.reduce((best, r) => (RANK[regions[r.id].status] > RANK[regions[best].status] ? r.id : best), REGIONS[0].id);
  }
  const select = id => { selected = id; symptomError = null; symptomOpen = false; ctx.refresh(); };
  const label = id => REGIONS.find(r => r.id === id).label;

  const now = new Date();
  const due = reminders(state.tasksDone[state.day], now.getHours() * 60 + now.getMinutes());
  const nextTask = TASKS.find(t => t.id === due.next);
  const strip = h('section', { class: 'strip', 'aria-label': 'Today' },
    h('p', { class: 'strip-count' }, h('strong', null, String(count)), count === 1 ? ' needs attention' : ' need attention'),
    alerts[0] && alerts[0].status !== 'info' ? h('p', null, h('a', { href: '#/alerts' }, alerts[0].title)) : null,
    state.hasCheckedInToday ? null : h('a', { class: 'button', href: '#/checkin' }, 'Start today\'s check-in'),
    h('p', { class: 'strip-next muted' },
      nextTask ? `Next: ${nextTask.label} at ${nextTask.time}` : 'All of today\'s tasks are done or past.',
      due.overdue.length ? h('span', null, ', ', h('a', { href: '#/routine' }, `${due.overdue.length} overdue`)) : null));

  const figure = svg('svg', { viewBox: `${VIEW.x} 0 ${VIEW.width} ${VIEW.height}`, class: 'figure', role: 'group', 'aria-label': 'Body map' },
    defs(),
    REGIONS.map(r => leader(r.id, regions[r.id].status)),
    DRAW_ORDER.map(id => svg('g', {
      id: `figure-${id}`, class: `region ${KIND[id]}`, 'data-region': id, 'data-status': regions[id].status,
      role: 'button', tabindex: '0', 'aria-pressed': String(selected === id),
      'aria-label': `${label(id)}: ${STATUS_LABEL[regions[id].status]}`,
      onclick: () => select(id),
      onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } },
    }, SHAPES[id]())),
    svg('g', { class: 'rim', 'aria-hidden': 'true' }, silhouette()),
    svg('g', { class: 'scan', 'clip-path': 'url(#body-clip)', 'aria-hidden': 'true' },
      svg('rect', { x: 0, y: -70, width: 300, height: 70, fill: 'url(#scan-fade)' })),
    selected === 'cabin' ? null : svg('g', { class: 'selected-outline', 'aria-hidden': 'true' }, SHAPES[selected]()));

  const callouts = h('ul', { class: 'callouts' },
    REGIONS.map(r => h('li', { style: `top: ${CALLOUTS[r.id].y / VIEW.height * 100}%` },
      h('button', { type: 'button', id: `region-${r.id}`, class: 'region-button', 'aria-pressed': String(selected === r.id), onclick: () => select(r.id) },
        h('span', null, r.label), statusBadge(regions[r.id].status)))));

  root.append(
    h('h1', { class: 'visually-hidden' }, 'Body map'),
    strip,
    h('div', { class: 'home' },
      callouts,
      h('div', { class: 'home-figure' }, figure),
      detailPanel(ctx, REGIONS.find(r => r.id === selected), regions[selected], states)));
}

function detailPanel(ctx, region, regionState, states) {
  const { state } = ctx;
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
        s.delta !== null ? h('span', { class: 'muted' }, signed(s.delta)) : null),
      flagged ? h('div', { class: 'action', 'data-status': s.status },
        h('ol', null, ind.actions[s.status].map(a => h('li', null, a))),
        h('p', { class: 'escalation' }, ESCALATION_LABEL[level])) : null,
      h('details', null,
        h('summary', null, 'About this reading'),
        h('p', null, ind.why),
        id === 'exercise' ? boneLine(state.day) : null,
        h('h4', null, 'How to measure it'),
        h('ol', null, ind.howTo.map(step => h('li', null, step))),
        ind.appRuleNote ? h('p', { class: 'muted' }, ind.appRuleNote) : null,
        s.day && s.day !== state.day && !ind.derived ? h('p', { class: 'muted' }, `Recorded on day ${s.day}.`) : null,
        id === 'radiation' ? null : h('p', null, h('a', { href: `#/trends?focus=${id}` }, 'See trend')))));
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
    regionState.symptoms.length
      ? h('ul', null, regionState.symptoms.map(s => h('li', null,
        h('span', null, s.text), ' ', h('span', { class: 'muted' }, `(${s.severity})`), ' ',
        h('button', { type: 'button', class: 'quiet', onclick: () => { store.removeSymptom(state.symptoms.indexOf(s)); ctx.refresh(); document.getElementById(textId)?.focus(); } }, 'Remove'))))
      : null,
    // Re-rendering must not close a form the crew member has opened.
    h('details', { open: symptomOpen || regionState.symptoms.length > 0, ontoggle: e => { symptomOpen = e.target.open; } },
      h('summary', null, 'Report a symptom here'),
      h('form', { class: 'symptom-form', onsubmit: submit },
        h('label', { class: 'visually-hidden', for: textId }, 'Symptom or discomfort'),
        h('div', { class: 'row' }, text,
          h('label', { class: 'visually-hidden', for: severity.id }, 'Severity'), severity,
          h('button', { type: 'submit', id: `symptom-add-${region.id}` }, 'Add')),
        h('p', { id: 'symptom-error', class: 'error' }, symptomError ?? ''),
        h('p', { class: 'muted' }, 'Mild and moderate show as Watch, severe as Act now (this app\'s own rule).'))));
}
