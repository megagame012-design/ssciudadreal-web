/* =====================================================================
   Utilidades compartidas: iconos, fechas, imágenes y lógica de los datos
   (los datos vienen de data/data.js y data/mapas.js como globales)
   ===================================================================== */

/* ---------- Iconos de trazo fino (estilo SF Symbols, dibujados a mano) ---------- */
const P = {
  hoy:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M3.5 9h17M8 13h4M8 16.5h7"/>',
  agenda:'<rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4"/><circle cx="8.5" cy="14" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r=".9" fill="currentColor" stroke="none"/><circle cx="15.5" cy="14" r=".9" fill="currentColor" stroke="none"/><circle cx="8.5" cy="17.2" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none"/>',
  fototeca:'<rect x="3" y="5" width="15" height="13" rx="3"/><path d="M6.5 2.8h11A3.5 3.5 0 0 1 21 6.3v9.2"/><path d="m3.5 15 3.7-3.6a1.5 1.5 0 0 1 2 0l4.8 4.6"/><circle cx="13.6" cy="9.3" r="1.5"/>',
  hermandades:'<path d="M12 2.5v5.5M9.6 4.8h4.8"/><path d="M7.5 21.5v-8.2a4.5 4.5 0 0 1 9 0v8.2"/><path d="M5 21.5h14"/><path d="M10.2 21.5v-3.2a1.8 1.8 0 0 1 3.6 0v3.2"/>',
  ajustes:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chevR:'<path d="m9 5 7 7-7 7"/>', chevL:'<path d="m15 5-7 7 7 7"/>', chevD:'<path d="m5 9 7 7 7-7"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>', check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/>',
  filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  share:'<path d="M12 3.5v11M8 7.2l4-3.7 4 3.7M6.5 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5"/>',
  star:'<path d="m12 3.2 2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.4 2.85 1-6L3.3 9.6l6-.9z"/>',
  heart:'<path d="M12 20s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 2.9C19.5 15.6 12 20 12 20z"/>',
  pin:'<path d="M12 21s-6.5-5.7-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  route:'<circle cx="6" cy="18.5" r="2.3"/><circle cx="18" cy="5.5" r="2.3"/><path d="M8.3 18.5h8.2a3.3 3.3 0 0 0 0-6.6h-9a3.3 3.3 0 0 1 0-6.6h8.2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  calPlus:'<rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4M12 12.5v5M9.5 15h5"/>',
  directions:'<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M9.5 14v-2.3a1 1 0 0 1 1-1H15M13 8.7l2 2-2 2"/>',
  music:'<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  history:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>',
  brush:'<path d="M18.4 2.8a2 2 0 0 1 2.8 2.8L11 15.8 8.2 13z"/><path d="M7 14.5c-2 0-3.5 1.6-3.5 3.5 0 1.2-.5 2-1.5 2.5 3.5 1 7.5-.5 7.5-3.5"/>',
  users:'<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.5c.6-3.4 3.2-5.2 6.2-5.2s5.6 1.8 6.2 5.2M16 4.8a3.4 3.4 0 0 1 0 6.4M18 14.6c1.8.6 3 2.2 3.3 4.9"/>',
  church:'<path d="M12 2.5v4M10 4.5h4M5.5 21V11.5L12 7l6.5 4.5V21M3.5 21h17M10 21v-4a2 2 0 0 1 4 0v4"/>',
  cross:'<path d="M12 2.8v18.4M6.6 8h10.8"/>',
  image:'<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="9" cy="9" r="1.8"/><path d="m20.5 15-5-5L5 20.5"/>',
  grid:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  ig:'<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.9"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none"/>',
  external:'<path d="M14 4h6v6M20 4l-8.5 8.5M18 14.5v3.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5"/>',
  phone:'<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/>',
  call:'<path d="M5.2 3.8h3.5l1.8 4.6-2.2 1.3a10.5 10.5 0 0 0 5.9 5.9l1.3-2.2 4.6 1.8v3.5a2 2 0 0 1-2.1 2A16.4 16.4 0 0 1 3.2 5.9a2 2 0 0 1 2-2.1z"/>',
  download:'<path d="M12 3.5v11.5M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  trash:'<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.9 13a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  textsize:'<path d="M4 19 9 6l5 13M5.8 14.5h6.4M14.5 19l3-7.5 3 7.5M15.6 16.6h3.8"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1-.8-1.4-.8-2.4 0-1 .9-1.7 2-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="10" cy="7.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="7.5" r="1.1" fill="currentColor" stroke="none"/>',
  bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.8a2 2 0 0 0 4 0"/>',
  database:'<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V6M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8"/>',
  homeadd:'<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  lazo:'<path d="M12 3.2c-2 0-3.3 1.5-3.3 3.4 0 2.2 1.9 4.4 3.3 6 1.4-1.6 3.3-3.8 3.3-6 0-1.9-1.3-3.4-3.3-3.4z"/><path d="M10.6 11.4 6.2 21l2.9-1 1.5 2.4 2.7-6.6M13.4 11.4 17.8 21l-2.9-1-1.5 2.4"/>',
  drop:'<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
  paso:'<path d="M3 12.5h18l-1.5 3h-15z"/><path d="M6 15.5v4M10 15.5v4M14 15.5v4M18 15.5v4"/><path d="M12 3v7M9.5 5.5h5"/>',
  inmaculada:'<path d="M3.5 15.5c2.2 3 5.1 4.5 8.5 4.5s6.3-1.5 8.5-4.5c-2.5 1.6-5.3 2.4-8.5 2.4s-6-.8-8.5-2.4z"/><path d="M12 3.2l1.3 2.7 2.9.3-2.2 2 .6 2.9L12 9.6l-2.6 1.5.6-2.9-2.2-2 2.9-.3z"/>',
  ancla:'<circle cx="12" cy="4.8" r="1.8"/><path d="M12 6.6V21M8.5 10h7M4.5 13.5c.4 4.2 3.6 7.5 7.5 7.5s7.1-3.3 7.5-7.5M4.5 13.5 3 15.5M4.5 13.5l2.2 1M19.5 13.5l1.5 2M19.5 13.5l-2.2 1"/>',
  estrella:'<path d="M9 3l1.4 3.3 3.5.3-2.7 2.3.9 3.5L9 10.5l-3.1 1.9.9-3.5-2.7-2.3 3.5-.3z"/><path d="M12.5 12.5 20 21M11.2 14.2l3.6 6.6M14.4 11.4l6.4 4"/>',
  belen:'<path d="M3 11l3.5 7h11L21 11z"/><path d="M6.5 18 4.5 21M17.5 18l2 3"/><circle cx="12" cy="7" r="2"/><path d="M9 11c.8-1.3 1.8-2 3-2s2.2.7 3 2"/>',
  camello:'<path d="M3.5 14.5c0-2 .9-3.3 2.2-3.5.5-3 1.6-4.5 3-4.5s2.3 1.4 2.7 3.3c.5-1.4 1.3-2.3 2.4-2.3 1.3 0 2.3 1.6 2.6 4l1.5-5.4c.2-.8.9-1.3 1.7-1.2l1.4.3-.4 1.5h-1.1L18 14.5z"/><path d="M5.5 14.5V21M8.5 14.5V21M14 14.5V21M16.8 14.5V21"/>',
  corona:'<path d="M4 17.5 3 8l5 4 4-7 4 7 5-4-1 9.5z"/><path d="M4.5 21h15"/>',
  cristoRey:'<path d="M5 19.5 4 10l4.5 3.5L12 8l3.5 5.5L20 10l-1 9.5z"/><path d="M12 2v5M10 4h4M4.5 22h15"/>',
  medalla:'<path d="M8 2.5 12 8l4-5.5"/><ellipse cx="12" cy="15" rx="5.5" ry="6.5"/><path d="M12 11.5v6M10 13.5h4"/>',
  candle:'<path d="M9 21h6M10 21V11h4v10"/><path d="M12 8.5c-1.2-1-1.6-2.1-1-3.3.4-.8 1-1.5 1-2.7 1.3.9 2 2.2 2 3.5a2 2 0 0 1-2 2.5z"/>',
  wifiOff:'<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-2.3-1.7M2 9.5a15 15 0 0 1 4.5-2.8M22 9.5A15 15 0 0 0 11 6"/><circle cx="12" cy="20" r=".9" fill="currentColor" stroke="none"/>',
  sparkle:'<path d="M12 3c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7z"/>',
  ellipsis:'<circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  map:'<path d="m9 4.5-5.5 2v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  pinFill:'<path d="M12 21s-6.5-5.7-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.3-6.5 11-6.5 11z" fill="currentColor"/>',
  newspaper:'<path d="M5 4.5h11a2 2 0 0 1 2 2V18a2.5 2.5 0 0 0 2.5 2.5H6.5A2.5 2.5 0 0 1 4 18V5.5a1 1 0 0 1 1-1z"/><path d="M18 9h2.5V18a2.5 2.5 0 0 1-2.5 2.5M7.5 8.5h7M7.5 12h7M7.5 15.5h4"/>'
};
export const icon = (n, s = 22, cls = '') => `<svg class="i ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- DOM ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
export function h(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const store = {
  get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
};

/* ---------- Imágenes ---------- */
const cld0 = (url, w) => {
  if (!url) return url;
  w = Math.round(w);   // los servidores de fotos solo aceptan anchos enteros (w148.2 no carga)
  if (url.includes('res.cloudinary.com') && url.includes('/upload/v')) return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`);
  if (url.includes('googleusercontent.com')) return url.replace(/\/[sw]\d+(-[a-z0-9-]+)?\//, `/w${Math.min(w, 1600)}/`);
  if (/^img\/[\w\/-]+\.webp$/.test(url) && w <= 700) return url.replace(/\.webp$/, '-640.webp');
  return url;
};
/* En el archivo único, las fotos propias van incrustadas (SSCR_INLINE) */
export const cld = (url, w) => { const u = cld0(url, w); return (window.SSCR_INLINE && window.SSCR_INLINE[u]) || u; };
export const srcset = (url, ws) => ws.map(w => `${cld(url, w)} ${w}w`).join(', ');
/* <img> con estado de carga (esqueleto) */
export const img = (url, w, { cls = '', alt = '', sizes = '', ws = null, eager = false, pos = '', style = '' } = {}) =>
  `<img class="${cls}" src="${cld(url, w)}"${ws ? ` srcset="${srcset(url, ws)}" sizes="${sizes || '100vw'}"` : ''} alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${pos || style ? ` style="${pos ? `object-position:${pos};` : ''}${style}"` : ''}>`;
