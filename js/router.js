/* =====================================================================
   Navegación de iOS
   - Cinco pestañas, cada una con su propia pila y su scroll.
   - Push desde la derecha y volver deslizando desde el borde (con muelle).
   - Título grande que se recoge en la barra de cristal al hacer scroll.
   - Rutas con URL propia (History API; con hash si se abre como archivo).
   ===================================================================== */
import { icon, h, esc, $, $$, markLoaded } from './util.js';
import { Spring, clamp, springsRunning } from './spring.js';
import { prefs } from './settings.js';
import { closeAllSheets } from './ui.js';

export const TABS = [
  { id:'hoy', label:'Hoy', icon:'hoy' },
  { id:'agenda', label:'Agenda', icon:'agenda' },
  { id:'hermandades', label:'Hermandades', icon:'hermandades' },
  { id:'fototeca', label:'Fototeca', icon:'fototeca' },
  { id:'noticias', label:'Noticias', icon:'newspaper' },
  { id:'ajustes', label:'Ajustes', icon:'ajustes', hidden:true }   // se abre desde el botón de perfil, como en el App Store
];
const VISIBLE = TABS.filter(t => !t.hidden);
const HASH = location.protocol === 'file:' || window.SSCR_HASH_ROUTER;
const routes = [];
const state = { tab:'hoy', tabs:{}, busy:false };
let stage, tabbar;

export function register(pattern, tab, factory){ routes.push({ re: new RegExp('^' + pattern + '$'), tab, factory }); }
// Los enlaces compartidos llevan la ruta tras «#/» (funcionan aunque el servidor solo tenga index.html)
export const currentPath = () => HASH || /^#\//.test(location.hash) ? (location.hash.replace(/^#/, '') || '/hoy') : (location.pathname.replace(/\/index\.html$/, '/') || '/');
const toURL = p => HASH ? '#' + p : p;
function match(path){
  if (path === '/' || path === '') path = '/hoy';
  for (const r of routes) { const m = path.match(r.re); if (m) return { ...r, params: m.slice(1).map(decodeURIComponent), path }; }
  return null;
}
export const activeTab = () => state.tab;
export const topScreen = (tab = state.tab) => { const s = state.tabs[tab].stack; return s[s.length - 1]; };

/* ---------- Construcción de una pantalla ---------- */
/* opts: title, large (título grande), overline, grouped, right (HTML), content (HTML o nodo), noNav, clearNav */
export function screen(opts){
  const el = h(`<section class="screen${opts.grouped ? ' grouped' : ''}${opts.noNav ? ' no-nav' : ''}" aria-label="${esc(opts.title || '')}">
    <div class="scroller">${opts.large !== false && opts.title ? `<header class="large-head">${opts.overline ? `<p class="overline">${esc(opts.overline)}</p>` : ''}<div class="large-head-row"><h1 class="large-title">${esc(opts.title)}</h1>${opts.titleAside || ''}</div></header>` : ''}</div>
    ${opts.noNav ? '' : `<nav class="navbar${opts.large === false ? ' show-title' : ''}${opts.clearNav ? ' clear' : ''}"><div class="nav-left"></div><div class="nav-title" aria-hidden="${opts.large !== false}">${esc(opts.navTitle || opts.title || '')}</div><div class="nav-right">${opts.right || ''}</div></nav>`}
  </section>`);
  const sc = $('.scroller', el);
  if (typeof opts.content === 'string') sc.insertAdjacentHTML('beforeend', opts.content);
  else if (opts.content) sc.appendChild(opts.content);
  return { el, title: opts.title || opts.navTitle || '', scroller: sc, navbar: $('.navbar', el), onShow: opts.onShow, onDestroy: opts.onDestroy, setup: opts.setup };
}

function wireScreen(s, backTitle){
  const nav = s.navbar;
  if (nav && backTitle !== undefined) {
    $('.nav-left', nav).innerHTML = `<button type="button" class="back-btn" data-back aria-label="Volver a ${esc(backTitle)}">${icon('chevL', 24)}<span>${esc(backTitle)}</span></button>`;
  }
  let lastY = 0;
  s.scroller.addEventListener('scroll', () => {
    const y = s.scroller.scrollTop;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 2);
      const lt = $('.large-title', s.scroller);
      if (lt && !nav.classList.contains('show-title')) {
        const over = y > 44; nav.querySelector('.nav-title').style.opacity = ''; nav.classList.toggle('title-on', over);
        nav.querySelector('.nav-title').classList.toggle('on', over);
        nav.querySelector('.nav-title').style.opacity = over ? 1 : 0; nav.querySelector('.nav-title').style.transform = over ? 'none' : '';
      }
      // Pull-down: el título grande crece un poco, como en iOS
      if (lt) lt.style.transform = y < 0 ? `scale(${1 + Math.min(0.08, -y / 800)})` : '';
    }
    // Barra de pestañas: se encoge al bajar, vuelve al subir
    if (y > lastY + 6 && y > 120) tabbar.classList.add('is-compact');
    else if (y < lastY - 6 || y < 60) tabbar.classList.remove('is-compact');
    lastY = y;
  }, { passive:true });
  s.setup && s.setup(s);
  markLoaded(s.el);
}

