import { STATUS_LABEL } from './indicators.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON = { green: '✓', amber: '!', red: '✕', none: '–' };

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

// Status is always an icon and a word as well as a colour.
export function statusBadge(status) {
  return h('span', { class: 'badge', 'data-status': status },
    h('span', { class: 'badge-icon', 'aria-hidden': 'true' }, ICON[status] ?? ICON.none),
    STATUS_LABEL[status] ?? STATUS_LABEL.none);
}

export function sourceLink(source) {
  return h('a', { class: 'source', href: source.url, target: '_blank', rel: 'noopener' }, `Source: ${source.title}`);
}

export function signed(delta) {
  return `${delta > 0 ? '+' : ''}${delta} vs your 14-day average`;
}
