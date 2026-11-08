/* Ficha de un acto, en hoja modal (se usa desde Agenda y Hoy) */
import { icon, esc, $, img, cld, typeOf, evTypesOn, evDates, timeOf, fmtLong, fmtShort, parseISO, MONTHS, hermsFor, salida, HERMS, slug, titleCase, downloadICS, directionsURL, share, evById, markLoaded } from '../util.js';
import { openSheet, toast } from '../ui.js';
import { openViewer } from './visor.js';

/* «5, 6 y 7 de noviembre» (o «30 de octubre y 1 de noviembre» si cambia el mes) */
const datesTxt = ds => { const d = ds.map(parseISO), y = a => a.length > 1 ? `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}` : a[0];
  return d.every(x => x.getMonth() === d[0].getMonth()) ? `${y(d.map(x => x.getDate()))} de ${MONTHS[d[0].getMonth()]}` : y(ds.map(fmtShort)); };

const tdot = id => `<i class="tdot tm-${typeOf(id).shape}" style="--c:${typeOf(id).color}" aria-hidden="true"></i>`;
export { tdot };
/* La hermandad del acto, si coincide con una de la app */
const hermOf = e => e.hermandad ? HERMS.find(x => slug(e.hermandad).includes(slug(x.name).replace(/^hermandad-(de-|del-)?/, '')) || slug(x.h.nombre) === slug(e.hermandad)) : null;

