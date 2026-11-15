import { HAZARDS } from './nasa-data.js';
import { INDICATORS } from './indicators.js';
import { indicatorStates } from './alerts.js';
import { replyDelay } from './projections.js';
import { h, statusLabel } from './ui.js';

// The hazard that is expanded, kept so a re-render does not close it.
let openId = null;

export function render(root, ctx) {
  const { state } = ctx;
  const states = indicatorStates(state, ctx.weather.summary);

  const tracked = id => h('li', null,
    h('a', { href: `#/trends?focus=${id}` }, INDICATORS.find(i => i.id === id).label),
    h('span', { class: 'muted' }, states[id].display),
    statusLabel(states[id].status));

  const toggled = (e, id) => {
    if (e.target.open) openId = id;
    else if (openId === id) openId = null;
  };
  const hazard = hz => h('details', { class: 'hazard', name: 'hazard', open: openId === hz.id, ontoggle: e => toggled(e, hz.id) },
    h('summary', null, h('h2', null, hz.name), h('span', { class: 'hazard-summary' }, hz.summary)),
    h('div', { class: 'hazard-body' },
      h('div', null, h('h3', null, 'Effects on the body'), h('ul', null, hz.effects.map(effect => h('li', null, effect)))),
      h('div', null, h('h3', null, 'In this app'), h('p', null, hz.appResponse)),
      hz.indicatorIds.length
        ? h('ul', { class: 'rows', 'aria-label': 'Tracked here' }, hz.indicatorIds.map(tracked))
        : h('p', { class: 'hazard-note' }, `${state.profile.name}: ${replyDelay(state.profile).text} `, h('a', { href: '#/alerts' }, 'See alerts and the report for ground'))));

  root.append(
    h('h1', null, 'Hazards'),
    h('p', { class: 'lede' }, 'The five hazards of human spaceflight, from NASA\'s Human Research Program. Open one to see what this app tracks for it.'),
    h('div', { class: 'stack' }, h('div', { class: 'panel list' }, HAZARDS.map(hazard))));
}
