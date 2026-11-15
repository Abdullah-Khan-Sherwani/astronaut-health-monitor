import { createStore } from './store.js';
import { loadWeather, summarize } from './space-weather.js';
import { PROFILES } from './nasa-data.js';
import { h } from './ui.js';
import * as home from './screen-home.js';
import * as checkin from './screen-checkin.js';
import * as trends from './screen-trends.js';
import * as alerts from './screen-alerts.js';
import * as routine from './screen-routine.js';
import * as library from './screen-library.js';

const SCREENS = { '': home, checkin, trends, alerts, routine, library };

// Everything the app needs to run with no connection after the first visit.
const APP_FILES = [
  './', 'index.html', 'styles.css', 'vendor/chart.umd.js', 'src/space-weather-snapshot.json',
  ...['app', 'ui', 'nasa-data', 'indicators', 'rules', 'projections', 'simulate', 'store', 'alerts', 'space-weather',
    'screen-home', 'screen-checkin', 'screen-trends', 'screen-alerts', 'screen-routine', 'screen-library']
    .map(name => `src/${name}.js`),
];

function memoryStorage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}

let storage;
try {
  storage = window.localStorage;
  storage.getItem('ahm.v1');
} catch {
  storage = memoryStorage();
}

const store = createStore(storage);
const root = document.getElementById('app');
const profileSelect = document.getElementById('profile');
let weatherData = null;
let weatherSource = 'none';
let cleanup = null;

function route() {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  return { path: Object.hasOwn(SCREENS, path) ? path : '', params: new URLSearchParams(query ?? '') };
}

function render({ moveFocus = false } = {}) {
  const { path, params } = route();
  const state = store.get();
  const focusedId = document.activeElement?.id;
  const ctx = {
    store, state, params,
    weather: { source: weatherSource, fetchedAt: weatherData?.fetchedAt ?? null, summary: summarize(weatherData, Date.now(), state.speDemo) },
    navigate: hash => { location.hash = hash; },
    refresh: () => render(),
  };

  cleanup?.();
  root.replaceChildren();
  cleanup = SCREENS[path].render(root, ctx) ?? null;

  profileSelect.value = state.profileId;
  const delay = state.profile.delaySecOneWay;
  document.getElementById('profile-facts').textContent =
    `${state.profile.gravity}, ${delay === 0 ? 'near real-time contact' : delay < 60 ? `${delay} s delay each way` : `${delay / 60} min delay each way`}`;
  document.getElementById('mission-day').textContent = state.day;
  for (const link of document.querySelectorAll('.tabs a')) {
    if (link.dataset.route === path) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  if (moveFocus) root.focus();
  else if (focusedId) document.getElementById(focusedId)?.focus();
}

for (const p of PROFILES) profileSelect.append(h('option', { value: p.id }, p.name));
profileSelect.addEventListener('change', () => { store.setProfile(profileSelect.value); render(); });

document.getElementById('reset').addEventListener('click', () => {
  store.reset();
  location.hash = '#/';
  location.reload();
});

const offlineFlag = document.getElementById('offline');
const showConnection = () => { offlineFlag.hidden = navigator.onLine; };
window.addEventListener('online', showConnection);
window.addEventListener('offline', showConnection);
showConnection();

window.addEventListener('hashchange', () => render({ moveFocus: true }));
render();

// Pass an arrow function: a detached `fetch` throws "Illegal invocation".
loadWeather({ fetchFn: url => fetch(url), storage, nowMs: Date.now() }).then(result => {
  weatherData = result.weather;
  weatherSource = result.source;
  render();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => caches.open('ahm-v1'))
    .then(cache => cache.addAll(APP_FILES))
    .catch(() => { /* offline support is best effort */ });
}
