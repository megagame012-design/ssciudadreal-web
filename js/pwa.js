/* =====================================================================
   App instalable: service worker, aviso de versión nueva, sin conexión
   ===================================================================== */
import { icon, h } from './util.js';
import { toast, alertBox } from './ui.js';

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; });
export async function install(){
  const p = window.__installPrompt; if (!p) return false;
  p.prompt(); try { await p.userChoice; } catch (e) {} window.__installPrompt = null; return true;
}

export function startPWA(){
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Hay una versión nueva esperando: aviso discreto para actualizar
      const ask = async w => {
        const i = await alertBox({ title:'Hay una versión nueva', text:'Actualiza para ver las últimas novedades de SS Ciudad Real.', buttons:[{ label:'Más tarde' }, { label:'Actualizar', bold:true }] });
        if (i === 1) w.postMessage({ type:'skip-waiting' });
      };
      if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
      reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); }); });
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
