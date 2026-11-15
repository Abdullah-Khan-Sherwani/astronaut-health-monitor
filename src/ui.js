import { STATUS_LABEL } from './indicators.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function build(el, attrs, children) {
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'value' || key === 'checked') el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  // Strings become text nodes, so user-entered text can never be parsed as HTML.
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) el.append(child);
  }
  return el;
}

export const h = (tag, attrs, ...children) => build(document.createElement(tag), attrs, children);
export const svg = (tag, attrs, ...children) => build(document.createElementNS(SVG_NS, tag), attrs, children);

// Status is always a word as well as a colour.
export function statusLabel(status) {
  return h('span', { class: 'status', 'data-status': status }, STATUS_LABEL[status] ?? STATUS_LABEL.none);
}

// A reading with its unit set smaller beside it, such as "131/82 mmHg".
export function reading(display, unit) {
  const split = unit && display.endsWith(` ${unit}`);
  return h('span', { class: 'value' },
    split ? display.slice(0, -unit.length - 1) : display,
    split ? h('span', { class: 'unit' }, ` ${unit}`) : null);
}

export function versusAverage(delta) {
  if (delta === 0) return 'Same as your 14-day average';
  return `${Math.abs(delta)} ${delta > 0 ? 'above' : 'below'} your 14-day average`;
}
