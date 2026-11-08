/* =====================================================================
   Agenda (como Calendario de Apple): Año → Mes (con la lista del día) → Día
   Pellizcar para alejar, deslizar para cambiar de mes.
   ===================================================================== */
import { icon, esc, $, $$, MONTHS, pad, toISO, parseISO, cap, TODAY, typeOf, TYPE_ORDER, eventsOn, ALL_DATES, evTypesOn, timeOf, fmtLong, fmtDay, plural, hermsFor, evDates, img, nextSS } from '../util.js';
import { screen, register, navigate, topScreen } from '../router.js';
import { prefs } from '../settings.js';
import { openSheet, toast, longPress } from '../ui.js';
import { switchCell, section, searchBar, wireSearch, norm, profileBtn } from './common.js';
import { openEvent, tdot } from './evento.js';
import { ensIcon } from './ensayos.js';
import { downloadICS, share, evById } from '../util.js';

/* Filtros (se recuerdan mientras la app está abierta) */
const F = { active: new Set(TYPE_ORDER), mine:false };
const filtered = () => F.active.size < TYPE_ORDER.length;
const evs = iso => eventsOn(iso, F.active);
const WD = ['L','M','X','J','V','S','D'];
const firstEventMonth = () => { const n = ALL_DATES.find(d => d >= TODAY) || TODAY; return n.slice(0, 7); };

