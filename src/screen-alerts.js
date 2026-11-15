import { NASA, SOURCES } from './nasa-data.js';
import { buildAlerts, buildReport, buildCsv, needsAttention, ESCALATION_LABEL } from './alerts.js';
import { h, statusBadge, sourceLink } from './ui.js';

const EVENT_NAME = { sep: 'Solar particle event', cme: 'Coronal mass ejection' };
let reportOpen = false;

export function render(root, ctx) {
  const { state, store } = ctx;
  const alerts = buildAlerts(state, ctx.weather.summary);

  root.append(
    h('h1', null, 'Alerts'),
    h('div', { class: 'cards' },
      needsAttention(alerts) === 0 ? h('p', null, 'Nothing needs attention today.') : null,
      alerts.map(alertCard)),
    h('div', { class: 'cards' }, weatherCard(ctx), reportCard(state, alerts), recordCard(state)));

  function alertCard(a) {
    if (a.kind === 'checkin') {
      return h('article', { class: 'card' },
        h('h2', null, a.title), h('p', null, a.detail), h('a', { class: 'button', href: '#/checkin' }, 'Start today\'s check-in'));
    }
    return h('article', { class: 'card', 'data-status': a.status },
      h('h2', null, statusBadge(a.status), a.title),
      h('p', null, a.detail),
      a.actions.length ? h('ol', null, a.actions.map(step => h('li', null, step))) : null,
      ESCALATION_LABEL[a.escalation] ? h('p', { class: 'escalation' }, ESCALATION_LABEL[a.escalation]) : null,
      a.delayText ? h('p', null, a.delayText) : null,
      h('p', { class: 'meta' }, sourceLink(a.source)));
  }

  function weatherCard({ weather }) {
    const { summary, source, fetchedAt } = weather;
    const when = fetchedAt ? new Date(fetchedAt) : null;
    const sourceLine = source === 'live' ? `Live from NASA DONKI, fetched ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : source === 'none' ? 'Space weather unavailable'
        : `Saved copy from ${when ? when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'an earlier visit'}`;
    return h('section', { class: 'card', 'data-status': summary.status },
      h('h2', null, 'Space weather'),
      h('p', null, summary.headline, ' ', statusBadge(summary.status)),
      h('p', { class: 'muted' }, sourceLine),
      summary.events.length ? h('ul', null, summary.events.map(e => h('li', null,
        `${EVENT_NAME[e.type]}, ${new Date(e.time).toISOString().slice(0, 16).replace('T', ' ')} UTC `,
        e.link ? h('a', { href: e.link, target: '_blank', rel: 'noopener' }, 'NASA record') : null))) : null,
      h('p', null, `${NASA.speLimitMsv} mSv per event, ${NASA.careerLimitMsv} mSv career (NASA). `, sourceLink(SOURCES.radiationBrief)),
      h('p', { class: 'muted' }, 'DONKI reports events observed from near Earth. A real vehicle would also use its own dosimeters.'),
      h('p', { class: 'meta' }, sourceLink(SOURCES.donki)),
      h('label', { class: 'check', for: 'spe-demo' },
        h('input', { type: 'checkbox', id: 'spe-demo', checked: state.speDemo, onchange: e => { store.setSpeDemo(e.target.checked); ctx.refresh(); } }),
        'Simulate a solar particle event (demo)'));
  }

  function reportCard(state, alerts) {
    const area = h('textarea', { id: 'report', readonly: true, rows: '14', 'aria-label': 'Report for ground' }, buildReport(state, alerts));
    const copied = h('span', { class: 'muted', role: 'status' });
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(area.value);
        copied.textContent = 'Copied.';
      } catch {
        area.select();
        copied.textContent = 'Selected. Press Ctrl or Cmd and C to copy.';
      }
    };
    return h('section', { class: 'card' },
      h('h2', null, 'Report for ground'),
      h('div', { class: 'report-buttons' },
        h('button', { type: 'button', id: 'build-report', onclick: () => { reportOpen = true; ctx.refresh(); } }, 'Build report for ground'),
        reportOpen ? h('button', { type: 'button', class: 'quiet', id: 'copy-report', onclick: copy }, 'Copy') : null,
        copied),
      reportOpen ? area : null,
      h('p', { class: 'muted' }, 'Prototype: nothing is transmitted.'));
  }

  function recordCard(state) {
    const download = () => {
      const url = URL.createObjectURL(new Blob([buildCsv(state)], { type: 'text/csv' }));
      const link = h('a', { href: url, download: `health-record-day-${state.day}.csv` });
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };
    return h('section', { class: 'card' },
      h('h2', null, 'Health record'),
      h('div', { class: 'report-buttons' },
        h('button', { type: 'button', id: 'download-record', onclick: download }, 'Download health record (CSV)')),
      h('p', { class: 'muted' }, 'Your record is stored on this device and works without a connection.'));
  }
}
