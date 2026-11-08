/* =====================================================================
   Fototeca propia de SS Ciudad Real (como Fotos de Apple)
   Un álbum por triduo o culto (data/fototeca.js). Todas las fotos llevan
   la marca de agua: fundido oscuro abajo y el logo blanco.
   Arriba: Cultos (por año) · Todas (pellizco 3/5/7 columnas).
   Debajo: Fijadas y Por hermandad.
   ===================================================================== */
import { icon, esc, $, $$, img, slug, cap, fmtLong, fmtShort, plural, HERMS, share, MONTHS } from '../util.js';
import { screen, register, navigate } from '../router.js';
import { prefs, setPref, onPrefs } from '../settings.js';
import { toast, longPress, segmented, moveSeg } from '../ui.js';
import { Spring } from '../spring.js';
import { openViewer } from './visor.js';
import { profileBtn, cell, section } from './common.js';

const COLS = [3, 5, 7];
let cols = 3;
const TIPO = { culto:'Culto', triduo:'Triduo', quinario:'Quinario', septenario:'Septenario', novena:'Novena', besamanos:'Besamanos', besapies:'Besapiés', traslado:'Traslado', funcion:'Función principal' };

/* Álbumes con su hermandad y sus fotos (los más recientes primero) */
const findHerm = name => { const n = slug(name || ''); return n ? HERMS.find(x => slug(x.h.nombre).includes(n) || slug(x.name).includes(n)) : null; };
const ALBUMS = (typeof ALBUMES !== 'undefined' ? ALBUMES : []).map(a => {
  const herm = findHerm(a.hermandad);
  const album = { ...a, herm, lugar: a.lugar || (herm && herm.h.sede) || '' };
  album.photos = (a.fotos || []).map((f, k) => ({ url:`img/fototeca/${a.id}/${f}`, herm, album, k, credit:'SS Ciudad Real' }));
  return album;
}).sort((a, b) => b.fecha.localeCompare(a.fecha));
const ALL = ALBUMS.flatMap(a => a.photos);
const cover = a => a && (a.photos[a.portada || 0] || a.photos[0]);
const tipo = a => TIPO[a.tipo] || cap(a.tipo || 'Culto');
const when = (a, long) => a.fechaTxt || (long ? fmtLong(a.fecha) : fmtShort(a.fecha));
const soon = a => !a.photos.length;
const sub = a => [a.herm ? a.herm.name : a.hermandad, when(a)].filter(Boolean).join(' · ');
const shortName = n => n.replace(/^(Hermandad|Archicofradía|Cofradía) (de |del )?/i, '');

/* ---------- Piezas ---------- */
function albumCard(a){
  const c = cover(a);
  return `<button type="button" class="album-card" data-go="/fototeca/album/${a.id}" data-album="${a.id}">
    ${c ? `<span class="ph album-media">${img(c.url, 900, { pos:'50% 30%' })}</span>` : `<span class="album-media album-soon"><span class="soon-pill">Próximamente</span>${icon('fototeca', 44)}<span class="soon-txt">Álbum en construcción</span><span class="soon-sub">Las fotos se añadirán muy pronto</span></span>`}
    <span class="album-text"><span class="overline">${esc(tipo(a))} · ${soon(a) ? 'Próximamente' : plural(a.photos.length, 'foto', 'fotos')}</span><span class="album-title">${esc(a.titulo)}</span><span class="album-sub">${esc(sub(a))}</span></span>
  </button>`;
}
function gridHTML(list, start = 0){
  return `<div class="photo-grid cols-${cols}" data-grid>${list.map((p, k) => `<button type="button" class="pg-item ph" data-ph="${start + k}" aria-label="Foto ${k + 1} de ${esc(p.album.titulo)}">${img(p.url, cols === 3 ? 640 : 320)}</button>`).join('')}</div>`;
}
function libraryHTML(mode){
  if (!ALBUMS.length) return `<div class="empty">${icon('fototeca', 44)}<h3>Fototeca en preparación</h3><p>Aquí estarán las fotografías de SS Ciudad Real de cada triduo y culto.</p></div>`;
  if (mode === 'todas') {
    if (!ALL.length) return `<div class="empty">${icon('fototeca', 44)}<h3>Fotos en preparación</h3><p>Muy pronto, las fotografías de los cultos.</p></div>`;
    let k = 0;
    return ALBUMS.filter(a => a.photos.length).map(a => { const html = `<div class="pg-sec"><span class="pg-label glass">${esc(a.titulo)} · ${esc(fmtShort(a.fecha))}</span>${gridHTML(a.photos, k)}</div>`; k += a.photos.length; return html; }).join('');
  }
  // Cultos por meses, del más reciente al más antiguo; los álbumes de cada mes se deslizan de lado
  const months = [...new Set(ALBUMS.map(a => a.fecha.slice(0, 7)))];
  return months.map(m => `<section class="album-year"><h2 class="year-title">${cap(MONTHS[+m.slice(5, 7) - 1])} <span class="c2">${m.slice(0, 4)}</span></h2><div class="album-rail hscroll${ALBUMS.filter(a => a.fecha.startsWith(m)).length === 1 ? ' solo' : ''}">${ALBUMS.filter(a => a.fecha.startsWith(m)).map(albumCard).join('')}</div></section>`).join('');
}

