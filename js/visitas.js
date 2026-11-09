/* =====================================================================
   Contador de visitas anónimo (sin cookies ni datos personales).
   Una visita por sesión del navegador; un visitante por dispositivo.
   Solo cuenta en ssciudadreal.es (no en pruebas locales).
   Lectura: https://abacus.jasoncameron.dev/get/ssciudadreal/<clave>
   ===================================================================== */
const API = 'https://abacus.jasoncameron.dev/hit/ssciudadreal/';
export function contarVisita(){
  try {
    if (location.hostname !== 'ssciudadreal.es' || navigator.webdriver) return;
    if (sessionStorage.getItem('sscr-visita')) return;
    sessionStorage.setItem('sscr-visita', '1');
    const d = new Date(), dia = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const claves = ['visitas', 'dia-' + dia, app ? 'app' : 'navegador'];
    if (!localStorage.getItem('sscr-visitante')) { localStorage.setItem('sscr-visitante', '1'); claves.push('visitantes', 'nuevos-' + dia); }
    claves.forEach(k => fetch(API + k, { mode:'cors', keepalive:true }).catch(() => {}));
  } catch (e) {}
}
