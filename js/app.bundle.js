/* SS Ciudad Real · app empaquetada (generada desde js/*.js con _build/bundle2.py; no editar a mano) */
const __defs = {}, __cache = {};
function __def(k, f){ __defs[k] = f; }
function __req(k){ if (__cache[k]) return __cache[k]; const e = __cache[k] = {}; __defs[k](e); return e; }
__def("js/settings.js", function(__exports){
/* =====================================================================
   Ajustes: se guardan en localStorage y se aplican al instante
   ===================================================================== */
const KEY = 'sscr-prefs-v2';
const DEFAULTS = {
  theme: 'auto',            // auto | light | dark
  accent: 'dorado',         // dorado | morado | granate | negro
  textScale: 1,             // 0.85 – 1.3
  reduceTransparency: false,
  reduceMotion: false,
  hermandad: null,          // "jornada|indice"
  pinned: [],               // fotos fijadas (url)
  reminders: { procesion:false, traslado:false, culto:false, besamanos:false, concierto:false, mia:false },
  offlinePhotos: false,
  collections: ['fijadas','hermandades','jornadas'],
  onboarded: false
};
function load(){
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { return { ...DEFAULTS }; }
}
const prefs = load();
const listeners = new Set();
function onPrefs(fn){ listeners.add(fn); return () => listeners.delete(fn); }
function setPref(k, v){
  prefs[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
  applyPrefs(); listeners.forEach(fn => fn(k, v));
}

const mqDark = matchMedia('(prefers-color-scheme: dark)');
const mqMotion = matchMedia('(prefers-reduced-motion: reduce)');
const systemReducedMotion = () => mqMotion.matches;
function resolvedTheme(){ return prefs.theme === 'auto' ? (mqDark.matches ? 'dark' : 'light') : prefs.theme; }

function applyPrefs(){
  const r = document.documentElement;
  const theme = resolvedTheme();
  r.dataset.theme = theme;
  r.dataset.accent = prefs.accent;
  r.style.setProperty('--ts', prefs.textScale);
  if (prefs.reduceTransparency) r.dataset.transparency = 'reduce'; else delete r.dataset.transparency;
  r.classList.toggle('reduce-motion', prefs.reduceMotion || mqMotion.matches);
  // Barra de estado y fondo del sistema
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = theme === 'dark' ? '#0A0908' : '#FBFAF7';
}
mqDark.addEventListener('change', () => { if (prefs.theme === 'auto') { applyPrefs(); listeners.forEach(fn => fn('theme')); } });
mqMotion.addEventListener('change', applyPrefs);
/* Movimiento reducido efectivo (sistema o Ajustes) */
Object.defineProperty(prefs, 'motionOff', { get(){ return prefs.reduceMotion || mqMotion.matches; } });

Object.assign(__exports, { prefs, onPrefs, setPref, systemReducedMotion, resolvedTheme, applyPrefs });
});
__def("js/spring.js", function(__exports){
/* =====================================================================
   Motor de muelles
   - Spring: valor animado con física (interrumpible: conserva posición y
     velocidad si se le da un nuevo destino a mitad).
   - springCSS(): la misma física como curva linear() para transiciones CSS.
   ===================================================================== */
const { prefs } = __req("js/settings.js");

/* Muelle por respuesta (segundos) y amortiguación (0–1), como en SwiftUI */
function params(response = 0.42, damping = 0.86){
  const k = Math.pow(2 * Math.PI / response, 2);
  const c = 4 * Math.PI * damping / response;
  return { k, c };
}

/* Muelles en marcha. Si el navegador deja de pintar fotogramas (app en segundo plano,
   pestaña oculta, ahorro de energía), se terminan de golpe en vez de quedarse a medias:
   así ninguna pantalla se queda medio fuera ni ninguna capa bloquea los toques. */
const running = new Set();
const finishAll = () => running.forEach(s => s.finish());
const springsRunning = () => running.size > 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) finishAll(); });
addEventListener('pagehide', finishAll);
setInterval(() => { const now = performance.now(); running.forEach(s => { if (now - s.lastFrame > 400) s.finish(); }); }, 250);

