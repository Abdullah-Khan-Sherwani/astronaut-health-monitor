import { INDICATORS, CHECKIN_STEPS } from './indicators.js';
import { SOURCES } from './nasa-data.js';
import { classify, valueOf } from './rules.js';
import { h, statusBadge, sourceLink } from './ui.js';

const byId = id => INDICATORS.find(i => i.id === id);
const STEPS = [...CHECKIN_STEPS.map(ids => ({ kind: 'reading', ids })), { kind: 'journal' }, { kind: 'review' }];
const fieldKeys = ind => (ind.fields ? ind.fields.map(f => f.key) : [ind.id]);

// The draft lives here until it is saved, so moving between screens does not lose it.
let draft = null;
let step = 0;
let errors = {};

function stepOfError(key) {
  if (key === 'journal') return STEPS.findIndex(s => s.kind === 'journal');
  const index = STEPS.findIndex(s => s.kind === 'reading' && s.ids.some(id => fieldKeys(byId(id)).includes(key)));
  return index === -1 ? STEPS.length - 1 : index;
}

// Classify what has been typed so far, without storing anything.
function draftStatus(id) {
  const numeric = {};
  for (const [k, v] of Object.entries(draft)) numeric[k] = v === '' || v === undefined || Number.isNaN(Number(v)) ? v : Number(v);
  if (id === 'vision') return classify(id, draft.vision);
  return classify(id, valueOf(numeric, id));
}

export function render(root, ctx) {
  const { state, store } = ctx;
  if (!draft) {
    draft = { ...(state.entries[state.day] ?? {}) };
    step = 0;
    errors = {};
  }
  const current = STEPS[step];
  const go = n => { step = Math.max(0, Math.min(STEPS.length - 1, n)); ctx.refresh(); document.getElementById('step-title')?.focus(); };

  const body = current.kind === 'reading' ? readingStep(current, ctx)
    : current.kind === 'journal' ? journalStep()
      : reviewStep();

  const save = () => {
    const result = store.saveEntry(draft);
    if (result.ok) {
      draft = null;
      ctx.navigate('#/');
      return;
    }
    errors = result.errors;
    const first = Object.keys(errors).find(k => k !== '_');
    go(first ? stepOfError(first) : STEPS.length - 1);
    if (first) document.getElementById(`field-${first}`)?.focus();
  };

  const skip = () => {
    if (current.kind === 'reading') for (const id of current.ids) for (const key of fieldKeys(byId(id))) delete draft[key];
    if (current.kind === 'journal') delete draft.journal;
    go(step + 1);
  };

  root.append(
    h('h1', null, state.hasCheckedInToday ? 'Update today\'s check-in' : 'Daily check-in'),
    h('p', { class: 'muted' }, `Step ${step + 1} of ${STEPS.length}`),
    h('progress', { max: String(STEPS.length), value: String(step + 1), 'aria-label': 'Check-in progress' }),
    h('form', { class: 'wizard', novalidate: true, onsubmit: e => { e.preventDefault(); if (current.kind === 'review') save(); else go(step + 1); } },
      body,
      h('div', { class: 'wizard-buttons' },
        step > 0 ? h('button', { type: 'button', class: 'quiet', onclick: () => go(step - 1) }, 'Back') : null,
        current.kind === 'review' ? null : h('button', { type: 'button', class: 'quiet', onclick: skip }, 'Skip'),
        h('button', { type: 'submit' }, current.kind === 'review' ? 'Save check-in' : 'Next'))));
}

function errorLine(key) {
  return h('p', { id: `error-${key}`, class: 'error' }, errors[key] ?? '');
}

function readingStep(current, ctx) {
  const inds = current.ids.map(byId);
  const title = inds.length > 1 ? 'Cabin environment' : inds[0].question;
  const section = h('div', null, h('h2', { id: 'step-title', tabindex: '-1' }, title));

  for (const ind of inds) {
    const badgeSlot = h('span', { class: 'live-badge' });
    const showBadge = () => {
      const status = draftStatus(ind.id);
      badgeSlot.replaceChildren(...(status === 'none' ? [] : [statusBadge(status)]));
    };
    const set = (key, value) => { draft[key] = value; showBadge(); };

    const block = h('fieldset', { class: 'question' }, h('legend', null, inds.length > 1 ? ind.label : 'Your reading', ' ', badgeSlot));
    if (ind.fields) {
      for (const f of ind.fields) {
        block.append(
          h('label', { for: `field-${f.key}` }, f.label),
          h('input', {
            id: `field-${f.key}`, type: 'number', inputmode: 'decimal', min: String(f.min), max: String(f.max), step: String(f.step),
            value: draft[f.key] ?? '', 'aria-describedby': `error-${f.key}`, oninput: e => set(f.key, e.target.value),
          }),
          errorLine(f.key));
      }
    } else {
      block.append(h('div', { class: 'options', role: 'radiogroup', 'aria-label': ind.label },
        ind.options.map(o => h('label', { class: 'option' },
          h('input', {
            type: 'radio', name: ind.id, id: `field-${ind.id}-${o.value}`, value: String(o.value),
            checked: String(draft[ind.id]) === String(o.value), onchange: () => set(ind.id, o.value),
          }),
          typeof o.value === 'number' ? `${o.value}  ${o.label}` : o.label))),
      errorLine(ind.id));
    }
    block.append(
      h('h3', null, 'How to measure it'),
      h('ol', null, ind.howTo.map(s => h('li', null, s))),
      h('h3', null, 'Why it matters in space'),
      h('p', null, ind.why),
      h('p', { class: 'meta' }, sourceLink(ind.source)));
    if (ind.appRuleNote) block.append(h('p', { class: 'muted' }, ind.appRuleNote));
    section.append(block);
    showBadge();
  }
  return section;
}

function journalStep() {
  return h('div', null,
    h('h2', { id: 'step-title', tabindex: '-1' }, 'Journal'),
    h('label', { for: 'field-journal' }, 'Journal (optional)'),
    h('textarea', {
      id: 'field-journal', rows: '6', maxlength: '2000', 'aria-describedby': 'error-journal',
      oninput: e => { draft.journal = e.target.value; },
    }, draft.journal ?? ''),
    errorLine('journal'),
    h('p', null, 'NASA encourages crews to keep a regular journal as self-care during long isolation.'),
    h('p', { class: 'meta' }, sourceLink(SOURCES.behaviorRisk)));
}

function reviewStep() {
  const rows = INDICATORS.filter(i => !i.derived).map(ind => {
    const status = draftStatus(ind.id);
    const value = ind.id === 'vision' ? draft.vision : valueOf(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v === '' ? undefined : v])), ind.id);
    const text = status === 'none' ? 'Skipped' : ind.format(value);
    return h('tr', null, h('th', { scope: 'row' }, ind.label), h('td', null, text), h('td', null, status === 'none' ? '' : statusBadge(status)));
  });
  return h('div', null,
    h('h2', { id: 'step-title', tabindex: '-1' }, 'Review'),
    h('table', { class: 'review' }, h('tbody', null, rows,
      h('tr', null, h('th', { scope: 'row' }, 'Journal'), h('td', { colspan: '2' }, draft.journal?.trim() ? draft.journal.trim() : 'Skipped')))),
    errors._ ? h('p', { class: 'error', role: 'alert' }, errors._) : null,
    Object.keys(errors).some(k => k !== '_') ? h('p', { class: 'error', role: 'alert' }, 'Some readings need correcting before saving.') : null);
}
