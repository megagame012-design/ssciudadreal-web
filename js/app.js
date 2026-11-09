/* =====================================================================
   SS Ciudad Real · Arranque de la app
   ===================================================================== */
import { applyPrefs, prefs, setPref, onPrefs } from './settings.js';
import { installSpringCurves } from './spring.js';
import { startRouter } from './router.js';
import { startPWA } from './pwa.js';
import { contarVisita } from './visitas.js';
import { icon, markLoaded } from './util.js';
import { openSheet } from './ui.js';
import './screens/hoy.js';
import './screens/agenda.js';
import './screens/fototeca.js';
import './screens/hermandades.js';
import './screens/ajustes.js';
import './screens/noticias.js';
import './screens/ensayos.js';

applyPrefs();
installSpringCurves();
startRouter();
startPWA();
contarVisita();

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