/* Colecciones: Fijadas y Por hermandad */
const hermsWithAlbums = () => [...new Map(ALBUMS.filter(a => a.herm).map(a => [a.herm.id, a.herm])).values()];
function collectionsHTML(){
  const pinned = prefs.pinned.filter(u => ALL.some(p => p.url === u));
  const hs = hermsWithAlbums();
  return `<section class="collection"><button type="button" class="col-head" data-go="/fototeca/fijadas"><h2 class="t-title2">Fijadas</h2>${icon('chevR', 20, 'ca')}</button>
      <div class="col-row hscroll">${pinned.length ? pinned.slice(0, 12).map((u, k) => `<button type="button" class="col-card sq" data-pin="${k}"><span class="ph">${img(u, 320)}</span></button>`).join('') : `<div class="col-empty">${icon('star', 26)}<p>Toca la estrella en el visor para fijar tus fotos favoritas.</p></div>`}</div></section>
    ${hs.length ? `<section class="collection"><div class="col-head"><h2 class="t-title2">Por hermandad</h2></div>
      <div class="col-row hscroll">${hs.map(x => { const own = ALBUMS.filter(a => a.herm && a.herm.id === x.id); const c = own.map(cover).find(Boolean); return `<button type="button" class="col-card" data-go="/fototeca/hermandad/${x.id}"><span class="ph">${img(c ? c.url : x.h.image, 400, { pos:'50% 25%' })}</span><b>${esc(shortName(x.name))}</b><small>${plural(own.length, 'álbum', 'álbumes')}</small></button>`; }).join('')}</div></section>` : ''}`;
}

/* ---------- Raíz ---------- */
register('/fototeca', 'fototeca', () => {
  let mode = 'cultos';
  const content = `<div class="lib" data-lib>${libraryHTML(mode)}</div><div class="cols-wrap" data-cols>${collectionsHTML()}</div><p class="home-foot">Fotografías de SS Ciudad Real</p>`;
  let off = null;
  return screen({ title:'Fototeca', titleAside: profileBtn(), overline:`${plural(ALL.length, 'FOTO', 'FOTOS')} · ${plural(ALBUMS.filter(a => !soon(a)).length, 'CULTO', 'CULTOS')}${ALBUMS.some(soon) ? ` · ${ALBUMS.filter(soon).length} PRÓXIMAMENTE` : ''}`, content, setup: s => {
    const seg = document.createElement('div'); seg.className = 'lib-seg'; seg.innerHTML = segmented([['cultos','Cultos'],['todas','Todas']], mode, { glass:true, label:'Vista de la fototeca' });
    s.el.appendChild(seg);
    const lib = $('[data-lib]', s.el);
    s.scroller.addEventListener('scroll', () => { const r = $('[data-cols]', s.el).getBoundingClientRect(); seg.classList.toggle('away', r.top < innerHeight - 140); }, { passive:true });
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-seg]'); if (b) { mode = b.dataset.seg; moveSeg(b.parentElement, mode); lib.innerHTML = libraryHTML(mode); return; }
      const p = e.target.closest('[data-ph]'); if (p) { openViewer(ALL, +p.dataset.ph, p); return; }
      const pin = e.target.closest('[data-pin]'); if (pin) { const list = prefs.pinned.map(u => ALL.find(x => x.url === u)).filter(Boolean); openViewer(list, +pin.dataset.pin, pin); }
    });
    pinchGrid(lib);
    longPress(s.el, '[data-ph]', el => photoMenu(ALL[+el.dataset.ph]));
    longPress(s.el, '[data-album]', el => { const a = ALBUMS.find(x => x.id === el.dataset.album); return a ? [
      { label:'Ver álbum', icon:'fototeca', run: () => navigate(`/fototeca/album/${a.id}`) },
      a.herm && { label:'Ver hermandad', icon:'hermandades', run: () => navigate(`/hermandades/${a.herm.id}`) },
      { label:'Compartir', icon:'share', run: () => share(a.titulo, `${location.origin}/fototeca/album/${a.id}`, toast) }].filter(Boolean) : []; });
    off = onPrefs(k => { if (k === 'pinned') $('[data-cols]', s.el).innerHTML = collectionsHTML(); });
  }, onDestroy: () => off && off() });
});

