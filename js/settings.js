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
export const prefs = load();
const listeners = new Set();
export function onPrefs(fn){ listeners.add(fn); return () => listeners.delete(fn); }
export function setPref(k, v){
  prefs[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
  applyPrefs(); listeners.forEach(fn => fn(k, v));
}

const mqDark = matchMedia('(prefers-color-scheme: dark)');
const mqMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const systemReducedMotion = () => mqMotion.matches;
export function resolvedTheme(){ return prefs.theme === 'auto' ? (mqDark.matches ? 'dark' : 'light') : prefs.theme; }

export function applyPrefs(){
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