/* ---------- Pilas ---------- */
function build(m, backTitle){
  const s = m.factory(...m.params);
  if (!s) return null;
  s.path = m.path; wireScreen(s, backTitle);
  return s;
}
function mount(tab, s){ state.tabs[tab].view.appendChild(s.el); }
function destroy(s){ s.onDestroy && s.onDestroy(); s.el.remove(); }

export function navigate(path, { replace = false, from = null, instant = false } = {}){
  const m = match(path); if (!m) return;
  if (m.tab !== state.tab) { switchTab(m.tab, { path:m.path }); return; }
  const stack = state.tabs[m.tab].stack;
  const idx = stack.findIndex(x => x.path === m.path);
  if (idx > -1 && idx < stack.length - 1) { popTo(idx); history.pushState({ tab:m.tab }, '', toURL(m.path)); return; }
  if (idx === stack.length - 1) return;
  if (replace && stack.length > 1) {
    const old = stack.pop(); const s = build(m, stack[stack.length - 1].title); if (!s) return;
    stack.push(s); mount(m.tab, s); destroy(old); history.replaceState({ tab:m.tab }, '', toURL(m.path)); s.onShow && s.onShow(s); return;
  }
  push(m, { from, instant });
  history.pushState({ tab:m.tab }, '', toURL(m.path));
}

const W = () => state.tabs[state.tab].view.clientWidth;
function setPair(top, under, p){
  top.el.style.transform = `translate3d(${(1 - p) * W()}px,0,0)`;
  top.el.style.boxShadow = p < 1 ? '-8px 0 24px rgba(0,0,0,.18)' : '';
  if (under) { under.el.style.transform = `translate3d(${-0.3 * W() * p}px,0,0)`; under.dim.style.opacity = String(0.14 * p); }
}
function ensureDim(s){ if (!s.dim) { s.dim = h('<div class="screen-dim"></div>'); s.el.appendChild(s.dim); } }

function push(m, { from = null, instant = false } = {}){
  const tab = m.tab, stack = state.tabs[tab].stack, under = stack[stack.length - 1];
  const s = build(m, under ? under.title : undefined); if (!s) return;
  stack.push(s); mount(tab, s);
  if (under) { ensureDim(under); under.el.classList.add('is-under'); }
  if (instant || prefs.motionOff || !under) { setPair(s, under, 1); if (under) { under.el.style.visibility = 'hidden'; under.dim.style.opacity = 0; under.el.style.transform = ''; } s.onShow && s.onShow(s); return; }
  if (from) { // Zoom: la pantalla nueva crece desde el elemento tocado (Calendario, Fotos)
    const v = state.tabs[tab].view.getBoundingClientRect(), W0 = v.width, H0 = v.height;
    const sx = from.width / W0, sy = from.height / H0, ox = from.left - v.left, oy = from.top - v.top;
    s.el.style.transformOrigin = '0 0';
    const sp = new Spring({ value:0, response:0.44, damping:0.88, onUpdate: p => {
      s.el.style.transform = `translate3d(${ox * (1 - p)}px,${oy * (1 - p)}px,0) scale(${sx + (1 - sx) * p},${sy + (1 - sy) * p})`;
      s.el.style.opacity = String(Math.min(1, p * 1.6)); s.el.style.borderRadius = `${16 * (1 - p)}px`; under.el.style.opacity = String(1 - p);
    }, onRest: () => { s.el.style.transform = ''; s.el.style.borderRadius = ''; under.el.style.visibility = 'hidden'; under.el.style.opacity = ''; } });
    sp.to(1); s.onShow && s.onShow(s); return;
  }
  const sp = new Spring({ value:0, response:0.42, damping:0.9, onUpdate: p => setPair(s, under, p), onRest: () => { under.el.style.visibility = 'hidden'; s.el.style.boxShadow = ''; } });
  setPair(s, under, 0); sp.to(1);
  s.onShow && s.onShow(s);
}
function pop(animated = true, velocity){
  const stack = state.tabs[state.tab].stack; if (stack.length < 2) return;
  const top = stack[stack.length - 1], under = stack[stack.length - 2];
  under.el.style.visibility = ''; under.el.classList.remove('is-under');
  stack.pop();
  if (!animated || prefs.motionOff) { destroy(top); setPair(under, null, 1); under.dim && (under.dim.style.opacity = 0); under.el.style.transform = ''; return; }
  const sp = new Spring({ value: top.p ?? 1, response:0.4, damping:0.92, onUpdate: p => setPair(top, under, p), onRest: () => { destroy(top); under.el.style.transform = ''; } });
  sp.to(0, velocity);
}
function popTo(idx){
  const stack = state.tabs[state.tab].stack;
  while (stack.length - 1 > idx + 1) destroy(stack.splice(stack.length - 2, 1)[0]);
  pop(true);
}
// Un solo «atrás» a la vez: dos toques seguidos no deben sacarte de la app
let backPending = 0;
export function back(){
  if (backPending > performance.now()) return;
  if (state.tabs[state.tab].stack.length > 1) { backPending = performance.now() + 700; history.back(); }
}