/* ---------- Año: los 12 meses en miniatura ---------- */
function miniMonth(y, m){
  const first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`, has = evs(iso).length;
    cells += `<span class="${iso === TODAY ? 'today' : ''}${has ? ' has' : ''}">${d}</span>`;
  }
  return `<button type="button" class="mini-month" data-month="${y}-${pad(m + 1)}" aria-label="${cap(MONTHS[m])} de ${y}"><span class="mm-name${y === new Date().getFullYear() && m === new Date().getMonth() ? ' ca' : ''}">${cap(MONTHS[m])}</span><span class="mm-grid">${cells}</span></button>`;
}
register('/agenda', 'agenda', () => {
  const y0 = new Date().getFullYear(), years = [y0, y0 + 1];
  const content = years.map(y => `<section class="year-block" data-year="${y}"><h2 class="year-title${y === y0 ? ' ca' : ''}">${y}</h2><div class="year-grid">${Array.from({ length:12 }, (_, m) => miniMonth(y, m)).join('')}</div></section>`).join('');
  let opened = false;
  return screen({ title:'Agenda', titleAside: profileBtn(), content, right: toolbar(), setup: s => {
    s.el.addEventListener('click', e => { const b = e.target.closest('[data-month]'); if (b) navigate(`/agenda/${b.dataset.month}`, { from: b.getBoundingClientRect() }); });
    wireToolbar(s);
  }, onShow: () => { if (!opened) { opened = true; if (topScreen('agenda').path === '/agenda') navigate(`/agenda/${firstEventMonth()}`, { instant:true }); } } });
});

/* Barra: Hoy, buscar, filtros e información */
function toolbar(){ return `<button type="button" class="gbtn glass liquid" data-ag="search" aria-label="Buscar actos">${icon('search', 20)}</button><button type="button" class="gbtn glass liquid" data-ag="filter" aria-label="Filtros">${icon('filter', 20)}${filtered() || F.mine ? '<span class="badge"></span>' : ''}</button>`; }
function wireToolbar(s, rerender){
  s.el.addEventListener('click', e => {
    const b = e.target.closest('[data-ag]'); if (!b) return;
    const a = b.dataset.ag;
    if (a === 'search') openSearch();
    if (a === 'filter') openFilters(() => { s.navbar.querySelector('.nav-right').innerHTML = (s.extraRight || '') + toolbar(); rerender && rerender(); });
    if (a === 'legend') openLegend();
    if (a === 'today') navigate(`/agenda/${TODAY.slice(0, 7)}`, { replace:true });
  });
}

/* ---------- Mes: rejilla con puntos y lista del día debajo ---------- */
register('/agenda/(\\d{4})-(\\d{2})', 'agenda', (Y, M) => monthScreen(+Y, +M - 1));
register('/agenda/(\\d{4})-(\\d{2})-(\\d{2})', 'agenda', (Y, M, D) => monthScreen(+Y, +M - 1, `${Y}-${M}-${D}`));
register('/agenda/(\\d{4})-(\\d{2})-(\\d{2})/(\\d+)', 'agenda', (Y, M, D, id) => monthScreen(+Y, +M - 1, `${Y}-${M}-${D}`, +id));

function monthGrid(y, m, sel){
  const first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let html = '';
  for (let i = 0; i < off; i++) html += '<span class="md empty" aria-hidden="true"></span>';
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`, list = evs(iso);
    const types = [...new Set(list.flatMap(e => evTypesOn(e, iso)).filter(t => F.active.has(t)))].slice(0, 3);
    const label = `${d} de ${MONTHS[m]}${list.length ? ', ' + plural(list.length, 'acto', 'actos') + ': ' + types.map(t => typeOf(t).one).join(', ') : ''}${iso === TODAY ? ', hoy' : ''}`;
    html += `<button type="button" class="md${iso === TODAY ? ' today' : ''}${iso === sel ? ' sel' : ''}" data-day="${iso}" aria-label="${label}" aria-pressed="${iso === sel}"><span class="md-n">${d}</span><span class="md-dots">${types.map(t => `<i style="--c:${typeOf(t).color}"></i>`).join('')}</span></button>`;
  }
  return html;
}
function dayList(iso){
  const list = evs(iso), all = eventsOn(iso);
  if (!list.length) return `<div class="empty compact">${icon(filtered() && all.length ? 'filter' : 'candle', 40)}<h3>${filtered() && all.length ? 'Sin resultados con estos filtros' : 'Sin actos'}</h3><p>${filtered() && all.length ? `Hay ${plural(all.length, 'acto', 'actos')} de otros tipos este día.` : 'No hay cultos ni actos publicados para este día.'}</p>${filtered() && all.length ? '<button type="button" class="btn btn-tinted btn-sm" data-ag-clear>Quitar filtros</button>' : ''}</div>`;
  return `<div class="group ev-group">${list.map(e => evRow(e, iso)).join('')}</div>`;
}
/* Tarjetas de los próximos actos (al entrar, sin día elegido) */
const evPic = e => e.image || (hermsFor(e)[0] && hermsFor(e)[0].h.image);
function monthCards(month){
  const seen = new Set(), list = [];
  ALL_DATES.filter(d => d.startsWith(month)).forEach(d => evs(d).forEach(e => { if (!seen.has(e.id)) { seen.add(e.id); list.push({ e, d }); } }));
  if (!list.length) return `<p class="ag-none">${icon('candle', 18)} Sin cultos publicados este mes</p>`;
  return `<div class="ag-cards">${list.map(({ e, d }) => {
    const t = evTypesOn(e, d)[0] || e.type, pic = evPic(e), dt = parseISO(d), ds = evDates(e).filter(x => x.startsWith(month));
    const last = ds[ds.length - 1], past = last < TODAY, n = Math.round((parseISO(d) - parseISO(TODAY)) / 864e5);
    const when = past ? 'Celebrado' : (ds.includes(TODAY) ? 'Hoy' : n === 1 ? 'Mañana' : n > 1 ? `En ${n} días` : 'En curso');
    const herm = String(e.hermandad || '').replace(/,.*$/, '');
    // Festividades: tarjeta pequeña, con su icono (o una miniatura si lleva foto)
    if (e.quiet) return `<button type="button" class="ag-card ag-mini${past ? ' past' : ''}" data-ev="${e.id}" data-iso="${d}" data-days="${ds.join(' ')}" style="--c:${typeOf(t).color}">
      <span class="agm-media${e.thumb || e.image ? ' ph' : ''}">${e.thumb || e.image ? img(e.thumb || e.image, 200, { pos:e.imagePos || '50% 20%' }) : icon(e.icon || 'sparkle', 30)}</span>
      <span class="agm-body"><span class="agm-date">${WEEKDAYS_S[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3)}<span class="agm-when${past ? ' is-past' : ''}">${when}</span></span>
        <span class="agm-title">${esc(e.title)}</span>
        ${e.sub || herm ? `<span class="agm-sub">${esc(e.sub || herm)}</span>` : ''}</span>
      ${icon('chevR', 16, 'agm-chev')}</button>`;
    return `<button type="button" class="ag-card${pic ? '' : ' no-pic'}${past ? ' past' : ''}" data-ev="${e.id}" data-iso="${d}" data-days="${ds.join(' ')}" style="--c:${typeOf(t).color}">
      <span class="agc-media${pic ? ' ph' : ''}">${pic ? img(pic, 900, { ws:[480, 900], sizes:'(min-width:760px) 45vw, 92vw', pos:e.imagePos || '50% 25%' }) : `<span class="agc-ill">${icon('candle', 44)}</span>`}
        <span class="agc-stamp"><i>${WEEKDAYS_S[dt.getDay()]}</i><b class="tnum">${ds.length > 1 ? `${dt.getDate()}–${parseISO(last).getDate()}` : dt.getDate()}</b><em>${MONTHS[dt.getMonth()].slice(0, 3)}</em></span>
        <span class="agc-when${past ? ' is-past' : ''}">${when}</span></span>
      <span class="agc-body">
        <span class="agc-type">${tdot(t)}<span>${typeOf(t).one}</span>${herm ? `<span class="agc-herm">· ${esc(herm)}</span>` : ''}</span>
        <span class="agc-title">${esc(e.title)}</span>
        <span class="agc-meta">${timeOf(e) ? `<span>${icon('clock', 15)}${timeOf(e)} h</span>` : ''}${e.location ? `<span>${icon('pin', 15)}${esc(e.location)}</span>` : ''}</span>
        ${ds.length > 1 ? `<span class="agc-days">${ds.map(x => `<span class="${x < TODAY ? 'done' : ''}"><i>${WEEKDAYS_S[parseISO(x).getDay()]}</i><b class="tnum">${parseISO(x).getDate()}</b></span>`).join('')}</span>` : ''}
        <span class="agc-cta">Ver ficha ${icon('chevR', 14)}</span>
      </span></button>`;
  }).join('')}</div>`;
}
const WEEKDAYS_S = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function evRow(e, iso){
  const types = evTypesOn(e, iso), t = timeOf(e);
  let sub = [e.hermandad, e.location].filter(Boolean).join(' · ');
  if (e.type === 'procesion' && !e.keep) { const n = hermsFor(e).length; sub = n ? `${plural(n, 'hermandad', 'hermandades')} en la calle` : 'Jornada procesional'; }
  return `<button type="button" class="ev-row" data-ev="${e.id}" data-iso="${iso}" style="--c:${typeOf(types[0]).color}">
    <span class="ev-bar"></span><span class="ev-time tnum">${t ? t : 'Todo<br>el día'}</span>
    <span class="ev-main"><span class="ev-title">${esc(e.title)}</span><span class="ev-sub">${types.map(tt => `${tdot(tt)}${typeOf(tt).one}`).join(' · ')}${sub ? ' · ' + esc(sub) : ''}</span></span>${icon('chevR', 18, 'cell-chev')}</button>`;
}
/* Un mes cada vez: flechas para pasar de mes en el mismo sitio; debajo, los cultos del mes */
const monthCount = key => new Set(ALL_DATES.filter(d => d.startsWith(key)).flatMap(d => evs(d).map(e => e.id))).size;
const ensayosBtn = () => `<button type="button" class="ag-ens" data-go="/agenda/ensayos">
  <span class="ag-ens-ic">${ensIcon(36)}</span><span class="ag-ens-t"><b>Ensayos e igualás</b><small>Calendario de las cuadrillas de costaleros</small></span>${icon('chevR', 18, 'cell-chev')}</button>`;
