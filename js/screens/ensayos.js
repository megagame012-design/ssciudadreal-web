/* =====================================================================
   Ensayos e igualás: el calendario de las cuadrillas (data/data.js · ENSAYOS)
   Portada con foto, próxima cita con cuenta atrás, la temporada en una línea,
   filtro por cuadrilla, agenda por meses y fichas de cada paso.
   ===================================================================== */
import { icon, esc, $, $$, img, MONTHS, WEEKDAYS, pad, parseISO, cap, TODAY, nextSS, addDays, toISO, plural, HERMS, store, downloadICS, directionsURL, share } from '../util.js';
import { screen, register, navigate } from '../router.js';
import { openSheet, toast } from '../ui.js';
import { prefs } from '../settings.js';
import { cell, section } from './common.js';

const PHOTO = 'img/ensayos.webp';
const ICON = 'img/ico-ensayos.png';   // costaleros bajo el paso, a línea (dibujo del usuario)
/* Icono de los ensayos: el dibujo como máscara, toma el color del texto */
export const ensIcon = (size = 22) => `<span class="ens-ico" aria-hidden="true" style="width:${size}px;height:${size}px;-webkit-mask-image:url(${ICON});mask-image:url(${ICON})"></span>`;   // costaleros bajo el paso (la que eligió el usuario) · foto: JM Cornejo
export const TIPOS = {
  reunion:    { l:'Reunión de costaleros', s:'Reunión',    c:'#5AA9FF', ic:'users' },
  comida:     { l:'Comida de hermandad',   s:'Comida',     c:'#FF9F43', ic:'heart' },
  convivencia:{ l:'Convivencia',           s:'Convivencia',c:'#FF6FA0', ic:'users' },
  iguala:     { l:'Igualá',                s:'Igualá',     c:'#E3C66B', ic:'users' },
  ensayo:     { l:'Ensayo',                s:'Ensayo',     c:'#B67CFF', ic:'paso' },
  traslado:   { l:'Traslado',              s:'Traslado',   c:'#4FD1C5', ic:'route' },
  retranqueo: { l:'Retranqueo',            s:'Retranqueo', c:'#4FD1C5', ic:'route' },
  muda:       { l:'Mudá',                  s:'Mudá',       c:'#7BD88F', ic:'paso' },
  desarma:    { l:'Desarmá',               s:'Desarmá',    c:'#A0A0A8', ic:'paso' }
};
const ORD = ['', '1.er', '2.º', '3.er', '4.º', '5.º', '6.º', '7.º', '8.º'];
const KEY = 'sscr-ensayos-filtro', MINE = 'sscr-ensayos-mia';

/* Datos listos: cada paso con su hermandad y todas las citas en orden */
export const PASOS = (typeof ENSAYOS !== 'undefined' ? ENSAYOS : []).map(p => {
  const herm = HERMS.find(x => x.h.nombre.includes(p.herm) || x.name.includes(p.herm));
  return { ...p, herm, photo: p.foto || (herm && herm.h.image), hname: p.sub || (herm ? (herm.h.nombreCorto || herm.name) : '') };
});
export const CITAS = PASOS.flatMap(p => p.citas.map((c, k) => ({ ...c, p, k, iso:c.f,
  title: c.titulo || (c.t === 'ensayo' ? (c.n ? `${ORD[c.n]} ensayo` : 'Ensayo') : TIPOS[c.t].l) })))
  .sort((a, b) => a.iso.localeCompare(b.iso) || (a.h || '99').localeCompare(b.h || '99'));
CITAS.forEach((c, i) => c.i = i);

