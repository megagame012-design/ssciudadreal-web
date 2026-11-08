/* =====================================================================
   Noticias: portada con la noticia destacada y lista; artículo a pantalla
   completa con su foto, titular en Cormorant y galería
   ===================================================================== */
import { icon, esc, $, img, fmtNewsDate, richText, share } from '../util.js';
import { screen, register, navigate } from '../router.js';
import { toast, longPress } from '../ui.js';
import { openViewer } from './visor.js';
import { profileBtn } from './common.js';

const lead = n => String(n.text || '').split('\n').find(Boolean) || '';

const mins = n => Math.max(1, Math.round(String(n.text || '').split(/\s+/).length / 200));
const plain = t => String(t || '').replace(/\*\*/g, '');
const ndate = n => { const m = String(n.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? { d:+m[3], m:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][+m[2] - 1] } : null; };
const stamp = n => { const d = ndate(n); return d ? `<span class="nc-stamp"><b class="tnum">${d.d}</b><i>${d.m}</i></span>` : ''; };

register('/noticias', 'noticias', () => {
  const [first, ...rest] = NOTICIAS;
  const content = !first ? `<div class="empty">${icon('newspaper', 44)}<h3>Sin noticias</h3><p>Aquí aparecerá la actualidad cofrade de Ciudad Real.</p></div>` : `
    <button type="button" class="news-feature" data-go="/noticias/${first.id}" data-news="${first.id}">
      <span class="nf-media ph">${img(first.coverImage, 1200, { ws:[640, 1000, 1400], sizes:'(min-width:760px) 720px, 100vw', pos:first.coverPos || '' })}</span>
      <span class="nf-top">${stamp(first)}</span>
      <span class="nf-body"><span class="nf-src">${esc(first.source || 'SS Ciudad Real')}</span>
        <span class="nf-title">${esc(first.title)}</span><span class="nf-lead">${esc(plain(lead(first)))}</span>
        <span class="nf-foot"><span>${icon('clock', 14)} ${mins(first)} min de lectura</span><span class="nf-read">Leer ${icon('chevR', 14)}</span></span></span>
    </button>
    ${rest.length ? `<header class="news-head"><p class="h-over">Actualidad</p><h2 class="h-title">Más noticias</h2></header>
      <div class="news-grid">${rest.map(n => `
      <button type="button" class="news-card" data-go="/noticias/${n.id}" data-news="${n.id}">
        <span class="nc-media ph">${img(n.coverImage, 700, { ws:[480, 800], sizes:'(min-width:760px) 40vw, 92vw', pos:n.coverPos || '' })}${stamp(n)}</span>
        <span class="nc-body"><span class="nc-src">${esc(n.source || fmtNewsDate(n.date))}</span>
          <span class="nc-title">${esc(n.title)}</span>
          <span class="nc-lead">${esc(plain(lead(n)))}</span>
          <span class="nc-foot"><span>${esc(fmtNewsDate(n.date))} · ${mins(n)} min</span><span class="nf-read">Leer ${icon('chevR', 14)}</span></span></span></button>`).join('')}</div>` : ''}
    <p class="news-foot">Fuentes citadas en cada noticia.</p>`;
  return screen({ title:'Noticias', titleAside: profileBtn(), grouped:true, content, setup: s => {
    longPress(s.el, '[data-news]', el => { const n = NOTICIAS.find(x => x.id === +el.dataset.news); return n ? [
      { label:'Leer', icon:'newspaper', run: () => navigate(`/noticias/${n.id}`) },
      { label:'Compartir', icon:'share', run: () => share(n.title, `${location.origin}/noticias/${n.id}`, toast) }] : []; });
  } });
});

register('/noticias/(\\d+)', 'noticias', id => {
  const n = NOTICIAS.find(x => x.id === +id); if (!n) return null;
  const imgs = (n.images || []).filter(u => u !== n.coverImage);
  const more = NOTICIAS.filter(x => x.id !== n.id).slice(0, 2);
  const content = `
    <div class="stretch-head art-head ph">${img(n.coverImage, 1400, { ws:[640, 1000, 1400], sizes:'100vw', eager:true, pos:n.coverPos || '' })}<span class="stretch-fade"></span>${stamp(n)}</div>
    <article class="article-wrap art">
      <div class="art-top"><p class="art-src">${esc(n.source || 'SS Ciudad Real')}</p><button type="button" class="art-share" data-share aria-label="Compartir">${icon('share', 18)}</button></div>
      <h1 class="article-title selectable">${esc(n.title)}</h1>
      <div class="art-meta"><span>${icon('agenda', 15)} ${esc(fmtNewsDate(n.date))}</span><span>${icon('clock', 15)} ${mins(n)} min de lectura</span></div>
      <div class="article selectable">${richText(n.text)}</div>
      ${imgs.length ? `<h2 class="art-h2">Imágenes</h2><div class="art-gallery">${imgs.map((u, k) => `<button type="button" class="ag-ph ph" data-nph="${k}" aria-label="Imagen ${k + 1}">${img(u, 800)}</button>`).join('')}</div>` : ''}
      <div class="x-actions" style="padding:0"><button type="button" class="btn btn-filled btn-wide" data-share>${icon('share', 20)} Compartir noticia</button></div>
      ${more.length ? `<h2 class="art-h2">Seguir leyendo</h2><div class="art-more">${more.map(m => `<button type="button" class="art-more-row" data-go="/noticias/${m.id}"><span class="ph">${img(m.coverImage, 300, { pos:m.coverPos || '' })}</span><span><small>${esc(fmtNewsDate(m.date))}</small><b>${esc(m.title)}</b></span></button>`).join('')}</div>` : ''}
    </article>`;
  return screen({ title:n.title, navTitle:'Noticia', large:false, grouped:true, clearNav:true, content, setup: s => {
    s.el.classList.add('has-stretch');
    const head = $('.stretch-head', s.el), nav = s.navbar;
    nav.classList.add('over-photo');
    s.scroller.addEventListener('scroll', () => {
      const y = s.scroller.scrollTop, hH = head.offsetHeight;
      head.querySelector('img').style.transform = y < 0 ? `scale(${1 + -y / hH})` : `translateY(${y * 0.25}px)`;
      const solid = y > hH - 100; nav.classList.toggle('solid', solid); nav.classList.toggle('show-title', solid); nav.classList.toggle('over-photo', !solid);
    }, { passive:true });
    s.el.addEventListener('click', e => {
      const p = e.target.closest('[data-nph]'); if (p) openViewer(imgs.map(u => ({ url:u, credit:n.source })), +p.dataset.nph, p);
      if (e.target.closest('[data-share]')) share(n.title, `${location.origin}/noticias/${n.id}`, toast);
    });
  } });
});
