import { HAZARDS } from './nasa-data.js';
import { INDICATORS } from './indicators.js';
import { indicatorStates } from './alerts.js';
import { replyDelay } from './projections.js';
import { h, statusBadge } from './ui.js';

export function render(root, ctx) {
  const { state } = ctx;
  const states = indicatorStates(state, ctx.weather.summary);

  const chip = id => h('li', null,
    h('a', { class: 'chip', href: `#/trends?focus=${id}` }, INDICATORS.find(i => i.id === id).label, statusBadge(states[id].status)));

  const card = hazard => h('article', { class: 'card' },
    h('h2', null, hazard.name),
    h('p', null, hazard.summary),
    h('ul', null, hazard.effects.map(effect => h('li', null, effect))),
    h('p', null, h('strong', null, 'How this app responds: '), hazard.appResponse),
    hazard.indicatorIds.length
      ? h('ul', { class: 'chips', 'aria-label': 'Tracked here' }, hazard.indicatorIds.map(chip))
      : h('p', null, `${state.profile.name}: ${replyDelay(state.profile).text} `, h('a', { href: '#/alerts' }, 'See alerts and the report for ground')));

  root.append(
    h('h1', null, 'Hazards'),
    h('p', { class: 'lede' }, 'NASA\'s Human Research Program groups the dangers of human spaceflight into five hazards. Each is shown with the readings this app tracks for it.'),
    h('div', { class: 'hazards' }, HAZARDS.map(card)));
}