/* ---------- Pestañas ---------- */
export function switchTab(tab, { path } = {}){
  closeAllSheets();
  const t = state.tabs[tab];
  if (!t.stack.length) { const r = build(match('/' + tab)); t.stack.push(r); mount(tab, r); }
  if (path && match(path)) {
    const m = match(path), stack = t.stack;
    if (!stack.some(s => s.path === m.path)) {
      if (!stack.length) { const r = build(match('/' + tab)); stack.push(r); mount(tab, r); }
      if (m.path !== '/' + tab) {
        // Abre la ruta encima de la raíz de esa pestaña
        while (stack.length > 1) destroy(stack.pop());
        const s = build(m, stack[0].title); stack.push(s); mount(tab, s); ensureDim(stack[0]); stack[0].el.style.visibility = 'hidden'; setPair(s, stack[0], 1);
      }
    }
  }
  state.tab = tab;
  $$('.tabview', stage).forEach(v => v.classList.toggle('is-active', v.dataset.tab === tab));
  $$('.tab', tabbar).forEach(b => { const on = b.dataset.tab === tab; on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  moveIndicator(VISIBLE.findIndex(t => t.id === tab));
  const top = topScreen(tab);
  history.pushState({ tab }, '', toURL(top.path));
  document.title = (top.title ? top.title + ' · ' : '') + 'SS Ciudad Real';
  tabbar.classList.remove('is-compact');
  top.onShow && top.onShow(top);
}
function moveIndicator(i){
  const ind = $('.tab-ind', tabbar);
  ind.style.opacity = i < 0 ? '0' : '';
  if (i < 0) return;
  if (matchMedia('(min-width:1024px)').matches) ind.style.transform = `translateY(${i * 46}px)`;
  else ind.style.transform = `translateX(${i * 100}%)`;
}

/* ---------- Gesto: volver deslizando desde el borde izquierdo ---------- */
function edgeSwipe(){
  let g = null;
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.clientX - stage.getBoundingClientRect().left > 24) return;
    const stack = state.tabs[state.tab].stack; if (stack.length < 2) return;
    g = { x0:e.clientX, y0:e.clientY, t:performance.now(), x:e.clientX, v:0, active:false, id:e.pointerId };
  });
  stage.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.active) { if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { g = null; return; } if (dx < 8) return; g.active = true; try { stage.setPointerCapture(e.pointerId); } catch (_) {} const st = state.tabs[state.tab].stack; st[st.length - 2].el.style.visibility = ''; }
    const now = performance.now(); g.v = (e.clientX - g.x) / Math.max(1, now - g.t) * 1000; g.x = e.clientX; g.t = now;
    const st = state.tabs[state.tab].stack, top = st[st.length - 1], under = st[st.length - 2];
    top.p = clamp(1 - dx / W(), 0, 1); setPair(top, under, top.p);
  });
  const end = () => {
    if (!g) return; const d = g; g = null; if (!d.active) return;
    const st = state.tabs[state.tab].stack, top = st[st.length - 1], under = st[st.length - 2];
    const p = top.p ?? 1, proj = p - (d.v / W()) * 0.25;
    if (proj < 0.5) { skipPop = true; pop(true, -d.v / W()); history.back(); }
    else { const sp = new Spring({ value:p, response:0.38, damping:0.9, onUpdate: q => setPair(top, under, q), onRest: () => { under.el.style.visibility = 'hidden'; top.el.style.boxShadow = ''; } }); sp.to(1, -d.v / W()); top.p = 1; }
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
}
let skipPop = false;