const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysTo = iso => Math.round((parseISO(iso) - day0()) / 864e5);
const wd = iso => WEEKDAYS[parseISO(iso).getDay()];
const longDate = iso => { const d = parseISO(iso); return `${cap(wd(iso))}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
const hourTxt = c => c.h ? `${c.h} h` : (c.hTxt || 'Hora por confirmar');
const placeTxt = c => [c.l, c.dir].filter(Boolean).join(' · ');
const when = n => n <= 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`;
export const nextCitas = (n = 3) => CITAS.filter(c => c.iso >= TODAY).slice(0, n);
// En los círculos pequeños se acerca a la cara cuando la foto es del paso entero (zoom y foco en ENSAYOS)
const avatar = (p, size = 44) => p.photo ? `<span class="ens-av" style="--s:${size}px">${img(p.photo, size * 3 * (p.zoom || 1), { pos: p.foco || '50% 22%', style: p.zoom ? `transform:scale(${p.zoom});transform-origin:${p.foco}` : '' })}</span>` : `<span class="ens-av ens-av-x" style="--s:${size}px">${icon('paso', size * .5)}</span>`;
const tico = (t, size) => t === 'ensayo' ? ensIcon(size + 3) : icon(TIPOS[t].ic, size);
const tpill = c => `<span class="ens-tp" style="--tc:${TIPOS[c.t].c}">${tico(c.t, 13)}${TIPOS[c.t].s}</span>`;

/* ---------- Piezas ---------- */
function nextCard(c){
  if (!c) return `<div class="ens-next ens-done">${icon('check', 28)}<b>Temporada cumplida</b><span>Todas las citas de esta Cuaresma han pasado. ¡Buena salida, costaleros!</span></div>`;
  const n = daysTo(c.iso), T = TIPOS[c.t];
  return `<button type="button" class="ens-next" data-cita="${c.i}" style="--tc:${T.c}">
    <span class="en-glow"></span>
    <span class="en-top"><span class="en-over">PRÓXIMA CITA</span>${tpill(c)}</span>
    <span class="en-mid">
      <span class="en-count"><b class="tnum">${Math.max(0, n)}</b><i>${n === 1 ? 'día' : 'días'}</i></span>
      <span class="en-what"><span class="en-title">${esc(c.title)}</span><span class="en-paso">${avatar(c.p, 26)}${esc(c.p.paso)}</span></span>
    </span>
    <span class="en-meta"><span>${icon('agenda', 16)} ${longDate(c.iso)}</span><span>${icon('clock', 16)} ${hourTxt(c)}</span>${c.l ? `<span>${icon('pin', 16)} ${esc(placeTxt(c))}</span>` : ''}</span>
  </button>`;
}
/* La temporada en una línea: de noviembre a Pascua, con un punto por cita */
function seasonLine(list){
  const { pascua } = nextSS(), pasion = addDays(pascua, -14);
  const first = parseISO(CITAS[0] ? CITAS[0].iso : TODAY); const a = new Date(first.getFullYear(), first.getMonth(), 1), b = addDays(pascua, 3);
  const x = d => Math.max(0, Math.min(100, (d - a) / (b - a) * 100));
  const months = []; for (let d = new Date(a); d <= b; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(`<span style="left:${x(d)}%">${MONTHS[d.getMonth()].slice(0, 3)}</span>`);
  const stack = {};
  const dots = list.map(c => { const s = stack[c.iso] = (stack[c.iso] || 0) + 1; return `<i class="${c.iso < TODAY ? 'past' : ''}" style="left:${x(parseISO(c.iso))}%;--tc:${TIPOS[c.t].c};--k:${s - 1}" title="${esc(c.title)} · ${esc(c.p.paso)}"></i>`; }).join('');
  const mark = (d, t, cls = '') => `<span class="ens-mk ${cls}" style="left:${x(d)}%"><em>${t}</em></span>`;
  return `<div class="ens-season" aria-hidden="true"><div class="ens-track"><span class="ens-fill" style="width:${x(day0())}%"></span>${dots}
    ${mark(day0(), 'Hoy', 'today')}${mark(pasion, 'Domingo de Pasión', 'end')}</div><div class="ens-months">${months.join('')}</div></div>`;
}
function chips(sel, mine){
  return `<div class="ens-chips hscroll" role="tablist" aria-label="Filtrar por cuadrilla">
    <button type="button" role="tab" class="ens-chip${sel === 'all' ? ' on' : ''}" data-f="all" aria-selected="${sel === 'all'}"><span class="ens-chip-all">${icon('grid', 16)}</span>Todas</button>
    ${PASOS.map(p => `<button type="button" role="tab" class="ens-chip${sel === p.id ? ' on' : ''}" data-f="${p.id}" aria-selected="${sel === p.id}">${avatar(p, 26)}${esc(shortPaso(p))}${p.id === mine ? `<span class="ens-star" aria-label="Tu cuadrilla">${icon('star', 13)}</span>` : ''}</button>`).join('')}</div>`;
}
const shortPaso = p => p.paso.replace(/^(Nuestro Padre|Nuestro Señor|María Santísima de la|Santo|El|Paso de Misterio de) /, '').replace(/ de los Olivos$/, '');
function agenda(list){
  if (!list.length) return `<div class="empty compact">${icon('paso', 40)}<h3>Sin citas</h3><p>Esta cuadrilla no tiene citas publicadas.</p></div>`;
  const byMonth = {};
  list.forEach(c => (byMonth[c.iso.slice(0, 7)] = byMonth[c.iso.slice(0, 7)] || []).push(c));
  return Object.entries(byMonth).map(([m, cs]) => {
    const [y, mo] = m.split('-').map(Number), byDay = {};
    cs.forEach(c => (byDay[c.iso] = byDay[c.iso] || []).push(c));
    return `<section class="ens-month"><h3 class="ens-mh"><span>${cap(MONTHS[mo - 1])}</span><small>${y} · ${plural(cs.length, 'cita', 'citas')}</small></h3>
      ${Object.entries(byDay).map(([iso, ds]) => `<div class="ens-day${iso < TODAY ? ' past' : ''}${iso === TODAY ? ' is-today' : ''}">
        <div class="ens-date"><i>${wd(iso).slice(0, 3)}</i><b class="tnum">${parseISO(iso).getDate()}</b></div>
        <div class="ens-items">${ds.map(c => `<button type="button" class="ens-item" data-cita="${c.i}" style="--tc:${TIPOS[c.t].c}">
          <span class="ens-bar"></span>
          <span class="ens-body"><span class="ens-row1">${tpill(c)}<span class="ens-hour tnum">${c.h || '—'}</span></span>
            <span class="ens-t">${esc(c.title)}</span>
            <span class="ens-p">${esc(c.p.paso)}</span>
            ${c.l ? `<span class="ens-l">${icon('pin', 13)} ${esc(placeTxt(c))}</span>` : ''}
            ${c.nota ? `<span class="ens-nota">${icon('info', 13)} ${esc(c.nota)}</span>` : ''}</span>
          ${avatar(c.p, 46)}${iso < TODAY ? `<span class="ens-ok">${icon('check', 14)}</span>` : ''}</button>`).join('')}</div></div>`).join('')}
    </section>`;
  }).join('');
}
function pasoCards(){
  return `<div class="ens-pasos hscroll">${PASOS.map(p => {
    const cs = CITAS.filter(c => c.p === p), done = cs.filter(c => c.iso < TODAY).length, nx = cs.find(c => c.iso >= TODAY);
    const ens = cs.filter(c => c.t === 'ensayo').length, ig = cs.find(c => c.t === 'iguala');
    return `<button type="button" class="ens-paso" data-f="${p.id}" data-scroll>
      <span class="ep-media ph">${p.photo ? img(p.photo, 700 * (p.zoomCard || 1), { pos:p.foco || '50% 25%', style: p.zoomCard ? `transform:scale(${p.zoomCard});transform-origin:${p.origenCard || p.foco}` : '' }) : ''}<span class="ep-fade"></span></span>
      <span class="ep-text"><span class="ep-h">${esc(p.hname)}</span><span class="ep-t">${esc(p.paso)}</span></span>
      <span class="ep-foot">
        <span class="ep-stats"><span><b class="tnum">${ens}</b> ${ens === 1 ? 'ensayo' : 'ensayos'}</span>${ig ? `<span>Igualá <b>${parseISO(ig.iso).getDate()} ${MONTHS[parseISO(ig.iso).getMonth()].slice(0, 3)}</b></span>` : ''}</span>
        <span class="ep-prog"><span><i style="width:${cs.length ? done / cs.length * 100 : 0}%"></i></span><em class="tnum">${done}/${cs.length}</em></span>
        ${nx ? `<span class="ep-next">Próxima: <b>${esc(nx.title)}</b> · ${parseISO(nx.iso).getDate()} ${MONTHS[parseISO(nx.iso).getMonth()].slice(0, 3)}</span>` : ''}
        ${p.notas.length || p.calzado ? `<span class="ep-notes">${p.calzado ? `<span class="ep-shoe ${p.calzado}">${icon('paso', 12)} Calzado ${p.calzado}</span>` : ''}${p.notas.filter(n => !/calzado/i.test(n)).map(n => `<span>${esc(n)}</span>`).join('')}</span>` : ''}
        ${p.lema ? `<span class="ep-lema">«${esc(p.lema)}»</span>` : ''}
      </span></button>`;
  }).join('')}</div>`;
}

/* ---------- Tu cuadrilla: se elige una vez y la pantalla se abre con sus citas ---------- */
function mineCard(id){
  const p = PASOS.find(x => x.id === id);
  if (!p) return `<button type="button" class="ens-mine empty-pick" data-mine><span class="em-ic">${icon('star', 22)}</span>
    <span class="em-t"><small>Tu cuadrilla</small><b>¿Con quién sales?</b><span>Elígela y verás solo sus citas.</span></span><span class="em-go">Elegir</span></button>`;
  const cs = CITAS.filter(c => c.p === p), nx = cs.find(c => c.iso >= TODAY);
  return `<button type="button" class="ens-mine" data-mine>${avatar(p, 44)}
    <span class="em-t"><small>Tu cuadrilla</small><b>${esc(p.paso)}</b><span>${nx ? `${esc(nx.title)} · ${when(daysTo(nx.iso)).toLowerCase()}` : plural(cs.length, 'cita', 'citas')}</span></span><span class="em-go">Cambiar</span></button>`;
}
function pickMine(cur, done){
  const html = `<div class="ens-pick"><p class="ens-pick-h">Elige la cuadrilla con la que sales. La pantalla de ensayos se abrirá siempre con sus citas.</p>
    ${PASOS.map(p => `<button type="button" data-pick="${p.id}" class="${p.id === cur ? 'on' : ''}">${avatar(p, 44)}<span class="ep-n"><b>${esc(p.paso)}</b><small>${esc(p.hname)}</small></span>${p.id === cur ? `<span class="ep-chk">${icon('check', 20)}</span>` : ''}</button>`).join('')}
    ${cur ? `<button type="button" data-pick="" class="ep-clear">No elegir ninguna</button>` : ''}</div>`;
  const sh = openSheet({ content:html, title:'Tu cuadrilla', label:'Elegir tu cuadrilla', detent:'large', onMount: m => m.body.addEventListener('click', e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    sh.close && sh.close(); done(b.dataset.pick || null);
  }) });
}

/* ---------- Ficha de una cita ---------- */
function openCita(c){
  const T = TIPOS[c.t], n = daysTo(c.iso);
  const html = `<div class="ens-sheet" style="--tc:${T.c}">
    <header class="es-head${c.p.photo ? '' : ' no-photo'}">
      <span class="es-media">${c.p.photo ? img(c.p.photo, 1000 * (c.p.zoomCard || 1), { pos: c.p.foco || '50% 22%', eager:true, style: c.p.zoomCard ? `transform:scale(${c.p.zoomCard});transform-origin:${c.p.origenCard || c.p.foco}` : '' }) : ''}<span class="es-shade"></span>${tpill(c)}<span class="es-when">${c.iso < TODAY ? 'Ya celebrada' : when(n)}</span></span>
      <span class="es-text"><h2>${esc(c.title)}</h2><p>${esc(c.p.paso)}${c.p.hname ? ` · ${esc(c.p.hname)}` : ''}</p></span></header>
    ${section([
      cell({ icon:['agenda','red'], title:longDate(c.iso), sub:String(parseISO(c.iso).getFullYear()), chev:false }),
      cell({ icon:['clock','blue'], title:hourTxt(c), chev:false }),
      c.nota ? cell({ icon:['info','orange'], title:esc(c.nota), chev:false }) : '',
      c.l ? cell({ icon:['pin','green'], title:esc(c.l), sub:c.dir ? esc(c.dir) : 'Ciudad Real', href:directionsURL([c.l, c.dir].filter(Boolean).join(', ')), external:true }) : ''
    ].filter(Boolean))}
    ${c.p.notas.length || c.p.lema ? section([
      ...c.p.notas.map(t => cell({ icon:['info','orange'], title:esc(t), chev:false })),
      c.p.lema ? `<div class="cell text-cell"><p class="es-lema">«${esc(c.p.lema)}»</p></div>` : ''
    ].filter(Boolean), { head:'A tener en cuenta' }) : ''}
    <div class="x-actions es-actions">
      <button type="button" class="btn btn-filled btn-wide" data-es="ics">${icon('calPlus', 20)} Añadir al calendario</button>
      ${c.p.herm ? `<button type="button" class="btn btn-gray btn-wide" data-es="herm">${icon('hermandades', 20)} Ver la hermandad</button>` : ''}
      <button type="button" class="btn btn-gray btn-wide" data-es="share">${icon('share', 20)} Compartir</button>
    </div></div>`;
  const sh = openSheet({ content:html, label:`${c.title} · ${c.p.paso}`, detent:'large', onMount: m => m.body.addEventListener('click', e => {
    const a = e.target.closest('[data-es]'); if (!a) return;
    const ev = { id:`ens-${c.p.id}-${c.k}`, title:`${c.title} · ${c.p.paso}`, time:c.h ? `${c.h} h` : '', location:placeTxt(c), desc:[c.nota, ...c.p.notas, c.p.lema ? `«${c.p.lema}»` : ''].filter(Boolean).join('. ') };
    if (a.dataset.es === 'ics') { downloadICS(ev, c.iso); toast('Añadido al calendario', 'calPlus'); }
    if (a.dataset.es === 'herm') { sh.close && sh.close(); navigate(`/hermandades/${c.p.herm.id}`); }
    if (a.dataset.es === 'share') share(`${c.title} · ${c.p.paso} · ${longDate(c.iso)}, ${hourTxt(c)}`, `${location.origin}/ensayos`, toast);
  }) });
  return sh;
}

/* ---------- Pantalla ---------- */
function ensayosScreen(){
  // Tu cuadrilla: la elegida aquí o, si no, la de «Mi hermandad» en Ajustes
  let mine = store.get(MINE); if (mine === null) { const m = PASOS.find(p => p.herm && p.herm.id === prefs.hermandad); mine = m ? m.id : ''; }
  if (!PASOS.some(p => p.id === mine)) mine = '';
  let sel = store.get(KEY) || mine || 'all'; if (sel !== 'all' && !PASOS.some(p => p.id === sel)) sel = 'all';
  const list = () => sel === 'all' ? CITAS : CITAS.filter(c => c.p.id === sel);
  const nEns = CITAS.filter(c => c.t === 'ensayo').length;
  const content = `
    <header class="ens-hero">
      <div class="eh-media ph">${img(PHOTO, 1400, { eager:true, pos:'50% 40%', ws:[640, 1000, 1400], sizes:'100vw' })}</div>
      <div class="eh-text">
        <p class="eh-over">${ensIcon(26)}COSTALEROS Y PORTADORES · CUARESMA ${nextSS().y}</p>
        <h1 class="eh-title">Ensayos <span>e igualás</span></h1>
        <dl class="eh-stats"><div><dd class="tnum">${PASOS.length}</dd><dt>cuadrillas</dt></div><div><dd class="tnum">${nEns}</dd><dt>ensayos</dt></div><div><dd class="tnum">${CITAS.length}</dd><dt>citas</dt></div></dl>
      </div>
    </header>
    <div class="ens-wrap">
      <div data-mine-wrap>${mineCard(mine)}</div>
      <div data-next>${nextCard(list().find(c => c.iso >= TODAY))}</div>
      <div data-season>${seasonLine(list())}</div>
      <div class="ens-legend">${['iguala', 'ensayo', 'reunion', 'convivencia', 'comida', 'traslado', 'muda'].map(t => `<span style="--tc:${TIPOS[t].c}"><i></i>${TIPOS[t].s}</span>`).join('')}</div>
      <h2 class="ens-h2" id="ens-cal">Calendario</h2>
      <div data-chips>${chips(sel, mine)}</div>
      <div class="ens-agenda" data-agenda>${agenda(list())}</div>
      <h2 class="ens-h2">Las cuadrillas</h2>
      ${pasoCards()}
      ${section([cell({ icon:['ig','pink'], title:'¿Eres capataz o llevas una cuadrilla?', sub:'Mándanos tus fechas por Instagram y las añadimos.', href:SITE.instagram, external:true, tall:true })])}
      <p class="home-foot">Fechas facilitadas por las hermandades · pueden cambiar<br>Foto de portada: JM Cornejo</p>
    </div>`;
  return screen({ title:'Ensayos e igualás', navTitle:'Ensayos', large:false, grouped:true, clearNav:true, content, setup: s => {
    s.el.classList.add('has-stretch', 'ens-screen');
    const head = $('.ens-hero', s.el), pic = $('.eh-media img', s.el), nav = s.navbar; nav.classList.add('over-photo'); nav.classList.remove('show-title');
    s.scroller.addEventListener('scroll', () => {
      const y = s.scroller.scrollTop, hH = head.offsetHeight;
      pic.style.transform = y < 0 ? `scale(${1 + -y / hH})` : `translateY(${y * 0.3}px)`;
      const solid = y > hH - 110; nav.classList.toggle('solid', solid); nav.classList.toggle('show-title', solid); nav.classList.toggle('over-photo', !solid);
    }, { passive:true });
    const render = () => {
      $('[data-next]', s.el).innerHTML = nextCard(list().find(c => c.iso >= TODAY));
      $('[data-season]', s.el).innerHTML = seasonLine(list());
      const ag = $('[data-agenda]', s.el); ag.innerHTML = agenda(list());
      if (!document.documentElement.classList.contains('reduce-motion') && ag.animate) ag.animate([{ opacity:0, transform:'translateY(10px)' }, { opacity:1, transform:'none' }], { duration:360, easing:'cubic-bezier(.23,1,.32,1)' });
      $$('.ens-chip', s.el).forEach(b => { const on = b.dataset.f === sel; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ inline:'center', block:'nearest', behavior:'smooth' }); });
    };
    s.el.addEventListener('click', e => {
      if (e.target.closest('[data-mine]')) {
        pickMine(mine, id => {
          mine = id || ''; store.set(MINE, mine); sel = mine || 'all'; store.set(KEY, sel);
          $('[data-mine-wrap]', s.el).innerHTML = mineCard(mine); $('[data-chips]', s.el).innerHTML = chips(sel, mine); render();
          toast(mine ? 'Tu cuadrilla, guardada' : 'Ya no tienes cuadrilla elegida', mine ? 'star' : 'check');
        });
        return;
      }
      const ct = e.target.closest('[data-cita]'); if (ct) { openCita(CITAS[+ct.dataset.cita]); return; }
      const f = e.target.closest('[data-f]'); if (!f) return;
      sel = f.dataset.scroll && sel === f.dataset.f ? 'all' : f.dataset.f; store.set(KEY, sel); render();
      if (f.dataset.scroll) s.scroller.scrollTo({ top: $('#ens-cal', s.el).offsetTop - 70, behavior:'smooth' });
    });
  } });
}
register('/ensayos', 'hoy', ensayosScreen);
register('/agenda/ensayos', 'agenda', ensayosScreen);   // también desde la Agenda
