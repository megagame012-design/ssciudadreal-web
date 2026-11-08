/* =====================================================================
   Ajustes (como los del iPhone)
   ===================================================================== */
import { icon, esc, $, $$, cld, img, HERM_UNIQUE, hermById, share } from '../util.js';
import { screen, register, rebuildAll } from '../router.js';
import { prefs, setPref, resolvedTheme } from '../settings.js';
import { toast, alertBox } from '../ui.js';
import { cell, switchCell, section, searchBar, wireSearch, norm } from './common.js';
import { openViewer } from './visor.js';
import { install } from '../pwa.js';

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
        <img class="account-logo" src="/icons/icon-192.png" alt="" width="60" height="60">
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
    <p class="version">SS Ciudad Real · Versión 2.0</p>`;
  return screen({ title:'Ajustes', grouped:true, content, setup: s => {
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
  ${section(TYPES.map(t => switchCell({ title:t.label, name:'rem:' + t.id, on: prefs.reminders[t.id] })), { head:'Avisarme de' })}
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
  <section class="section"><div class="install-hero"><img src="/icons/icon-192.png" alt="" width="72" height="72"><h2 class="t-title2">SS Ciudad Real en tu iPhone</h2><p class="c2 t-subhead">Ábrela desde la pantalla de inicio como cualquier app, también sin conexión.</p>
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
  <div class="about-hero"><img src="/icons/icon-192.png" alt="" width="96" height="96"><h1 class="t-title1">SS Ciudad Real</h1><p class="c2 t-subhead">«La idea no es grabar, es sentir»</p></div>
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
