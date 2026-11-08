/* =====================================================================
   App instalable: service worker, aviso de versión nueva, sin conexión
   ===================================================================== */
import { icon, h } from './util.js';
import { toast } from './ui.js';

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });
export async function install(){
  const p = window.__installPrompt; if (!p) return false;
  p.prompt(); try { await p.userChoice; } catch (e) {} window.__installPrompt = null; return true;
}

export function startPWA(){
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/sw.js', { updateViaCache:'none' }).then(reg => {
      // Versión nueva: se instala sola y la app se recarga (sin preguntar)
      const go = w => { if (w && navigator.serviceWorker.controller) { toast('Actualizando la app…', 'sparkle'); w.postMessage({ type:'skip-waiting' }); } };
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
