/* =====================================================================
   Componentes de interfaz: avisos, alertas, hojas modales, menús
   contextuales, controles segmentados e interruptores
   ===================================================================== */
import { icon, h, esc, $, $$, markLoaded } from './util.js';
import { Spring, clamp, rubber } from './spring.js';
import { prefs } from './settings.js';

const isDesktop = () => matchMedia('(min-width: 768px)').matches;
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

/* ---------- Avisos (toast) en cápsula de cristal ---------- */
let toastEl, toastTimer;
export function toast(text, ic = 'check'){
  if (!toastEl) { toastEl = h(`<div class="toast glass" role="status" aria-live="polite"></div>`); document.body.appendChild(toastEl); }
  toastEl.innerHTML = `${icon(ic, 20)}<span>${esc(text)}</span>`;
  requestAnimationFrame(() => toastEl.classList.add('is-on'));
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

/* ---------- Alertas al estilo iOS ---------- */
export function alertBox({ title, text = '', buttons = [{ label:'Aceptar', bold:true }] }){
  return new Promise(resolve => {
    const layer = h(`<div class="alert-layer" role="alertdialog" aria-modal="true" aria-labelledby="al-t">
      <div class="alert glass"><div class="alert-text"><h3 id="al-t">${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}</div>
      <div class="alert-btns">${buttons.map((b, i) => `<button type="button" data-i="${i}" class="${b.bold ? 'bold' : ''} ${b.danger ? 'danger' : ''}">${esc(b.label)}</button>`).join('')}</div></div></div>`);
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('is-open'));
    const done = i => { layer.classList.remove('is-open'); setTimeout(() => layer.remove(), 220); resolve(i); };
    layer.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) done(+b.dataset.i); });
    layer.addEventListener('keydown', e => { if (e.key === 'Escape') done(-1); });
    (layer.querySelector('.bold') || layer.querySelector('button')).focus();
  });
}

