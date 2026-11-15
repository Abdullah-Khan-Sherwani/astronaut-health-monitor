import { HAZARDS, SOURCES } from './nasa-data.js';
import { INDICATORS } from './indicators.js';
import { indicatorStates } from './alerts.js';
import { replyDelay } from './projections.js';
import { h, statusBadge, sourceLink } from './ui.js';

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
      ? [h('p', null, h('strong', null, 'Tracked here:')), h('ul', { class: 'chips' }, hazard.indicatorIds.map(chip))]
      : h('p', null, `${state.profile.name}: ${replyDelay(state.profile).text} `, h('a', { href: '#/alerts' }, 'See alerts and the report for ground')),
    h('p', { class: 'meta' }, sourceLink(SOURCES[hazard.source])));

  root.append(
    h('h1', null, 'Hazards'),
    h('p', null, 'NASA\'s Human Research Program groups the dangers of human spaceflight into five hazards. Each one is summarised here with the readings this app tracks for it. ',
      sourceLink(SOURCES.hazards)),
    h('div', { class: 'hazards' }, HAZARDS.map(card)));
}
