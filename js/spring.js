/* =====================================================================
   Motor de muelles
   - Spring: valor animado con física (interrumpible: conserva posición y
     velocidad si se le da un nuevo destino a mitad).
   - springCSS(): la misma física como curva linear() para transiciones CSS.
   ===================================================================== */
import { prefs } from './settings.js';

/* Muelle por respuesta (segundos) y amortiguación (0–1), como en SwiftUI */
export function params(response = 0.42, damping = 0.86){
  const k = Math.pow(2 * Math.PI / response, 2);
  const c = 4 * Math.PI * damping / response;
  return { k, c };
}

/* Muelles en marcha. Si el navegador deja de pintar fotogramas (app en segundo plano,
   pestaña oculta, ahorro de energía), se terminan de golpe en vez de quedarse a medias:
   así ninguna pantalla se queda medio fuera ni ninguna capa bloquea los toques. */
const running = new Set();
const finishAll = () => running.forEach(s => s.finish());
export const springsRunning = () => running.size > 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) finishAll(); });
addEventListener('pagehide', finishAll);
setInterval(() => { const now = performance.now(); running.forEach(s => { if (now - s.lastFrame > 400) s.finish(); }); }, 250);

export class Spring {
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
export function springCSS(response = 0.42, damping = 0.86){
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
export function installSpringCurves(){
  const s = springCSS(0.42, 0.86);
  const r = document.documentElement.style;
  r.setProperty('--spring', s.easing);
  r.setProperty('--spring-d', s.duration + 'ms');
}

/* Interpolación útil para gestos */
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/* Resistencia de goma al pasar de un límite, como iOS */
export const rubber = (x, d = 300, c = 0.55) => (1 - (1 / (x * c / d + 1))) * d;