/* ---------- Hojas modales con dos alturas y cierre deslizando ---------- */
const sheets = [];
export function openSheet({ content, label = 'Detalle', detent = 'large', plain = false, title = '', left = '', right = 'close', onClose, onMount } = {}){
  const layer = h(`<div class="sheet-layer" role="dialog" aria-modal="true" aria-label="${esc(label)}">
    <div class="sheet-scrim"></div>
    <section class="sheet${plain ? ' plain' : ''}">
      <span class="sheet-grab" aria-hidden="true"></span>
      ${title || left || right ? `<header class="sheet-top">${left || '<span style="width:36px"></span>'}${title ? `<h2>${esc(title)}</h2>` : '<span style="flex:1"></span>'}${right === 'close' ? `<button type="button" class="gbtn glass liquid" data-sheet-close aria-label="Cerrar">${icon('x', 18)}</button>` : right}</header>` : ''}
      <div class="sheet-body"></div>
    </section></div>`);
  const sheetEl = $('.sheet', layer), body = $('.sheet-body', layer), scrim = $('.sheet-scrim', layer);
  if (typeof content === 'string') body.innerHTML = content; else if (content) body.appendChild(content);
  document.body.appendChild(layer);
  const opener = document.activeElement;
  const ctl = { el: layer, body, sheetEl, close, setDetent };
  sheets.push(ctl);
  document.documentElement.classList.add('sheet-open');
  markLoaded(body);

  const H = () => sheetEl.offsetHeight;
  const detentY = d => d === 'medium' ? Math.max(0, H() - Math.round(innerHeight * 0.52)) : 0;
  let current = detent;
  const spring = new Spring({ value: H() + 40, response: 0.44, damping: 0.88,
    onUpdate: y => { sheetEl.style.transform = `translateY(${y}px)`; scrim.style.opacity = String(clamp(1 - y / H(), 0, 1)); } });

  if (isDesktop()) {
    sheetEl.style.transition = `transform 360ms var(--spring), opacity 200ms ease`;
    requestAnimationFrame(() => { layer.classList.add('is-open'); sheetEl.style.opacity = '1'; sheetEl.style.transform = 'translate(-50%,-50%)'; });
  } else {
    layer.classList.add('is-open');
    spring.set(H() + 40);
    requestAnimationFrame(() => spring.to(detentY(current)));
  }
  onMount && onMount(ctl);
  // Foco dentro de la hoja
  setTimeout(() => { const f = body.querySelector('h1,h2,[autofocus]') || sheetEl; f.setAttribute('tabindex', '-1'); f.focus({ preventScroll:true }); }, 60);

  function setDetent(d){ current = d; if (!isDesktop()) spring.to(detentY(d)); }
  function close(){
    if (ctl.closed) return; ctl.closed = true;
    sheets.splice(sheets.indexOf(ctl), 1);
    if (!sheets.length) document.documentElement.classList.remove('sheet-open');
    const fin = () => { layer.remove(); onClose && onClose(); if (opener && document.contains(opener)) opener.focus({ preventScroll:true }); };
    if (isDesktop()) { sheetEl.style.opacity = '0'; sheetEl.style.transform = 'translate(-50%,-45%) scale(.96)'; layer.classList.remove('is-open'); setTimeout(fin, 240); }
    else { layer.classList.remove('is-open'); spring.onRest = fin; spring.to(H() + 40); if (prefs.motionOff) fin(); }
  }
  layer.addEventListener('click', e => { if (e.target === scrim || e.target.closest('[data-sheet-close]')) close(); });
  layer.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { // foco atrapado
      const f = $$('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', sheetEl).filter(x => !x.disabled && x.offsetParent);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Arrastre con el dedo: sigue 1:1 y cierra o cambia de altura según velocidad
  let drag = null;
  sheetEl.addEventListener('pointerdown', e => {
    if (isDesktop() || e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('input,textarea,.no-drag,.cband,.map-frame,.hscroll')) return;
    const onTop = !!e.target.closest('.sheet-top,.sheet-grab');
    if (!onTop && body.scrollTop > 0) return;
    drag = { y0:e.clientY, start:spring.x, t:performance.now(), y:e.clientY, v:0, active:false, onTop, id:e.pointerId };
  });
  sheetEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (!drag.active) {
      if (Math.abs(dy) < 6) return;
      if (dy < 0 && !drag.onTop && current === 'large') { drag = null; return; }
      drag.active = true; spring.stop(); try { sheetEl.setPointerCapture(e.pointerId); } catch (_) {}
    }
    const now = performance.now(); drag.v = (e.clientY - drag.y) / Math.max(1, now - drag.t) * 1000; drag.y = e.clientY; drag.t = now;
    let y = drag.start + dy;
    if (y < 0) y = -rubber(-y, 120);
    spring.set(y);
  });
  const end = () => {
    if (!drag) return; const d = drag; drag = null; if (!d.active) return;
    const y = spring.x, v = d.v, proj = y + v * 0.2, mid = detentY('medium');
    if (proj > H() * 0.6 || (v > 900 && (current === 'medium' || y > mid * 0.5))) return close();
    if (detent === 'medium' || current === 'medium') current = proj > mid * 0.5 && mid > 0 ? 'medium' : 'large';
    spring.to(detentY(current), v);
  };
  sheetEl.addEventListener('pointerup', end); sheetEl.addEventListener('pointercancel', end);
  body.addEventListener('scroll', () => { if (current === 'medium' && body.scrollTop > 2) setDetent('large'); }, { passive:true });
  return ctl;
}
export const topSheet = () => sheets[sheets.length - 1];
export const closeAllSheets = () => [...sheets].reverse().forEach(s => s.close());