/* Contenido de la ficha y su cableado (sirve para hoja o tarjeta expandida) */
export function eventView(id, iso, { hero = true } = {}){
  const e = evById(id); if (!e) return null;
  const day = iso && evDates(e).includes(iso) ? iso : e.date;
  const herms = e.type === 'procesion' && !e.keep ? hermsFor(e) : [];
  const pic = e.image || (herms[0] && herms[0].h.image);
  const types = evTypesOn(e, day);
  const firstOut = herms.map(x => salida(x.h)).filter(Boolean).sort()[0];
  const time = timeOf(e) ? `${timeOf(e)} h${e.end ? ' – ' + e.end + ' h' : ''}` : (firstOut ? `Primera salida a las ${firstOut} h` : 'Todo el día');
  const hx = hermOf(e);
  const url = `${location.origin}/agenda/${day}/${e.id}`;
  const gallery = e.gallery && e.gallery.length ? (e.link ? [...e.gallery] : [e.image, ...e.gallery]) : [];
  const d0 = parseISO(day), ds = evDates(e);
  const n = Math.round((d0 - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5);
  const when = n < 0 ? 'Celebrado' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`;
  const typeLine = `<p class="ev-type">${types.map(t => `${tdot(t)}<span>${typeOf(t).one}</span>`).join('<span class="sep">·</span>')}</p>`;
  const hermLine = e.sub && !e.hermandad ? `<p class="ev-herm-txt">${esc(e.sub)}</p>` : e.hermandad ? (hx ? `<button type="button" class="ev-herm" data-go="/hermandades/${hx.id}">${esc(e.hermandad)} ${icon('chevR', 14)}</button>` : `<p class="ev-herm-txt">${esc(e.hermandad)}</p>`) : '';
  const html = `
    ${pic && hero ? `<div class="ev-hero ph">${img(pic, 1200, { alt:'', pos: e.imagePos || '' })}<span class="ev-hero-shade"></span>${e.credit ? `<span class="ev-hero-credit">${esc(e.credit)}</span>` : ''}<span class="ev-hero-text">${typeLine}<span class="ev-hero-title selectable">${esc(e.title)}</span></span></div>` : ''}
    <header class="ev-head${pic && hero ? ' under' : ''}${pic ? '' : ' no-pic'}">
      ${pic && hero ? '' : `${typeLine}${hero || !pic ? `<h1 class="ev-title-big selectable">${esc(e.title)}</h1>` : ''}`}
      ${hermLine}
    </header>
    <section class="ifc" aria-label="Fecha, hora y lugar">
      <div class="ifc-row">${icon('agenda', 20)}<span><small>Fecha</small>${esc(fmtLong(day))}${e.dates ? `<em>${datesTxt(e.dates)}</em>` : ''}<em class="ifc-when">${when}</em></span></div>
      <div class="ifc-row">${icon('clock', 20)}<span><small>Hora</small><span class="tnum">${esc(time)}</span></span></div>
      ${e.location ? `<div class="ifc-row">${icon('pin', 20)}<span><small>Lugar</small><span class="selectable">${esc(e.location)}</span></span></div>` : ''}
      ${ds.length > 1 ? `<div class="ifc-days">${ds.map(x => { const dx = parseISO(x); return `<span class="${x === day ? 'on' : ''}"><i>${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][dx.getDay()]}</i><b>${dx.getDate()}</b></span>`; }).join('')}</div>` : ''}
    </section>
    <div class="ev-actions">
      ${e.quiet ? '' : `<button type="button" class="ev-act" data-ev-act="ics">${icon('calPlus', 22)}<span>Calendario</span></button>`}
      <button type="button" class="ev-act" data-ev-act="share">${icon('share', 22)}<span>Compartir</span></button>
      ${e.location ? `<a class="ev-act" href="${directionsURL(e.location)}" target="_blank" rel="noopener">${icon('directions', 22)}<span>Cómo llegar</span></a>` : ''}
      ${e.link ? `<a class="ev-act ev-act-main" href="${esc(e.link.url)}" target="_blank" rel="noopener">${icon('external', 22)}<span>${esc(e.link.label.replace('Comprar entradas', 'Entradas'))}</span></a>` : ''}
    </div>
    ${e.fullDesc || e.desc ? `<section class="ev-about"><h2 class="ev-h2">Sobre el acto</h2><div class="ev-desc selectable">${(e.fullDesc || esc(e.desc)).split(/\n{2,}/).map(p => `<p>${p.replace(/<\/b>\s*\n/g, '</b>').replace(/\n/g, '<br>')}</p>`).join('')}</div></section>` : ''}
    ${gallery.length ? `<section class="ev-about"><h2 class="ev-h2">Imágenes</h2><div class="ev-gallery">${gallery.map((g, k) => `<button type="button" class="pg-item ph" data-evph="${k}" aria-label="Imagen ${k + 1}">${img(g, 600)}</button>`).join('')}</div></section>` : ''}
    ${herms.length ? `<section class="section"><h2 class="ev-h2">Hermandades en la calle</h2><div class="group">${herms.map(x => { const s = salida(x.h); return `<button type="button" class="cell tall" data-go="/hermandades/${x.id}"><span class="ph cell-thumb">${img(x.h.image, 120, { cls:'cell-thumb' })}</span><span class="cell-body"><span class="cell-row-wrap"><span style="flex:1;min-width:0"><span class="cell-title">${esc(x.name)}</span><span class="cell-sub" style="display:block">${esc(x.h.sede || titleCase(x.j))}</span></span>${s ? `<span class="cell-value tnum">${s}</span>` : ''}${icon('chevR', 18, 'cell-chev')}</span></span></button>`; }).join('')}</div><p class="section-foot">Horas de salida de 2026, orientativas hasta que se publique la guía de 2027.</p></section>` : ''}
`;
  const wire = root => {
      root.addEventListener('click', ev => {
        const a = ev.target.closest('[data-ev-act]');
        if (a && a.dataset.evAct === 'ics') { downloadICS(e, day); toast('Añadido al calendario', 'calPlus'); }
        if (a && a.dataset.evAct === 'share') share(e.title, url, toast);
        const p = ev.target.closest('[data-evph]'); if (p) openViewer(gallery.map(u => ({ url:u, credit:e.hermandad || '' })), +p.dataset.evph, p);
      });
      markLoaded(root);
  };
  return { e, day, pic, html, wire };
}
export function openEvent(id, iso){
  const v = eventView(id, iso); if (!v) { toast('No hemos encontrado ese acto', 'info'); return; }
  const sh = openSheet({ content: v.html, label: v.e.title, detent:'large', right:'close', onMount: c => v.wire(c.body) });
  sh.el.querySelector('.sheet').classList.add('ev-sheet');
  return sh;
}