/* ---------- Atrás del sistema y enlaces ---------- */
function onPop(){
  backPending = 0;
  if (skipPop) { skipPop = false; return; }
  const path = currentPath(), m = match(path); if (!m) return;
  if (document.querySelector('.sheet-layer')) { closeAllSheets(); }
  if (m.tab !== state.tab) { switchTab(m.tab, { path:m.path }); return; }
  const stack = state.tabs[m.tab].stack, idx = stack.findIndex(x => x.path === m.path);
  if (idx > -1 && idx < stack.length - 1) popTo(idx);
  else if (idx === -1) push(m);
}

/* ---------- Arranque ---------- */
export function startRouter(){
  stage = $('#stage'); tabbar = $('#tabbar');
  tabbar.innerHTML = `<span class="tab-ind" aria-hidden="true"></span>` + VISIBLE.map(t => `<button type="button" class="tab" data-tab="${t.id}" aria-label="${t.label}">${icon(t.icon, 26)}<span>${t.label}</span></button>`).join('');
  TABS.forEach(t => { const v = h(`<div class="tabview" data-tab="${t.id}"></div>`); stage.appendChild(v); state.tabs[t.id] = { view:v, stack:[] }; });
  tabbar.addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    const tab = b.dataset.tab;
    if (tab === state.tab) { // tocar la pestaña activa: a la raíz o arriba del todo
      const st = state.tabs[tab].stack;
      if (st.length > 1) { popTo(0); history.pushState({ tab }, '', toURL(st[0].path)); }
      else st[0].scroller.scrollTo({ top:0, behavior: prefs.motionOff ? 'auto' : 'smooth' });
      return;
    }
    if (!state.tabs[tab].stack.length) { const r = build(match('/' + tab)); state.tabs[tab].stack.push(r); mount(tab, r); }
    switchTab(tab);
  });
  stage.addEventListener('click', e => {
    if (e.target.closest('[data-back]')) { back(); return; }
    const a = e.target.closest('a[data-nav],[data-go]'); if (!a) return;
    e.preventDefault(); navigate(a.dataset.go || a.getAttribute('href'));
  });
  document.addEventListener('click', e => { // enlaces internos dentro de hojas
    const a = e.target.closest('.sheet-layer [data-go]'); if (!a) return;
    e.preventDefault(); closeAllSheets(); setTimeout(() => navigate(a.dataset.go), 260);
  });
  window.addEventListener('popstate', onPop);
  edgeSwipe();
  // Ruta inicial (enlace compartido o raíz)
  const m = match(currentPath()) || match('/hoy');
  const root = build(match('/' + m.tab)); state.tabs[m.tab].stack.push(root); mount(m.tab, root);
  if (m.path !== '/' + m.tab) { const s = build(m, root.title); if (s) { state.tabs[m.tab].stack.push(s); mount(m.tab, s); ensureDim(root); root.el.style.visibility = 'hidden'; setPair(s, root, 1); } }
  state.tab = m.tab;
  $$('.tabview', stage).forEach(v => v.classList.toggle('is-active', v.dataset.tab === m.tab));
  $$('.tab', tabbar).forEach(b => { if (b.dataset.tab === m.tab) b.setAttribute('aria-current', 'page'); });
  moveIndicator(VISIBLE.findIndex(t => t.id === m.tab));
  history.replaceState({ tab:m.tab }, '', toURL(topScreen().path));
  window.addEventListener('resize', () => moveIndicator(VISIBLE.findIndex(t => t.id === state.tab)));
  topScreen().onShow && topScreen().onShow(topScreen());
}
/* Útil para refrescar pantallas al cambiar ajustes */
/* Solo se rehacen las raíces (Hoy y Ajustes muestran tus preferencias) y nunca a mitad
   de una transición: si no, la pantalla nueva heredaría una posición intermedia y se quedaría
   medio fuera, que es lo que «rayaba» la web al salir de Mi hermandad. */
export function rebuildAll(tabs = ['hoy', 'ajustes']){
  if (springsRunning()) { setTimeout(() => rebuildAll(tabs), 120); return; }
  Object.entries(state.tabs).filter(([tab]) => tabs.includes(tab)).forEach(([tab, t]) => {
    const s = t.stack[0]; if (!s || !document.contains(s.el)) return;
    const m = match(s.path); if (!m) return;
    const n = build(m); if (!n) return;
    n.el.style.cssText = s.el.style.cssText; n.el.classList.toggle('is-under', s.el.classList.contains('is-under'));
    if (s.dim) { ensureDim(n); n.dim.style.opacity = s.dim.style.opacity; }
    const y = s.scroller.scrollTop; s.el.replaceWith(n.el); s.onDestroy && s.onDestroy(); n.scroller.scrollTop = y; t.stack[0] = n;
    if (t.stack.length > 1) t.stack[1].navbar && $('.back-btn span', t.stack[1].navbar) && ($('.back-btn span', t.stack[1].navbar).textContent = n.title);
  });
}