function monthScreen(y, m, selISO, openId){
  let key = `${y}-${pad(m + 1)}`, sel = selISO || null;
  const label = k => { const [yy, mm] = k.split('-').map(Number); return { name: cap(MONTHS[mm - 1]), y: yy }; };
  const shift = (k, n) => { const [yy, mm] = k.split('-').map(Number); const d = new Date(yy, mm - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const head = k => { const l = label(k), c = monthCount(k); return `<button type="button" class="ag-arrow" data-shift="-1" aria-label="Mes anterior">${icon('chevL', 22)}</button>
    <div class="ag-mtitle" aria-live="polite"><h1 class="t-large">${l.name}</h1><span>${l.y}${c ? ` · ${plural(c, 'culto', 'cultos')}` : ''}</span></div>
    <button type="button" class="ag-arrow" data-shift="1" aria-label="Mes siguiente">${icon('chevR', 22)}</button>`; };
  const content = `<div class="ag-mhead">${head(key)}</div>
    <div class="wd-row" aria-hidden="true">${WD.map(d => `<span>${d}</span>`).join('')}</div>
    <div class="ag-mbody">
      <div class="month-grid" role="grid">${monthGrid(y, m, sel)}</div>
      <div class="ag-extra">${ensayosBtn()}</div>
      <div class="ag-month-list">${monthCards(key)}</div>
    </div>
    <div class="day-head ag-legend-row"><span class="t-footnote c2">Toca un día para ir a sus cultos</span><button type="button" class="info-btn" data-ag="legend" aria-label="Leyenda de tipos de acto">${icon('info', 22)}</button></div>`;
  const s = screen({ title: label(key).name, navTitle: `${label(key).name} ${y}`, large:false, content, right: `<button type="button" class="nav-text-btn" data-ag="today">Hoy</button>` + toolbar(), setup: s => {
    s.extraRight = `<button type="button" class="nav-text-btn" data-ag="today">Hoy</button>`;
    s.navbar.classList.add('month-nav'); s.navbar.classList.remove('show-title');
    s.scroller.addEventListener('scroll', () => s.navbar.classList.toggle('show-title', s.scroller.scrollTop > 60), { passive:true });
    const mhead = $('.ag-mhead', s.el), body = $('.ag-mbody', s.el), title = $('.nav-title', s.navbar);
    const render = () => { const [yy, mm] = key.split('-').map(Number);
      mhead.innerHTML = head(key); $('.month-grid', body).innerHTML = monthGrid(yy, mm - 1, sel); $('.ag-month-list', body).innerHTML = monthCards(key);
      title.textContent = `${label(key).name} ${yy}`; };
    // Cambiar de mes en el mismo sitio, con un deslizamiento corto en la dirección de la flecha
    const go = n => {
      key = n === 0 ? TODAY.slice(0, 7) : shift(key, n); sel = null; render();
      history.replaceState(history.state, '', (location.protocol === 'file:' ? '#' : '') + `/agenda/${key}`);
      if (!prefs.reduceMotion && body.animate) body.animate([{ opacity:0, transform:`translateX(${n < 0 ? -24 : 24}px)` }, { opacity:1, transform:'none' }], { duration:320, easing:'cubic-bezier(.23,1,.32,1)' });
    };
    const pick = iso => {
      if (iso === sel) iso = null; sel = iso;
      $$('.md', s.el).forEach(b => { const on = b.dataset.day === iso; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
      $$('.ag-card', s.el).forEach(c => c.classList.toggle('hl', !!iso && c.dataset.days.split(' ').includes(iso)));
      if (!iso) return;
      const card = $$('.ag-card', s.el).find(c => c.dataset.days.split(' ').includes(iso));
      if (card) s.scroller.scrollTo({ top: card.getBoundingClientRect().top - s.scroller.getBoundingClientRect().top + s.scroller.scrollTop - 110, behavior:'smooth' });
      else toast(eventsOn(iso).length ? 'Ningún culto de este tipo ese día' : 'No hay cultos publicados ese día', 'info');
    };
    s.el.addEventListener('click', e => {
      const a = e.target.closest('[data-shift]'); if (a) { go(+a.dataset.shift); return; }
      const d = e.target.closest('[data-day]'); if (d) { pick(d.dataset.day); return; }
      const ev = e.target.closest('[data-ev]'); if (ev) { openEvent(+ev.dataset.ev, ev.dataset.iso); return; }
      if (e.target.closest('[data-ag=today]')) { e.stopPropagation(); go(0); }
    }, true);
    wireToolbar(s, render);
    longPress(s.el, '[data-ev]', el => { const e = evById(+el.dataset.ev); return e ? [
      { label:'Añadir al calendario', icon:'calPlus', run: () => { downloadICS(e, el.dataset.iso); toast('Añadido al calendario', 'calPlus'); } },
      { label:'Compartir', icon:'share', run: () => share(e.title, `${location.origin}/agenda/${el.dataset.iso}/${e.id}`, toast) },
      { label:'Ver ficha', icon:'info', run: () => openEvent(e.id, el.dataset.iso) }] : []; });
    // Teclado: flechas izquierda/derecha cambian de mes
    s.el.addEventListener('keydown', e => { if (e.target.closest('input')) return; if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
    // Pellizcar para volver al año
    const pts = new Map(); let pin = null;
    body.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; pin = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
    body.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if (pin && pts.size === 2) { const [a, b] = [...pts.values()]; if (Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pin < 0.7) { pin = null; pts.clear(); history.back(); } } });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pin = null; };
    body.addEventListener('pointerup', up); body.addEventListener('pointercancel', up);
    if (sel) setTimeout(() => { const iso = sel; sel = null; pick(iso); }, 250);
  }, onShow: () => { if (openId) { const id = openId; openId = null; setTimeout(() => openEvent(id, selISO), 120); } } });
  return s;
}

/* ---------- Hojas: filtros, búsqueda y leyenda ---------- */
function openFilters(done){
  const html = `${section(TYPES.map(t => switchCell({ title:`${tdot(t.id)} ${t.label}`, name:t.id, on:F.active.has(t.id) })), { head:'Tipos de acto' })}
    ${section([`<button type="button" class="cell cell-accent" data-all>Mostrar todos</button>`])}`;
  openSheet({ content:`<div style="padding-top:8px">${html}</div>`, title:'Filtros', label:'Filtros de la agenda', detent:'medium', left:'<span style="width:36px"></span>',
    onMount: c => {
      c.body.addEventListener('change', e => { const s = e.target.closest('[data-switch]'); if (!s) return; s.checked ? F.active.add(s.dataset.switch) : F.active.delete(s.dataset.switch); done(); });
      c.body.addEventListener('click', e => { if (e.target.closest('[data-all]')) { F.active = new Set(TYPE_ORDER); $$('[data-switch]', c.body).forEach(x => x.checked = true); done(); } });
    } });
}
function openLegend(){
  openSheet({ title:'Tipos de acto', label:'Leyenda', detent:'medium', left:'<span style="width:36px"></span>', content:`<div style="padding-top:8px">${section(TYPES.map(t => `<div class="cell">${tdot(t.id)}<span class="cell-body"><span class="cell-title">${t.label}</span></span></div>`), { foot:'Cada tipo tiene su color y su forma. En los días del calendario, un punto por tipo (hasta tres).' })}</div>` });
}
function openSearch(){
  const all = [...new Map(ALL_DATES.flatMap(d => eventsOn(d).map(e => [e.id + '|' + d, { e, d }]))).values()];
  const res = q => { const r = all.filter(({ e }) => !q || norm([e.title, e.hermandad, e.location, e.desc].join(' ')).includes(q)).slice(0, 40); return r.length ? `<div class="group ev-group" style="margin:0 var(--margin)">${r.map(({ e, d }) => evRow(e, d)).join('')}</div>` : `<div class="empty compact">${icon('search', 40)}<h3>Sin resultados</h3><p>Prueba con otra palabra.</p></div>`; };
  openSheet({ title:'Buscar', label:'Buscar actos', detent:'large', left:'<span style="width:36px"></span>', content:`${searchBar('Actos, hermandades, lugares', 'ev')}<div class="search-res">${res('')}</div>`,
    onMount: c => { wireSearch(c.body, q => { $('.search-res', c.body).innerHTML = res(q); }); setTimeout(() => $('input', c.body).focus(), 350);
      c.body.addEventListener('click', e => { const ev = e.target.closest('[data-ev]'); if (ev) openEvent(+ev.dataset.ev, ev.dataset.iso); }); } });
}
