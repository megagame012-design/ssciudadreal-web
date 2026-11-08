/* =====================================================================
   Tarjeta que se expande a pantalla completa (pestaña Hoy del App Store)
   La tarjeta crece desde su sitio; se cierra con × o deslizando hacia abajo
   y vuelve a su posición.
   ===================================================================== */
import { icon, h, $, markLoaded } from './util.js';
import { Spring, clamp } from './spring.js';
import { prefs } from './settings.js';

let open = null;
export function expandCard(card, { hero, body, label = 'Detalle', wire }){
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
export const closeExpanded = () => open && open.close();
