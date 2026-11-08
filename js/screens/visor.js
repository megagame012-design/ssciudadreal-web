/* =====================================================================
   Visor de fotos (como Fotos de Apple)
   - Crece desde la miniatura y vuelve a ella al cerrar.
   - Deslizar abajo: cerrar (sigue al dedo). Arriba: información.
   - Lados: pasar de foto. Pellizco o doble toque: ampliar y arrastrar.
   - Toque: muestra u oculta los controles de cristal. Tira de miniaturas.
   ===================================================================== */
import { icon, h, esc, $, $$, cld, titleCase } from '../util.js';
import { Spring, clamp, rubber } from '../spring.js';
import { prefs, setPref } from '../settings.js';
import { toast } from '../ui.js';
import { share } from '../util.js';
import { navigate } from '../router.js';

let V = null;
export function openViewer(items, index = 0, sourceEl = null){
  if (V) V.close(true);
  const layer = h(`<div class="viewer" role="dialog" aria-modal="true" aria-label="Visor de fotos">
    <div class="vw-bg"></div>
    <div class="vw-stage"><img class="vw-img" alt="" draggable="false"></div>
    <header class="vw-top"><button type="button" class="gbtn glass liquid" data-vw="close" aria-label="Cerrar">${icon('x', 20)}</button>
      <div class="vw-title glass"><b></b><span></span></div>
      <div class="vw-actions"><button type="button" class="gbtn glass liquid" data-vw="pin" aria-label="Fijar">${icon('star', 20)}</button><button type="button" class="gbtn glass liquid" data-vw="share" aria-label="Compartir">${icon('share', 20)}</button></div></header>
    <footer class="vw-bottom"><div class="vw-strip glass hscroll" role="listbox" aria-label="Miniaturas"></div></footer>
    <section class="vw-info glass" aria-label="Información"><span class="sheet-grab"></span><div class="vw-info-body"></div></section>
  </div>`);
  document.body.appendChild(layer);
  document.documentElement.classList.add('viewer-open');
  const bg = $('.vw-bg', layer), stageEl = $('.vw-stage', layer), im = $('.vw-img', layer), strip = $('.vw-strip', layer), info = $('.vw-info', layer);
  let i = index, chrome = true, zoom = 1, panX = 0, panY = 0;
  const opener = document.activeElement;

  /* Tira de miniaturas (ventana alrededor de la foto actual si hay muchas) */
  strip.innerHTML = items.map((it, k) => `<button type="button" class="vw-th" role="option" data-k="${k}" aria-label="Foto ${k + 1} de ${items.length}"><img src="${cld(it.url, 120)}" alt="" loading="lazy" decoding="async"></button>`).join('');

  /* Encaje de la foto en pantalla */
  const fit = () => {
    const W = innerWidth, H = innerHeight, nw = im.naturalWidth || 3, nh = im.naturalHeight || 4;
    const s = Math.min(W / nw, H / nh); return { w: nw * s, h: nh * s, x: (W - nw * s) / 2, y: (H - nh * s) / 2 };
  };
  // Transformación actual: arrastre (dx, dy), escala por gesto (gs) y zoom
  const pos = { dx:0, dy:0, gs:1 };
  const apply = () => {
    const f = fit();
    Object.assign(im.style, { width: f.w + 'px', height: f.h + 'px', left: f.x + 'px', top: f.y + 'px' });
    im.style.transform = `translate3d(${pos.dx + panX}px,${pos.dy + panY}px,0) scale(${pos.gs * zoom})`;
  };
  const sDismiss = new Spring({ value:0, response:0.38, damping:0.86, onUpdate: v => { pos.dy = v; pos.gs = 1 - Math.min(0.35, Math.abs(v) / innerHeight * 0.6); bg.style.opacity = String(1 - Math.min(1, Math.abs(v) / (innerHeight * 0.5))); apply(); } });
  const sX = new Spring({ value:0, response:0.36, damping:0.9, onUpdate: v => { pos.dx = v; apply(); } });
  const sInfo = new Spring({ value:0, response:0.42, damping:0.88, onUpdate: v => { info.style.transform = `translateY(${(1 - v) * 105}%)`; panY = -v * innerHeight * 0.22; apply(); } });

  function setPhoto(k, { anim = false } = {}){
    i = (k + items.length) % items.length; zoom = 1; panX = 0; panY = 0;
    const it = items[i];
    im.classList.remove('is-loaded');
    im.src = cld(it.url, 1600);
    const al = it.album;
    im.alt = al ? `${al.titulo}, ${al.fecha}` : it.herm ? `Foto de ${it.herm.name}` : 'Foto';
    $('.vw-title b', layer).textContent = al ? al.titulo : it.herm ? it.herm.name : 'Foto';
    $('.vw-title span', layer).textContent = al ? new Date(al.fecha + 'T12:00').toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' }) : it.herm ? titleCase(it.herm.j) : `${i + 1} de ${items.length}`;
    $$('.vw-th', strip).forEach((t, n) => t.classList.toggle('on', n === i));
    const cur = $(`.vw-th[data-k="${i}"]`, strip); if (cur) cur.scrollIntoView({ inline:'center', block:'nearest', behavior: anim ? 'smooth' : 'auto' });
    $('[data-vw=pin]', layer).classList.toggle('is-on', prefs.pinned.includes(it.url));
    $('.vw-info-body', layer).innerHTML = al ? `<h2 class="t-title2">${esc(al.titulo)}</h2><p class="c2 t-subhead">${esc(al.herm ? al.herm.name : al.hermandad || '')}</p>
      <dl class="vw-meta"><div><dt>Fecha</dt><dd>${esc(new Date(al.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' }))}</dd></div><div><dt>Tipo</dt><dd>${esc(al.tipo ? al.tipo.charAt(0).toUpperCase() + al.tipo.slice(1) : 'Culto')}</dd></div>${al.lugar ? `<div><dt>Lugar</dt><dd>${esc(al.lugar)}</dd></div>` : ''}<div><dt>Fotografía</dt><dd>SS Ciudad Real</dd></div></dl>
      ${al.herm ? `<button type="button" class="btn btn-tinted btn-wide" data-go="/hermandades/${al.herm.id}">${icon('hermandades', 20)} Ver la hermandad</button>` : ''}` : `<h2 class="t-title3">${esc(it.herm ? it.herm.name : 'Foto')}</h2>
      ${it.herm ? `<p class="c2 t-subhead">${esc(it.herm.h.titulares || '')}</p>` : ''}
      <dl class="vw-meta">${it.herm ? `<div><dt>Jornada</dt><dd>${esc(titleCase(it.herm.j))}</dd></div><div><dt>Sede</dt><dd>${esc(it.herm.h.sede || '—')}</dd></div>` : ''}
      <div><dt>Fecha</dt><dd class="c2">Sin fecha en los datos</dd></div><div><dt>Autoría</dt><dd>${esc(it.credit || 'Laura Arroyo · Objetivo Cofrade')}</dd></div></dl>
      ${it.herm ? `<button type="button" class="btn btn-tinted btn-wide" data-go="/hermandades/${it.herm.id}">${icon('hermandades', 20)} Ver la hermandad</button>` : ''}`;
    apply();
  }
  im.addEventListener('load', () => { im.classList.add('is-loaded'); apply(); });

  /* Apertura: la foto crece desde la miniatura */
  setPhoto(i);
  const openFrom = () => {
    const r = sourceEl && sourceEl.getBoundingClientRect();
    if (!r || prefs.motionOff || !r.width) { layer.classList.add('is-open'); bg.style.opacity = 1; return; }
    const f = fit(), s = Math.max(r.width / f.w, r.height / f.h);
    const cx = r.left + r.width / 2 - (f.x + f.w / 2), cy = r.top + r.height / 2 - (f.y + f.h / 2);
    im.style.clipPath = `inset(${(f.h - r.height / s) / 2}px ${(f.w - r.width / s) / 2}px round ${12 / s}px)`;
    const sp = new Spring({ value:0, response:0.42, damping:0.86, onUpdate: p => {
      pos.dx = cx * (1 - p); pos.dy = cy * (1 - p); pos.gs = s + (1 - s) * p; bg.style.opacity = String(p);
      const ix = (f.w - r.width / s) / 2 * (1 - p), iy = (f.h - r.height / s) / 2 * (1 - p);
      im.style.clipPath = p > .995 ? '' : `inset(${iy}px ${ix}px round ${12 * (1 - p)}px)`; apply();
    }, onRest: () => { pos.dx = pos.dy = 0; pos.gs = 1; im.style.clipPath = ''; apply(); } });
    layer.classList.add('is-open'); sp.to(1);
  };
  if (im.complete && im.naturalWidth) openFrom(); else { im.addEventListener('load', openFrom, { once:true }); setTimeout(() => { if (!layer.classList.contains('is-open')) openFrom(); }, 500); }

  /* Cierre: vuelve a su miniatura si se ve, si no se desvanece */
  function close(instant){
    if (!V) return; V = null;
    document.documentElement.classList.remove('viewer-open');
    const fin = () => { layer.remove(); if (opener && document.contains(opener)) opener.focus({ preventScroll:true }); };
    if (instant || prefs.motionOff) return fin();
    layer.classList.remove('chrome-on'); layer.classList.add('closing');
    const r = sourceEl && i === index && document.contains(sourceEl) ? sourceEl.getBoundingClientRect() : null;
    if (r && r.width && r.bottom > 0 && r.top < innerHeight) {
      const f = fit(), s = Math.max(r.width / f.w, r.height / f.h);
      const cx = r.left + r.width / 2 - (f.x + f.w / 2), cy = r.top + r.height / 2 - (f.y + f.h / 2);
      const d0 = { dx:pos.dx, dy:pos.dy, gs:pos.gs, o:+getComputedStyle(bg).opacity };
      const sp = new Spring({ value:0, response:0.36, damping:0.9, onUpdate: p => {
        pos.dx = d0.dx + (cx - d0.dx) * p; pos.dy = d0.dy + (cy - d0.dy) * p; pos.gs = d0.gs + (s - d0.gs) * p; bg.style.opacity = String(d0.o * (1 - p));
        const ix = (f.w - r.width / s) / 2 * p, iy = (f.h - r.height / s) / 2 * p; im.style.clipPath = `inset(${iy}px ${ix}px round ${12 * p}px)`; apply();
      }, onRest: fin });
      sp.to(1);
    } else { layer.style.transition = 'opacity 220ms ease'; layer.style.opacity = '0'; setTimeout(fin, 230); }
  }
  V = { close };

  const toggleChrome = on => { chrome = on ?? !chrome; layer.classList.toggle('chrome-on', chrome); };
  setTimeout(() => toggleChrome(true), 60);

  /* Botones */
  layer.addEventListener('click', e => {
    const b = e.target.closest('[data-vw],[data-k],[data-go]'); if (!b) return;
    if (b.dataset.go) { const go = b.dataset.go; close(true); navigate(go); return; }
    if (b.dataset.k !== undefined) { setPhoto(+b.dataset.k, { anim:true }); return; }
    const a = b.dataset.vw;
    if (a === 'close') close();
    if (a === 'share') { const it = items[i]; share(it.album ? it.album.titulo : it.herm ? it.herm.name : 'Foto', it.album ? `${location.origin}/fototeca/album/${it.album.id}` : it.herm ? `${location.origin}/hermandades/${it.herm.id}` : it.url, toast); }
    if (a === 'pin') { const u = items[i].url, on = prefs.pinned.includes(u); setPref('pinned', on ? prefs.pinned.filter(x => x !== u) : [u, ...prefs.pinned]); b.classList.toggle('is-on', !on); toast(on ? 'Quitada de Fijadas' : 'Añadida a Fijadas', 'star'); }
  });
  layer.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') setPhoto(i + 1, { anim:true });
    if (e.key === 'ArrowLeft') setPhoto(i - 1, { anim:true });
  });
  setTimeout(() => $('[data-vw=close]', layer).focus({ preventScroll:true }), 80);

  /* Gestos: arrastre, pellizco y doble toque */
  const pts = new Map(); let g = null, lastTap = 0, pinch = null, infoOpen = false;
  stageEl.addEventListener('pointerdown', e => {
    stageEl.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; g = null; return; }
    g = { x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, t:performance.now(), vx:0, vy:0, axis:null, px:panX, py:panY, moved:false };
    sDismiss.stop(); sX.stop();
  });
  stageEl.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; zoom = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, 0.8, 5); apply(); return; }
    if (!g) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0, now = performance.now();
    g.vx = (e.clientX - g.x) / Math.max(1, now - g.t) * 1000; g.vy = (e.clientY - g.y) / Math.max(1, now - g.t) * 1000; g.x = e.clientX; g.y = e.clientY; g.t = now;
    if (!g.axis) { if (Math.hypot(dx, dy) < 8) return; g.axis = zoom > 1.01 ? 'pan' : Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; g.moved = true; }
    if (g.axis === 'pan') { panX = g.px + dx; panY = g.py + dy; apply(); }
    else if (g.axis === 'x') { const edge = (i === 0 && dx > 0) || (i === items.length - 1 && dx < 0); sX.set(edge ? rubber(Math.abs(dx), 200) * Math.sign(dx) : dx); }
    else if (infoOpen) { sInfo.set(clamp(1 - dy / 300, 0, 1)); }
    else if (dy < 0) { sInfo.set(clamp(-dy / 300, 0, 1)); }
    else { sDismiss.set(dy); pos.dx = dx * 0.6; apply(); layer.classList.remove('chrome-on'); }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pinch) { if (pts.size < 2) { pinch = null; if (zoom < 1) { zoom = 1; panX = panY = 0; apply(); } } return; }
    if (!g) return; const d = g; g = null;
    if (!d.moved) { // toque o doble toque
      const now = performance.now();
      if (now - lastTap < 280) { zoom = zoom > 1.01 ? 1 : 2.5; if (zoom === 1) { panX = panY = 0; } else { const r = im.getBoundingClientRect(); panX = (innerWidth / 2 - d.x0) * 1.5; panY = (innerHeight / 2 - d.y0) * 1.5; } im.style.transition = 'transform 320ms var(--spring)'; apply(); setTimeout(() => im.style.transition = '', 340); lastTap = 0; return; }
      lastTap = now; setTimeout(() => { if (lastTap === now) toggleChrome(); }, 290); return;
    }
    if (d.axis === 'x') {
      const dx = pos.dx, proj = dx + d.vx * 0.2;
      if (proj < -innerWidth * 0.35 && i < items.length - 1) { sX.onRest = () => { sX.onRest = () => {}; sX.set(innerWidth * 0.3); setPhoto(i + 1); sX.to(0); }; sX.to(-innerWidth, d.vx); }
      else if (proj > innerWidth * 0.35 && i > 0) { sX.onRest = () => { sX.onRest = () => {}; sX.set(-innerWidth * 0.3); setPhoto(i - 1); sX.to(0); }; sX.to(innerWidth, d.vx); }
      else sX.to(0, d.vx);
    } else if (d.axis === 'y') {
      if (infoOpen || sInfo.x > 0.02) { infoOpen = sInfo.x + d.vy / -1500 > 0.4; sInfo.to(infoOpen ? 1 : 0); if (!infoOpen) toggleChrome(true); return; }
      if (pos.dy + d.vy * 0.15 > 140) close();
      else { sDismiss.to(0, d.vy); pos.dx = 0; toggleChrome(true); }
    }
  };
  stageEl.addEventListener('pointerup', up); stageEl.addEventListener('pointercancel', up);
  stageEl.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); zoom = clamp(zoom * (1 - e.deltaY / 200), 1, 5); apply(); } }, { passive:false });
  window.addEventListener('resize', apply);
}
