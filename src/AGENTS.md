# src

- Logic modules (`nasa-data`, `indicators`, `rules`, `projections`, `simulate`, `store`, `alerts`,
  `space-weather`) are pure: storage, fetch and the clock are passed in as arguments.
- Screens (`screen-*.js`) hold no numbers. Every figure comes from `nasa-data.js` or `indicators.js`.
- Tests sit beside the module as `*.test.js`. Run `npm test` from the repo root.
- User-entered text is rendered with `textContent` (see `ui.js`), never `innerHTML`.
