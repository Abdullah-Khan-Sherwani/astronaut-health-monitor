import { TASKS, NASA } from './nasa-data.js';
import { streak, weeklyCompletion } from './store.js';
import { exerciseMinutes, reminders } from './projections.js';
import { h, svg } from './ui.js';

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function render(root, ctx) {
  const { state, store } = ctx;
  const done = state.tasksDone[state.day] ?? [];
  const now = new Date();
  const due = reminders(done, now.getHours() * 60 + now.getMinutes());
  const run = streak(state.entries, state.day);
  const week = weeklyCompletion(state.tasksDone, state.day);

  const task = t => {
    const id = `task-${t.id}`;
    return h('li', { class: 'task' },
      h('span', { class: 'task-time' }, t.time),
      h('input', {
        type: 'checkbox', id, checked: done.includes(t.id), disabled: t.auto,
        onchange: () => { store.toggleTask(t.id); ctx.refresh(); },
      }),
      h('div', null,
        h('label', { for: id }, t.label,
          due.overdue.includes(t.id) ? h('span', { class: 'mark mark-overdue' }, 'Overdue') : null,
          due.next === t.id ? h('span', { class: 'mark mark-next' }, 'Next') : null),
        h('p', { class: 'muted' }, t.why, t.auto ? [' ', h('a', { href: '#/checkin' }, 'Done in the check-in')] : null)));
  };

  root.append(
    h('h1', null, 'Routine'),
    h('div', { class: 'routine' },
      h('section', { 'aria-label': 'Today\'s tasks' },
        h('ul', { class: 'tasks' }, [...TASKS].sort((a, b) => a.time.localeCompare(b.time)).map(task)),
        h('p', null, `Exercise today: ${exerciseMinutes(done)} of ${NASA.exerciseMinPerDay} minutes`)),
      h('section', { class: 'panel', 'aria-label': 'Progress' },
        h('h2', null, 'Progress'),
        h('div', { class: 'ring' },
          svg('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' },
            svg('circle', { cx: 60, cy: 60, r: RING_RADIUS }),
            svg('circle', { class: 'ring-done', cx: 60, cy: 60, r: RING_RADIUS, 'stroke-dasharray': `${RING_LENGTH * week.done / week.total} ${RING_LENGTH}` })),
          h('p', { class: 'ring-text' }, h('strong', null, `${week.done} of ${week.total}`), ' tasks this week')),
        h('p', null, `Check-in streak: ${run.current} days`),
        h('p', null, `Personal best: ${run.best} days`),
        run.current > 0 && run.current === run.best ? h('p', { class: 'escalation' }, 'New personal best') : null)));
}
