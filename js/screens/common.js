/* Piezas comunes de las pantallas: celdas de lista agrupada y secciones */
import { icon, esc } from '../util.js';

/* Celda de lista. o: { go, href, external, action, data, icon:[nombre,color], thumb, title, sub, value, check, chev, accent, danger, right, tall, label } */
export function cell(o){
  const tag = o.href ? 'a' : 'button';
  const attrs = [
    o.href ? `href="${esc(o.href)}"` : 'type="button"',
    o.external ? 'target="_blank" rel="noopener noreferrer"' : '',
    o.go ? `data-go="${esc(o.go)}"` : '',
    o.action ? `data-action="${esc(o.action)}"` : '',
    o.data || '',
    o.label ? `aria-label="${esc(o.label)}"` : ''
  ].join(' ');
  const lead = o.icon ? `<span class="sicon ${o.icon[1]}">${icon(o.icon[0], 19)}</span>` : o.thumb ? o.thumb : '';
  const trail = (o.value != null ? `<span class="cell-value">${o.value}</span>` : '') + (o.right || '') +
    (o.check ? icon('check', 20, 'cell-check') : '') + (o.external ? icon('external', 17, 'cell-chev') : (o.chev !== false && (o.go || o.chev) ? icon('chevR', 18, 'cell-chev') : ''));
  const cls = ['cell', o.tall ? 'tall' : '', o.accent ? 'cell-accent' : '', o.danger ? 'cell-danger' : ''].join(' ');
  return `<${tag} class="${cls}" ${attrs}>${lead}<span class="cell-body"><span class="cell-row-wrap"><span style="flex:1;min-width:0"><span class="cell-title${o.bold ? ' semibold' : ''}">${o.title}</span>${o.sub ? `<span class="cell-sub" style="display:block">${o.sub}</span>` : ''}</span>${trail}</span></span></${tag}>`;
}
/* Celda con interruptor (no es un botón: la fila entera es la etiqueta) */
export function switchCell({ icon: ic, title, name, on, sub }){
  return `<label class="cell">${ic ? `<span class="sicon ${ic[1]}">${icon(ic[0], 19)}</span>` : ''}<span class="cell-body"><span class="cell-row-wrap"><span style="flex:1;min-width:0"><span class="cell-title">${title}</span>${sub ? `<span class="cell-sub" style="display:block">${sub}</span>` : ''}</span><input type="checkbox" switch class="switch" data-switch="${esc(name)}" ${on ? 'checked' : ''}></span></span></label>`;
}
export const section = (cells, { head = '', foot = '', big = false, extra = '' } = {}) =>
  `<section class="section">${head ? `<h2 class="section-head${big ? ' big' : ''}">${head}</h2>` : ''}${extra}<div class="group">${cells.join('')}</div>${foot ? `<p class="section-foot">${foot}</p>` : ''}</section>`;
export const searchBar = (placeholder, id) =>
  `<div class="search" data-search="${id}"><label class="search-field">${icon('search', 17)}<input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="none" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"><button type="button" class="search-clear" hidden aria-label="Borrar">${icon('x', 14)}</button></label><button type="button" class="search-cancel">Cancelar</button></div>`;
/* Conecta un buscador: llama a onInput(texto) */
export function wireSearch(root, onInput){
  const s = root.querySelector('.search'); if (!s) return;
  const inp = s.querySelector('input'), clr = s.querySelector('.search-clear');
  const fire = () => { clr.hidden = !inp.value; onInput(inp.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')); };
  inp.addEventListener('focus', () => s.classList.add('is-focus'));
  inp.addEventListener('blur', () => { if (!inp.value) s.classList.remove('is-focus'); });
  inp.addEventListener('input', fire);
  clr.addEventListener('click', () => { inp.value = ''; fire(); inp.focus(); });
  s.querySelector('.search-cancel').addEventListener('click', () => { inp.value = ''; fire(); inp.blur(); s.classList.remove('is-focus'); });
}
export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Botón de perfil (abre Ajustes), como la foto de cuenta del App Store */
export const profileBtn = () => `<button type="button" class="avatar" data-go="/ajustes" aria-label="Ajustes"><img src="/icons/icon-192.png" alt="" width="36" height="36"></button>`;