export function markLoaded(root){ $$('img', root || document).forEach(i => { if (i.complete && i.naturalWidth) i.classList.add('is-loaded'); }); }

/* ---------- Fechas ---------- */
export const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export const WEEKDAYS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
export const pad = n => String(n).padStart(2, '0');
export const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const SMALL = new Set(['de','del','la','las','los','y','en','el']);
export const titleCase = s => String(s).toLowerCase().split(' ').map((w, i) => i > 0 && SMALL.has(w) ? w : cap(w)).join(' ');
export const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const fmtLong = iso => cap(parseISO(iso).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));
export const fmtDay = iso => cap(parseISO(iso).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' }));
export const fmtShort = iso => parseISO(iso).toLocaleDateString('es-ES', { day:'numeric', month:'long' });
export const fmtNewsDate = s => /^\d{4}-\d{2}$/.test(s) ? cap(`${MONTHS[+s.slice(5, 7) - 1]} de ${s.slice(0, 4)}`) : /^\d{4}-\d{2}-\d{2}$/.test(s) ? fmtShort(s) + ' de ' + s.slice(0, 4) : '';
export const isMissing = v => !v || /^\s*no especificad/i.test(v) || /en confirmación|por confirmar/i.test(v);
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const TODAY = toISO(new Date());

/* ---------- Semana Santa ---------- */
export function easter(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    hh=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-hh-k)%7,m=Math.floor((a+11*hh+22*l)/451),
    month=Math.floor((hh+l-7*m+114)/31),day=((hh+l-7*m+114)%31)+1;
  return new Date(y, month - 1, day);
}
export function nextSS(){
  const now = new Date(); now.setHours(0, 0, 0, 0);
  let y = now.getFullYear(), pascua = easter(y);
  if (now > pascua) pascua = easter(++y);
  return { y, pascua };
}
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/* Construye las fechas de cada jornada de Semana Santa */
export const JF = JORNADA_FECHAS;
export const SS_DAYS = [];
(function buildSemanaSanta(){
  const { y, pascua } = nextSS();
  const at = off => addDays(pascua, off);
  const dm = d => `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  Object.entries(JORNADA_OFFSETS).forEach(([k, offs]) => {
    const ds = offs.map(at);
    const txt = ds.length > 1 && ds[0].getMonth() === ds[1].getMonth() ? `${ds[0].getDate()} y ${dm(ds[1])}` : ds.map(dm).join(' y ');
    JORNADA_FECHAS[k] = { txt:`${txt} de ${y}`, iso:toISO(ds[0]), isos: ds.map(toISO) };
  });
  for (let i = EVENTOS.length - 1; i >= 0; i--) if (EVENTOS[i].type === 'procesion' && !EVENTOS[i].keep) EVENTOS.splice(i, 1);
  // Las jornadas de Semana Santa no son actos de la agenda: van aparte (fichas de hermandad y «Hoy en la calle»)
  PROC_EVENTS.forEach(p => SS_DAYS.push({ id:p.id, date:toISO(at(p.off)), title:p.title, type:'procesion' }));
})();

/* ---------- Agenda ---------- */
export const typeOf = id => TYPES.find(t => t.id === id) || TYPES[0];
export const TYPE_ORDER = TYPES.map(t => t.id);
export const evDates = e => e.dates || [e.date];
export const evTypesOn = (e, iso) => [...new Set([e.type, ...((e.secondaryTypes && e.secondaryTypes[iso]) || [])])];
export const timeOf = e => { const m = String(e.time || '').match(/(\d{1,2}):(\d{2})/); return m ? `${pad(m[1])}:${m[2]}` : null; };
export const ALL_DATES = [...new Set(EVENTOS.flatMap(evDates))].sort();
export const evById = id => EVENTOS.find(e => e.id === id);
export function eventsOn(iso, active){
  return EVENTOS
    .filter(e => evDates(e).includes(iso) && (!active || evTypesOn(e, iso).some(t => active.has(t))))
    .sort((a, b) => (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || (timeOf(a) || '99').localeCompare(timeOf(b) || '99'));
}
export function nextEvent(fromISO = TODAY){
  const list = [];
  EVENTOS.forEach(e => { const d = evDates(e).find(x => x >= fromISO); if (d) list.push({ e, d }); });
  return list.sort((a, b) => a.d.localeCompare(b.d) || (timeOf(a.e) || '99').localeCompare(timeOf(b.e) || '99'));
}

/* ---------- Hermandades ---------- */
export const HERMS = [];   // lista plana: { id, j, i, h, name }
HERMANDADES_DATA.forEach(j => j.items.forEach((hh, i) => {
  const name = hh.nombreCorto || hh.nombre;
  HERMS.push({ id:`${slug(j.jornada)}/${slug(name)}`, j:j.jornada, i, h:hh, name });
}));
export const hermById = id => HERMS.find(x => x.id === id);
export const jornadaBySlug = s => HERMANDADES_DATA.find(j => slug(j.jornada) === s);
/* Hermandades únicas (sin repetir las que salen en dos jornadas ni el Vía Crucis) */
export const HERM_UNIQUE = (() => { const seen = new Set(); return HERMS.filter(x => { const k = slug(x.name); if (x.h.isViaCrucis || seen.has(k)) return false; seen.add(k); return true; }); })();
export function salida(hh){
  const line = String(hh.itinerarioHorarios || '').split('\n').find(l => /\d{1,2}:\d{2}/.test(l));
  const m = line && line.match(/(\d{1,2}:\d{2})/);
  return m ? m[1].padStart(5, '0') : null;
}
export function entrada(hh){
  const lines = String(hh.itinerarioHorarios || '').split('\n').filter(l => /\d{1,2}:\d{2}/.test(l));
  const last = lines[lines.length - 1]; const m = last && /entrada/i.test(last) && last.match(/(\d{1,2}:\d{2})/);
  return m ? m[1].padStart(5, '0') : null;
}
export function jornadasFor(e){ return (PROC_JORNADA[e.title] || []).map(n => HERMANDADES_DATA.find(j => j.jornada === n)).filter(Boolean); }
export function hermsFor(e){ return jornadasFor(e).flatMap(j => j.items.map((hh, i) => HERMS.find(x => x.j === j.jornada && x.i === i))).filter(x => x && (!x.h.diaSalida || x.h.diaSalida === e.title)); }
/* Fecha de salida procesional de una hermandad (a partir de su jornada) */
export function procDateFor(x){
  const ev = SS_DAYS.find(e => hermsFor(e).some(y => y.id === x.id));
  return ev ? { iso: ev.date, title: ev.title, id: ev.id } : null;
}
/* Todas las fotos de la fototeca, con su hermandad y jornada (sin fecha en los datos) */
export const PHOTOS = (() => {
  const out = [], seen = new Set();
  HERMS.forEach(x => [x.h.image, ...(x.h.galeria || [])].filter(Boolean).forEach(u => { if (seen.has(u)) return; seen.add(u); out.push({ url:u, herm:x, credit:'Laura Arroyo · Objetivo Cofrade' }); }));
  return out;
})();

/* ---------- Textos ---------- */
export function richText(t){
  return String(t || '').split(/\n{2,}/).map(par => {
    let out = '', buf = [], list = [];
    const bold = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');   // **negrita**
    const flushP = () => { if (buf.length) { out += `<p>${buf.map(bold).join('<br>')}</p>`; buf = []; } };
    const flushL = () => { if (list.length) { out += `<ul>${list.map(x => `<li>${bold(x)}</li>`).join('')}</ul>`; list = []; } };
    par.split('\n').forEach(raw => {
      const s = raw.trim(); if (!s) return;
      const q = s.match(/^["“](.+)["”]\.?$/);
      if (/^-\s+/.test(s)) { flushP(); list.push(s.replace(/^-\s+/, '')); }
      else if (q) { flushP(); flushL(); out += `<blockquote>${esc(q[1])}</blockquote>`; }
      else { flushL(); buf.push(s); }
    });
    flushP(); flushL(); return out;
  }).join('');
}
export function timelineRows(text){
  const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
  const re = /^(.*?)[\s,:]*(?:a las\s*)?(\d{1,2}:\d{2})\s*h?\.?$/i;
  return lines.map(l => { const m = l.match(re); return m ? { t:m[2].padStart(5, '0'), p:m[1].replace(/[\s:,.]+$/, '') } : { t:'', p:l }; });
}

/* ---------- Calendario (.ics) ---------- */
export function icsFor(e, iso){
  const day = iso || e.date, d = day.replace(/-/g, ''), t = timeOf(e);
  const clean = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
  let start, end;
  if (t) {
    const [hh, mm] = t.split(':').map(Number);
    start = `DTSTART;TZID=Europe/Madrid:${d}T${pad(hh)}${pad(mm)}00`;
    const em = String(e.end || '').match(/^(\d{1,2}):(\d{2})$/);
    end = em ? `DTEND;TZID=Europe/Madrid:${d}T${pad(em[1])}${em[2]}00` : hh < 22 ? `DTEND;TZID=Europe/Madrid:${d}T${pad(hh + 2)}${pad(mm)}00` : 'DURATION:PT2H';
  } else {
    const n = parseISO(day); n.setDate(n.getDate() + 1);
    start = `DTSTART;VALUE=DATE:${d}`; end = `DTEND;VALUE=DATE:${toISO(n).replace(/-/g, '')}`;
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SS Ciudad Real//Agenda cofrade//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    `UID:sscr-${e.id}-${d}@ssciudadreal`, `DTSTAMP:${stamp}`, start, end, `SUMMARY:${clean(e.title)}`,
    e.location ? `LOCATION:${clean(e.location + ', Ciudad Real')}` : 'LOCATION:Ciudad Real',
    `DESCRIPTION:${clean((e.hermandad ? e.hermandad + '\n\n' : '') + (e.fullDesc || e.desc || '') + '\n\nSS Ciudad Real · ' + SITE.url)}`,
    'END:VEVENT','END:VCALENDAR'].join('\r\n');
}
export function downloadICS(e, iso){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([icsFor(e, iso)], { type:'text/calendar;charset=utf-8' }));
  a.download = slug(e.title).slice(0, 60) + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
/* «Cómo llegar»: búsqueda por el texto del lugar en Mapas de Apple (sin inventar coordenadas) */
export const directionsURL = place => `https://maps.apple.com/?q=${encodeURIComponent(place + ', Ciudad Real')}`;

/* Compartir nativo con alternativa de copiar enlace */
/* El enlace siempre apunta a la web pública: abierta como archivo o en local, location.origin no sirve («null», localhost) */
/* y la ruta va tras «#/» para que abra aunque el servidor no redirija las rutas a index.html */
const publicURL = url => { const p = String(url || '').replace(/^(null|[a-z]+:\/\/[^/]*)/i, '').replace(/^\/?#/, ''); return SITE.url.replace(/\/$/, '') + (p && p !== '/' ? '/#' + p : '/'); };
async function copyText(text){
  if (navigator.clipboard && window.isSecureContext) { try { await navigator.clipboard.writeText(text); return; } catch (e) {} }
  const t = document.createElement('textarea');
  t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length);
  const ok = document.execCommand('copy'); t.remove();
  if (!ok) throw new Error('copy');
}
export async function share(title, url, toast){
  url = publicURL(url || currentPathURL());
  const data = { title, text: title + ' · SS Ciudad Real', url };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try { await navigator.share(data); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }   // cancelado por el usuario; otro error → copiar
  }
  try { await copyText(url); toast && toast('Enlace copiado', 'check'); } catch (e) { toast && toast('No se ha podido copiar el enlace', 'info'); }
}
const currentPathURL = () => location.protocol === 'file:' ? (location.hash.replace(/^#/, '') || '/') : location.pathname;
