/* =====================================================================
   Mapas de recorridos (callejero propio en SVG) y galería curvada
   Código heredado de la versión anterior, adaptado a módulo.
   ===================================================================== */
import { esc, cld, icon as icon2 } from './util.js';
export const GAL = {};
const icon = (n, s) => icon2(n === 'moon' ? 'moon' : n === 'sun' ? 'sun' : n, s);
/* =====================================================================
   GALERÍA CURVADA: una fila de fotos que gira por dentro de un cilindro.
   El centro mira de frente, los extremos se curvan hacia ti y se funden.
   Cada foto se corta en tiras verticales (caras planas del cilindro) y la
   foto entera gira con una sola animación, así las tiras nunca se separan.
   ===================================================================== */
const CB_CAMERA = 1.6, CB_MAXW = 55;
const cbArc = b => (CB_CAMERA - 1 + Math.cos(b)) / (2 * CB_CAMERA * Math.sin(b));
export function bandItems(key){
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
export function curvedBand(el, items, o){
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
export function initBands(root){
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
export function mapHTML(map){
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
export function renderMapView(el, map, vi){
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
