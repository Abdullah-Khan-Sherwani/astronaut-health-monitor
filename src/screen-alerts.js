import { NASA } from './nasa-data.js';
import { buildAlerts, buildReport, buildCsv, needsAttention, ESCALATION_LABEL } from './alerts.js';
import { h, statusLabel } from './ui.js';

const EVENT_NAME = { sep: 'Solar particle event', cme: 'Coronal mass ejection' };
let reportOpen = false;
// The alert whose steps are showing. Until one is chosen, the most serious is open.
let openId;

export function render(root, ctx) {
  const { state, store } = ctx;
  const alerts = buildAlerts(state, ctx.weather.summary);
  if (openId === undefined) openId = alerts[0]?.id ?? null;

  root.append(
    h('h1', null, 'Alerts'),
    h('div', { class: 'stack' },
      h('section', { class: 'panel list', 'aria-label': 'Needs attention' },
        needsAttention(alerts) === 0 ? h('p', { class: 'empty' }, 'Nothing needs attention today.') : null,
        alerts.map(alertRow)),
      weatherPanel(ctx),
      recordPanel(state, alerts)));

  function alertRow(a) {
    if (a.kind === 'checkin') {
      return h('div', { class: 'alert alert-info' },
        h('div', null, h('p', { class: 'alert-title' }, a.title), h('p', { class: 'muted small' }, a.detail)),
        h('a', { class: 'button', href: '#/checkin' }, 'Start today\'s check-in'));
    }
    const toggled = e => {
      if (e.target.open) openId = a.id;
      else if (openId === a.id) openId = null;
    };
    return h('details', { class: 'alert', name: 'alert', open: openId === a.id, ontoggle: toggled },
      h('summary', null,
        statusLabel(a.status),
        h('span', { class: 'alert-title' }, a.title),
        h('span', { class: 'alert-detail' }, a.detail)),
      h('div', { class: 'alert-body' },
        a.actions.length ? h('ol', { class: 'steps' }, a.actions.map(step => h('li', null, step))) : null,
        h('p', { class: 'escalation' }, ESCALATION_LABEL[a.escalation]),
        a.delayText ? h('p', { class: 'muted small' }, a.delayText) : null));
  }

  function weatherPanel({ weather }) {
    const { summary, source, fetchedAt } = weather;
    const when = fetchedAt ? new Date(fetchedAt) : null;
    const sourceLine = source === 'live' ? `Live from NASA DONKI, fetched ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : source === 'none' ? 'Space weather unavailable'
        : `Saved copy from ${when ? when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'an earlier visit'}`;
    return h('section', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h2', null, 'Space weather'), statusLabel(summary.status)),
      h('p', null, summary.headline),
      summary.events.length ? h('ul', { class: 'rows events' }, summary.events.map(e => h('li', null,
        EVENT_NAME[e.type],
        h('span', { class: 'muted' }, `${new Date(e.time).toISOString().slice(0, 16).replace('T', ' ')} UTC`),
        e.link ? h('a', { href: e.link, target: '_blank', rel: 'noopener' }, 'NASA record') : h('span')))) : null,
      h('dl', { class: 'facts-list' },
        h('dt', null, 'Source'), h('dd', null, sourceLine),
        h('dt', null, 'NASA limits'), h('dd', null, `${NASA.speLimitMsv} mSv per event, ${NASA.careerLimitMsv} mSv career`)),
      h('p', { class: 'muted small' }, 'DONKI reports events observed from near Earth. A real vehicle would also use its own dosimeters.'),
      h('label', { class: 'check', for: 'spe-demo' },
        h('input', { type: 'checkbox', id: 'spe-demo', checked: state.speDemo, onchange: e => { store.setSpeDemo(e.target.checked); if (e.target.checked) openId = 'weather'; ctx.refresh(); } }),
        'Simulate a solar particle event (demo)'));
  }

  function recordPanel(state, alerts) {
    const area = h('textarea', { id: 'report', readonly: true, rows: '14', 'aria-label': 'Report for ground' }, buildReport(state, alerts));
    const copied = h('span', { class: 'muted small', role: 'status' });
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(area.value);
        copied.textContent = 'Copied.';
      } catch {
        area.select();
        copied.textContent = 'Selected. Press Ctrl or Cmd and C to copy.';
      }
    };
    const download = () => {
      const url = URL.createObjectURL(new Blob([buildCsv(state)], { type: 'text/csv' }));
      const link = h('a', { href: url, download: `health-record-day-${state.day}.csv` });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };
    return h('section', { class: 'panel' },
      h('h2', null, 'Report and record'),
      h('div', { class: 'action-row' },
        h('div', null,
          h('h3', null, 'Report for ground'),
          h('p', { class: 'muted small' }, 'A plain-text summary for the flight surgeon. Prototype: nothing is transmitted.')),
        h('button', { type: 'button', class: 'quiet', id: 'build-report', onclick: () => { reportOpen = true; ctx.refresh(); } }, 'Build report')),
      reportOpen ? h('div', { class: 'report' }, area,
        h('div', { class: 'report-buttons' }, h('button', { type: 'button', class: 'quiet', id: 'copy-report', onclick: copy }, 'Copy'), copied)) : null,
      h('div', { class: 'action-row' },
        h('div', null,
          h('h3', null, 'Health record'),
          h('p', { class: 'muted small' }, 'Your readings as a CSV file. The record is stored on this device and works without a connection.')),
        h('button', { type: 'button', class: 'quiet', id: 'download-record', onclick: download }, 'Download CSV')));
  }
}
