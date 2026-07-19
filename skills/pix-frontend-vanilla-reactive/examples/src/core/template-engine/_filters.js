// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3 — Filter system + built-in filters
// ═══════════════════════════════════════════════════════════════════════════════

export const FILTERS = {};
export function registerFilter(name, fn) { FILTERS[name] = fn; }

// ── Built-in filters ──────────────────────────────────────────────────────────
export function utilSlug(v) { return String(v).toLowerCase().trim().replace(/[\s\W-]+/g, '-').replace(/^-+|-+$/g, ''); }

registerFilter('upper',       v => String(v).toUpperCase());
registerFilter('lower',       v => String(v).toLowerCase());
registerFilter('capitalize',  v => { const s = String(v); return s[0].toUpperCase() + s.slice(1).toLowerCase(); });
registerFilter('slugify',     v => utilSlug(v));
registerFilter('slug',        v => utilSlug(v));
registerFilter('trim',        v => String(v).trim());
registerFilter('escapeHtml',  v => String(v).replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;' }[s] || s)));
registerFilter('striptags',   v => String(v).replace(/<[^>]*>/g, ''));
registerFilter('raw',         v => v);
registerFilter('json',        v => { try { return JSON.stringify(v); } catch { return String(v); } });
registerFilter('default',     (v, d = '') => (v !== undefined && v !== null && v !== '' ? v : d));
registerFilter('truncate',    (v, l = 100) => { const s = String(v); return s.length > l ? s.slice(0, l) + '...' : s; });
registerFilter('length',      v => (Array.isArray(v) || typeof v === 'string' ? v.length : 0));
registerFilter('where',       (v, prop) => Array.isArray(v) ? v.filter(item => item[prop]) : v);
registerFilter('first',       v => (Array.isArray(v) && v.length ? v[0] : v));
registerFilter('last',        v => (Array.isArray(v) && v.length ? v[v.length - 1] : v));

registerFilter('join', (v, sep = ', ') => {
  if (!Array.isArray(v)) return v;
  return v.map(i => (typeof i === 'object' && i?.label) ? i.label : String(i)).join(sep);
});

registerFilter('tagLabel', tag => {
  if (!tag) return '';
  const raw = typeof tag === 'object' ? (tag.label || tag.name || String(tag)) : String(tag);
  const m = { css: 'CSS', html: 'HTML' };
  return m[String(raw).toLowerCase().trim()] || raw;
});

registerFilter('tagHref', tag => {
  if (!tag) return '/tags/';
  if (typeof tag === 'object') {
    if (tag.url) return tag.url.startsWith('/') ? tag.url : '/' + tag.url;
    return '/tags/' + utilSlug(tag.key || tag.name || String(tag)) + '.html';
  }
  return '/tags/' + utilSlug(tag) + '.html';
});

registerFilter('date', (value, format = 'en-US') => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  if (format === 'YYYY-MM-DD') return d.toISOString().split('T')[0];
  if (format === 'long') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  if (format === 'short') return d.toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
  if (format === 'full') return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (format === 'iso') return d.toISOString();
  if (format === 'DD MMM YYYY') {
    const ms = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return String(d.getDate()).padStart(2, '0') + ' ' + ms[d.getMonth()] + ' ' + d.getFullYear();
  }
  try { return d.toLocaleDateString(format, { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
});

registerFilter('timeAgo', value => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return d.toLocaleDateString('en-US');
});

registerFilter('urlencode', v => encodeURIComponent(String(v)));
registerFilter('sortBy', (array, prop, dir = 'asc') => {
  if (!Array.isArray(array)) return array;
  return [...array].sort((a, b) => {
    let va = a[prop], vb = b[prop];
    if (prop === 'date') { va = new Date(va); vb = new Date(vb); }
    return dir === 'desc' ? (va < vb ? 1 : va > vb ? -1 : 0) : (va > vb ? 1 : va < vb ? -1 : 0);
  });
});
