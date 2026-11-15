import { INDICATORS, REGIONS, STATUS_LABEL } from './indicators.js';
import { regionStatuses, indicatorStates, buildAlerts, needsAttention, ESCALATION_LABEL } from './alerts.js';
import { flaggedRun, escalation } from './rules.js';
import { boneLossRange } from './projections.js';
import { h, svg, statusLabel, reading, versusAverage } from './ui.js';

let selected = null;
// True for the one render in which the detail sheet should slide in.
let entering = false;
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

// Where each label's leader line touches the figure, which side the label sits on, and at what height.
const CALLOUTS = {
  head: { at: [126, 40], side: 'left', y: 40 },
  eyes: { at: [166, 50], side: 'right', y: 62 },
  heart: { at: [178, 146], side: 'right', y: 170 },
  body: { at: [108, 214], side: 'left', y: 214 },
  gut: { at: [172, 266], side: 'right', y: 290 },
  bones: { at: [56, 300], side: 'left', y: 350 },
  cabin: { at: [8, 540], side: 'left', y: 540 },
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

function leader(id, isSelected) {
  const { at: [x, y], side, y: labelY } = CALLOUTS[id];
  const toLeft = side === 'left';
  const elbowX = x + (toLeft ? -1 : 1) * Math.abs(labelY - y);
  const edgeX = toLeft ? VIEW.x : VIEW.x + VIEW.width;
  return svg('g', { class: 'leader', 'data-selected': isSelected, 'aria-hidden': 'true' },
    svg('polyline', { points: `${x},${y} ${elbowX},${labelY} ${edgeX},${labelY}` }),
    svg('circle', { cx: x, cy: y, r: 2.6 }));
}

export function render(root, ctx) {
  const { state } = ctx;
  const weather = ctx.weather.summary;
  const regions = regionStatuses(state, weather);
  const count = needsAttention(buildAlerts(state, weather));
  if (selected && !regions[selected]) selected = null;
  const slideIn = entering;
  entering = false;

  // Choosing the open region again closes the sheet.
  const select = id => {
    selected = selected === id ? null : id;
    entering = selected !== null;
    symptomError = null;
    symptomOpen = false;
    ctx.refresh();
    document.getElementById(selected ? 'sheet-title' : `region-${id}`)?.focus();
  };
  const label = id => REGIONS.find(r => r.id === id).label;

  const figure = svg('svg', { viewBox: `${VIEW.x} 0 ${VIEW.width} ${VIEW.height}`, class: 'figure', role: 'group', 'aria-label': 'Body map' },
    defs(),
    REGIONS.map(r => leader(r.id, selected === r.id)),
    DRAW_ORDER.map(id => svg('g', {
      id: `figure-${id}`, class: 'region', 'data-region': id,
      role: 'button', tabindex: '0', 'aria-pressed': String(selected === id),
      'aria-label': `${label(id)}: ${STATUS_LABEL[regions[id].status]}`,
      onclick: () => select(id),
      onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } },
    }, SHAPES[id]())),
    svg('g', { class: 'rim', 'aria-hidden': 'true' }, silhouette()),
    svg('g', { class: 'scan', 'clip-path': 'url(#body-clip)', 'aria-hidden': 'true' },
      svg('rect', { x: 0, y: -70, width: 300, height: 70, fill: 'url(#scan-fade)', style: `--t: ${(performance.now() / 1000).toFixed(2)}` })),
    selected && selected !== 'cabin' ? svg('g', { class: 'selected-outline', 'aria-hidden': 'true' }, SHAPES[selected]()) : null);

  const callouts = h('ul', { class: 'callouts' },
    REGIONS.map(r => h('li', { 'data-side': CALLOUTS[r.id].side, style: `--y: ${CALLOUTS[r.id].y / VIEW.height * 100}%` },
      h('button', { type: 'button', id: `region-${r.id}`, class: 'callout', 'aria-pressed': String(selected === r.id), onclick: () => select(r.id) },
        h('span', { class: 'callout-name' }, r.label), statusLabel(regions[r.id].status)))));

  root.append(
    h('header', { class: 'home-head' },
      h('h1', null, count === 0 ? 'All readings are in range' : `${count} ${count === 1 ? 'thing needs' : 'things need'} your attention`),
      h('p', { class: 'home-actions' },
        state.hasCheckedInToday ? null : h('a', { class: 'button', href: '#/checkin' }, 'Start today\'s check-in'),
        count ? h('a', { href: '#/alerts' }, 'Review alerts') : null)),
    h('div', { class: 'home' }, h('div', { class: 'home-figure' }, figure), callouts),
    h('p', { class: 'hint muted' }, 'Select a part of the body to see its readings.'));

  if (selected) {
    root.append(sheet(ctx, REGIONS.find(r => r.id === selected), regions[selected], indicatorStates(state, weather), () => select(selected), slideIn));
  }

  const onKey = e => { if (e.key === 'Escape' && selected) select(selected); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

function sheet(ctx, region, regionState, states, close, slideIn) {
  const { state } = ctx;
  const el = h('aside', { class: slideIn ? 'sheet sheet-enter' : 'sheet', 'aria-labelledby': 'sheet-title' },
    h('header', { class: 'sheet-head' },
      h('h2', { id: 'sheet-title', tabindex: '-1' }, region.label),
      h('button', { type: 'button', id: 'sheet-close', class: 'icon-button', 'aria-label': 'Close', onclick: close }, '×')));

  for (const id of region.indicatorIds) {
    const ind = INDICATORS.find(i => i.id === id);
    const s = states[id];
    const flagged = s.status === 'amber' || s.status === 'red';
    const level = flagged ? escalation(s.status, ind.derived ? 1 : flaggedRun(state.entries, id, state.day)) : 'none';
    el.append(h('article', { class: 'reading' },
      h('div', { class: 'reading-top' }, h('h3', null, ind.label), statusLabel(s.status)),
      h('p', { class: 'reading-value' }, reading(s.display, ind.unit)),
      s.delta !== null ? h('p', { class: 'muted small' }, versusAverage(s.delta)) : null,
      flagged ? h('div', { class: 'todo' },
        h('h4', null, 'What to do'),
        h('ol', { class: 'steps' }, ind.actions[s.status].map(a => h('li', null, a))),
        h('p', { class: 'escalation' }, ESCALATION_LABEL[level])) : null,
      h('details', null,
        h('summary', null, 'About this reading'),
        h('p', null, ind.why),
        id === 'exercise' ? boneLine(state.day) : null,
        h('h4', null, 'How to measure it'),
        h('ol', null, ind.howTo.map(step => h('li', null, step))),
        ind.appRuleNote ? h('p', { class: 'muted' }, ind.appRuleNote) : null,
        s.day && s.day !== state.day && !ind.derived ? h('p', { class: 'muted' }, `Recorded on day ${s.day}.`) : null,
        h('p', null, h('a', { href: `#/trends?focus=${id}` }, 'See trend')))));
  }

  if (region.bodyPart) el.append(symptomBlock(ctx, region, regionState));
  return el;
}

function boneLine(day) {
  const loss = boneLossRange(day);
  return h('p', null, `Estimated bone density loss so far: ${loss.minPct}–${loss.maxPct}% (NASA average, not a measurement of you).`);
}

function symptomBlock(ctx, region, regionState) {
  const { state, store } = ctx;
  const textId = `symptom-text-${region.id}`;
  const text = h('input', { id: textId, type: 'text', maxlength: '200', autocomplete: 'off', placeholder: 'Describe it', 'aria-describedby': 'symptom-error' });
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
        h('span', null, s.text, ' ', h('span', { class: 'muted' }, `(${s.severity})`)),
        h('button', { type: 'button', class: 'quiet', onclick: () => { store.removeSymptom(state.symptoms.indexOf(s)); ctx.refresh(); document.getElementById(textId)?.focus(); } }, 'Remove'))))
      : null,
    // Re-rendering must not close a form the crew member has opened.
    h('details', { open: symptomOpen || regionState.symptoms.length > 0, ontoggle: e => { symptomOpen = e.target.open; } },
      h('summary', null, 'Report a symptom'),
      h('form', { class: 'symptom-form', onsubmit: submit },
        h('label', { class: 'visually-hidden', for: textId }, 'Symptom or discomfort'),
        h('div', { class: 'row' }, text,
          h('label', { class: 'visually-hidden', for: severity.id }, 'Severity'), severity,
          h('button', { type: 'submit', id: `symptom-add-${region.id}` }, 'Add')),
        h('p', { id: 'symptom-error', class: 'error' }, symptomError ?? ''),
        h('p', { class: 'muted' }, 'Mild and moderate show as Watch, severe as Act now (this app\'s own rule).'))));
}
