/* =====================================================================
   Hermandades (estilo Contactos y Música)
   ===================================================================== */
import { icon, esc, $, $$, img, cld, slug, titleCase, isMissing, HERMS, hermById, JF, salida, entrada, procDateFor, fmtLong, fmtShort, timelineRows, share, parseISO, MONTHS, TODAY, nextSS, evDates, timeOf, directionsURL, downloadICS, store } from '../util.js';
import { screen, register, navigate } from '../router.js';
import { prefs, setPref } from '../settings.js';
import { toast, longPress, openSheet, segmented, moveSeg } from '../ui.js';
import { cell, section, searchBar, wireSearch, norm, profileBtn } from './common.js';
import { openViewer } from './visor.js';
import { curvedBand } from '../mapa.js';
import { CITAS, PASOS as PASOS_ENS, ensIcon } from './ensayos.js';
import { openEvent } from './evento.js';

/* Una entrada por hermandad (las que salen dos jornadas aparecen en cada una en «Por jornada») */
const ALL = (() => { const seen = new Set(); return HERMS.filter(x => { const k = slug(x.name); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.name.localeCompare(b.name, 'es')); })();
const short = n => n.replace(/^(Real |Pontificia |Ilustre )*(Hermandad|Archicofradía|Cofradía) (y Cofradía )?(de |del )?/i, '');

/* ---------- Lista por jornadas: pestañas con contador y tarjetas con foto (como la web anterior) ---------- */
const hcard = x => {
  const h = x.h, sal = salida(h), sede = (h.sede || '').replace(/^Parroquia (de )?/, '');
  const mine = prefs.hermandad && slug(hermById(prefs.hermandad)?.name || '') === slug(x.name);
  return `<button type="button" class="h-card" data-go="/hermandades/${x.id}" data-herm="${x.id}">
    <span class="h-media ph">${img(h.image, 800, { ws:[480, 800, 1200], sizes:'(min-width:1024px) 380px, (min-width:700px) 45vw, 92vw', pos:'50% 22%', alt:esc(h.titulares || x.name) })}</span>
    <span class="h-body">
      <span class="h-name">${esc(h.nombreCorto || short(x.name))}${mine ? ` ${icon('star', 16, 'mine')}` : ''}</span>
      ${h.titulares ? `<span class="h-tit">${esc(h.titulares)}</span>` : ''}
      <span class="h-meta">${h.diaSalida ? `<span>${icon('agenda', 14)} ${esc(h.diaSalida)}</span>` : ''}${sede ? `<span>${icon('church', 14)} ${esc(sede)}</span>` : ''}${sal ? `<span>${icon('clock', 14)} ${sal} h</span>` : ''}</span>
    </span></button>`;
};
const jtabs = cur => `<div class="jtabs" role="tablist" aria-label="Jornadas">${HERMANDADES_DATA.map(j => `<button type="button" role="tab" class="jtab" data-jornada="${esc(j.jornada)}" aria-selected="${j.jornada === cur}">${titleCase(j.jornada)}<span class="count">${j.items.length}</span></button>`).join('')}</div>`;
function jornadaView(jn){
  const j = HERMANDADES_DATA.find(x => x.jornada === jn), f = JF[jn];
  return `<div class="jinfo"><div><h2 class="jinfo-title">${titleCase(jn)}</h2><p class="jinfo-sub">${f ? esc(f.txt) + ' · ' : ''}${j.items.length} ${j.items.length === 1 ? 'hermandad' : 'hermandades'}</p></div>
</div>
    <div class="hgrid" role="list" aria-label="Hermandades de ${titleCase(jn)}">${HERMS.filter(x => x.j === jn).map(hcard).join('')}</div>
    ${j.items.length > 1 ? `<p class="hgrid-hint">Desliza para ver las ${j.items.length} hermandades</p>` : ''}`;
}
/* ---------- Hermandades de gloria ---------- */
const GL = typeof GLORIA !== 'undefined' ? GLORIA : [];
export const gloriaById = id => GL.find(g => g.id === id);
const gPic = (g, w, pos) => g.image ? img(g.image, w, { pos: pos || g.imagePos || '50% 22%', alt:esc(g.titulares || g.nombre) }) : `<span class="g-nopic">${icon('church', 44)}</span>`;
const gcard = g => `<button type="button" class="h-card" data-go="/hermandades/gloria/${g.id}">
    <span class="h-media ph">${gPic(g, 800)}</span>
    <span class="h-body">
      <span class="h-name">${esc(g.nombre.replace(/^Hermandad (de la |del |de )?/, ''))}</span>
      ${g.titulares ? `<span class="h-tit">${esc(g.titulares)}</span>` : ''}
      <span class="h-meta">${g.titulos && g.titulos[0] && g.titulos[0].fecha ? `<span>${icon('agenda', 14)} ${esc(g.titulos[0].fecha.split(',')[0])}</span>` : ''}${g.sede ? `<span>${icon('church', 14)} ${esc(g.sede.replace(/^Parroquia (de )?/, ''))}</span>` : ''}</span>
    </span></button>`;
const gloriaView = () => `<div class="jinfo"><div><h2 class="jinfo-title">Hermandades de gloria</h2><p class="jinfo-sub">${GL.length} hermandades · Sus fiestas y procesiones durante el año</p></div></div>
    <div class="hgrid" role="list" aria-label="Hermandades de gloria">${GL.map(gcard).join('')}</div>`;

function searchView(q){
  const r = ALL.filter(x => norm(`${x.name} ${x.h.titulares || ''} ${x.h.sede || ''} ${x.j}`).includes(q));
  const g = GL.filter(x => norm(`${x.nombre} ${x.completo || ''} ${x.titulares || ''} ${x.sede || ''}`).includes(q)), n = r.length + g.length;
  return n ? `<p class="jinfo-sub hsearch-count">${n} ${n === 1 ? 'resultado' : 'resultados'}</p><div class="hgrid">${r.map(hcard).join('')}${g.map(gcard).join('')}</div>` : `<p class="empty-note">No hay ninguna hermandad que coincida.</p>`;
}
/* La jornada que viene (o la primera si ya pasó la Semana Santa) */
function firstJornada(){
  const t = new Date().toISOString().slice(0, 10);
  const j = HERMANDADES_DATA.find(x => JF[x.jornada] && (JF[x.jornada].isos || [JF[x.jornada].iso]).some(d => d >= t));
  return (j || HERMANDADES_DATA[0]).jornada;
}

register('/hermandades', 'hermandades', () => {
  let cur = firstJornada(), q = '', tipo = store.get('sscr-herm-tipo') === 'gloria' ? 'gloria' : 'penitencia';
  const content = `${searchBar('Buscar hermandad, titular o sede', 'herm')}
    <div class="seg-wrap herm-seg">${segmented([['penitencia', 'Penitencia'], ['gloria', 'Gloria']], tipo, { glass:true, label:'Tipo de hermandad' })}</div>
    <div class="jtabs-wrap"${tipo === 'gloria' ? ' hidden' : ''}>${jtabs(cur)}</div>
    <div class="herm-view">${tipo === 'gloria' ? gloriaView() : jornadaView(cur)}</div>`;
  return screen({ title:'Hermandades', titleAside: profileBtn(), content, setup: s => {
    const view = $('.herm-view', s.el), tabs = $('.jtabs-wrap', s.el);
    const segW = $('.herm-seg', s.el);
    const show = () => { view.innerHTML = q ? searchView(q) : tipo === 'gloria' ? gloriaView() : jornadaView(cur); tabs.hidden = !!q || tipo === 'gloria'; segW.hidden = !!q; };
    wireSearch(s.el, v => { q = v; show(); });
    s.el.addEventListener('click', e => {
      const sg = e.target.closest('[data-seg]');
      if (sg) { tipo = sg.dataset.seg; store.set('sscr-herm-tipo', tipo); moveSeg(sg.parentElement, tipo); show(); if (tipo === 'penitencia') requestAnimationFrame(() => { const a = $('.jtab[aria-selected=true]', s.el); if (a) a.scrollIntoView({ inline:'center', block:'nearest' }); }); return; }
      const t = e.target.closest('[data-jornada]'); if (!t) return;
      cur = t.dataset.jornada; $$('.jtab', s.el).forEach(b => b.setAttribute('aria-selected', b === t));
      t.scrollIntoView({ inline:'center', block:'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      show();
    });
    longPress(s.el, '[data-herm]', el => hermMenu(hermById(el.dataset.herm)));
    requestAnimationFrame(() => { const a = $('.jtab[aria-selected=true]', s.el); if (a) a.scrollIntoView({ inline:'center', block:'nearest' }); });
  } });
});

export function hermMenu(x){
  if (!x) return [];
  const mine = prefs.hermandad === x.id;
  return [
    { label:'Ver ficha', icon:'chevR', run: () => navigate(`/hermandades/${x.id}`) },
    { label: mine ? 'Quitar de Mi hermandad' : 'Mi hermandad', icon:'star', run: () => { setPref('hermandad', mine ? null : x.id); toast(mine ? 'Sin hermandad' : 'Hermandad guardada', 'star'); } },
    { label:'Compartir', icon:'share', run: () => share(x.name, `${location.origin}/hermandades/${x.id}`, toast) }
  ];
}

/* ---------- Ficha de hermandad ---------- */
/* Portada a sangre, papeleta de salida, titulares, datos en losetas, itinerario,
   ensayos de su cuadrilla, sus próximos actos y la galería que gira. */
const WD3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const STOP = new Set(['nuestra', 'senora', 'nuestro', 'senor', 'padre', 'santisima', 'santisimo', 'maria', 'jesus', 'cristo', 'virgen', 'viernes', 'jueves', 'domingo', 'manana', 'tarde', 'noche', 'hermandad', 'cofradia', 'archicofradia', 'real', 'pontificia', 'ilustre', 'ntra', 'stma']);
const keyWords = t => [...new Set(slug(t).split('-').filter(w => w.length > 3 && !STOP.has(w)))];
const sameHerm = (a, b) => a && b && slug(a.name) === slug(b.name);
/* Sus actos en la agenda (cultos, besamanos…) a partir de hoy */
function actsFor(x){
  // Por palabras clave: «Real Cofradía de Nuestra Señora de la Soledad…» es la Soledad y Amargura
  const words = keyWords(x.name);   // dos palabras como mínimo: con una sola («Dolores») se cruzan hermandades
  return EVENTOS.filter(e => e.hermandad && words.length > 1 && words.filter(w => slug(e.hermandad).includes(w)).length >= 2)
    .map(e => ({ e, d: evDates(e).find(d => d >= TODAY) })).filter(a => a.d).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 4);
}
/* Itinerario: salida y entrada destacadas; si es largo, se pliega */
function itinerary(rows){
  const timed = rows.filter(r => r.t);
  const li = (r, k) => `<li class="${k === 0 ? 'first' : ''}${k === rows.length - 1 ? ' last' : ''}${r.t ? '' : ' no-t'}"><span class="hi-t tnum">${r.t || ''}</span><span class="hi-p">${esc(r.p)}</span></li>`;
  const long = rows.length > 8;
  return `<ol class="hf-itin${long ? ' is-folded' : ''}">${rows.map(li).join('')}</ol>
    ${long ? `<button type="button" class="hf-more" data-act="itin">${icon('chevD', 16)} Ver las ${rows.length} paradas</button>` : ''}
    ${timed.length > 1 ? `<p class="hf-foot">Horarios de 2026, orientativos para la Semana Santa ${nextSS().y}.</p>` : ''}`;
}

register('/hermandades/([^/]+)/([^/]+)', 'hermandades', (js, hs) => {
  if (js === 'gloria') return gloriaScreen(hs);
  const x = hermById(`${js}/${hs}`); if (!x) return null;
  const hh = x.h, out = salida(hh), inn = entrada(hh), proc = procDateFor(x);
  const photos = [...new Set([hh.image, ...(hh.galeria || [])])].filter(Boolean);
  const mine = prefs.hermandad === x.id;
  const ok = v => v && !isMissing(v);
  const rows = timelineRows(hh.itinerarioHorarios);
  const cuadrillas = PASOS_ENS.filter(p => sameHerm(p.herm, x));
  const citas = CITAS.filter(c => cuadrillas.includes(c.p) && c.iso >= TODAY).slice(0, 3);
  const acts = actsFor(x);
  const d0 = proc ? parseISO(proc.iso) : null;
  const n = d0 ? Math.round((d0 - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5) : null;
  const when = n == null ? '' : n < 0 ? 'Ya salió' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`;
  const name = hh.nombreCorto || short(x.name);

  // Datos en losetas: número grande arriba, etiqueta abajo; las largas ocupan el ancho
  const tiles = hh.isViaCrucis ? [
    ok(hh.inicioTradicion) && { k:'Desde', v:hh.inicioTradicion, big:true },
    ok(hh.distancia) && { k:'Recorrido', v:hh.distancia, big:true },
    ok(hh.puntosInteres) && { k:'Por dónde pasa', v:hh.puntosInteres, wide:true }
  ] : [
    ok(hh.fundacion) && { k:'Fundación', v:hh.fundacion, big:true },
    ok(hh.hermanos) && { k:'Hermanos', v:hh.hermanos, big:true },
    ok(hh.distancia) && { k:'Recorrido', v:hh.distancia, big:true },
    ok(hh.portadores) && { k:'Bajo los pasos', v:String(hh.portadores).replace(/<br\s*\/?>/gi, '\n'), wide:true },
    ok(hh.autoria) && { k:'Autoría de las imágenes', v:hh.autoria, wide:true },
    ok(hh.musica) && { k:'Música', v:hh.musica, wide:true },
    ok(hh.puntosInteres) && { k:'Puntos de interés', v:hh.puntosInteres, wide:true }
  ];
  const tileHTML = tiles.filter(Boolean).map(t => `<div class="hf-tile${t.wide ? ' wide' : ''}${t.big ? ' big' : ''}"><span class="hft-k">${t.k}</span><span class="hft-v${t.big ? ' tnum' : ''} selectable">${esc(t.v).replace(/\n/g, '<br>')}</span></div>`).join('');

  const content = `
    <header class="hf-hero">
      <div class="hf-media ph">${img(hh.image, 1400, { alt:esc(hh.titulares || x.name), eager:true, ws:[640, 1000, 1400], sizes:'100vw', pos:'50% 22%' })}</div>
      <span class="hf-shade"></span>
      <div class="hf-text">
        <p class="hf-over">${esc(hh.diaSalida || titleCase(x.j))}${proc ? ` · ${esc(fmtShort(proc.iso))}` : ''}</p>
        <h1 class="hf-name">${esc(name)}</h1>
        ${slug(name) !== slug(x.name) ? `<p class="hf-full">${esc(x.name)}</p>` : ''}
        ${mine ? `<span class="hf-mine">${icon('star', 14)} Tu hermandad</span>` : ''}
      </div>
    </header>

    ${proc || out || hh.sede ? `<section class="ifc" aria-label="Salida procesional">
      <div class="ifc-row">${icon('agenda', 20)}<span><small>${hh.isViaCrucis ? 'Celebración' : 'Salida procesional'}</small>${esc(proc ? fmtLong(proc.iso) : (hh.diaSalida || titleCase(x.j)))}${when ? `<em class="ifc-when">${when}</em>` : ''}</span></div>
      ${out || inn ? `<div class="ifc-row">${icon('clock', 20)}<span><small>Horario</small><span class="tnum">${out ? `Salida ${out} h` : ''}${out && inn ? ' · ' : ''}${inn ? `Entrada ${inn} h` : ''}</span></span></div>` : ''}
      ${hh.sede ? `<div class="ifc-row">${icon('church', 20)}<span><small>Sede canónica</small><span class="selectable">${esc(hh.sede)}</span></span></div>` : ''}
    </section>` : ''}

    <div class="ev-actions">
      ${proc ? `<button type="button" class="ev-act" data-act="ics">${icon('calPlus', 22)}<span>Calendario</span></button>` : ''}
      <button type="button" class="ev-act${mine ? ' ev-act-main' : ''}" data-act="mia" aria-pressed="${mine}">${icon('star', 22)}<span>Mi hermandad</span></button>
      ${hh.sede ? `<a class="ev-act" href="${directionsURL(hh.sede)}" target="_blank" rel="noopener">${icon('directions', 22)}<span>Cómo llegar</span></a>` : ''}
      <button type="button" class="ev-act" data-act="share">${icon('share', 22)}<span>Compartir</span></button>
    </div>

    ${ok(hh.titulares) ? `<section class="hf-tit">
      <p class="hf-tit-k">Sagrados titulares</p>
      <p class="hf-tit-v selectable">${esc(hh.titulares)}</p>
    </section>` : ''}

    ${hh.isViaCrucis ? [['Celebración', hh.celebracion], ['Imagen que preside', hh.imagenPreside], ['Dinámica', hh.dinamica], ['Recorrido y estaciones', hh.recorridoEstaciones]].filter(([, v]) => ok(v)).map(([k, v]) =>
      `<section class="ev-about"><h2 class="ev-h2">${k}</h2><div class="ev-desc selectable"><p>${esc(v).replace(/\n/g, '<br>')}</p></div></section>`).join('') + (hh.nota ? `<p class="hf-note">${icon('info', 16)} ${esc(hh.nota)}</p>` : '') : ''}

    ${tileHTML ? `<section class="hf-sec"><h2 class="ev-h2">La hermandad</h2><div class="hf-tiles">${tileHTML}</div></section>` : ''}

    ${rows.length > 1 ? `<section class="hf-sec"><h2 class="ev-h2">Itinerario</h2>${itinerary(rows)}</section>` : ''}


    ${cuadrillas.length ? `<section class="hf-sec"><h2 class="ev-h2">Ensayos de su cuadrilla</h2>
      <div class="hf-ens">
        ${citas.length ? citas.map(c => { const d = parseISO(c.iso); return `<button type="button" class="hf-ens-row" data-ens="${c.p.id}">
          <span class="hfe-date"><i>${WD3[d.getDay()]}</i><b class="tnum">${d.getDate()}</b><em>${MONTHS[d.getMonth()].slice(0, 3)}</em></span>
          <span class="hfe-t"><b>${esc(c.title)}</b><small>${[cuadrillas.length > 1 ? esc(c.p.paso) : '', c.h ? `${c.h} h` : 'Hora por confirmar', c.l ? esc(c.l) : ''].filter(Boolean).join(' · ')}</small></span>${icon('chevR', 16)}</button>`; }).join('')
          : `<p class="hf-foot">No quedan citas esta Cuaresma.</p>`}
        <button type="button" class="hf-ens-all" data-ens="${cuadrillas[0].id}">${ensIcon(22)} Ver el calendario de ensayos</button>
      </div></section>` : ''}

    ${acts.length ? `<section class="hf-sec"><h2 class="ev-h2">Próximos actos</h2><div class="hf-acts hscroll">
      ${acts.map(({ e, d }) => { const dd = parseISO(d); return `<button type="button" class="hf-act" data-ev="${e.id}" data-iso="${d}">
        <span class="hfa-media ph">${img(e.image || hh.image, 600, { pos: e.imagePos || '50% 25%' })}<span class="hfa-stamp"><b class="tnum">${dd.getDate()}</b><em>${MONTHS[dd.getMonth()].slice(0, 3)}</em></span></span>
        <span class="hfa-t">${esc(e.title)}</span><span class="hfa-s">${esc(timeOf(e) ? timeOf(e) + ' h' : fmtShort(d))}${e.location ? ` · ${esc(e.location)}` : ''}</span></button>`; }).join('')}
    </div></section>` : ''}

    <section class="hf-sec herm-band"><h2 class="ev-h2">Fotos · ${photos.length}</h2><div class="cband cband-herm" role="group" aria-label="Fotos de la hermandad. Toca una para verla en grande"></div>
      ${photos.length > 1 ? `<div class="hf-pad"><button type="button" class="btn btn-gray btn-wide" data-act="fotos">${icon('fototeca', 20)} Ver las ${photos.length} fotos</button></div>` : ''}
      <p class="hf-foot">Fotografías: Laura Arroyo · Objetivo Cofrade</p></section>
`;

  return screen({ title: x.name, navTitle: short(x.name), large:false, grouped:true, clearNav:true, content, setup: s => {
    s.el.classList.add('has-stretch', 'hf-screen');
    const head = $('.hf-hero', s.el), pic = $('.hf-media img', s.el), nav = s.navbar;
    s.scroller.addEventListener('scroll', () => {
      const y = s.scroller.scrollTop, hH = head.offsetHeight;
      pic.style.transform = y < 0 ? `scale(${1 + -y / hH})` : `translateY(${y * 0.3}px)`;
      const solid = y > hH - 100; nav.classList.toggle('solid', solid); nav.classList.toggle('show-title', solid); nav.classList.toggle('over-photo', !solid);
    }, { passive:true });
    nav.classList.add('over-photo');
    const items = photos.map(u => ({ url:u, herm:x }));
    // Galería curvada como la de Hoy, con las fotos de esta hermandad
    curvedBand($('.cband-herm', s.el), photos.map((src, k) => ({ src, name:'data-ph', val:k })), { speed:4, tileHeight:74, curve:68, fade:10 });
    s.el.addEventListener('click', e => {
      const p = e.target.closest('[data-ph]'); if (p) { openViewer(items, +p.dataset.ph, p); return; }
      const ev = e.target.closest('[data-ev]'); if (ev) { openEvent(+ev.dataset.ev, ev.dataset.iso); return; }
      const en = e.target.closest('[data-ens]'); if (en) { store.set('sscr-ensayos-filtro', en.dataset.ens); navigate('/ensayos'); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'share') share(x.name, `${location.origin}/hermandades/${x.id}`, toast);
      if (act === 'fotos') openViewer(items, 0, $('.cband-herm', s.el));
      if (act === 'itin') { const ol = $('.hf-itin', s.el); ol.classList.remove('is-folded'); a.remove(); }
      if (act === 'ics') { downloadICS({ id:'herm-' + slug(x.id), title:`${proc.title} · ${name}`, time: out ? `${out} h` : '', location: hh.sede || '', desc: hh.titulares || '' }, proc.iso); toast('Añadido al calendario', 'calPlus'); }
      if (act === 'mia') {
        const on = prefs.hermandad === x.id; setPref('hermandad', on ? null : x.id);
        a.classList.toggle('ev-act-main', !on); a.setAttribute('aria-pressed', !on);
        const t = $('.hf-text', s.el), chip = $('.hf-mine', s.el);
        if (on && chip) chip.remove(); else if (!on && !chip) t.insertAdjacentHTML('beforeend', `<span class="hf-mine">${icon('star', 14)} Tu hermandad</span>`);
        toast(on ? 'Sin hermandad' : 'Es tu hermandad', 'star');
      }
    });
  } });
});

/* ---------- Ficha de hermandad de gloria ---------- */
function gloriaActs(g){
  const words = keyWords(g.completo || g.nombre);
  return EVENTOS.filter(e => e.gloria === g.id || (e.hermandad && words.length > 1 && words.filter(w => slug(e.hermandad).includes(w)).length >= 2))
    .map(e => ({ e, d: evDates(e).find(d => d >= TODAY) })).filter(a => a.d).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 4);
}
function gloriaScreen(id){
  const g = gloriaById(id); if (!g) return null;
  const photos = [g.image, ...(g.galeria || [])].filter(Boolean);
  const acts = gloriaActs(g);
  const name = g.nombre.replace(/^Hermandad (de la |del |de )?/, '');
  const tiles = [g.fundacion && { k:'Fundación', v:g.fundacion, big:true }, g.hermanos && { k:'Hermanos', v:g.hermanos, wide:true }, g.autoria && { k:'Autoría de la imagen', v:g.autoria, wide:true }].filter(Boolean)
    .map(t => `<div class="hf-tile${t.wide ? ' wide' : ''}${t.big ? ' big' : ''}"><span class="hft-k">${t.k}</span><span class="hft-v${t.big ? ' tnum' : ''} selectable">${esc(t.v)}</span></div>`).join('');
  const row = (ic, k, v) => v ? `<div class="ifc-row">${icon(ic, 20)}<span><small>${k}</small><span class="selectable">${esc(v)}</span></span></div>` : '';
  const content = `
    <header class="hf-hero${g.image ? '' : ' no-pic'}">
      <div class="hf-media ph">${g.image ? img(g.image, 1400, { alt:esc(g.titulares || g.nombre), eager:true, ws:[640, 1000, 1400], sizes:'100vw', pos: g.imagePos || '50% 22%' }) : `<span class="g-nopic">${icon('church', 64)}</span>`}</div>
      <span class="hf-shade"></span>
      <div class="hf-text">
        <p class="hf-over">Hermandad de gloria</p>
        <h1 class="hf-name">${esc(name)}</h1>
        ${g.completo ? `<p class="hf-full">${esc(g.completo)}</p>` : ''}
      </div>
    </header>
    ${g.sede ? `<section class="ifc" aria-label="Sede">${row('church', 'Sede', g.sede)}</section>` : ''}
    <div class="ev-actions">
      ${g.sede ? `<a class="ev-act" href="${directionsURL(g.sede)}" target="_blank" rel="noopener">${icon('directions', 22)}<span>Cómo llegar</span></a>` : ''}
      <button type="button" class="ev-act" data-act="share">${icon('share', 22)}<span>Compartir</span></button>
    </div>
    ${g.titulares ? `<section class="hf-tit"><p class="hf-tit-k">Sagrados titulares</p><p class="hf-tit-v selectable">${esc(g.titulares)}</p></section>` : ''}
    ${g.resumen ? `<section class="ev-about"><h2 class="ev-h2">La hermandad</h2><div class="ev-desc selectable"><p>${esc(g.resumen)}</p></div></section>` : ''}
    ${tiles ? `<section class="hf-sec"><div class="hf-tiles">${tiles}</div></section>` : ''}
    ${g.historia ? `<section class="ev-about"><h2 class="ev-h2">Historia</h2><div class="ev-desc selectable">${g.historia.map(p => `<p>${esc(p)}</p>`).join('')}</div></section>` : ''}
    ${(g.titulos || []).map(ti => `<section class="hf-sec g-tit"><h2 class="ev-h2">${esc(ti.n)}</h2>
      ${ti.fecha || ti.hora || ti.salida ? `<section class="ifc">${row('agenda', 'Fecha', ti.fecha)}${row('clock', 'Hora', ti.hora)}${row('pin', 'Salida', ti.salida)}</section>` : ''}
      ${ti.historia || ti.recorrido ? `<div class="ev-desc selectable">${ti.historia ? `<p>${esc(ti.historia)}</p>` : ''}${ti.recorrido ? `<p><b>Recorrido.</b> ${esc(ti.recorrido)}</p>` : ''}</div>` : ''}
    </section>`).join('')}
    ${acts.length ? `<section class="hf-sec"><h2 class="ev-h2">Próximos actos</h2><div class="hf-acts hscroll">
      ${acts.map(({ e, d }) => { const dd = parseISO(d); return `<button type="button" class="hf-act" data-ev="${e.id}" data-iso="${d}">
        <span class="hfa-media ph">${img(e.image || g.image, 600, { pos: e.imagePos || '50% 25%' })}<span class="hfa-stamp"><b class="tnum">${dd.getDate()}</b><em>${MONTHS[dd.getMonth()].slice(0, 3)}</em></span></span>
        <span class="hfa-t">${esc(e.title)}</span><span class="hfa-s">${esc(timeOf(e) ? timeOf(e) + ' h' : fmtShort(d))}${e.location ? ` · ${esc(e.location)}` : ''}</span></button>`; }).join('')}
    </div></section>` : ''}
    ${photos.length > 1 ? `<section class="hf-sec herm-band"><h2 class="ev-h2">Fotos · ${photos.length}</h2><div class="cband cband-herm" role="group" aria-label="Fotos de la hermandad. Toca una para verla en grande"></div>
      <div class="hf-pad"><button type="button" class="btn btn-gray btn-wide" data-act="fotos">${icon('fototeca', 20)} Ver las ${photos.length} fotos</button></div></section>` : ''}
`;
  return screen({ title: g.nombre, navTitle: name, large:false, grouped:true, clearNav:true, content, setup: s => {
    s.el.classList.add('has-stretch', 'hf-screen');
    const head = $('.hf-hero', s.el), pic = $('.hf-media img', s.el), nav = s.navbar;
    s.scroller.addEventListener('scroll', () => {
      const y = s.scroller.scrollTop, hH = head.offsetHeight;
      if (pic) pic.style.transform = y < 0 ? `scale(${1 + -y / hH})` : `translateY(${y * 0.3}px)`;
      const solid = y > hH - 100; nav.classList.toggle('solid', solid); nav.classList.toggle('show-title', solid); nav.classList.toggle('over-photo', !solid);
    }, { passive:true });
    nav.classList.add('over-photo');
    const items = photos.map(u => ({ url:u, credit:g.nombre }));
    const band = $('.cband-herm', s.el); if (band) curvedBand(band, photos.map((src, k) => ({ src, name:'data-ph', val:k })), { speed:4, tileHeight:74, curve:68, fade:10 });
    s.el.addEventListener('click', e => {
      const p = e.target.closest('[data-ph]'); if (p) { openViewer(items, +p.dataset.ph, p); return; }
      const ev = e.target.closest('[data-ev]'); if (ev) { openEvent(+ev.dataset.ev, ev.dataset.iso); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'share') share(g.nombre, `${location.origin}/hermandades/gloria/${g.id}`, toast);
      if (a.dataset.act === 'fotos') openViewer(items, 0, band);
    });
  } });
}