export function photoMenu(p){
  if (!p) return [];
  const on = prefs.pinned.includes(p.url);
  return [
    { label: on ? 'Quitar de Fijadas' : 'Fijar', icon:'star', run: () => { setPref('pinned', on ? prefs.pinned.filter(x => x !== p.url) : [p.url, ...prefs.pinned]); toast(on ? 'Quitada de Fijadas' : 'Añadida a Fijadas', 'star'); } },
    { label:'Ver álbum', icon:'fototeca', run: () => navigate(`/fototeca/album/${p.album.id}`) },
    { label:'Compartir', icon:'share', run: () => share(p.album.titulo, `${location.origin}/fototeca/album/${p.album.id}`, toast) }
  ];
}

/* Pellizco: cambia el número de columnas y cada foto viaja a su sitio */
function pinchGrid(root){
  const pts = new Map(); let d0 = 0, done = false;
  root.addEventListener('pointerdown', e => { if (!root.querySelector('[data-grid]')) return; pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); done = false; } });
  root.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
    if (pts.size !== 2 || done) return;
    const [a, b] = [...pts.values()], r = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / d0, i = COLS.indexOf(cols);
    if (r < 0.75 && i < COLS.length - 1) { done = true; setCols(root, COLS[i + 1]); }
    if (r > 1.33 && i > 0) { done = true; setCols(root, COLS[i - 1]); }
  });
  ['pointerup','pointercancel'].forEach(t => root.addEventListener(t, e => pts.delete(e.pointerId)));
  root.addEventListener('wheel', e => { if (!e.ctrlKey || !root.querySelector('[data-grid]')) return; e.preventDefault(); const i = COLS.indexOf(cols); if (e.deltaY > 0 && i < 2) setCols(root, COLS[i + 1]); if (e.deltaY < 0 && i > 0) setCols(root, COLS[i - 1]); }, { passive:false });
}
function setCols(root, n){
  const items = $$('.pg-item', root), vis = items.filter(it => { const r = it.getBoundingClientRect(); return r.bottom > -200 && r.top < innerHeight + 200; });
  const before = new Map(vis.map(it => [it, it.getBoundingClientRect()]));
  cols = n; $$('[data-grid]', root).forEach(g => { g.className = `photo-grid cols-${n}`; });
  if (prefs.motionOff) return;
  vis.forEach(it => {
    const a = before.get(it), b = it.getBoundingClientRect(); if (!b.width) return;
    const dx = a.left - b.left, dy = a.top - b.top, sc = a.width / b.width;
    const sp = new Spring({ value:0, response:0.42, damping:0.86, onUpdate: p => { it.style.transform = `translate3d(${dx * (1 - p)}px,${dy * (1 - p)}px,0) scale(${sc + (1 - sc) * p})`; }, onRest: () => { it.style.transform = ''; } });
    it.style.transformOrigin = '0 0'; sp.to(1);
  });
}

