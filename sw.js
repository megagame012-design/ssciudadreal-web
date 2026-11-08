/* SS Ciudad Real · Service worker
   - Armazón y datos precargados: la app abre al instante y funciona sin conexión.
   - Fotos: se guardan según se ven (y todas, si se activa en Ajustes).
   - Al publicar cambios, sube VERSION: la app avisará de que hay una versión nueva. */
const VERSION = 'sscr-v2.1.42';
const CORE = VERSION + '-core', IMG = 'sscr-img', MAX_IMG = 400;
const SHELL = ['/', '/index.html', '/manifest.webmanifest',
  '/css/tokens.css', '/css/base.css', '/css/components.css', '/css/screens.css',
  '/data/data.js', '/data/mapas.js', '/data/fototeca.js', '/js/app.bundle.js',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/icon-32.png',
  '/img/portada.jpg', '/img/portada-640.jpg'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CORE).then(c => c.addAll(SHELL))); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.endsWith('-core') && k !== CORE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (e.data?.type === 'skip-waiting') self.skipWaiting();
  if (e.data?.type === 'cache-photos') e.waitUntil(caches.open(IMG).then(async c => { for (const u of e.data.urls || []) { try { if (!(await c.match(u))) { const r = await fetch(u, { mode:'no-cors' }); await c.put(u, r); } } catch (err) {} } }));
});
async function trim(){ const c = await caches.open(IMG); const k = await c.keys(); for (let i = 0; i < k.length - MAX_IMG; i++) await c.delete(k[i]); }

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Rutas de la app: siempre el armazón (funciona sin conexión)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  if (url.origin === location.origin) {
    // Caché primero y actualización en segundo plano
    e.respondWith(caches.open(CORE).then(async c => {
      const hit = await c.match(req, { ignoreSearch:true });
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (/googleusercontent\.com|res\.cloudinary\.com|lanzadigital\.com/.test(url.host)) {
    e.respondWith(caches.open(IMG).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === 'opaque') { c.put(req, r.clone()); trim(); } return r; }
      catch (err) { return hit || Response.error(); }
    }));
  }
});