/* ---------- Menú contextual al mantener pulsado ---------- */
export function longPress(root, selector, getMenu){
  let timer = 0, start = null, target = null;
  root.addEventListener('pointerdown', e => {
    const el = e.target.closest(selector); if (!el || e.button > 0) return;
    target = el; start = { x:e.clientX, y:e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => { const items = getMenu(target); if (items && items.length) { target.dataset.lp = '1'; openContextMenu(target, items); } }, 480);
  });
  root.addEventListener('pointermove', e => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearTimeout(timer); });
  ['pointerup','pointercancel','pointerleave'].forEach(t => root.addEventListener(t, () => clearTimeout(timer)));
  root.addEventListener('contextmenu', e => { if (e.target.closest(selector)) e.preventDefault(); });
  // Evita el clic que sigue a la pulsación larga
  root.addEventListener('click', e => { const el = e.target.closest(selector); if (el && el.dataset.lp) { e.preventDefault(); e.stopPropagation(); delete el.dataset.lp; } }, true);
}
export function openContextMenu(el, items){
  vibrate(10);
  const r = el.getBoundingClientRect();
  const layer = h(`<div class="ctx-layer" role="menu"></div>`);
  const prev = el.cloneNode(true); prev.classList.add('ctx-preview'); prev.removeAttribute('id');
  Object.assign(prev.style, { left:r.left + 'px', top:r.top + 'px', width:r.width + 'px', height:r.height + 'px', margin:0 });
  const menu = h(`<div class="ctx-menu glass">${items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}" class="${it.danger ? 'cell-danger' : ''}"><span>${esc(it.label)}</span>${icon(it.icon || 'chevR', 20)}</button>`).join('')}</div>`);
  layer.append(prev, menu); document.body.appendChild(layer);
  const mh = items.length * 44, below = r.bottom + 12 + mh < innerHeight - 20;
  const lift = below ? 0 : Math.max(0, r.bottom + 12 + mh - (innerHeight - 20));
  menu.style.left = clamp(r.left, 12, innerWidth - 262) + 'px';
  menu.style.top = (below ? r.bottom + 12 - lift : Math.max(12, r.top - mh - 12)) + 'px';
  menu.style.setProperty('--oy', below ? '0' : '100%');
  requestAnimationFrame(() => { layer.classList.add('is-open'); prev.style.transform = `translateY(${-lift}px) scale(1.03)`; });
  const close = () => { layer.classList.remove('is-open'); prev.style.transform = ''; setTimeout(() => layer.remove(), 260); };
  layer.addEventListener('click', e => { const b = e.target.closest('[data-i]'); close(); if (b) setTimeout(() => items[+b.dataset.i].run(), 120); });
  layer.querySelector('button').focus();
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ---------- Control segmentado con indicador que se desliza ---------- */
export function segmented(options, value, { glass = false, label = '' } = {}){
  return `<div class="seg${glass ? ' glass' : ''}" role="tablist" aria-label="${esc(label)}" style="--n:${options.length}">
    <span class="seg-ind" style="width:calc((100% - ${glass ? 8 : 4}px) / ${options.length});transform:translateX(${options.findIndex(o => o[0] === value) * 100}%)"></span>
    ${options.map(([v, t]) => `<button type="button" role="tab" data-seg="${esc(v)}" aria-pressed="${v === value}" aria-selected="${v === value}">${esc(t)}</button>`).join('')}</div>`;
}
export function moveSeg(seg, value){
  const btns = $$('[data-seg]', seg); const i = btns.findIndex(b => b.dataset.seg === value);
  btns.forEach(b => { const on = b.dataset.seg === value; b.setAttribute('aria-pressed', on); b.setAttribute('aria-selected', on); });
  $('.seg-ind', seg).style.transform = `translateX(${i * 100}%)`;
}

/* Interruptor: nativo de iOS (input switch) con aspecto idéntico en el resto */
export const switchHTML = (name, on, label) => `<input type="checkbox" switch class="switch" data-switch="${esc(name)}" ${on ? 'checked' : ''} aria-label="${esc(label)}">`;
export const spinner = () => `<span class="spinner" role="progressbar" aria-label="Cargando">${'<i></i>'.repeat(8)}</span>`;