/* ---------- Álbum de un culto ---------- */
register('/fototeca/album/([^/]+)', 'fototeca', id => {
  const a = ALBUMS.find(x => x.id === id); if (!a) return null;
  const c = cover(a), hname = a.herm ? a.herm.name : a.hermandad;
  const info = [
    cell({ icon:['agenda','red'], title:esc(cap(when(a, true))), sub:esc(tipo(a)), chev:false }),
    a.lugar ? cell({ icon:['church','gold'], title:esc(a.lugar), sub:'Lugar', chev:false }) : '',
    hname ? cell({ icon:['hermandades','purple'], title:esc(hname), sub:'Hermandad', go: a.herm ? `/hermandades/${a.herm.id}` : '', chev: !!a.herm }) : ''
  ].filter(Boolean);
  const content = `
    <header class="album-hero${c ? '' : ' no-cover'}${soon(a) ? ' is-soon' : ''}">
      ${c ? `<div class="ah-media ph">${img(c.url, 1400, { eager:true, pos:'50% 28%', ws:[640, 1000, 1400], sizes:'100vw' })}</div>` : ''}
      <div class="ah-text">
        <p class="ah-over">${esc(tipo(a)).toUpperCase()} · ${soon(a) ? 'PRÓXIMAMENTE' : plural(a.photos.length, 'FOTO', 'FOTOS')}</p>
        <h1 class="ah-title">${esc(a.titulo)}</h1>
        ${hname ? `<p class="ah-sub">${esc(hname)}</p>` : ''}
      </div>
    </header>
    <div class="action-row ah-actions">
      ${a.herm ? `<button type="button" class="action" data-go="/hermandades/${a.herm.id}">${icon('hermandades', 22)}<span>Hermandad</span></button>` : ''}
      ${a.photos.length ? `<button type="button" class="action" data-ph="0">${icon('fototeca', 22)}<span>Ver fotos</span></button>` : ''}
      <button type="button" class="action" data-act="share">${icon('share', 22)}<span>Compartir</span></button>
    </div>
    ${section(info)}
    ${a.photos.length ? `<div class="album-mosaic">${a.photos.map((p, k) => `<button type="button" class="am-item ph" data-ph="${k}" aria-label="Foto ${k + 1} de ${a.photos.length}">${img(p.url, 640, { ws:[640, 1350], sizes:'(min-width:760px) 25vw, 50vw' })}</button>`).join('')}</div>`
      : `<div class="empty">${icon('fototeca', 44)}<span class="soon-pill static">Próximamente</span><h3>Álbum en construcción</h3><p>${a.fecha > new Date().toISOString().slice(0, 10) ? 'SS Ciudad Real estará en este culto. Las fotografías llegarán aquí muy pronto.' : 'Estamos preparando las fotografías de este culto. Muy pronto, aquí.'}</p></div>`}
    <p class="home-foot">${soon(a) ? 'Álbum en construcción · SS Ciudad Real' : `${plural(a.photos.length, 'fotografía', 'fotografías')} de SS Ciudad Real`}</p>`;
  return screen({ title:a.titulo, navTitle: tipo(a), large:false, grouped:true, clearNav:!!c, content, setup: s => {
    if (c) {
      s.el.classList.add('has-stretch');
      const head = $('.album-hero', s.el), pic = $('.ah-media img', s.el), nav = s.navbar; nav.classList.add('over-photo'); nav.classList.remove('show-title');
      s.scroller.addEventListener('scroll', () => {
        const y = s.scroller.scrollTop, hH = head.offsetHeight;
        pic.style.transform = y < 0 ? `scale(${1 + -y / hH})` : `translateY(${y * 0.3}px)`;
        const solid = y > hH - 110; nav.classList.toggle('solid', solid); nav.classList.toggle('show-title', solid); nav.classList.toggle('over-photo', !solid);
      }, { passive:true });
    }
    s.el.addEventListener('click', e => {
      const p = e.target.closest('[data-ph]'); if (p) { openViewer(a.photos, +p.dataset.ph, p.classList.contains('am-item') ? p : $('.am-item', s.el)); return; }
      if (e.target.closest('[data-act=share]')) share(a.titulo, `${location.origin}/fototeca/album/${a.id}`, toast);
    });
    longPress(s.el, '.am-item', el => photoMenu(a.photos[+el.dataset.ph]));
  } });
});

/* ---------- Álbumes de una hermandad y fotos fijadas ---------- */
register('/fototeca/hermandad/([^/]+)/([^/]+)', 'fototeca', (j, hs) => {
  const list = ALBUMS.filter(a => a.herm && a.herm.id === `${j}/${hs}`); if (!list.length) return null;
  return screen({ title:shortName(list[0].herm.name), large:false, content:`<div class="album-list" style="padding-top:8px">${list.map(albumCard).join('')}</div>` });
});
register('/fototeca/fijadas', 'fototeca', () => {
  const list = prefs.pinned.map(u => ALL.find(x => x.url === u)).filter(Boolean);
  return screen({ title:'Fijadas', large:false, content: list.length ? gridHTML(list) : `<div class="empty">${icon('star', 44)}<h3>Sin fotos fijadas</h3><p>En el visor, toca la estrella para fijar tus fotos favoritas.</p></div>`,
    setup: s => s.el.addEventListener('click', e => { const p = e.target.closest('[data-ph]'); if (p) openViewer(list, +p.dataset.ph, p); }) });
});