class Spring {
  constructor({ value = 0, response = 0.42, damping = 0.86, onUpdate = () => {}, onRest = () => {} } = {}){
    this.x = value; this.v = 0; this.target = value;
    Object.assign(this, params(response, damping));
    this.onUpdate = onUpdate; this.onRest = onRest; this.raf = 0;
  }
  set(value){ this.stop(); this.x = this.target = value; this.v = 0; this.onUpdate(value); }
  stop(){ cancelAnimationFrame(this.raf); this.raf = 0; running.delete(this); }
  /* Salta al destino y avisa de que ha terminado */
  finish(){ if (!this.raf) return; this.stop(); this.x = this.target; this.v = 0; try { this.onUpdate(this.x); } finally { this.onRest(this.x); } }
  to(target, velocity){
    this.target = target;
    if (velocity !== undefined) this.v = velocity;
    if (prefs.motionOff || document.hidden) { this.set(target); this.onRest(target); return; }
    if (this.raf) return;
    let last = performance.now();
    this.lastFrame = last; running.add(this);
    const step = now => {
      this.lastFrame = performance.now();
      let dt = Math.min(0.064, (now - last) / 1000); last = now;
      // Integración semiimplícita en pasos pequeños: estable y fluida a 60/120 Hz
      while (dt > 0) {
        const h = Math.min(dt, 1 / 240);
        const a = -this.k * (this.x - this.target) - this.c * this.v;
        this.v += a * h; this.x += this.v * h; dt -= h;
      }
      this.onUpdate(this.x);
      if (Math.abs(this.v) < 0.01 && Math.abs(this.x - this.target) < 0.001) { this.x = this.target; this.v = 0; this.onUpdate(this.x); this.raf = 0; running.delete(this); this.onRest(this.x); return; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
}

/* Curva linear() para CSS a partir del mismo muelle */
function springCSS(response = 0.42, damping = 0.86){
  const { k, c } = params(response, damping);
  let x = 0, v = 0; const dt = 1 / 600, pts = [];
  let t = 0, settle = 0;
  while (t < 2.5) {
    const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt;
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) { if (!settle) settle = t; if (t > settle + 0.02) break; }
  }
  const total = t; const n = 40; x = 0; v = 0; t = 0;
  for (let i = 0; i <= n; i++) {
    const target = total * i / n;
    while (t < target) { const a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt; }
    pts.push(+x.toFixed(4));
  }
  pts[pts.length - 1] = 1;
  return { easing: `linear(${pts.join(', ')})`, duration: Math.round(total * 1000) };
}

/* Instala las curvas en :root */
function installSpringCurves(){
  const s = springCSS(0.42, 0.86);
  const r = document.documentElement.style;
  r.setProperty('--spring', s.easing);
  r.setProperty('--spring-d', s.duration + 'ms');
}

/* Interpolación útil para gestos */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/* Resistencia de goma al pasar de un límite, como iOS */
const rubber = (x, d = 300, c = 0.55) => (1 - (1 / (x * c / d + 1))) * d;

Object.assign(__exports, { params, springsRunning, Spring, springCSS, installSpringCurves, lerp, clamp, rubber });
});
__def("js/util.js", function(__exports){
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
const icon = (n, s = 22, cls = '') => `<svg class="i ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- DOM ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
function h(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const store = {
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
const cld = (url, w) => { const u = cld0(url, w); return (window.SSCR_INLINE && window.SSCR_INLINE[u]) || u; };
const srcset = (url, ws) => ws.map(w => `${cld(url, w)} ${w}w`).join(', ');
/* <img> con estado de carga (esqueleto) */
const img = (url, w, { cls = '', alt = '', sizes = '', ws = null, eager = false, pos = '', style = '' } = {}) =>
  `<img class="${cls}" src="${cld(url, w)}"${ws ? ` srcset="${srcset(url, ws)}" sizes="${sizes || '100vw'}"` : ''} alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${pos || style ? ` style="${pos ? `object-position:${pos};` : ''}${style}"` : ''}>`;
function markLoaded(root){ $$('img', root || document).forEach(i => { if (i.complete && i.naturalWidth) i.classList.add('is-loaded'); }); }

/* ---------- Fechas ---------- */
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const WEEKDAYS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const SMALL = new Set(['de','del','la','las','los','y','en','el']);
const titleCase = s => String(s).toLowerCase().split(' ').map((w, i) => i > 0 && SMALL.has(w) ? w : cap(w)).join(' ');
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtLong = iso => cap(parseISO(iso).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));
const fmtDay = iso => cap(parseISO(iso).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' }));
const fmtShort = iso => parseISO(iso).toLocaleDateString('es-ES', { day:'numeric', month:'long' });
const fmtNewsDate = s => /^\d{4}-\d{2}$/.test(s) ? cap(`${MONTHS[+s.slice(5, 7) - 1]} de ${s.slice(0, 4)}`) : /^\d{4}-\d{2}-\d{2}$/.test(s) ? fmtShort(s) + ' de ' + s.slice(0, 4) : '';
const isMissing = v => !v || /^\s*no especificad/i.test(v) || /en confirmación|por confirmar/i.test(v);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const TODAY = toISO(new Date());

/* ---------- Semana Santa ---------- */
function easter(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    hh=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-hh-k)%7,m=Math.floor((a+11*hh+22*l)/451),
    month=Math.floor((hh+l-7*m+114)/31),day=((hh+l-7*m+114)%31)+1;
  return new Date(y, month - 1, day);
}
function nextSS(){
  const now = new Date(); now.setHours(0, 0, 0, 0);
  let y = now.getFullYear(), pascua = easter(y);
  if (now > pascua) pascua = easter(++y);
  return { y, pascua };
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/* Construye las fechas de cada jornada de Semana Santa */
const JF = JORNADA_FECHAS;
const SS_DAYS = [];
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
const typeOf = id => TYPES.find(t => t.id === id) || TYPES[0];
const TYPE_ORDER = TYPES.map(t => t.id);
const evDates = e => e.dates || [e.date];
const evTypesOn = (e, iso) => [...new Set([e.type, ...((e.secondaryTypes && e.secondaryTypes[iso]) || [])])];
const timeOf = e => { const m = String(e.time || '').match(/(\d{1,2}):(\d{2})/); return m ? `${pad(m[1])}:${m[2]}` : null; };
const ALL_DATES = [...new Set(EVENTOS.flatMap(evDates))].sort();
const evById = id => EVENTOS.find(e => e.id === id);
function eventsOn(iso, active){
  return EVENTOS
    .filter(e => evDates(e).includes(iso) && (!active || evTypesOn(e, iso).some(t => active.has(t))))
    .sort((a, b) => (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || (timeOf(a) || '99').localeCompare(timeOf(b) || '99'));
}
function nextEvent(fromISO = TODAY){
  const list = [];
  EVENTOS.forEach(e => { const d = evDates(e).find(x => x >= fromISO); if (d) list.push({ e, d }); });
  return list.sort((a, b) => a.d.localeCompare(b.d) || (timeOf(a.e) || '99').localeCompare(timeOf(b.e) || '99'));
}

/* ---------- Hermandades ---------- */
const HERMS = [];   // lista plana: { id, j, i, h, name }
HERMANDADES_DATA.forEach(j => j.items.forEach((hh, i) => {
  const name = hh.nombreCorto || hh.nombre;
  HERMS.push({ id:`${slug(j.jornada)}/${slug(name)}`, j:j.jornada, i, h:hh, name });
}));
const hermById = id => HERMS.find(x => x.id === id);
const jornadaBySlug = s => HERMANDADES_DATA.find(j => slug(j.jornada) === s);
/* Hermandades únicas (sin repetir las que salen en dos jornadas ni el Vía Crucis) */
const HERM_UNIQUE = (() => { const seen = new Set(); return HERMS.filter(x => { const k = slug(x.name); if (x.h.isViaCrucis || seen.has(k)) return false; seen.add(k); return true; }); })();
function salida(hh){
  const line = String(hh.itinerarioHorarios || '').split('\n').find(l => /\d{1,2}:\d{2}/.test(l));
  const m = line && line.match(/(\d{1,2}:\d{2})/);
  return m ? m[1].padStart(5, '0') : null;
}
function entrada(hh){
  const lines = String(hh.itinerarioHorarios || '').split('\n').filter(l => /\d{1,2}:\d{2}/.test(l));
  const last = lines[lines.length - 1]; const m = last && /entrada/i.test(last) && last.match(/(\d{1,2}:\d{2})/);
  return m ? m[1].padStart(5, '0') : null;
}
function jornadasFor(e){ return (PROC_JORNADA[e.title] || []).map(n => HERMANDADES_DATA.find(j => j.jornada === n)).filter(Boolean); }
function hermsFor(e){ return jornadasFor(e).flatMap(j => j.items.map((hh, i) => HERMS.find(x => x.j === j.jornada && x.i === i))).filter(x => x && (!x.h.diaSalida || x.h.diaSalida === e.title)); }
/* Fecha de salida procesional de una hermandad (a partir de su jornada) */
function procDateFor(x){
  const ev = SS_DAYS.find(e => hermsFor(e).some(y => y.id === x.id));
  return ev ? { iso: ev.date, title: ev.title, id: ev.id } : null;
}
/* Todas las fotos de la fototeca, con su hermandad y jornada (sin fecha en los datos) */
const PHOTOS = (() => {
  const out = [], seen = new Set();
  HERMS.forEach(x => [x.h.image, ...(x.h.galeria || [])].filter(Boolean).forEach(u => { if (seen.has(u)) return; seen.add(u); out.push({ url:u, herm:x, credit:'Laura Arroyo · Objetivo Cofrade' }); }));
  return out;
})();

/* ---------- Textos ---------- */
function richText(t){
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
function timelineRows(text){
  const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
  const re = /^(.*?)[\s,:]*(?:a las\s*)?(\d{1,2}:\d{2})\s*h?\.?$/i;
  return lines.map(l => { const m = l.match(re); return m ? { t:m[2].padStart(5, '0'), p:m[1].replace(/[\s:,.]+$/, '') } : { t:'', p:l }; });
}

/* ---------- Calendario (.ics) ---------- */
function icsFor(e, iso){
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
function downloadICS(e, iso){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([icsFor(e, iso)], { type:'text/calendar;charset=utf-8' }));
  a.download = slug(e.title).slice(0, 60) + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
/* «Cómo llegar»: búsqueda por el texto del lugar en Mapas de Apple (sin inventar coordenadas) */
const directionsURL = place => `https://maps.apple.com/?q=${encodeURIComponent(place + ', Ciudad Real')}`;

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
async function share(title, url, toast){
  url = publicURL(url || currentPathURL());
  const data = { title, text: title + ' · SS Ciudad Real', url };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try { await navigator.share(data); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }   // cancelado por el usuario; otro error → copiar
  }
  try { await copyText(url); toast && toast('Enlace copiado', 'check'); } catch (e) { toast && toast('No se ha podido copiar el enlace', 'info'); }
}
const currentPathURL = () => location.protocol === 'file:' ? (location.hash.replace(/^#/, '') || '/') : location.pathname;

Object.assign(__exports, { icon, $, $$, esc, h, store, cld, srcset, img, markLoaded, MONTHS, WEEKDAYS, pad, toISO, parseISO, cap, titleCase, slug, fmtLong, fmtDay, fmtShort, fmtNewsDate, isMissing, plural, TODAY, easter, nextSS, addDays, JF, SS_DAYS, typeOf, TYPE_ORDER, evDates, evTypesOn, timeOf, ALL_DATES, evById, eventsOn, nextEvent, HERMS, hermById, jornadaBySlug, HERM_UNIQUE, salida, entrada, jornadasFor, hermsFor, procDateFor, PHOTOS, richText, timelineRows, icsFor, downloadICS, directionsURL, share });
});
__def("js/ui.js", function(__exports){
/* =====================================================================
   Componentes de interfaz: avisos, alertas, hojas modales, menús
   contextuales, controles segmentados e interruptores
   ===================================================================== */
const { icon, h, esc, $, $$, markLoaded } = __req("js/util.js");
const { Spring, clamp, rubber } = __req("js/spring.js");
const { prefs } = __req("js/settings.js");

const isDesktop = () => matchMedia('(min-width: 768px)').matches;
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

/* ---------- Avisos (toast) en cápsula de cristal ---------- */
let toastEl, toastTimer;
function toast(text, ic = 'check'){
  if (!toastEl) { toastEl = h(`<div class="toast glass" role="status" aria-live="polite"></div>`); document.body.appendChild(toastEl); }
  toastEl.innerHTML = `${icon(ic, 20)}<span>${esc(text)}</span>`;
  requestAnimationFrame(() => toastEl.classList.add('is-on'));
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

/* ---------- Alertas al estilo iOS ---------- */
function alertBox({ title, text = '', buttons = [{ label:'Aceptar', bold:true }] }){
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
function openSheet({ content, label = 'Detalle', detent = 'large', plain = false, title = '', left = '', right = 'close', onClose, onMount } = {}){
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
const topSheet = () => sheets[sheets.length - 1];
const closeAllSheets = () => [...sheets].reverse().forEach(s => s.close());

/* ---------- Menú contextual al mantener pulsado ---------- */
function longPress(root, selector, getMenu){
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
function openContextMenu(el, items){
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
function segmented(options, value, { glass = false, label = '' } = {}){
  return `<div class="seg${glass ? ' glass' : ''}" role="tablist" aria-label="${esc(label)}" style="--n:${options.length}">
    <span class="seg-ind" style="width:calc((100% - ${glass ? 8 : 4}px) / ${options.length});transform:translateX(${options.findIndex(o => o[0] === value) * 100}%)"></span>
    ${options.map(([v, t]) => `<button type="button" role="tab" data-seg="${esc(v)}" aria-pressed="${v === value}" aria-selected="${v === value}">${esc(t)}</button>`).join('')}</div>`;
}
function moveSeg(seg, value){
  const btns = $$('[data-seg]', seg); const i = btns.findIndex(b => b.dataset.seg === value);
  btns.forEach(b => { const on = b.dataset.seg === value; b.setAttribute('aria-pressed', on); b.setAttribute('aria-selected', on); });
  $('.seg-ind', seg).style.transform = `translateX(${i * 100}%)`;
}

/* Interruptor: nativo de iOS (input switch) con aspecto idéntico en el resto */
const switchHTML = (name, on, label) => `<input type="checkbox" switch class="switch" data-switch="${esc(name)}" ${on ? 'checked' : ''} aria-label="${esc(label)}">`;
const spinner = () => `<span class="spinner" role="progressbar" aria-label="Cargando">${'<i></i>'.repeat(8)}</span>`;

Object.assign(__exports, { toast, alertBox, openSheet, topSheet, closeAllSheets, longPress, openContextMenu, segmented, moveSeg, switchHTML, spinner });
});
__def("js/router.js", function(__exports){
/* =====================================================================
   Navegación de iOS
   - Cinco pestañas, cada una con su propia pila y su scroll.
   - Push desde la derecha y volver deslizando desde el borde (con muelle).
   - Título grande que se recoge en la barra de cristal al hacer scroll.
   - Rutas con URL propia (History API; con hash si se abre como archivo).
   ===================================================================== */
const { icon, h, esc, $, $$, markLoaded } = __req("js/util.js");
const { Spring, clamp, springsRunning } = __req("js/spring.js");
const { prefs } = __req("js/settings.js");
const { closeAllSheets } = __req("js/ui.js");

const TABS = [
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

function register(pattern, tab, factory){ routes.push({ re: new RegExp('^' + pattern + '$'), tab, factory }); }
// Los enlaces compartidos llevan la ruta tras «#/» (funcionan aunque el servidor solo tenga index.html)
const currentPath = () => HASH || /^#\//.test(location.hash) ? (location.hash.replace(/^#/, '') || '/hoy') : (location.pathname.replace(/\/index\.html$/, '/') || '/');
const toURL = p => HASH ? '#' + p : p;
function match(path){
  if (path === '/' || path === '') path = '/hoy';
  for (const r of routes) { const m = path.match(r.re); if (m) return { ...r, params: m.slice(1).map(decodeURIComponent), path }; }
  return null;
}
const activeTab = () => state.tab;
const topScreen = (tab = state.tab) => { const s = state.tabs[tab].stack; return s[s.length - 1]; };

/* ---------- Construcción de una pantalla ---------- */
/* opts: title, large (título grande), overline, grouped, right (HTML), content (HTML o nodo), noNav, clearNav */
function screen(opts){
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

function navigate(path, { replace = false, from = null, instant = false } = {}){
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
function back(){
  if (backPending > performance.now()) return;
  if (state.tabs[state.tab].stack.length > 1) { backPending = performance.now() + 700; history.back(); }
}

/* ---------- Pestañas ---------- */
function switchTab(tab, { path } = {}){
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
function startRouter(){
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
function rebuildAll(tabs = ['hoy', 'ajustes']){
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

Object.assign(__exports, { TABS, register, currentPath, activeTab, topScreen, screen, navigate, back, switchTab, startRouter, rebuildAll });
});
__def("js/pwa.js", function(__exports){
/* =====================================================================
   App instalable: service worker, aviso de versión nueva, sin conexión
   ===================================================================== */
const { icon, h } = __req("js/util.js");
const { toast } = __req("js/ui.js");

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });
async function install(){
  const p = window.__installPrompt; if (!p) return false;
  p.prompt(); try { await p.userChoice; } catch (e) {} window.__installPrompt = null; return true;
}

/* Aviso de actualización: tarjeta arriba con el logo y una barra que avanza; al volver, confirmación */
function showUpdating(){
  if (document.querySelector('.upd-card')) return;
  const c = h(`<div class="upd-card glass" role="status" aria-live="polite"><img src="icons/icon-192.png" alt="" width="40" height="40"><span class="upd-txt"><b>Nueva versión de SS Ciudad Real</b><small>Instalando las novedades…</small></span><i class="upd-bar"><i></i></i></div>`);
  document.body.appendChild(c); requestAnimationFrame(() => c.classList.add('is-on'));
}
function confirmUpdated(){
  let done = false; try { done = sessionStorage.getItem('sscr-updated') === '1'; sessionStorage.removeItem('sscr-updated'); } catch (e) {}
  if (!done) return;
  const say = v => setTimeout(() => toast(`Ya tienes la última versión${v ? ' · ' + v : ''}`, 'check'), 600);
  if (window.caches) caches.keys().then(ks => { const k = ks.find(x => /^sscr-v[\d.]+-core$/.test(x)); say(k ? k.slice(6, -5) : ''); }).catch(() => say('')); else say('');
}

function startPWA(){
  confirmUpdated();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/sw.js', { updateViaCache:'none' }).then(reg => {
      // Versión nueva: se instala sola y la app se recarga (sin preguntar)
      const go = w => { if (!w || !navigator.serviceWorker.controller) return; showUpdating(); try { sessionStorage.setItem('sscr-updated', '1'); } catch (e) {} setTimeout(() => w.postMessage({ type:'skip-waiting' }), 900); };
      if (reg.waiting) go(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed') go(w); }); });
      // Al volver a la app (iOS la deja abierta en segundo plano), comprueba si hay versión nueva
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
  // Sin conexión: cápsula discreta encima de la barra de pestañas
  const pill = h(`<div class="offline-pill glass" role="status" hidden>${icon('wifiOff', 16)}<span>Sin conexión · Usando datos guardados</span></div>`);
  document.body.appendChild(pill);
  const sync = () => { pill.hidden = navigator.onLine; };
  window.addEventListener('online', () => { sync(); toast('Conexión recuperada', 'check'); });
  window.addEventListener('offline', sync); sync();
}

Object.assign(__exports, { install, startPWA });
});
__def("js/expand.js", function(__exports){
/* =====================================================================
   Tarjeta que se expande a pantalla completa (pestaña Hoy del App Store)
   La tarjeta crece desde su sitio; se cierra con × o deslizando hacia abajo
   y vuelve a su posición.
   ===================================================================== */
const { icon, h, $, markLoaded } = __req("js/util.js");
const { Spring, clamp } = __req("js/spring.js");
const { prefs } = __req("js/settings.js");

let open = null;
function expandCard(card, { hero, body, label = 'Detalle', wire }){
  if (open) return;
  const r0 = card.getBoundingClientRect();
  const layer = h(`<div class="xcard-layer" role="dialog" aria-modal="true" aria-label="${label}">
    <div class="xcard-scrim"></div>
    <article class="xcard"><div class="xcard-scroll">${hero}<div class="xcard-body">${body}</div></div>
      <button type="button" class="gbtn glass liquid xcard-close" aria-label="Cerrar">${icon('x', 18)}</button></article></div>`);
  document.body.appendChild(layer);
  document.documentElement.classList.add('xcard-open');
  const el = $('.xcard', layer), sc = $('.xcard-scroll', layer), scrim = $('.xcard-scrim', layer);
  wire && wire(el); markLoaded(el);
  // Copia de la tarjeta encima: se funde al abrir y reaparece al cerrar, así el paso es continuo
  const ghost = card.cloneNode(true);
  ghost.removeAttribute('data-card'); ghost.setAttribute('aria-hidden', 'true'); ghost.tabIndex = -1;
  ghost.classList.add('xcard-ghost', 'in');
  Object.assign(ghost.style, { left:`${r0.left}px`, top:`${r0.top}px`, width:`${r0.width}px`, height:`${r0.height}px` });
  layer.appendChild(ghost);
  card.style.visibility = 'hidden';
  const opener = document.activeElement;
  const W = innerWidth, H = innerHeight, s0 = r0.width / W, h0 = r0.height / s0;
  const lerp = (a, b, t) => a + (b - a) * t, ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  let drag = 1, off = 0;
  // p = 0: la tarjeta en su sitio; p = 1: pantalla completa. El contenido se escala (no se recorta de lado)
  const render = p => {
    const q = Math.max(0, p), sc1 = lerp(s0, 1, q) * drag;
    const tx = lerp(r0.left, 0, q) + (1 - drag) * W / 2, ty = lerp(r0.top, 0, q) + (1 - drag) * H / 2;
    const hv = Math.min(H, lerp(h0, H, Math.min(1, q)));
    el.style.transform = `translate(${tx}px,${ty}px) scale(${sc1})`;
    el.style.clipPath = `inset(0 0 ${Math.max(0, H - hv)}px 0 round ${Math.max(0, (22 / sc1) * (1 - Math.min(1, q)) + (1 - drag) * 160)}px)`;
    sc.style.transform = off ? `translateY(${-off * Math.min(1, q)}px)` : '';
    scrim.style.opacity = String(Math.min(1, q));
    ghost.style.opacity = String(1 - ease(q / 0.32));
  };
  const sp = new Spring({ value:0, response:0.5, damping:0.86, onUpdate: render });
  if (prefs.motionOff) { sp.set(1); } else { render(0); requestAnimationFrame(() => sp.to(1)); }
  setTimeout(() => $('.xcard-close', layer).focus({ preventScroll:true }), 60);

  function close(){
    if (!open) return; open = null;
    const fin = () => { layer.remove(); card.style.visibility = ''; document.documentElement.classList.remove('xcard-open'); if (opener && document.contains(opener)) opener.focus({ preventScroll:true }); };
    // Vuelve arriba sin salto: el desplazamiento se convierte en un movimiento que se anima con el cierre
    off = sc.scrollTop; sc.style.overflowY = 'hidden'; sc.scrollTop = 0; render(sp.x);
    if (prefs.motionOff) return fin();
    const from = sp.x; sp.stop();
    const sp2 = new Spring({ value:from, response:0.42, damping:1, onUpdate: render, onRest: fin });
    sp2.v = sp.v; sp2.to(0);
  }
  open = { close };
  layer.addEventListener('click', e => { if (e.target.closest('.xcard-close') || e.target === scrim) close(); });
  layer.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Deslizar hacia abajo (desde arriba del contenido) para cerrar: la tarjeta se encoge
  let g = null;
  el.addEventListener('pointerdown', e => { if (sc.scrollTop > 0 || e.pointerType === 'mouse' || e.target.closest('.hscroll,.map-frame')) return; g = { y0:e.clientY, t:performance.now(), active:false, id:e.pointerId }; });
  el.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return; const dy = e.clientY - g.y0;
    if (!g.active) { if (dy < 6) { if (dy < -6) g = null; return; } g.active = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} }
    drag = clamp(1 - dy / 900, 0.8, 1); render(1);
    if (drag <= 0.84) { g = null; close(); new Spring({ value:drag, response:0.4, damping:1, onUpdate: v => { drag = v; } }).to(1); }
  });
  const end = () => { if (!g) return; g = null; const from = drag; const s2 = new Spring({ value:from, response:0.35, damping:0.8, onUpdate: v => { drag = v; render(1); } }); s2.to(1); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  return open;
}
const closeExpanded = () => open && open.close();

Object.assign(__exports, { expandCard, closeExpanded });
});
__def("js/screens/visor.js", function(__exports){
/* =====================================================================
   Visor de fotos (como Fotos de Apple)
   - Crece desde la miniatura y vuelve a ella al cerrar.
   - Deslizar abajo: cerrar (sigue al dedo). Arriba: información.
   - Lados: pasar de foto. Pellizco o doble toque: ampliar y arrastrar.
   - Toque: muestra u oculta los controles de cristal. Tira de miniaturas.
   ===================================================================== */
const { icon, h, esc, $, $$, cld, titleCase } = __req("js/util.js");
const { Spring, clamp, rubber } = __req("js/spring.js");
const { prefs, setPref } = __req("js/settings.js");
const { toast } = __req("js/ui.js");
const { share } = __req("js/util.js");
const { navigate } = __req("js/router.js");

let V = null;
function openViewer(items, index = 0, sourceEl = null){
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
      <div><dt>Fecha</dt><dd class="c2">Sin fecha en los datos</dd></div>${it.credit === '' ? '' : `<div><dt>Autoría</dt><dd>${esc(it.credit || 'Laura Arroyo · Objetivo Cofrade')}</dd></div>`}</dl>
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

Object.assign(__exports, { openViewer });
});
__def("js/screens/evento.js", function(__exports){
/* Ficha de un acto, en hoja modal (se usa desde Agenda y Hoy) */
const { icon, esc, $, img, cld, typeOf, evTypesOn, evDates, timeOf, fmtLong, fmtShort, parseISO, MONTHS, hermsFor, salida, HERMS, slug, titleCase, downloadICS, directionsURL, share, evById, markLoaded } = __req("js/util.js");
const { openSheet, toast } = __req("js/ui.js");
const { openViewer } = __req("js/screens/visor.js");

/* «5, 6 y 7 de noviembre» (o «30 de octubre y 1 de noviembre» si cambia el mes) */
const datesTxt = ds => { const d = ds.map(parseISO), y = a => a.length > 1 ? `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}` : a[0];
  return d.every(x => x.getMonth() === d[0].getMonth()) ? `${y(d.map(x => x.getDate()))} de ${MONTHS[d[0].getMonth()]}` : y(ds.map(fmtShort)); };

const tdot = id => `<i class="tdot tm-${typeOf(id).shape}" style="--c:${typeOf(id).color}" aria-hidden="true"></i>`;

/* La hermandad del acto, si coincide con una de la app */
const hermOf = e => e.hermandad ? HERMS.find(x => slug(e.hermandad).includes(slug(x.name).replace(/^hermandad-(de-|del-)?/, '')) || slug(x.h.nombre) === slug(e.hermandad)) : null;

/* Contenido de la ficha y su cableado (sirve para hoja o tarjeta expandida) */
function eventView(id, iso, { hero = true } = {}){
  const e = evById(id); if (!e) return null;
  const day = iso && evDates(e).includes(iso) ? iso : e.date;
  const herms = e.type === 'procesion' && !e.keep ? hermsFor(e) : [];
  const pic = e.image || (herms[0] && herms[0].h.image);
  const types = evTypesOn(e, day);
  const firstOut = herms.map(x => salida(x.h)).filter(Boolean).sort()[0];
  const time = timeOf(e) ? `${timeOf(e)} h${e.end ? ' – ' + e.end + ' h' : ''}` : (firstOut ? `Primera salida a las ${firstOut} h` : (e.timeTxt || 'Todo el día'));
  const hx = hermOf(e);
  const url = `${location.origin}/agenda/${day}/${e.id}`;
  const gallery = e.gallery && e.gallery.length ? (e.link ? [...e.gallery] : [e.image, ...e.gallery]) : [];
  const d0 = parseISO(day), ds = evDates(e);
  const n = Math.round((d0 - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5);
  const when = n < 0 ? 'Celebrado' : n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`;
  const typeLine = `<p class="ev-type">${types.map(t => `${tdot(t)}<span>${typeOf(t).one}</span>`).join('<span class="sep">·</span>')}</p>`;
  // Hermandad de gloria (Carmen, Virgen de la Cabeza…): enlaza a su ficha
  const gl = e.gloria && typeof GLORIA !== 'undefined' ? GLORIA.find(g => g.id === e.gloria) : null;
  // Hermandades que celebran el acto (p. ej. Cristo Rey): de penitencia por nombre o de gloria por id
  const celeb = (e.celebran || []).map(c => { if (c.gloria) { const g = typeof GLORIA !== 'undefined' && GLORIA.find(x => x.id === c.gloria); return g && { go:`/hermandades/gloria/${g.id}`, name:g.nombre, sub:c.sub || g.titulares, pic:g.image }; }
    const x = HERMS.find(h => h.name.includes(c.herm) || h.h.nombre.includes(c.herm)); return x && { go:`/hermandades/${x.id}`, name:x.h.nombreCorto || x.name, sub:c.sub || x.h.titulares, pic:x.h.image }; }).filter(Boolean);
  const hermLine = gl ? `<button type="button" class="ev-herm" data-go="/hermandades/gloria/${gl.id}">${esc(gl.nombre)} ${icon('chevR', 14)}</button>` : e.sub && !e.hermandad ? `<p class="ev-herm-txt">${esc(e.sub)}</p>` : e.hermandad ? (hx ? `<button type="button" class="ev-herm" data-go="/hermandades/${hx.id}">${esc(e.hermandad)} ${icon('chevR', 14)}</button>` : `<p class="ev-herm-txt">${esc(e.hermandad)}</p>`) : '';
  const html = `
    ${pic && hero ? `<div class="ev-hero ph">${img(pic, 1200, { alt:'', pos: e.imagePos || '' })}<span class="ev-hero-shade"></span><span class="ev-hero-text">${typeLine}<span class="ev-hero-title selectable">${esc(e.title)}</span>${e.credit ? `<span class="ev-hero-credit">${esc(e.credit)}</span>` : ''}</span></div>` : ''}
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
    ${celeb.length ? `<section class="section"><h2 class="ev-h2">Celebran la festividad</h2><div class="group">${celeb.map(c => `<button type="button" class="cell tall" data-go="${c.go}"><span class="ph cell-thumb">${c.pic ? img(c.pic, 120, { cls:'cell-thumb', pos:'50% 30%' }) : ''}</span><span class="cell-body"><span class="cell-row-wrap"><span style="flex:1;min-width:0"><span class="cell-title">${esc(c.name)}</span>${c.sub ? `<span class="cell-sub" style="display:block">${esc(c.sub)}</span>` : ''}</span>${icon('chevR', 18, 'cell-chev')}</span></span></button>`).join('')}</div></section>` : ''}
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
function openEvent(id, iso){
  const v = eventView(id, iso); if (!v) { toast('No hemos encontrado ese acto', 'info'); return; }
  const sh = openSheet({ content: v.html, label: v.e.title, detent:'large', right:'close', onMount: c => v.wire(c.body) });
  sh.el.querySelector('.sheet').classList.add('ev-sheet');
  return sh;
}

Object.assign(__exports, { eventView, openEvent, tdot });
});
__def("js/mapa.js", function(__exports){
/* =====================================================================
   Mapas de recorridos (callejero propio en SVG) y galería curvada
   Código heredado de la versión anterior, adaptado a módulo.
   ===================================================================== */
const { esc, cld, icon: icon2 } = __req("js/util.js");
const GAL = {};
const icon = (n, s) => icon2(n === 'moon' ? 'moon' : n === 'sun' ? 'sun' : n, s);
/* =====================================================================
   GALERÍA CURVADA: una fila de fotos que gira por dentro de un cilindro.
   El centro mira de frente, los extremos se curvan hacia ti y se funden.
   Cada foto se corta en tiras verticales (caras planas del cilindro) y la
   foto entera gira con una sola animación, así las tiras nunca se separan.
   ===================================================================== */
const CB_CAMERA = 1.6, CB_MAXW = 55;
const cbArc = b => (CB_CAMERA - 1 + Math.cos(b)) / (2 * CB_CAMERA * Math.sin(b));
function bandItems(key){
  if (key === 'all') {
    const out = [];
    HERMANDADES_DATA.forEach(j => j.items.forEach((h, i) => {
      if (out.some(o => o.src === h.image)) return;
      out.push({ src:h.image, name:'data-herm-band', val:`${j.jornada}|${i}` });
    }));
    return out;
  }
  return (GAL[key] || []).map((src, k) => ({ src, name:'data-lightbox', val:`${key}|${k}` }));
}
function curvedBand(el, items, o){
  const opt = Object.assign({ speed:4, tileHeight:80, aspect:3/4, gap:6, curve:70, fade:14 }, o || {});
  if (!items.length) return;
  const bend = Math.min(85, Math.max(5, opt.curve)) * Math.PI / 180;
  el.style.setProperty('--fade', opt.fade + '%');
  let lastKey = '';
  const build = () => {
    if (!el.isConnected) { if (el.__cbLive) ro.disconnect(); return; }
    el.__cbLive = true;
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const key = Math.round(W) + 'x' + Math.round(H); if (key === lastKey) return; lastKey = key;
    const slices = W < 600 ? 10 : 16;
    const th = Math.min(opt.tileHeight / 100 * H, (CB_MAXW / 100 * W) / opt.aspect);
    const R = W * cbArc(bend);
    const deg = r => r * 180 / Math.PI;
    const unit = deg(th / R), pitch = (opt.aspect + opt.gap / 100) * unit;
    const limit = deg(bend) + opt.aspect * unit / 2;
    const cols = Math.min(60, Math.max(2, Math.ceil(2 * limit / pitch)));
    const sweep = cols * pitch / 2;
    const tw = th * opt.aspect, sw = tw / slices, sa = (opt.aspect * unit) / slices;
    const id = 'cb' + Math.random().toString(36).slice(2, 8);
    const dur = cols * opt.speed;
    const rot = a => `translateZ(${R.toFixed(2)}px) rotateY(${a.toFixed(4)}deg) translateZ(${(-R).toFixed(2)}px)`;
    let html = `<style>@keyframes ${id}{from{transform:${rot(-sweep)}}to{transform:${rot(sweep)}}}</style>
      <div class="cband-stage" style="perspective:${(CB_CAMERA * R).toFixed(1)}px;perspective-origin:50% 50%"><div class="cband-orbit" style="top:50%">`;
    for (let t = 0; t < cols; t++) {
      const it = items[t % items.length];
      html += `<div class="cband-tile" ${it.name}="${esc(it.val)}" data-idx="${t % items.length}" style="animation-name:${id};animation-duration:${dur}s;animation-delay:${(-t * opt.speed).toFixed(2)}s;margin-top:${(-th / 2).toFixed(1)}px">`;
      for (let k = 0; k < slices; k++) {
        const phi = -((k + 0.5) - slices / 2) * sa;
        const rad = k === 0 ? 'border-radius:14px 0 0 14px;' : k === slices - 1 ? 'border-radius:0 14px 14px 0;' : '';
        html += `<div class="cband-strip" style="width:${(sw + 1).toFixed(2)}px;height:${th.toFixed(1)}px;left:${(-sw / 2).toFixed(2)}px;${rad}transform:${rot(phi)}"><img src="${cld(it.src, 700)}" alt="" style="width:${tw.toFixed(1)}px;left:${(-k * sw).toFixed(2)}px" decoding="async"></div>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
    el.innerHTML = html;
    // Cuando una foto da la vuelta (ya fuera de la vista) toma la siguiente de la lista
    el.querySelectorAll('.cband-tile').forEach(tile => tile.addEventListener('animationiteration', () => {
      const n = (+tile.dataset.idx + cols) % items.length; tile.dataset.idx = n;
      const it = items[n], src = cld(it.src, 700);
      tile.setAttribute(it.name, it.val);
      tile.querySelectorAll('img').forEach(img => { img.src = src; });
    }));
  };
  const ro = new ResizeObserver(build); ro.observe(el);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => el.classList.toggle('is-paused', !e.isIntersecting))).observe(el);
  }
  build();
}
function initBands(root){
  (root || document).querySelectorAll('[data-band]').forEach(el => {
    const key = el.dataset.band;
    curvedBand(el, bandItems(key), key === 'all' ? { speed:3.6, tileHeight:60, curve:72 } : { speed:4.2, tileHeight:62, curve:64 });
  });
}



/* =====================================================================
   MAPAS DE RECORRIDOS POR JORNADA
   Fondo: callejero de OpenStreetMap con estilo CARTO (claro de día,
   oscuro de noche). Encima, el trazado de cada hermandad dibujado por
   sus calles, con la hora de salida y la de entrada.
   ===================================================================== */
const ROUTE_COLORS = ['#D4AF37','#E05A5A','#5B9BF0','#A877E8','#4FC48F','#F08A3C','#E86AB0','#3FC3CF'];
function decodePoly(str){
  let i = 0, lat = 0, lon = 0; const pts = [];
  while (i < str.length) {
    for (const k of [0,1]) {
      let shift = 0, res = 0, b;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 31) << shift; shift += 5; } while (b >= 32);
      const d = (res & 1) ? ~(res >> 1) : (res >> 1);
      if (k === 0) lat += d; else lon += d;
    }
    pts.push([lat / 1e5, lon / 1e5]);
  }
  return pts;
}
const TILE = 256;
const projX = (lon, z) => (lon + 180) / 360 * TILE * 2 ** z;
const projY = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z; };

/* Un mapa: lista de "vistas" (día / noche / madrugada); cada vista tiene sus recorridos */
function mapHTML(map){
  const id = 'map-' + map.id;
  const views = map.views;
  const tabs = views.length > 1 ? `<div class="map-seg" role="tablist" aria-label="Vista del mapa">${views.map((v,i) => `<button type="button" role="tab" data-mapview="${id}|${i}" aria-selected="${i===0}">${icon(v.mode === 'night' ? 'moon' : 'sun', 15)} ${esc(v.label)}</button>`).join('')}</div>` : '';
  return `<section class="map-card" id="${id}" data-map="${esc(map.id)}" aria-label="${esc(map.title)}">
    <div class="map-head"><h3 class="map-title">${esc(map.title)}</h3>${tabs}</div>
    <div class="map-frame" data-frame></div>
    <ul class="map-legend" data-legend></ul>
    <p class="map-attr">${map.attr ? esc(map.attr) : `Recorridos y horarios de la Semana Santa 2026, orientativos para 2027. Callejero © colaboradores de OpenStreetMap.`}</p>
  </section>`;
}
/* Callejero del centro de Ciudad Real (OpenStreetMap), dibujado como SVG propio */

let STREETS_W = null;   // calles ya proyectadas (se calcula una sola vez)
function streetsWorld(){
  if (!STREETS_W) {
    const pr = s => decodePoly(s).map(([la, lo]) => [projX(lo, 0), projY(la, 0)]);
    STREETS_W = { major: STREETS.major.split(' ').map(pr), minor: STREETS.minor.split(' ').map(pr) };
  }
  return STREETS_W;
}
function renderMapView(el, map, vi){
  const view = map.views[vi];
  el.dataset.mode = view.mode;
  const routes = view.routes.map((r, i) => ({ ...r, pts: decodePoly(ROUTES_GEO[r.geo] || ''), color: r.color || ROUTE_COLORS[i % ROUTE_COLORS.length] })).filter(r => r.pts.length > 1);
  const frame = el.querySelector('[data-frame]');
  if (!routes.length) { frame.innerHTML = '<div class="empty">Recorrido no disponible.</div>'; el.querySelector('[data-legend]').innerHTML = ''; return; }
  // Encaje: el conjunto de recorridos ocupa ~76 % del recuadro
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  routes.forEach(r => r.pts.forEach(([la, lo]) => { const x = projX(lo, 0), y = projY(la, 0); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }));
  const W = 1000, H = 1000;
  const sc = 760 / Math.max(maxX - minX, maxY - minY, 1e-7);
  const x0 = (minX + maxX) / 2 * sc - W / 2, y0 = (minY + maxY) / 2 * sc - H / 2;
  const mPerUnit = 121700 / sc;                      // metros por unidad del SVG a esta latitud
  const wMin = Math.max(2.2, 7 / mPerUnit), wMaj = Math.max(4, 13 / mPerUnit);
  const inView = l => l.some(([x, y]) => { const X = x * sc - x0, Y = y * sc - y0; return X > -60 && X < W + 60 && Y > -60 && Y < H + 60; });
  const pts = l => l.map(([x, y]) => (x * sc - x0).toFixed(1) + ',' + (y * sc - y0).toFixed(1)).join(' ');
  const sw = streetsWorld();
  const minor = sw.minor.filter(inView).map(l => `<polyline points="${pts(l)}"/>`).join('');
  const major = sw.major.filter(inView).map(l => `<polyline points="${pts(l)}"/>`).join('');
  const pt = (la, lo) => [projX(lo, 0) * sc - x0, projY(la, 0) * sc - y0];
  const n = routes.length;
  let lines = '', marks = '';
  routes.forEach((r, i) => {
    const off = (i - (n - 1) / 2) * 4.5;    // separa un poco los trazados que comparten calles
    const p = r.pts.map(([la, lo]) => pt(la, lo).map(v => (v + off).toFixed(1)).join(',')).join(' ');
    lines += `<polyline points="${p}" class="rt-halo"/><polyline points="${p}" class="rt-line" style="stroke:${r.color};--d:${(i * 0.25).toFixed(2)}s" pathLength="1"/>`;
    const [sx, sy] = pt(...r.pts[0]).map(v => v + off), [ex, ey] = pt(...r.pts[r.pts.length - 1]).map(v => v + off);
    if (Math.hypot(ex - sx, ey - sy) > 18) marks += `<g class="rt-mark rt-end"><rect x="${(ex - 11).toFixed(1)}" y="${(ey - 11).toFixed(1)}" width="22" height="22" rx="6" style="stroke:${r.color}"/></g>`;
    marks += `<g class="rt-mark"><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="17" style="fill:${r.color}"/><text x="${sx.toFixed(1)}" y="${(sy + 6).toFixed(1)}">${i + 1}</text></g>`;
  });
  const lm = [...LANDMARKS, ...(map.landmarks || [])].map(([name, la, lo]) => { const [x, y] = pt(la, lo); return (x > 30 && x < W - 30 && y > 30 && y < H - 30) ? `<g class="lm"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/><text x="${(x + 9).toFixed(1)}" y="${(y - 8).toFixed(1)}">${name}</text></g>` : ''; }).join('');
  frame.innerHTML = `<svg class="map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa de ${esc(view.label)}: ${esc(routes.map(r => r.name).join(', '))}">
    <rect class="mp-bg" width="${W}" height="${H}"/>
    <g class="mp-minor" style="stroke-width:${wMin.toFixed(1)}">${minor}</g>
    <g class="mp-major" style="stroke-width:${wMaj.toFixed(1)}">${major}</g>
    ${lm}${lines}${marks}
    <g class="mp-north" transform="translate(${W - 52},52)"><circle r="22"/><path d="M0-13 6 6 0 2-6 6z"/><text y="-28">N</text></g>
  </svg>`;
  el.querySelector('[data-legend]').innerHTML = routes.map((r, i) => `<li><span class="lg-dot" style="background:${r.color}">${i + 1}</span><span class="lg-name">${esc(r.name)}</span><span class="lg-time">${icon('clock', 13)} Salida ${esc(r.out)} · Entrada ${esc(r.in)}</span></li>`).join('');
  el.querySelectorAll('[data-mapview]').forEach(b => b.setAttribute('aria-selected', b.dataset.mapview.endsWith('|' + vi)));
}

Object.assign(__exports, { GAL, bandItems, curvedBand, initBands, mapHTML, renderMapView });
});
__def("js/screens/common.js", function(__exports){
/* Piezas comunes de las pantallas: celdas de lista agrupada y secciones */
const { icon, esc } = __req("js/util.js");

/* Celda de lista. o: { go, href, external, action, data, icon:[nombre,color], thumb, title, sub, value, check, chev, accent, danger, right, tall, label } */
function cell(o){
  const tag = o.href ? 'a' : 'button';
  const attrs = [
    o.href ? `href="${esc(o.href)}"` : 'type="button"',
    o.external ? 'target="_blank" rel="noopener noreferrer"' : '',
    o.go ? `data-go="${esc(o.go)}"` : '',
    o.action ? `data-action="${esc(o.action)}"` : '',
    o.data || '',
    o.label ? `aria-label="${esc(o.label)}"` : ''
  ].join(' ');
  const lead = o.icon ? `<span class="sicon ${o.icon[1]}">${icon(o.icon[0], 19)}</span>` : o.thumb ? o.thumb : '';
  const trail = (o.value != null ? `<span class="cell-value">${o.value}</span>` : '') + (o.right || '') +
    (o.check ? icon('check', 20, 'cell-check') : '') + (o.external ? icon('external', 17, 'cell-chev') : (o.chev !== false && (o.go || o.chev) ? icon('chevR', 18, 'cell-chev') : ''));
  const cls = ['cell', o.tall ? 'tall' : '', o.accent ? 'cell-accent' : '', o.danger ? 'cell-danger' : ''].join(' ');
  return `<${tag} class="${cls}" ${attrs}>${lead}<span class="cell-body"><span class="cell-row-wrap"><span style="flex:1;min-width:0"><span class="cell-title${o.bold ? ' semibold' : ''}">${o.title}</span>${o.sub ? `<span class="cell-sub" style="display:block">${o.sub}</span>` : ''}</span>${trail}</span></span></${tag}>`;
}
/* Celda con interruptor (no es un botón: la fila entera es la etiqueta) */
function switchCell({ icon: ic, title, name, on, sub }){
  return `<label class="cell">${ic ? `<span class="sicon ${ic[1]}">${icon(ic[0], 19)}</span>` : ''}<span class="cell-body"><span class="cell-row-wrap"><span style="flex:1;min-width:0"><span class="cell-title">${title}</span>${sub ? `<span class="cell-sub" style="display:block">${sub}</span>` : ''}</span><input type="checkbox" switch class="switch" data-switch="${esc(name)}" ${on ? 'checked' : ''}></span></span></label>`;
}
const section = (cells, { head = '', foot = '', big = false, extra = '' } = {}) =>
  `<section class="section">${head ? `<h2 class="section-head${big ? ' big' : ''}">${head}</h2>` : ''}${extra}<div class="group">${cells.join('')}</div>${foot ? `<p class="section-foot">${foot}</p>` : ''}</section>`;
const searchBar = (placeholder, id) =>
  `<div class="search" data-search="${id}"><label class="search-field">${icon('search', 17)}<input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="none" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"><button type="button" class="search-clear" hidden aria-label="Borrar">${icon('x', 14)}</button></label><button type="button" class="search-cancel">Cancelar</button></div>`;
/* Conecta un buscador: llama a onInput(texto) */
function wireSearch(root, onInput){
  const s = root.querySelector('.search'); if (!s) return;
  const inp = s.querySelector('input'), clr = s.querySelector('.search-clear');
  const fire = () => { clr.hidden = !inp.value; onInput(inp.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')); };
  inp.addEventListener('focus', () => s.classList.add('is-focus'));
  inp.addEventListener('blur', () => { if (!inp.value) s.classList.remove('is-focus'); });
  inp.addEventListener('input', fire);
  clr.addEventListener('click', () => { inp.value = ''; fire(); inp.focus(); });
  s.querySelector('.search-cancel').addEventListener('click', () => { inp.value = ''; fire(); inp.blur(); s.classList.remove('is-focus'); });
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Botón de perfil (abre Ajustes), como la foto de cuenta del App Store */
const profileBtn = () => `<button type="button" class="avatar" data-go="/ajustes" aria-label="Ajustes"><img src="icons/icon-192.png" alt="" width="36" height="36"></button>`;

Object.assign(__exports, { cell, switchCell, section, searchBar, wireSearch, norm, profileBtn });
});
__def("js/screens/ensayos.js", function(__exports){
/* =====================================================================
   Ensayos e igualás: el calendario de las cuadrillas (data/data.js · ENSAYOS)
   Portada con foto, próxima cita con cuenta atrás, la temporada en una línea,
   filtro por cuadrilla, agenda por meses y fichas de cada paso.
   ===================================================================== */
const { icon, esc, $, $$, img, MONTHS, WEEKDAYS, pad, parseISO, cap, TODAY, nextSS, addDays, toISO, plural, HERMS, store, downloadICS, directionsURL, share } = __req("js/util.js");
const { screen, register, navigate } = __req("js/router.js");
const { openSheet, toast } = __req("js/ui.js");
const { prefs } = __req("js/settings.js");
const { cell, section } = __req("js/screens/common.js");

const PHOTO = 'img/ensayos.webp';
const ICON = 'img/ico-ensayos.png';   // costaleros bajo el paso, a línea (dibujo del usuario)
/* Icono de los ensayos: el dibujo como máscara, toma el color del texto */
const ensIcon = (size = 22) => `<span class="ens-ico" aria-hidden="true" style="width:${size}px;height:${size}px;-webkit-mask-image:url(${ICON});mask-image:url(${ICON})"></span>`;   // costaleros bajo el paso (la que eligió el usuario) · foto: JM Cornejo
const TIPOS = {
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
const PASOS = (typeof ENSAYOS !== 'undefined' ? ENSAYOS : []).map(p => {
  const herm = HERMS.find(x => x.h.nombre.includes(p.herm) || x.name.includes(p.herm));
  return { ...p, herm, photo: p.foto || (herm && herm.h.image), hname: p.sub || (herm ? (herm.h.nombreCorto || herm.name) : '') };
});
const CITAS = PASOS.flatMap(p => p.citas.map((c, k) => ({ ...c, p, k, iso:c.f,
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
const nextCitas = (n = 3) => CITAS.filter(c => c.iso >= TODAY).slice(0, n);
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

Object.assign(__exports, { ensIcon, TIPOS, PASOS, CITAS, nextCitas });
});
__def("js/screens/hoy.js", function(__exports){
/* =====================================================================
   Hoy: portada tranquila, entre lo profesional y lo cofrade.
   Cuenta atrás, lo próximo, agenda breve, ensayos y noticias.
   ===================================================================== */
const { icon, esc, $, $$, img, cld, MONTHS, WEEKDAYS, pad, toISO, parseISO, cap, TODAY, nextSS, addDays, JF, titleCase, fmtShort, fmtLong, fmtNewsDate, plural, timeOf, evDates, nextEvent, eventsOn, hermById, hermsFor, salida, procDateFor, richText, share, HERMS, SS_DAYS, easter } = __req("js/util.js");
const { screen, register, navigate } = __req("js/router.js");
const { prefs } = __req("js/settings.js");
const { toast } = __req("js/ui.js");
const { HERM_UNIQUE } = __req("js/util.js");
const { expandCard } = __req("js/expand.js");
const { eventView } = __req("js/screens/evento.js");
const { openEvent } = __req("js/screens/evento.js");
const { bandItems, curvedBand } = __req("js/mapa.js");
const { section, cell, profileBtn } = __req("js/screens/common.js");
const { nextCitas } = __req("js/screens/ensayos.js");

const now = () => new Date();
/* Ilustraciones de las tarjetas sin foto */
const CANDLE = `<svg class="ill ill-candle" viewBox="0 0 120 220" aria-hidden="true">
  <defs><radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD98A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
  <linearGradient id="wax" x1="0" x2="1"><stop offset="0" stop-color="#E9DFC9"/><stop offset=".55" stop-color="#FBF6EA"/><stop offset="1" stop-color="#CFC2A6"/></linearGradient></defs>
  <circle cx="60" cy="40" r="44" fill="url(#glow)"/>
  <path class="flame" d="M60 14c8 12 12 20 12 28a12 12 0 0 1-24 0c0-8 4-16 12-28z" fill="#FFC95A"/><path d="M60 30c4 6 6 10 6 14a6 6 0 0 1-12 0c0-4 2-8 6-14z" fill="#FFF3CF"/>
  <path d="M60 56v8" stroke="#3a2a14" stroke-width="2"/>
  <path d="M42 64h36v118H42z" fill="url(#wax)"/><path d="M42 64c4 0 4 10 8 10s3-10 8-10 4 16 8 16 4-16 12-16" fill="#FBF6EA"/>
  <path d="M30 182h60l-6 10H36z" fill="#C9A227"/><path d="M24 192h72v8H24z" fill="#A9861A"/><path d="M48 200h24l6 14H42z" fill="#C9A227"/></svg>`;
const ENSAYOS_PHOTO = 'img/ensayos.webp';   // costaleros bajo el paso (la que eligió el usuario) · foto: JM Cornejo
const PASION_PHOTO = 'img/pasion-nazareno.jpg';   // Nazareno por la calle, foto elegida por el usuario
const dateOverline = () => { const d = now(); return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`.toUpperCase(); };

/* ---------- Tarjeta base ---------- */
const card = ({ id, overline, title, sub = '', photo = '', pos = '', tone = '', size = '', extra = '' }) => `
  <button type="button" class="tcard ${tone} ${size}" data-card="${id}" aria-label="${esc(title)}">
    ${photo ? `<span class="tcard-media ph">${img(photo, 900, { ws:[480, 800, 1200], sizes:'(min-width:700px) 600px, 92vw', pos })}</span>` : ''}
    <span class="tcard-text"><span class="tcard-over">${overline}</span><span class="tcard-title">${title}</span></span>
    ${extra}${sub ? `<span class="tcard-sub">${sub}</span>` : ''}
  </button>`;
/* Cabecera de la tarjeta expandida (la misma imagen, a pantalla completa) */
const xhero = ({ overline, title, photo = '', pos = '', tone = '', ill = '' }) => `
  <header class="xcard-hero ${tone}">${ill}${photo ? `<span class="xcard-media ph">${img(photo, 1400, { ws:[640, 1000, 1400], sizes:'100vw', pos, eager:true })}</span>` : ''}
    <span class="tcard-text"><span class="tcard-over">${overline}</span><span class="tcard-title">${title}</span></span></header>`;

/* ---------- Cuenta atrás al Domingo de Pasión (o «Hoy en la calle») ---------- */
function countdown(){
  const { y, pascua } = nextSS(), meta = addDays(pascua, -14); meta.setHours(0, 0, 0, 0);
  const n = now(), pasion = addDays(pascua, -14);
  if (n >= addDays(pasion, 0) && n <= addDays(pascua, 1)) return { live:true, y };
  const ms = Math.max(0, meta - n), d = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4), ss = Math.floor(ms % 6e4 / 1e3);
  return { live:false, y, d, hh, mm, ss, meta };
}
function countdownCard(){
  const c = countdown();
  if (c.live) {
    const today = SS_DAYS.filter(e => e.date === TODAY);
    return card({ id:'calle', tone:'dark h-count', overline:'HOY EN LA CALLE', title: today.length ? esc(today[0].title) : `Semana Santa ${c.y}`, photo:'img/dolores.webp', pos:'50% 25%',
      extra:`<span class="tcard-foot">${today.length ? plural(hermsFor(today[0]).length, 'hermandad', 'hermandades') + ' en la calle' : 'Consulta la agenda de cada jornada'}</span>` });
  }
  // Recorrido desde el último Domingo de Pasión hasta el próximo
  const prev = addDays(easter(c.y - 1), -14), pct = Math.round(Math.min(1, Math.max(0, (now() - prev) / (c.meta - prev))) * 100);
  const unit = (k, v, l) => `<span class="hc-u"><b class="tnum" data-cd="${k}">${v}</b><i>${l}</i></span>`;
  return card({ id:'cuenta', tone:'dark h-count', overline:'CUENTA ATRÁS', title:'Domingo de Pasión', photo: PASION_PHOTO, pos:'50% 34%',
    extra:`<span class="hc-foot" aria-label="Faltan ${c.d} días, ${c.hh} horas y ${c.mm} minutos">
        <span class="hc-date">${c.meta.getDate()} de ${MONTHS[c.meta.getMonth()]} de ${c.y}</span>
        <span class="hc-row">${unit('d', c.d, c.d === 1 ? 'día' : 'días')}${unit('h', pad(c.hh), 'horas')}${unit('m', pad(c.mm), 'minutos')}</span>
        <span class="hc-bar"><i style="width:${pct}%"></i></span>
      </span>` });
}
function countdownBody(){
  const rows = HERMANDADES_DATA.map(j => { const f = JF[j.jornada]; return f ? cell({ title:titleCase(j.jornada), value:esc(fmtShort(f.iso)), go:'/hermandades' }) : ''; });
  return `<p class="x-lead">La cuenta atrás hacia el Domingo de Pasión, que abre nuestra Semana Santa. Estas son las jornadas de la próxima Semana Santa:</p>${section(rows, { foot:'Fechas calculadas a partir de la Pascua. Horarios de 2026, orientativos para 2027.' })}`;
}

/* ---------- Urda ---------- */
const urdaBody = () => `
  <p class="x-lead selectable">El pasado 28 de octubre, el choque entre un AVE de Renfe y un tren de Iryo en la línea de alta velocidad Madrid-Andalucía, a la altura de Urda (Toledo), dejó decenas de fallecidos y numerosos heridos. Desde SS Ciudad Real nos unimos al dolor de las familias y rezamos por todos ellos.</p>
  <section class="prayer selectable" aria-labelledby="pr-t"><h2 id="pr-t" class="overline">Oración</h2>
    <p>Señor Jesucristo, que en la Cruz conociste el dolor y la muerte, acoge en tu misericordia a quienes han perdido la vida en el accidente de Urda.</p>
    <p>Dales el descanso eterno y haz brillar para ellos la luz que no se apaga. Sostén a los heridos, da fortaleza a sus familias y consuela a todos los que hoy lloran.</p>
    <p>Bendice las manos de los sanitarios, los equipos de emergencia y los voluntarios que socorren a los afectados.</p>
    <p>Madre de los Dolores, tú que estuviste al pie de la Cruz, acompaña a cada familia en esta hora de dolor.</p>
    <p class="amen">Amén.</p></section>
  ${section([cell({ icon:['call','green'], title:'Renfe', value:'<span class="tnum">900 10 10 20</span>', href:'tel:+34900101020', chev:false }), cell({ icon:['call','green'], title:'Iryo', value:'<span class="tnum">900 001 403</span>', href:'tel:+34900001403', chev:false })], { head:'Atención a familiares' })}
  ${DONAR.map(([prov, list], i) => section(list.map(([c, hh, dir, hor, tels]) => `<div class="cell text-cell"><p class="t-headline">${esc(c)}</p><p class="t-subhead c2">${esc(hh)}${dir ? ' · ' + esc(dir) : ''}</p><p class="t-footnote c2">${esc(hor)}</p><p class="tel-row">${tels.map(t => /^\d/.test(t) ? `<a class="btn btn-tinted btn-sm" href="tel:+34${t.replace(/\s/g, '')}">${icon('call', 16)}<span class="tnum">${t}</span></a>` : `<span class="t-footnote c2">${esc(t)}</span>`).join('')}</p></div>`), { head: i === 0 ? `Dónde donar sangre · ${prov}` : prov, foot: i === DONAR.length - 1 ? 'Requisitos: entre 18 y 65 años, más de 50 kg y buen estado de salud. Ante la situación, los horarios pueden ampliarse: llama antes de acudir.' : '' })).join('')}
  <div class="x-actions"><button type="button" class="btn btn-gray btn-wide" data-share="urda">${icon('share', 20)} Compartir</button></div>`;

/* ---------- Piezas de la portada ----------
   Una portada tranquila: una foto grande por sección como mucho, listas limpias
   y un adorno cofrade (filete dorado con cruz) para separar. */
const LO_PROXIMO_PHOTO = {};   // foto distinta para la portada (por id de acto); si no, la del acto
const NEWS_FIRST = 8;                                                                        // noticia destacada: el certamen
const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysTo = iso => Math.round((parseISO(iso) - day0()) / 864e5);
const inDays = iso => { const n = daysTo(iso); return n <= 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`; };
const mon3 = iso => MONTHS[parseISO(iso).getMonth()].slice(0, 3);
const evPhoto = e => LO_PROXIMO_PHOTO[e.id] || e.image || (hermsFor(e)[0] && hermsFor(e)[0].h.image);
const daysTxt = (e, d) => { const all = evDates(e), ds = all.filter(x => x >= d), m = MONTHS[parseISO(d).getMonth()];
  // Actos de varios días: el día de hoy dice si es el primero o el último
  if (d === TODAY && all.length > 1) return `${d === all[0] ? 'Primer día' : d === all[all.length - 1] ? 'Último día' : 'Hoy'} · ${all.map(x => parseISO(x).getDate()).join(', ').replace(/, (\d+)$/, ' y $1')} de ${m}`;
  return ds.length > 1 ? `${ds.map(x => parseISO(x).getDate()).join(', ').replace(/, (\d+)$/, ' y $1')} de ${m}` : `${cap(WEEKDAYS[parseISO(d).getDay()])}, ${parseISO(d).getDate()} de ${m}`; };
const shead = (over, title, link = '') => `<header class="h-sec-head"><div><p class="h-over">${over}</p><h2 class="h-title">${title}</h2></div>${link}</header>`;

/* Lo próximo: un acto, a lo grande */
function featuredEvent(e, d){
  return `<button type="button" class="h-feature" data-card="ev-${e.id}-${d}" aria-label="${esc(e.title)}">
    <span class="h-feature-media ph">${img(evPhoto(e), 1000, { ws:[640, 1000], sizes:'(min-width:1000px) 50vw, 92vw', pos: LO_PROXIMO_PHOTO[e.id] ? '50% 28%' : (e.imagePos || '50% 25%') })}</span>
    <span class="h-feature-text"><span class="h-feature-title">${esc(e.title)}</span>
      <span class="h-feature-meta">${esc(daysTxt(e, d))}${timeOf(e) ? ` · ${timeOf(e)} h` : ''}${e.location ? `<br>${esc(e.location)}` : ''}</span></span></button>`;
}
/* Próximos días: lista sobria */
const dayRows = list => `<div class="h-list">${list.map(({ e, d }) => `<button type="button" class="h-row" data-ev="${e.id}|${d}">
  <span class="h-date"><b class="tnum">${parseISO(d).getDate()}</b><i>${mon3(d)}</i></span>
  <span class="h-row-main"><span class="h-row-title">${esc(e.title)}</span><span class="h-row-sub">${esc([timeOf(e) ? timeOf(e) + ' h' : '', e.location].filter(Boolean).join(' · '))}</span></span>
  ${icon('chevR', 16, 'h-chev')}</button>`).join('')}</div>`;
/* Ensayos: tarjeta horizontal */
function ensayosRow(){
  const c = nextCitas(1)[0];
  return `<button type="button" class="h-ens" data-card="ensayos">
    <span class="h-ens-media ph">${img(ENSAYOS_PHOTO, 500, { pos:'50% 40%' })}</span>
    <span class="h-ens-text"><span class="h-over">Costaleros · Cuaresma</span><span class="h-ens-title">Ensayos e igualás</span>
      ${c ? `<span class="h-ens-next">Próxima: <b>${esc(c.title)}</b><br>${esc(c.p.paso)} · ${parseISO(c.iso).getDate()} de ${MONTHS[parseISO(c.iso).getMonth()]}</span>` : ''}</span>
    ${icon('chevR', 18, 'h-chev')}</button>`;
}
/* Noticias: tres titulares */
const newsRows = list => `<div class="h-list">${list.map(n => `<button type="button" class="h-news" data-news="${n.id}">
  <span class="h-news-pic ph">${img(n.coverImage, 300, { pos:n.coverPos || '' })}</span>
  <span class="h-row-main"><span class="h-row-date">${esc(fmtNewsDate(n.date))}</span><span class="h-news-title">${esc(n.title)}</span></span></button>`).join('')}</div>`;

/* ---------- Pantalla ---------- */
register('/hoy', 'hoy', () => {
  const bodies = {};
  bodies.urda = { overline:'EN MEMORIA', title:'Por las víctimas de Urda', tone:'mourning', body:urdaBody };
  bodies.cuenta = { overline:'CUENTA ATRÁS', title:`Domingo de Pasión ${countdown().y}`, photo:PASION_PHOTO, pos:'50% 38%', tone:'dark', body:countdownBody };
  const seen = new Set(), upcoming = nextEvent().filter(x => x.d >= TODAY && !x.e.quiet && !(x.e.doneAt && Date.now() >= Date.parse(x.e.doneAt) && evDates(x.e).every(d => d <= TODAY)) && !seen.has(x.e.id) && seen.add(x.e.id));
  // Lo próximo: el primer acto con foto. Si hoy hay varios, los dos más destacados (el acto
  // señalado y un besamanos van antes que un culto que ya lleva días).
  const rank = x => x.e.feature ? 0 : x.e.type === 'besamanos' ? 1 : 2;
  const today = upcoming.filter(x => x.d === TODAY && evPhoto(x.e)).sort((a, b) => rank(a) - rank(b)).slice(0, 2);
  const bigs = today.length ? today : upcoming.filter(x => evPhoto(x.e)).slice(0, 1), big = bigs[0];
  const rest = upcoming.filter(x => !bigs.includes(x)).slice(0, 4);
  bigs.forEach(b => { bodies[`ev-${b.e.id}-${b.d}`] = { overline: b.d === TODAY ? 'HOY' : 'LO PRÓXIMO', title:esc(b.e.title), photo:evPhoto(b.e), pos: LO_PROXIMO_PHOTO[b.e.id] ? '50% 28%' : (b.e.imagePos || ''), tone:'dark', event:{ id:b.e.id, d:b.d } }; });
  const news = [NOTICIAS.find(n => n.id === NEWS_FIRST), ...NOTICIAS.filter(n => n.id !== NEWS_FIRST)].filter(Boolean).slice(0, 3);
  const my = prefs.hermandad && hermById(prefs.hermandad), pd = my && procDateFor(my);
  const memorial = now() < new Date(2026, 10, 3) ? `<button type="button" class="h-memorial" data-card="urda">${icon('lazo', 22)}<span><b>En memoria de las víctimas de Urda</b><small>Oración, teléfonos de ayuda y dónde donar sangre</small></span>${icon('chevR', 16, 'h-chev')}</button>` : '';

  // Aviso de álbum nuevo en la Fototeca (se quita solo al pasar la fecha)
  const NEW_ALBUM = { id:'2026-11-05-soledad-triduo', hasta:new Date(2026, 10, 23), foto:'img/fototeca/2026-11-05-soledad-triduo/02.webp', title:'Triduo a la Soledad', sub:'12 fotografías de SS Ciudad Real' };
  const newAlbum = now() < NEW_ALBUM.hasta ? `<section class="h-sec h-a-album"><button type="button" class="h-ens" data-card="album"><span class="h-ens-media ph">${img(NEW_ALBUM.foto, 500, { pos:'50% 22%' })}</span><span class="h-ens-text"><span class="h-over">Nuevo en la Fototeca</span><span class="h-ens-title">${esc(NEW_ALBUM.title)}</span><span class="h-ens-next">${esc(NEW_ALBUM.sub)}</span></span>${icon('chevR', 18, 'h-chev')}</button></section>` : '';

  // Oración del día en las festividades (solo el día que toca; se repite cada año)
  const ORACIONES = {
    '12-08': ['Inmaculada Concepción', ['Bendita sea tu pureza y eternamente lo sea, pues todo un Dios se recrea en tan graciosa belleza.', 'A ti, celestial Princesa, Virgen sagrada María, yo te ofrezco en este día alma, vida y corazón. Mírame con compasión, no me dejes, Madre mía.']],
    '12-25': ['Natividad del Señor', ['Hoy nos ha nacido un Salvador: el Mesías, el Señor.', 'Niño Dios, que te hiciste uno de nosotros, llena el mundo de tu paz y nuestras familias de tu alegría.', 'Que esta Navidad te reconozcamos en el que sufre, en el que está solo y en el que más nos necesita.']],
    '01-06': ['Epifanía del Señor', ['Señor, que guiaste a los Magos de Oriente con la luz de una estrella, guíanos también a nosotros hasta ti.', 'Como ellos, queremos ofrecerte lo mejor que tenemos: nuestra fe, nuestro trabajo y nuestro amor.', 'Que nunca dejemos de buscarte y que, al encontrarte, sepamos volver a casa por otro camino, el tuyo.']]
  };
  const ora = ORACIONES[TODAY.slice(5)];
  const prayer = ora ? `<section class="h-sec h-a-prayer"><div class="prayer selectable"><p class="overline">Oración · ${ora[0]}</p>${ora[1].map(p => `<p>${p}</p>`).join('')}<p class="amen">Amén.</p></div></section>` : '';

  // Foto de portada según el día (la de siempre es la Soledad; los días señalados cambia sola).
  // Cada foto va en img/ como NOMBRE.jpg (1200 px) y NOMBRE-640.jpg; «listo:false» hasta tenerla.
  const PORTADAS = [
    { desde:'2026-11-22', hasta:'2026-11-22', f:'img/portada-cristo-rey', alt:'Nazareno con la cruz al hombro, corona de espinas y potencias, ante un cuadro', pos:'44% 38%', listo:true },
    { desde:'2026-11-27', hasta:'2026-11-27', f:'img/portada-milagrosa', alt:'Virgen de la Medalla Milagrosa en un retablo cerámico', pos:'50% 22%', listo:true },
    { desde:'2026-12-01', hasta:'2026-12-31', f:'img/portada-esperanza', alt:'Nuestra Señora de la Esperanza, con corona y ráfaga y tocado de encaje', pos:'50% 30%', listo:true }
  ];
  const por = PORTADAS.find(p => p.listo && TODAY >= p.desde && TODAY <= p.hasta) || { f:'img/portada', alt:'Dolorosa bajo palio, con corona y ráfaga, entre la candelería' };

  const content = `
    <header class="home-hero">
      <picture class="hh-photo"><img src="${por.f}.jpg" srcset="${por.f}-640.jpg 600w, ${por.f}.jpg 1200w" sizes="(min-width:1024px) 55vw, 100vw" alt="${por.alt}"${por.pos ? ` style="object-position:${por.pos}"` : ''} width="768" height="1024" fetchpriority="high" decoding="async"></picture>
      <div class="hh-text">
        <p class="hh-over">${dateOverline()}</p>
        <h1 class="hh-title">Semana Santa<span>de Ciudad Real</span></h1>
        <p class="hh-quote">La idea no es grabar, es sentir.</p>
      </div>
    </header>
    <div class="h-page">
      ${memorial}
      <div class="h-cols">
        <div class="h-col">
          <section class="h-sec h-a-count">${countdownCard()}</section>
          ${big ? `<section class="h-sec h-a-next${bigs.length > 1 ? ' two' : ''}">${shead('Lo próximo', big.d === TODAY ? 'Hoy' : esc(inDays(big.d)))}${bigs.map(b => featuredEvent(b.e, b.d)).join('')}</section>` : ''}
        </div>
        <div class="h-col">
          ${prayer}
          ${newAlbum}
          ${rest.length ? `<section class="h-sec h-a-days">${shead('Agenda', 'Próximos días', '<button type="button" class="h-link" data-go="/agenda">Ver agenda</button>')}${dayRows(rest)}</section>` : ''}
          <section class="h-sec h-a-ens">${ensayosRow()}</section>
          ${my ? `<section class="h-sec h-a-mine"><button type="button" class="h-ens" data-card="mia"><span class="h-ens-media ph">${img(my.h.image, 500, { pos:'50% 22%' })}</span><span class="h-ens-text"><span class="h-over">Mi hermandad</span><span class="h-ens-title">${esc(my.name)}</span>${pd ? `<span class="h-ens-next">${esc(pd.title)} · ${fmtShort(pd.iso)}</span>` : ''}</span>${icon('chevR', 18, 'h-chev')}</button></section>` : ''}
          ${news.length ? `<section class="h-sec h-a-news">${shead('Actualidad', 'Noticias', '<button type="button" class="h-link" data-go="/noticias">Ver todas</button>')}${newsRows(news)}</section>` : ''}
        </div>
      </div>
    </div>
    <section class="today-band" aria-labelledby="jj-t">
      <div class="tb-head"><div><p class="h-over">Hermandades</p><h2 class="h-title" id="jj-t">Jornada a jornada</h2></div><button type="button" class="h-link" data-go="/hermandades">Ver todas</button></div>
      <div class="cband cband-today" role="group" aria-label="Fotos de las hermandades. Toca una para abrir su ficha"></div>
    </section>
    <p class="home-foot">Fiesta de Interés Turístico Nacional<br>Fotografías de hermandades: Laura Arroyo · Objetivo Cofrade</p>`;

  const timers = [];
  return screen({ title:'Hoy', navTitle:'SS Ciudad Real', large:false, clearNav:true, right: profileBtn(), content, setup: s => {
    s.el.classList.add('has-stretch', 'home'); s.navbar.classList.remove('show-title');
    const hero = $('.home-hero', s.el), nav = s.navbar;
    s.scroller.addEventListener('scroll', () => {
      const yy = s.scroller.scrollTop;
      hero.querySelector('img').style.transform = yy < 0 ? `scale(${1 + -yy / 600})` : `translateY(${yy * 0.3}px)`;
      // El logo (Ajustes) va arriba a la derecha y se va con la página al bajar; sin barra ni fundido
      nav.style.transform = yy > 0 ? `translateY(${-yy}px)` : '';
    }, { passive:true });
    const band = $('.cband-today', s.el);
    curvedBand(band, bandItems('all'), { speed:3.6, tileHeight:72, curve:70, fade:10 });
    band.addEventListener('click', e => { const t = e.target.closest('[data-herm-band]'); if (!t) return; const [j, i] = t.dataset.hermBand.split('|'); const x = HERMS.find(z => z.j === j && z.i === +i); if (x) navigate(`/hermandades/${x.id}`); });

    // Sin fundido al bajar: las secciones están siempre visibles

    s.el.addEventListener('click', e => {
      const r = e.target.closest('[data-ev]'); if (r) { const [id, d] = r.dataset.ev.split('|'); openEvent(+id, d); return; }
      const nw = e.target.closest('[data-news]'); if (nw) { navigate(`/noticias/${nw.dataset.news}`); return; }
      const c = e.target.closest('[data-card]'); if (!c) return;
      const id = c.dataset.card;
      if (id === 'mia') { navigate(`/hermandades/${prefs.hermandad}`); return; }
      if (id === 'calle') { navigate('/hermandades'); return; }
      if (id === 'ensayos') { navigate('/ensayos'); return; }
      if (id === 'album') { navigate(`/fototeca/album/${NEW_ALBUM.id}`); return; }
      const b = bodies[id]; if (!b) return;
      const hero2 = xhero(b);
      if (b.event) { const v = eventView(b.event.id, b.event.d, { hero:false }); expandCard(c, { hero:hero2, body: v.html, label:b.title, wire: el => v.wire(el) }); return; }
      expandCard(c, { hero:hero2, body: b.body(), label:b.title, wire: el => el.addEventListener('click', ev => { if (ev.target.closest('[data-share=urda]')) share('Oración por las víctimas de Urda y dónde donar sangre', `${location.origin}/hoy`, toast); }) });
    });
    // Cuenta atrás al minuto (sin segundos: más calma)
    timers.push(setInterval(() => {
      const c = countdown(); if (c.live) return;
      const set = (k, v) => { const el = $(`[data-cd="${k}"]`, s.el); if (el && el.textContent != v) el.textContent = v; };
      set('d', c.d); set('h', pad(c.hh)); set('m', pad(c.mm));
    }, 15000));
  }, onDestroy: () => timers.forEach(clearInterval) });
});


});
__def("js/screens/agenda.js", function(__exports){
/* =====================================================================
   Agenda (como Calendario de Apple): Año → Mes (con la lista del día) → Día
   Pellizcar para alejar, deslizar para cambiar de mes.
   ===================================================================== */
const { icon, esc, $, $$, MONTHS, pad, toISO, parseISO, cap, TODAY, typeOf, TYPE_ORDER, eventsOn, ALL_DATES, evTypesOn, timeOf, fmtLong, fmtDay, plural, hermsFor, evDates, img, nextSS } = __req("js/util.js");
const { screen, register, navigate, topScreen } = __req("js/router.js");
const { prefs } = __req("js/settings.js");
const { openSheet, toast, longPress } = __req("js/ui.js");
const { switchCell, section, searchBar, wireSearch, norm, profileBtn } = __req("js/screens/common.js");
const { openEvent, tdot } = __req("js/screens/evento.js");
const { ensIcon } = __req("js/screens/ensayos.js");
const { downloadICS, share, evById } = __req("js/util.js");

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
  const cards = list.map(({ e, d }) => {
    const t = evTypesOn(e, d)[0] || e.type, pic = evPic(e), dt = parseISO(d), ds = evDates(e).filter(x => x.startsWith(month));
    const last = ds[ds.length - 1], past = last < TODAY || (last === TODAY && e.doneAt && Date.now() >= Date.parse(e.doneAt)), n = Math.round((parseISO(d) - parseISO(TODAY)) / 864e5);
    const when = past ? 'Celebrado' : (ds.includes(TODAY) ? 'Hoy' : n === 1 ? 'Mañana' : n > 1 ? `En ${n} días` : 'En curso');
    const herm = String(e.hermandad || '').replace(/,.*$/, '');
    // Festividades: tarjeta pequeña, con su icono (o una miniatura si lleva foto)
    // Actos ya celebrados y festividades: tarjeta pequeña (Cristo Rey y la Milagrosa, «big», van en grande)
    const mpic = e.thumb || (e.quiet ? e.image : pic);
    if ((e.quiet && !e.big) || past) return `<button type="button" class="ag-card ag-mini${past ? ' past' : ''}" data-ev="${e.id}" data-iso="${d}" data-days="${ds.join(' ')}" style="--c:${typeOf(t).color}">
      <span class="agm-media${mpic ? ' ph' : ''}">${mpic ? img(mpic, 200, { pos: e.thumb ? '50% 50%' : (e.imagePos || '50% 20%') }) : icon(e.icon || 'sparkle', 30)}</span>
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
  });
  // Primero los próximos; los ya celebrados, juntos al final y en pequeño
  const isPast = c => /class="ag-card ag-mini past/.test(c), past = cards.filter(isPast), next = cards.filter(c => !isPast(c));
  return `${next.length ? `<div class="ag-cards">${next.join('')}</div>` : ''}${past.length ? `<div class="ag-cards ag-cards-past">${past.join('')}</div>` : ''}`;
}
const WEEKDAYS_S = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function evRow(e, iso){
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

Object.assign(__exports, { evRow });
});
__def("js/screens/fototeca.js", function(__exports){
/* =====================================================================
   Fototeca propia de SS Ciudad Real (como Fotos de Apple)
   Un álbum por triduo o culto (data/fototeca.js). Todas las fotos llevan
   la marca de agua: fundido oscuro abajo y el logo blanco.
   Arriba: Cultos (por año) · Todas (pellizco 3/5/7 columnas).
   Debajo: Fijadas y Por hermandad.
   ===================================================================== */
const { icon, esc, $, $$, img, slug, cap, fmtLong, fmtShort, plural, HERMS, share, MONTHS } = __req("js/util.js");
const { screen, register, navigate } = __req("js/router.js");
const { prefs, setPref, onPrefs } = __req("js/settings.js");
const { toast, longPress, segmented, moveSeg } = __req("js/ui.js");
const { Spring } = __req("js/spring.js");
const { openViewer } = __req("js/screens/visor.js");
const { profileBtn, cell, section } = __req("js/screens/common.js");

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

function photoMenu(p){
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

Object.assign(__exports, { photoMenu });
});
__def("js/screens/hermandades.js", function(__exports){
/* =====================================================================
   Hermandades (estilo Contactos y Música)
   ===================================================================== */
const { icon, esc, $, $$, img, cld, slug, titleCase, isMissing, HERMS, hermById, JF, salida, entrada, procDateFor, fmtLong, fmtShort, timelineRows, share, parseISO, MONTHS, TODAY, nextSS, evDates, timeOf, directionsURL, downloadICS, store } = __req("js/util.js");
const { screen, register, navigate } = __req("js/router.js");
const { prefs, setPref } = __req("js/settings.js");
const { toast, longPress, openSheet, segmented, moveSeg } = __req("js/ui.js");
const { cell, section, searchBar, wireSearch, norm, profileBtn } = __req("js/screens/common.js");
const { openViewer } = __req("js/screens/visor.js");
const { curvedBand } = __req("js/mapa.js");
const { CITAS, PASOS: PASOS_ENS, ensIcon } = __req("js/screens/ensayos.js");
const { openEvent } = __req("js/screens/evento.js");

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
const gloriaById = id => GL.find(g => g.id === id);
const gPic = (g, w, pos) => g.image ? img(g.image, w, { pos: pos || g.imagePos || '50% 22%', alt:esc(g.titulares || g.nombre) }) : `<span class="g-nopic">${icon('church', 44)}</span>`;
const gcard = g => `<button type="button" class="h-card" data-go="/hermandades/gloria/${g.id}">
    <span class="h-media ph">${gPic(g, 800)}</span>
    <span class="h-body">
      <span class="h-name">${esc(g.nombre)}</span>
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

function hermMenu(x){
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
  const pics = [g.image && { u:g.image, c:g.imageCredit || '' }, ...(g.galeria || []).map(x => typeof x === 'string' ? { u:x, c:'' } : x)].filter(Boolean), photos = pics.map(x => x.u);
  const acts = gloriaActs(g);
  const name = g.nombre;
  const tiles = [g.fundacion && { k:'Fundación', v:g.fundacion, big:true }, g.coronacion && { k:'Coronación canónica', v:g.coronacion, wide:true }, g.hermanos && { k:'Hermanos', v:g.hermanos, wide:true }, g.autoria && { k:'Autoría de la imagen', v:g.autoria, wide:true }].filter(Boolean)
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
  return screen({ title: g.nombre, navTitle: g.corto || name, large:false, grouped:true, clearNav:true, content, setup: s => {
    s.el.classList.add('has-stretch', 'hf-screen');
    const head = $('.hf-hero', s.el), pic = $('.hf-media img', s.el), nav = s.navbar;
    s.scroller.addEventListener('scroll', () => {
      const y = s.scroller.scrollTop, hH = head.offsetHeight;
      if (pic) pic.style.transform = y < 0 ? `scale(${1 + -y / hH})` : `translateY(${y * 0.3}px)`;
      const solid = y > hH - 100; nav.classList.toggle('solid', solid); nav.classList.toggle('show-title', solid); nav.classList.toggle('over-photo', !solid);
    }, { passive:true });
    nav.classList.add('over-photo');
    const items = pics.map(x => ({ url:x.u, credit:x.c || '' }));
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

Object.assign(__exports, { gloriaById, hermMenu });
});
__def("js/screens/ajustes.js", function(__exports){
/* =====================================================================
   Ajustes (como los del iPhone)
   ===================================================================== */
const { icon, esc, $, $$, cld, img, HERM_UNIQUE, hermById, share } = __req("js/util.js");
const { screen, register, rebuildAll } = __req("js/router.js");
const { prefs, setPref, resolvedTheme } = __req("js/settings.js");
const { toast, alertBox } = __req("js/ui.js");
const { cell, switchCell, section, searchBar, wireSearch, norm } = __req("js/screens/common.js");
const { openViewer } = __req("js/screens/visor.js");
const { install } = __req("js/pwa.js");

const ACCENTS = [['dorado','Dorado','#D4AF37','#7D6210'],['morado','Morado nazareno','#A97BD3','#5E2A7E'],['granate','Granate','#E0707C','#7A1F2B'],['negro','Negro azabache','#FFFFFF','#1C1A17']];
const accentName = () => (ACCENTS.find(a => a[0] === prefs.accent) || ACCENTS[0])[1];
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/* Cambios que afectan a otras pantallas: se reconstruyen al volver */
function wireSwitches(el){
  el.addEventListener('change', e => {
    const s = e.target.closest('[data-switch]'); if (!s) return;
    const n = s.dataset.switch, v = s.checked;
    if (n.startsWith('rem:')) { setPref('reminders', { ...prefs.reminders, [n.slice(4)]: v }); return; }
    if (n === 'auto') { setPref('theme', v ? 'auto' : resolvedTheme()); refreshAppearance(el); return; }
    setPref(n, v);
    if (n === 'offlinePhotos' && v) { navigator.serviceWorker?.controller?.postMessage({ type:'cache-photos', urls: HERM_UNIQUE.flatMap(x => [cld(x.h.image, 480), ...(x.h.galeria || []).map(u => cld(u, 320))]) }); toast('Descargando fotos', 'download'); }
  });
}

/* ---------- Raíz ---------- */
register('/ajustes', 'ajustes', () => {
  const my = prefs.hermandad && hermById(prefs.hermandad);
  const content = `${searchBar('Buscar', 'ajustes')}
    <section class="section"><div class="group">
      <button type="button" class="cell account" data-go="/ajustes/acerca">
        <img class="account-logo" src="icons/icon-192.png" alt="" width="60" height="60">
        <span class="cell-body"><span class="cell-row-wrap"><span style="flex:1"><span class="t-title3" style="display:block">SS Ciudad Real</span><span class="cell-sub" style="display:block">Semana Santa de Ciudad Real</span></span>${icon('chevR', 18, 'cell-chev')}</span></span>
      </button></div></section>
    ${section([
      cell({ icon:['textsize','blue'], title:'Apariencia', go:'/ajustes/apariencia', value: prefs.theme === 'auto' ? 'Automático' : prefs.theme === 'dark' ? 'Oscuro' : 'Claro' }),
      cell({ icon:['palette','orange'], title:'Color de acento', go:'/ajustes/acento', value: accentName() })
    ])}
    ${section([
      cell({ icon:['star','gold'], title:'Mi hermandad', go:'/ajustes/mi-hermandad', value: my ? esc(my.name.replace(/^Hermandad (de |del )?/i, '')) : 'Ninguna' }),
      cell({ icon:['bell','red'], title:'Recordatorios', go:'/ajustes/recordatorios' }),
      cell({ icon:['pin','teal'], title:'Fotos fijadas', go:'/ajustes/fijadas', value: String(prefs.pinned.length) })
    ])}
    ${section([
      cell({ icon:['homeadd','gray'], title:'Añadir a pantalla de inicio', go:'/ajustes/instalar', value: isStandalone() ? 'Instalada ✓' : '' }),
      cell({ icon:['database','gray'], title:'Datos y almacenamiento', go:'/ajustes/datos' })
    ])}
    ${section([
      cell({ icon:['info','ink'], title:'Acerca de SS Ciudad Real', go:'/ajustes/acerca' }),
      cell({ icon:['ig','pink'], title:'Instagram', sub:'@ss.ciudad_real', href: SITE.instagram, external:true }),
      cell({ icon:['share','green'], title:'Compartir la app', action:'share-app' })
    ])}
    <p class="version">SS Ciudad Real · <span data-ver>Versión 2.1</span></p>`;
  return screen({ title:'Ajustes', grouped:true, content, setup: s => {
    // Versión real instalada (la del service worker), para saber si el móvil está al día
    if (window.caches) caches.keys().then(ks => { const k = ks.find(x => /^sscr-v[\d.]+-core$/.test(x)); const v = $('[data-ver]', s.el); if (k && v) v.textContent = 'Versión ' + k.slice(6, -5); }).catch(() => {});
    wireSearch(s.el, q => $$('.section', s.scroller).forEach(sec => {
      let any = false; $$('.cell', sec).forEach(c => { const m = !q || norm(c.textContent).includes(q); c.hidden = !m; any = any || m; }); sec.hidden = !any;
    }));
    s.el.addEventListener('click', e => { if (e.target.closest('[data-action=share-app]')) share('SS Ciudad Real · Semana Santa de Ciudad Real', SITE.url, toast); });
  } });
});

/* ---------- Apariencia (como «Pantalla y brillo») ---------- */
function appearanceHTML(){
  const t = resolvedTheme();
  const phone = mode => `<button type="button" class="theme-opt" data-theme-pick="${mode}" aria-pressed="${t === mode}" aria-label="${mode === 'light' ? 'Claro' : 'Oscuro'}">
      <span class="mini-phone ${mode}"><span class="mp-bar"></span><span class="mp-card"></span><span class="mp-line"></span><span class="mp-line s"></span><span class="mp-tab"></span></span>
      <span class="t-subhead">${mode === 'light' ? 'Claro' : 'Oscuro'}</span>
      <span class="radio${t === mode ? ' on' : ''}">${t === mode ? icon('check', 14) : ''}</span></button>`;
  const pct = Math.round((prefs.textScale - 0.85) / 0.45 * 100);
  return `<section class="section"><h2 class="section-head">Apariencia</h2><div class="group">
      <div class="theme-pick">${phone('light')}${phone('dark')}</div>
      ${switchCell({ title:'Automático', name:'auto', on: prefs.theme === 'auto' })}
    </div><p class="section-foot">En automático, la app sigue el modo claro u oscuro del iPhone.</p></section>
    <section class="section"><h2 class="section-head">Tamaño del texto</h2><div class="group">
      <div class="ts-row"><span class="ts-a s">A</span><input class="slider" type="range" min="0.85" max="1.3" step="0.05" value="${prefs.textScale}" aria-label="Tamaño del texto" style="--p:${pct}%"><span class="ts-a l">A</span></div>
      <p class="ts-preview">La idea no es grabar, es sentir. Así se verán los textos de la app.</p>
    </div></section>
    ${section([switchCell({ title:'Reducir transparencia', name:'reduceTransparency', on: prefs.reduceTransparency }), switchCell({ title:'Reducir movimiento', name:'reduceMotion', on: prefs.reduceMotion })], { head:'Accesibilidad', foot:'También se aplican solos si los tienes activados en los ajustes de accesibilidad del iPhone.' })}`;
}
function refreshAppearance(el){ const sc = $('.scroller', el); const y = sc.scrollTop; $('.app-body', sc).innerHTML = appearanceHTML(); sc.scrollTop = y; }
register('/ajustes/apariencia', 'ajustes', () => screen({ title:'Apariencia', large:false, grouped:true, content:`<div class="app-body" style="padding-top:16px">${appearanceHTML()}</div>`, setup: s => {
  wireSwitches(s.el);
  s.el.addEventListener('click', e => { const b = e.target.closest('[data-theme-pick]'); if (b) { setPref('theme', b.dataset.themePick); refreshAppearance(s.el); } });
  s.el.addEventListener('input', e => { if (e.target.classList.contains('slider')) { const v = +e.target.value; e.target.style.setProperty('--p', Math.round((v - 0.85) / 0.45 * 100) + '%'); setPref('textScale', v); } });
}, onDestroy: () => rebuildRoot() }));

/* ---------- Color de acento ---------- */
register('/ajustes/acento', 'ajustes', () => screen({ title:'Color de acento', large:false, grouped:true, content:`<div style="padding-top:16px">${section(ACCENTS.map(([id, name, d, l]) => cell({ title:name, action:'accent', data:`data-accent="${id}"`, check: prefs.accent === id, thumb:`<span class="swatch" style="--d:${d};--l:${l}"></span>`, chev:false })), { foot:'El color de botones, enlaces y selección. El negro azabache se ve blanco en modo oscuro.' })}</div>`, setup: s => {
  s.el.addEventListener('click', e => { const b = e.target.closest('[data-accent]'); if (!b) return; setPref('accent', b.dataset.accent); $$('.cell', s.el).forEach(c => { const on = c.dataset.accent === b.dataset.accent; const ch = c.querySelector('.cell-check'); if (on && !ch) c.querySelector('.cell-row-wrap').insertAdjacentHTML('beforeend', icon('check', 20, 'cell-check')); if (!on && ch) ch.remove(); }); });
}, onDestroy: () => rebuildRoot() }));

/* ---------- Mi hermandad ---------- */
register('/ajustes/mi-hermandad', 'ajustes', () => {
  const list = [...HERM_UNIQUE].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const content = `${searchBar('Buscar hermandad', 'mi')}
    ${section([cell({ title:'Ninguna', action:'pick', data:'data-pick=""', check: !prefs.hermandad, chev:false }), ...list.map(x => cell({ title:esc(x.name), sub:esc(x.h.sede || ''), action:'pick', data:`data-pick="${x.id}"`, check: prefs.hermandad === x.id, chev:false, thumb: `<span class="ph cell-thumb">${img(x.h.image, 120, { cls:'cell-thumb' })}</span>` }))], { foot:'Tu hermandad se destaca en Hoy, en la Agenda y en la Fototeca.' })}`;
  return screen({ title:'Mi hermandad', large:false, grouped:true, content:`<div style="padding-top:8px">${content}</div>`, setup: s => {
    wireSearch(s.el, q => $$('[data-pick]', s.el).forEach(c => { c.hidden = q && !norm(c.textContent).includes(q); }));
    s.el.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; setPref('hermandad', b.dataset.pick || null);
      $$('[data-pick]', s.el).forEach(c => { const ch = c.querySelector('.cell-check'); if (c === b && !ch) c.querySelector('.cell-row-wrap').insertAdjacentHTML('beforeend', icon('check', 20, 'cell-check')); if (c !== b && ch) ch.remove(); });
      toast(b.dataset.pick ? 'Hermandad guardada' : 'Sin hermandad', 'star'); });
  }, onDestroy: () => rebuildRoot() });
});

/* ---------- Recordatorios ---------- */
register('/ajustes/recordatorios', 'ajustes', () => screen({ title:'Recordatorios', large:false, grouped:true, content:`<div style="padding-top:16px">
  ${section(TYPES.filter(t => !t.noRem).map(t => switchCell({ title:t.label, name:'rem:' + t.id, on: prefs.reminders[t.id] })), { head:'Avisarme de' })}
  ${section([switchCell({ title:'Actos de Mi hermandad', name:'rem:mia', on: prefs.reminders.mia })], { foot:'Guardamos tus preferencias. Los avisos automáticos necesitan un servidor de notificaciones que la app todavía no tiene; mientras tanto, usa «Añadir al calendario» en cada acto y tu iPhone te avisará.' })}
</div>`, setup: s => wireSwitches(s.el) }));

/* ---------- Fotos fijadas ---------- */
register('/ajustes/fijadas', 'ajustes', () => screen({ title:'Fotos fijadas', large:false, grouped:true, content: prefs.pinned.length
  ? `<div class="photo-grid cols-3" style="margin-top:8px">${prefs.pinned.map((u, i) => `<button type="button" class="pg-item ph" data-pin-i="${i}" aria-label="Ver foto ${i + 1}">${img(u, 320)}</button>`).join('')}</div><p class="section-foot" style="padding:12px 20px">Mantén pulsada una foto en la Fototeca para fijarla o quitarla.</p>`
  : `<div class="empty">${icon('pin', 44)}<h3>Sin fotos fijadas</h3><p>En el visor de fotos, toca la estrella para fijar tus favoritas y verlas aquí y en la Fototeca.</p></div>`,
  setup: s => s.el.addEventListener('click', e => { const b = e.target.closest('[data-pin-i]'); if (b) openViewer(prefs.pinned.map(u => ({ url:u })), +b.dataset.pinI, b); }) }));

/* ---------- Añadir a pantalla de inicio ---------- */
register('/ajustes/instalar', 'ajustes', () => screen({ title:'Pantalla de inicio', large:false, grouped:true, content:`<div style="padding-top:16px">
  ${isStandalone() ? `<div class="empty">${icon('check', 44)}<h3>Ya está instalada</h3><p>Estás usando SS Ciudad Real como una app.</p></div>` : `
  <section class="section"><div class="install-hero"><img src="icons/icon-192.png" alt="" width="72" height="72"><h2 class="t-title2">SS Ciudad Real en tu iPhone</h2><p class="c2 t-subhead">Ábrela desde la pantalla de inicio como cualquier app, también sin conexión.</p>
  <button type="button" class="btn btn-filled btn-wide" data-action="install" ${window.__installPrompt ? '' : 'hidden'}>${icon('download', 20)} Instalar</button></div></section>
  <section class="section"><h2 class="section-head">iPhone y iPad · Safari</h2><div class="group steps">
    <div class="step"><span class="step-n">1</span><span>Toca <b>Compartir</b> ${icon('share', 18, 'inline')} en la barra de Safari.</span></div>
    <div class="step"><span class="step-n">2</span><span>Desliza y elige <b>Añadir a pantalla de inicio</b> ${icon('homeadd', 18, 'inline')}.</span></div>
    <div class="step"><span class="step-n">3</span><span>Toca <b>Añadir</b>. El icono aparecerá junto a tus apps.</span></div>
  </div><p class="section-foot">Si la abriste desde Instagram, toca ··· y elige «Abrir en Safari» primero.</p></section>
  <section class="section"><h2 class="section-head">Mac · Safari</h2><div class="group steps">
    <div class="step"><span class="step-n">1</span><span>Pulsa <b>Compartir</b> ${icon('share', 18, 'inline')} en la barra de Safari, o abre el menú <b>Archivo</b>.</span></div>
    <div class="step"><span class="step-n">2</span><span>Elige <b>Añadir al Dock</b>.</span></div>
    <div class="step"><span class="step-n">3</span><span>Pulsa <b>Añadir</b>. La app aparecerá en el Dock y en Launchpad.</span></div>
  </div><p class="section-foot">Disponible desde macOS Sonoma.</p></section>
  <section class="section"><h2 class="section-head">Android · Chrome</h2><div class="group steps">
    <div class="step"><span class="step-n">1</span><span>Toca el menú ${icon('ellipsis', 18, 'inline')} arriba a la derecha.</span></div>
    <div class="step"><span class="step-n">2</span><span>Elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</span></div>
  </div></section>`}</div>`, setup: s => s.el.addEventListener('click', e => { if (e.target.closest('[data-action=install]')) install(); }) }));

/* ---------- Datos y almacenamiento ---------- */
register('/ajustes/datos', 'ajustes', () => screen({ title:'Datos y almacenamiento', large:false, grouped:true, content:`<div style="padding-top:16px">
  ${section([cell({ title:'Espacio sin conexión', value:'<span data-usage>Calculando…</span>', chev:false })], { foot:'La agenda, las hermandades y las fotos que ya has visto se guardan para usarlas sin conexión.' })}
  ${section([switchCell({ title:'Descargar fotos para usar sin conexión', name:'offlinePhotos', on: prefs.offlinePhotos })], { foot:'Guarda en el móvil la foto principal y la galería de cada hermandad. Ocupa unos 30 MB.' })}
  ${section([cell({ title:'Borrar caché', action:'clear-cache', danger:true, chev:false })])}
</div>`, setup: s => {
  wireSwitches(s.el);
  const show = async () => { const u = $('[data-usage]', s.el); try { const est = await navigator.storage.estimate(); u.textContent = (est.usage / 1048576).toFixed(1).replace('.', ',') + ' MB'; } catch (e) { u.textContent = 'No disponible'; } };
  show();
  s.el.addEventListener('click', async e => {
    if (!e.target.closest('[data-action=clear-cache]')) return;
    const i = await alertBox({ title:'¿Borrar la caché?', text:'Se borrarán las fotos y datos guardados. Se volverán a descargar cuando tengas conexión.', buttons:[{ label:'Cancelar' }, { label:'Borrar', danger:true, bold:true }] });
    if (i !== 1) return;
    try { for (const k of await caches.keys()) if (!k.endsWith('-core')) await caches.delete(k); } catch (e) {}
    toast('Caché borrada', 'trash'); show();
  });
} }));

/* ---------- Acerca de (El proyecto) ---------- */
register('/ajustes/acerca', 'ajustes', () => screen({ title:'Acerca de', large:false, grouped:true, content:`
  <div class="about-hero"><img src="icons/icon-192.png" alt="" width="96" height="96"><h1 class="t-title1">SS Ciudad Real</h1><p class="c2 t-subhead">«La idea no es grabar, es sentir»</p></div>
  <section class="section"><div class="group prose-cell selectable">
    <p>SS Ciudad Real nace en junio de 2024 como un proyecto de difusión audiovisual dedicado a la Semana Santa de Ciudad Real. Desde el principio nuestro objetivo ha sido acercar las hermandades, sus imágenes y sus tradiciones a todos los cofrades y devotos.</p>
    <p>Con el paso del tiempo el proyecto ha ido creciendo gracias a la acogida de la comunidad cofrade, que siempre nos ha apoyado y animado a seguir trabajando.</p>
    <p>Nuestro compromiso es ofrecer un contenido cuidado, respetuoso y lo más profesional posible, mostrando la riqueza y el patrimonio de nuestra Semana Santa. Nuestro objetivo principal es la difusión audiovisual, permitiendo que cualquier persona pueda disfrutar y conocer la Semana Santa de Ciudad Real.</p>
    <p>Además, todo este trabajo se realiza de forma totalmente desinteresada, sin cobrar nunca nada a ninguna hermandad por la difusión de su actividad.</p>
  </div></section>
  ${section([cell({ title:'Nacimiento', value:'Junio de 2024', chev:false }), cell({ title:'Difusión', value:'Audiovisual', chev:false }), cell({ title:'Coste para las hermandades', value:'Ninguno', chev:false })])}
  ${section([cell({ icon:['ig','pink'], title:'Instagram', sub:'@ss.ciudad_real · #SsCiudadReal', href:SITE.instagram, external:true })], { foot:'Información de la Guía de Semana Santa de Ciudad Real · Codal de Plata. Fotografías de hermandades: Laura Arroyo · Objetivo Cofrade.' })}
` }));

/* La raíz de Ajustes muestra valores (acento, tema…): se rehace al volver */
function rebuildRoot(){ setTimeout(() => rebuildAll(), 0); }


});
__def("js/screens/noticias.js", function(__exports){
/* =====================================================================
   Noticias: portada con la noticia destacada y lista; artículo a pantalla
   completa con su foto, titular en Cormorant y galería
   ===================================================================== */
const { icon, esc, $, img, fmtNewsDate, richText, share } = __req("js/util.js");
const { screen, register, navigate } = __req("js/router.js");
const { toast, longPress } = __req("js/ui.js");
const { openViewer } = __req("js/screens/visor.js");
const { profileBtn } = __req("js/screens/common.js");

const lead = n => String(n.text || '').split('\n').find(Boolean) || '';

const mins = n => Math.max(1, Math.round(String(n.text || '').split(/\s+/).length / 200));
const plain = t => String(t || '').replace(/\*\*/g, '');
const ndate = n => { const m = String(n.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? { d:+m[3], m:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][+m[2] - 1] } : null; };
const stamp = n => { const d = ndate(n); return d ? `<span class="nc-stamp"><b class="tnum">${d.d}</b><i>${d.m}</i></span>` : ''; };

register('/noticias', 'noticias', () => {
  const [first, ...rest] = NOTICIAS;
  const content = !first ? `<div class="empty">${icon('newspaper', 44)}<h3>Sin noticias</h3><p>Aquí aparecerá la actualidad cofrade de Ciudad Real.</p></div>` : `
    <button type="button" class="news-feature" data-go="/noticias/${first.id}" data-news="${first.id}">
      <span class="nf-media ph">${img(first.coverImage, 1200, { ws:[640, 1000, 1400], sizes:'(min-width:760px) 720px, 100vw', pos:first.coverPos || '' })}</span>
      <span class="nf-top">${stamp(first)}</span>
      <span class="nf-body"><span class="nf-src">${esc(first.source || 'SS Ciudad Real')}</span>
        <span class="nf-title">${esc(first.title)}</span><span class="nf-lead">${esc(plain(lead(first)))}</span>
        <span class="nf-foot"><span>${icon('clock', 14)} ${mins(first)} min de lectura</span><span class="nf-read">Leer ${icon('chevR', 14)}</span></span></span>
    </button>
    ${rest.length ? `<header class="news-head"><p class="h-over">Actualidad</p><h2 class="h-title">Más noticias</h2></header>
      <div class="news-grid">${rest.map(n => `
      <button type="button" class="news-card" data-go="/noticias/${n.id}" data-news="${n.id}">
        <span class="nc-media ph">${img(n.coverImage, 700, { ws:[480, 800], sizes:'(min-width:760px) 40vw, 92vw', pos:n.coverPos || '' })}${stamp(n)}</span>
        <span class="nc-body"><span class="nc-src">${esc(n.source || fmtNewsDate(n.date))}</span>
          <span class="nc-title">${esc(n.title)}</span>
          <span class="nc-lead">${esc(plain(lead(n)))}</span>
          <span class="nc-foot"><span>${esc(fmtNewsDate(n.date))} · ${mins(n)} min</span><span class="nf-read">Leer ${icon('chevR', 14)}</span></span></span></button>`).join('')}</div>` : ''}
    <p class="news-foot">Fuentes citadas en cada noticia.</p>`;
  return screen({ title:'Noticias', titleAside: profileBtn(), grouped:true, content, setup: s => {
    longPress(s.el, '[data-news]', el => { const n = NOTICIAS.find(x => x.id === +el.dataset.news); return n ? [
      { label:'Leer', icon:'newspaper', run: () => navigate(`/noticias/${n.id}`) },
      { label:'Compartir', icon:'share', run: () => share(n.title, `${location.origin}/noticias/${n.id}`, toast) }] : []; });
  } });
});

register('/noticias/(\\d+)', 'noticias', id => {
  const n = NOTICIAS.find(x => x.id === +id); if (!n) return null;
  const imgs = (n.images || []).filter(u => u !== n.coverImage);
  const more = NOTICIAS.filter(x => x.id !== n.id).slice(0, 2);
  const content = `
    <div class="stretch-head art-head ph">${img(n.coverImage, 1400, { ws:[640, 1000, 1400], sizes:'100vw', eager:true, pos:n.coverPos || '' })}<span class="stretch-fade"></span>${stamp(n)}</div>
    <article class="article-wrap art">
      <div class="art-top"><p class="art-src">${esc(n.source || 'SS Ciudad Real')}</p><button type="button" class="art-share" data-share aria-label="Compartir">${icon('share', 18)}</button></div>
      <h1 class="article-title selectable">${esc(n.title)}</h1>
      <div class="art-meta"><span>${icon('agenda', 15)} ${esc(fmtNewsDate(n.date))}</span><span>${icon('clock', 15)} ${mins(n)} min de lectura</span></div>
      <div class="article selectable">${richText(n.text)}</div>
      ${imgs.length ? `<h2 class="art-h2">Imágenes</h2><div class="art-gallery">${imgs.map((u, k) => `<button type="button" class="ag-ph ph" data-nph="${k}" aria-label="Imagen ${k + 1}">${img(u, 800)}</button>`).join('')}</div>` : ''}
      <div class="x-actions" style="padding:0"><button type="button" class="btn btn-filled btn-wide" data-share>${icon('share', 20)} Compartir noticia</button></div>
      ${more.length ? `<h2 class="art-h2">Seguir leyendo</h2><div class="art-more">${more.map(m => `<button type="button" class="art-more-row" data-go="/noticias/${m.id}"><span class="ph">${img(m.coverImage, 300, { pos:m.coverPos || '' })}</span><span><small>${esc(fmtNewsDate(m.date))}</small><b>${esc(m.title)}</b></span></button>`).join('')}</div>` : ''}
    </article>`;
  return screen({ title:n.title, navTitle:'Noticia', large:false, grouped:true, clearNav:true, content, setup: s => {
    s.el.classList.add('has-stretch');
    const head = $('.stretch-head', s.el), nav = s.navbar;
    nav.classList.add('over-photo');
    s.scroller.addEventListener('scroll', () => {
      const y = s.scroller.scrollTop, hH = head.offsetHeight;
      head.querySelector('img').style.transform = y < 0 ? `scale(${1 + -y / hH})` : `translateY(${y * 0.25}px)`;
      const solid = y > hH - 100; nav.classList.toggle('solid', solid); nav.classList.toggle('show-title', solid); nav.classList.toggle('over-photo', !solid);
    }, { passive:true });
    s.el.addEventListener('click', e => {
      const p = e.target.closest('[data-nph]'); if (p) openViewer(imgs.map(u => ({ url:u, credit:n.source })), +p.dataset.nph, p);
      if (e.target.closest('[data-share]')) share(n.title, `${location.origin}/noticias/${n.id}`, toast);
    });
  } });
});


});
__def("js/app.js", function(__exports){
/* =====================================================================
   SS Ciudad Real · Arranque de la app
   ===================================================================== */
const { applyPrefs, prefs, setPref, onPrefs } = __req("js/settings.js");
const { installSpringCurves } = __req("js/spring.js");
const { startRouter } = __req("js/router.js");
const { startPWA } = __req("js/pwa.js");
const { icon, markLoaded } = __req("js/util.js");
const { openSheet } = __req("js/ui.js");
__req("js/screens/hoy.js");
__req("js/screens/agenda.js");
__req("js/screens/fototeca.js");
__req("js/screens/hermandades.js");
__req("js/screens/ajustes.js");
__req("js/screens/noticias.js");
__req("js/screens/ensayos.js");

applyPrefs();
installSpringCurves();
startRouter();
startPWA();

/* Estado de carga de las imágenes (esqueleto con brillo hasta que llegan) */
document.addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded'); }, true);
document.addEventListener('error', e => { const t = e.target; if (t.tagName === 'IMG') { t.classList.add('is-broken'); t.closest('.ph')?.classList.add('is-broken'); } }, true);
markLoaded();

/* Bienvenida «Novedades» (solo la primera vez) */
if (!prefs.onboarded) setTimeout(() => {
  const row = (ic, color, t, d) => `<li class="wn-row"><span class="wn-ico" style="color:${color}">${icon(ic, 34)}</span><span><b>${t}</b><span>${d}</span></span></li>`;
  const sh = openSheet({ label:'Te damos la bienvenida', plain:true, right:'', content:`<div class="whatsnew">
    <h1 class="wn-title">Te damos la bienvenida a SS Ciudad Real</h1>
    <ul class="wn-list">
      ${row('agenda', '#FF453A', 'Agenda cofrade', 'Procesiones, traslados, cultos y besamanos, día a día, como en Calendario.')}
      ${row('fototeca', '#0A84FF', 'Fototeca', 'Las fotografías de SS Ciudad Real de cada triduo y culto, con su marca.')}
      ${row('hermandades', 'var(--accent)', 'Hermandades', 'Titulares, sede, salida e itinerario de cada hermandad.')}
      ${row('wifiOff', '#30B054', 'Úsala sin conexión', 'Instálala en la pantalla de inicio y llévala contigo en la calle.')}
    </ul>
    <button type="button" class="btn btn-filled btn-wide" data-wn>Continuar</button></div>`, onClose: () => setPref('onboarded', true) });
  sh.body.addEventListener('click', e => { if (e.target.closest('[data-wn]')) sh.close(); });
}, 500);

/* Datos estructurados de la agenda (schema.org Event) */
(function eventsLD(){
  const today = new Date().toISOString().slice(0, 10);
  const evs = EVENTOS.filter(e => (e.dates || [e.date]).some(d => d >= today)).slice(0, 20).map(e => ({
    '@type':'Event', name:e.title, startDate:(e.dates ? e.dates[0] : e.date),
    eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode', eventStatus:'https://schema.org/EventScheduled',
    location:{ '@type':'Place', name:e.location || 'Ciudad Real', address:{ '@type':'PostalAddress', addressLocality:'Ciudad Real', addressCountry:'ES' } },
    image: e.image && /^https?:/.test(e.image) ? e.image : `${SITE.url}/img/og.jpg`,
    description: String(e.desc || '').replace(/<[^>]+>/g, '').slice(0, 300),
    url: `${SITE.url}/agenda/${e.date}/${e.id}`
  }));
  if (!evs.length) return;
  const s = document.createElement('script'); s.type = 'application/ld+json';
  s.textContent = JSON.stringify({ '@context':'https://schema.org', '@graph':evs }); document.head.appendChild(s);
})();


});
__req('js/app.js');