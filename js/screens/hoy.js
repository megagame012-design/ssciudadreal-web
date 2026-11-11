/* =====================================================================
   Hoy: portada tranquila, entre lo profesional y lo cofrade.
   Cuenta atrás, lo próximo, agenda breve, ensayos y noticias.
   ===================================================================== */
import { icon, esc, $, $$, img, cld, MONTHS, WEEKDAYS, pad, toISO, parseISO, cap, TODAY, nextSS, addDays, JF, titleCase, fmtShort, fmtLong, fmtNewsDate, plural, timeOf, evDates, nextEvent, eventsOn, hermById, hermsFor, salida, procDateFor, richText, share, HERMS, SS_DAYS, easter } from '../util.js';
import { screen, register, navigate } from '../router.js';
import { prefs } from '../settings.js';
import { toast } from '../ui.js';
import { HERM_UNIQUE } from '../util.js';
import { expandCard } from '../expand.js';
import { eventView } from './evento.js';
import { openEvent } from './evento.js';
import { bandItems, curvedBand } from '../mapa.js';
import { section, cell, profileBtn } from './common.js';
import { nextCitas } from './ensayos.js';

const now = () => new Date();
/* Ilustraciones de las tarjetas sin foto */
const CANDLE = `<svg class="ill ill-candle" viewBox="0 0 120 220" aria-hidden="true">
  <defs><radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD98A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
  <linearGradient id="wax" x1="0" x2="1"><stop offset="0" stop-color="#E9DFC9"/><stop offset=".55" stop-color="#FBF6EA"/><stop offset="1" stop-color="#CFC2A6"/></linearGradient></defs>
  <circle cx="60" cy="40" r="44" fill="url(#glow)"/>
  <path class="flame" d="M60 14c8 12 12 20 12 28a12 12 0 0 1-24 0c0-8 4-16 12-28z" fill="#FFC95A"/><path d="M60 30c4 6 6 10 6 14a6 6 0 0 1-12 0c0-4 2-8 6-14z" fill="#FFF3CF"/>
  <path d="M60 56v8" stroke="#3a2a14" stroke-width="2"/>
  <path d="M42 64h36v118H42z" fill="url(#wax)"/><path d="M42 64c4 0 4 10 8 10s3-10 8-10 4 16 8 16 4-16 12-16" fill="#FBF6EA"/>
  <path d="M30 182h60l-6 10H36z" fill="#C9A227"/><path d="M24 192h72v8H24z" fill="#A9861A"/><path d="M48 200h24l6 14H42z" fill="#C9A227"/></svg>`;
const ENSAYOS_PHOTO = 'img/ensayos.webp';   // costaleros bajo el paso (la que eligió el usuario) · foto: JM Cornejo
const PASION_PHOTO = 'img/pasion-nazareno.jpg';   // Nazareno por la calle, foto elegida por el usuario
const dateOverline = () => { const d = now(); return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`.toUpperCase(); };

/* ---------- Tarjeta base ---------- */
const card = ({ id, overline, title, sub = '', photo = '', pos = '', tone = '', size = '', extra = '' }) => `
  <button type="button" class="tcard ${tone} ${size}" data-card="${id}" aria-label="${esc(title)}">
    ${photo ? `<span class="tcard-media ph">${img(photo, 900, { ws:[480, 800, 1200], sizes:'(min-width:700px) 600px, 92vw', pos })}</span>` : ''}
    <span class="tcard-text"><span class="tcard-over">${overline}</span><span class="tcard-title">${title}</span></span>
    ${extra}${sub ? `<span class="tcard-sub">${sub}</span>` : ''}
  </button>`;
/* Cabecera de la tarjeta expandida (la misma imagen, a pantalla completa) */
const xhero = ({ overline, title, photo = '', pos = '', tone = '', ill = '' }) => `
  <header class="xcard-hero ${tone}">${ill}${photo ? `<span class="xcard-media ph">${img(photo, 1400, { ws:[640, 1000, 1400], sizes:'100vw', pos, eager:true })}</span>` : ''}
    <span class="tcard-text"><span class="tcard-over">${overline}</span><span class="tcard-title">${title}</span></span></header>`;

/* ---------- Cuenta atrás al Domingo de Pasión (o «Hoy en la calle») ---------- */
function countdown(){
  const { y, pascua } = nextSS(), meta = addDays(pascua, -14); meta.setHours(0, 0, 0, 0);
  const n = now(), pasion = addDays(pascua, -14);
  if (n >= addDays(pasion, 0) && n <= addDays(pascua, 1)) return { live:true, y };
  const ms = Math.max(0, meta - n), d = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4), ss = Math.floor(ms % 6e4 / 1e3);
  return { live:false, y, d, hh, mm, ss, meta };
}
function countdownCard(){
  const c = countdown();
  if (c.live) {
    const today = SS_DAYS.filter(e => e.date === TODAY);
    return card({ id:'calle', tone:'dark h-count', overline:'HOY EN LA CALLE', title: today.length ? esc(today[0].title) : `Semana Santa ${c.y}`, photo:'img/dolores.webp', pos:'50% 25%',
      extra:`<span class="tcard-foot">${today.length ? plural(hermsFor(today[0]).length, 'hermandad', 'hermandades') + ' en la calle' : 'Consulta la agenda de cada jornada'}</span>` });
  }
  // Recorrido desde el último Domingo de Pasión hasta el próximo
  const prev = addDays(easter(c.y - 1), -14), pct = Math.round(Math.min(1, Math.max(0, (now() - prev) / (c.meta - prev))) * 100);
  const unit = (k, v, l) => `<span class="hc-u"><b class="tnum" data-cd="${k}">${v}</b><i>${l}</i></span>`;
  return card({ id:'cuenta', tone:'dark h-count', overline:'CUENTA ATRÁS', title:'Domingo de Pasión', photo: PASION_PHOTO, pos:'50% 34%',
    extra:`<span class="hc-foot" aria-label="Faltan ${c.d} días, ${c.hh} horas y ${c.mm} minutos">
        <span class="hc-date">${c.meta.getDate()} de ${MONTHS[c.meta.getMonth()]} de ${c.y}</span>
        <span class="hc-row">${unit('d', c.d, c.d === 1 ? 'día' : 'días')}${unit('h', pad(c.hh), 'horas')}${unit('m', pad(c.mm), 'minutos')}</span>
        <span class="hc-bar"><i style="width:${pct}%"></i></span>
      </span>` });
}
function countdownBody(){
  const rows = HERMANDADES_DATA.map(j => { const f = JF[j.jornada]; return f ? cell({ title:titleCase(j.jornada), value:esc(fmtShort(f.iso)), go:'/hermandades' }) : ''; });
  return `<p class="x-lead">La cuenta atrás hacia el Domingo de Pasión, que abre nuestra Semana Santa. Estas son las jornadas de la próxima Semana Santa:</p>${section(rows, { foot:'Fechas calculadas a partir de la Pascua. Horarios de 2026, orientativos para 2027.' })}`;
}

/* ---------- Urda ---------- */
const urdaBody = () => `
  <p class="x-lead selectable">El pasado 28 de octubre, el choque entre un AVE de Renfe y un tren de Iryo en la línea de alta velocidad Madrid-Andalucía, a la altura de Urda (Toledo), dejó decenas de fallecidos y numerosos heridos. Desde SS Ciudad Real nos unimos al dolor de las familias y rezamos por todos ellos.</p>
  <section class="prayer selectable" aria-labelledby="pr-t"><h2 id="pr-t" class="overline">Oración</h2>
    <p>Señor Jesucristo, que en la Cruz conociste el dolor y la muerte, acoge en tu misericordia a quienes han perdido la vida en el accidente de Urda.</p>
    <p>Dales el descanso eterno y haz brillar para ellos la luz que no se apaga. Sostén a los heridos, da fortaleza a sus familias y consuela a todos los que hoy lloran.</p>
    <p>Bendice las manos de los sanitarios, los equipos de emergencia y los voluntarios que socorren a los afectados.</p>
    <p>Madre de los Dolores, tú que estuviste al pie de la Cruz, acompaña a cada familia en esta hora de dolor.</p>
    <p class="amen">Amén.</p></section>
  ${section([cell({ icon:['call','green'], title:'Renfe', value:'<span class="tnum">900 10 10 20</span>', href:'tel:+34900101020', chev:false }), cell({ icon:['call','green'], title:'Iryo', value:'<span class="tnum">900 001 403</span>', href:'tel:+34900001403', chev:false })], { head:'Atención a familiares' })}
  ${DONAR.map(([prov, list], i) => section(list.map(([c, hh, dir, hor, tels]) => `<div class="cell text-cell"><p class="t-headline">${esc(c)}</p><p class="t-subhead c2">${esc(hh)}${dir ? ' · ' + esc(dir) : ''}</p><p class="t-footnote c2">${esc(hor)}</p><p class="tel-row">${tels.map(t => /^\d/.test(t) ? `<a class="btn btn-tinted btn-sm" href="tel:+34${t.replace(/\s/g, '')}">${icon('call', 16)}<span class="tnum">${t}</span></a>` : `<span class="t-footnote c2">${esc(t)}</span>`).join('')}</p></div>`), { head: i === 0 ? `Dónde donar sangre · ${prov}` : prov, foot: i === DONAR.length - 1 ? 'Requisitos: entre 18 y 65 años, más de 50 kg y buen estado de salud. Ante la situación, los horarios pueden ampliarse: llama antes de acudir.' : '' })).join('')}
  <div class="x-actions"><button type="button" class="btn btn-gray btn-wide" data-share="urda">${icon('share', 20)} Compartir</button></div>`;

/* ---------- Piezas de la portada ----------
   Una portada tranquila: una foto grande por sección como mucho, listas limpias
   y un adorno cofrade (filete dorado con cruz) para separar. */
const LO_PROXIMO_PHOTO = {};   // foto distinta para la portada (por id de acto); si no, la del acto
const NEWS_FIRST = 8;                                                                        // noticia destacada: el certamen
const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysTo = iso => Math.round((parseISO(iso) - day0()) / 864e5);
const inDays = iso => { const n = daysTo(iso); return n <= 0 ? 'Hoy' : n === 1 ? 'Mañana' : `En ${n} días`; };
const mon3 = iso => MONTHS[parseISO(iso).getMonth()].slice(0, 3);
const evPhoto = e => LO_PROXIMO_PHOTO[e.id] || e.image || (hermsFor(e)[0] && hermsFor(e)[0].h.image);
const daysTxt = (e, d) => { const all = evDates(e), ds = all.filter(x => x >= d), m = MONTHS[parseISO(d).getMonth()];
  // Actos de varios días: el día de hoy dice si es el primero o el último
  if (d === TODAY && all.length > 1) return `${d === all[0] ? 'Primer día' : d === all[all.length - 1] ? 'Último día' : 'Hoy'} · ${all.map(x => parseISO(x).getDate()).join(', ').replace(/, (\d+)$/, ' y $1')} de ${m}`;
  return ds.length > 1 ? `${ds.map(x => parseISO(x).getDate()).join(', ').replace(/, (\d+)$/, ' y $1')} de ${m}` : `${cap(WEEKDAYS[parseISO(d).getDay()])}, ${parseISO(d).getDate()} de ${m}`; };
const shead = (over, title, link = '') => `<header class="h-sec-head"><div><p class="h-over">${over}</p><h2 class="h-title">${title}</h2></div>${link}</header>`;

/* Lo próximo: un acto, a lo grande */
function featuredEvent(e, d){
  return `<button type="button" class="h-feature" data-card="ev-${e.id}-${d}" aria-label="${esc(e.title)}">
    <span class="h-feature-media ph">${img(evPhoto(e), 1000, { ws:[640, 1000], sizes:'(min-width:1000px) 50vw, 92vw', pos: LO_PROXIMO_PHOTO[e.id] ? '50% 28%' : (e.imagePos || '50% 25%') })}</span>
    <span class="h-feature-text"><span class="h-feature-title">${esc(e.title)}</span>
      <span class="h-feature-meta">${esc(daysTxt(e, d))}${timeOf(e) ? ` · ${timeOf(e)} h` : ''}${e.location ? `<br>${esc(e.location)}` : ''}</span></span></button>`;
}
/* Próximos días: lista sobria */
const dayRows = list => `<div class="h-list">${list.map(({ e, d }) => `<button type="button" class="h-row" data-ev="${e.id}|${d}">
  <span class="h-date"><b class="tnum">${parseISO(d).getDate()}</b><i>${mon3(d)}</i></span>
  <span class="h-row-main"><span class="h-row-title">${esc(e.title)}</span><span class="h-row-sub">${esc([timeOf(e) ? timeOf(e) + ' h' : '', e.location].filter(Boolean).join(' · '))}</span></span>
  ${icon('chevR', 16, 'h-chev')}</button>`).join('')}</div>`;
/* Ensayos: tarjeta horizontal */
function ensayosRow(){
  const c = nextCitas(1)[0];
  return `<button type="button" class="h-ens" data-card="ensayos">
    <span class="h-ens-media ph">${img(ENSAYOS_PHOTO, 500, { pos:'50% 40%' })}</span>
    <span class="h-ens-text"><span class="h-over">Costaleros · Cuaresma</span><span class="h-ens-title">Ensayos e igualás</span>
      ${c ? `<span class="h-ens-next">Próxima: <b>${esc(c.title)}</b><br>${esc(c.p.paso)} · ${parseISO(c.iso).getDate()} de ${MONTHS[parseISO(c.iso).getMonth()]}</span>` : ''}</span>
    ${icon('chevR', 18, 'h-chev')}</button>`;
}
/* Noticias: tres titulares */
const newsRows = list => `<div class="h-list">${list.map(n => `<button type="button" class="h-news" data-news="${n.id}">
  <span class="h-news-pic ph">${img(n.coverImage, 300, { pos:n.coverPos || '' })}</span>
  <span class="h-row-main"><span class="h-row-date">${esc(fmtNewsDate(n.date))}</span><span class="h-news-title">${esc(n.title)}</span></span></button>`).join('')}</div>`;

/* ---------- Pantalla ---------- */
register('/hoy', 'hoy', () => {
  const bodies = {};
  bodies.urda = { overline:'EN MEMORIA', title:'Por las víctimas de Urda', tone:'mourning', body:urdaBody };
  bodies.cuenta = { overline:'CUENTA ATRÁS', title:`Domingo de Pasión ${countdown().y}`, photo:PASION_PHOTO, pos:'50% 38%', tone:'dark', body:countdownBody };
  const seen = new Set(), upcoming = nextEvent().filter(x => x.d >= TODAY && !x.e.quiet && !(x.e.doneAt && Date.now() >= Date.parse(x.e.doneAt) && evDates(x.e).every(d => d <= TODAY)) && !seen.has(x.e.id) && seen.add(x.e.id));
  // Lo próximo: el primer acto con foto. Si hoy hay varios, los dos más destacados (el acto
  // señalado y un besamanos van antes que un culto que ya lleva días).
  const rank = x => x.e.feature ? 0 : x.e.type === 'besamanos' ? 1 : 2;
  const today = upcoming.filter(x => x.d === TODAY && evPhoto(x.e)).sort((a, b) => rank(a) - rank(b)).slice(0, 2);
  const bigs = today.length ? today : upcoming.filter(x => evPhoto(x.e)).slice(0, 1), big = bigs[0];
  const rest = upcoming.filter(x => !bigs.includes(x)).slice(0, 4);
  bigs.forEach(b => { bodies[`ev-${b.e.id}-${b.d}`] = { overline: b.d === TODAY ? 'HOY' : 'LO PRÓXIMO', title:esc(b.e.title), photo:evPhoto(b.e), pos: LO_PROXIMO_PHOTO[b.e.id] ? '50% 28%' : (b.e.imagePos || ''), tone:'dark', event:{ id:b.e.id, d:b.d } }; });
  const news = [NOTICIAS.find(n => n.id === NEWS_FIRST), ...NOTICIAS.filter(n => n.id !== NEWS_FIRST)].filter(Boolean).slice(0, 3);
  const my = prefs.hermandad && hermById(prefs.hermandad), pd = my && procDateFor(my);
  const memorial = now() < new Date(2026, 10, 3) ? `<button type="button" class="h-memorial" data-card="urda">${icon('lazo', 22)}<span><b>En memoria de las víctimas de Urda</b><small>Oración, teléfonos de ayuda y dónde donar sangre</small></span>${icon('chevR', 16, 'h-chev')}</button>` : '';

  // Aviso de álbum nuevo en la Fototeca (se quita solo al pasar la fecha)
  const NEW_ALBUM = { id:'2026-11-05-soledad-triduo', hasta:new Date(2026, 10, 23), foto:'img/fototeca/2026-11-05-soledad-triduo/02.webp', title:'Triduo a la Soledad', sub:'12 fotografías de SS Ciudad Real' };
  const newAlbum = now() < NEW_ALBUM.hasta ? `<section class="h-sec h-a-album"><button type="button" class="h-ens" data-card="album"><span class="h-ens-media ph">${img(NEW_ALBUM.foto, 500, { pos:'50% 22%' })}</span><span class="h-ens-text"><span class="h-over">Nuevo en la Fototeca</span><span class="h-ens-title">${esc(NEW_ALBUM.title)}</span><span class="h-ens-next">${esc(NEW_ALBUM.sub)}</span></span>${icon('chevR', 18, 'h-chev')}</button></section>` : '';

  // Oración del día en las festividades (solo el día que toca; se repite cada año)
  const ORACIONES = {
    '12-08': ['Inmaculada Concepción', ['Bendita sea tu pureza y eternamente lo sea, pues todo un Dios se recrea en tan graciosa belleza.', 'A ti, celestial Princesa, Virgen sagrada María, yo te ofrezco en este día alma, vida y corazón. Mírame con compasión, no me dejes, Madre mía.']],
    '12-25': ['Natividad del Señor', ['Hoy nos ha nacido un Salvador: el Mesías, el Señor.', 'Niño Dios, que te hiciste uno de nosotros, llena el mundo de tu paz y nuestras familias de tu alegría.', 'Que esta Navidad te reconozcamos en el que sufre, en el que está solo y en el que más nos necesita.']],
    '01-06': ['Epifanía del Señor', ['Señor, que guiaste a los Magos de Oriente con la luz de una estrella, guíanos también a nosotros hasta ti.', 'Como ellos, queremos ofrecerte lo mejor que tenemos: nuestra fe, nuestro trabajo y nuestro amor.', 'Que nunca dejemos de buscarte y que, al encontrarte, sepamos volver a casa por otro camino, el tuyo.']]
  };
  const ora = ORACIONES[TODAY.slice(5)];
  const prayer = ora ? `<section class="h-sec h-a-prayer"><div class="prayer selectable"><p class="overline">Oración · ${ora[0]}</p>${ora[1].map(p => `<p>${p}</p>`).join('')}<p class="amen">Amén.</p></div></section>` : '';

  // Foto de portada según el día (la de siempre es la Soledad; los días señalados cambia sola).
  // Cada foto va en img/ como NOMBRE.jpg (1200 px) y NOMBRE-640.jpg; «listo:false» hasta tenerla.
  const PORTADAS = [
    { desde:'2026-11-22', hasta:'2026-11-22', f:'img/portada-cristo-rey', alt:'Nazareno con la cruz al hombro, corona de espinas y potencias, ante un cuadro', pos:'44% 38%', listo:true },
    { desde:'2026-11-27', hasta:'2026-11-27', f:'img/portada-milagrosa', alt:'Virgen de la Medalla Milagrosa en un retablo cerámico', pos:'50% 22%', listo:true },
    { desde:'2026-12-01', hasta:'2026-12-31', f:'img/portada-diciembre', alt:'Nuestra Señora de la Esperanza en su altar de cultos, con corona de estrellas, manto verde y rosario entre las manos', pos:'50% 26%', listo:true }
  ];
  const por = PORTADAS.find(p => p.listo && TODAY >= p.desde && TODAY <= p.hasta) || { f:'img/portada', alt:'Dolorosa bajo palio, con corona y ráfaga, entre la candelería' };

  const content = `
    <header class="home-hero">
      <picture class="hh-photo"><img src="${por.f}.jpg" srcset="${por.f}-640.jpg 600w, ${por.f}.jpg 1200w" sizes="(min-width:1024px) 55vw, 100vw" alt="${por.alt}"${por.pos ? ` style="object-position:${por.pos}"` : ''} width="768" height="1024" fetchpriority="high" decoding="async"></picture>
      <div class="hh-text">
        <p class="hh-over">${dateOverline()}</p>
        <h1 class="hh-title">Semana Santa<span>de Ciudad Real</span></h1>
        <p class="hh-quote">La idea no es grabar, es sentir.</p>
      </div>
    </header>
    <div class="h-page">
      ${memorial}
      <div class="h-cols">
        <div class="h-col">
          <section class="h-sec h-a-count">${countdownCard()}</section>
          ${big ? `<section class="h-sec h-a-next${bigs.length > 1 ? ' two' : ''}">${shead('Lo próximo', big.d === TODAY ? 'Hoy' : esc(inDays(big.d)))}${bigs.map(b => featuredEvent(b.e, b.d)).join('')}</section>` : ''}
        </div>
        <div class="h-col">
          ${prayer}
          ${newAlbum}
          ${rest.length ? `<section class="h-sec h-a-days">${shead('Agenda', 'Próximos días', '<button type="button" class="h-link" data-go="/agenda">Ver agenda</button>')}${dayRows(rest)}</section>` : ''}
          <section class="h-sec h-a-ens">${ensayosRow()}</section>
          ${my ? `<section class="h-sec h-a-mine"><button type="button" class="h-ens" data-card="mia"><span class="h-ens-media ph">${img(my.h.image, 500, { pos:'50% 22%' })}</span><span class="h-ens-text"><span class="h-over">Mi hermandad</span><span class="h-ens-title">${esc(my.name)}</span>${pd ? `<span class="h-ens-next">${esc(pd.title)} · ${fmtShort(pd.iso)}</span>` : ''}</span>${icon('chevR', 18, 'h-chev')}</button></section>` : ''}
          ${news.length ? `<section class="h-sec h-a-news">${shead('Actualidad', 'Noticias', '<button type="button" class="h-link" data-go="/noticias">Ver todas</button>')}${newsRows(news)}</section>` : ''}
        </div>
      </div>
    </div>
    <section class="today-band" aria-labelledby="jj-t">
      <div class="tb-head"><div><p class="h-over">Hermandades</p><h2 class="h-title" id="jj-t">Jornada a jornada</h2></div><button type="button" class="h-link" data-go="/hermandades">Ver todas</button></div>
      <div class="cband cband-today" role="group" aria-label="Fotos de las hermandades. Toca una para abrir su ficha"></div>
    </section>
    <p class="home-foot">Fiesta de Interés Turístico Nacional<br>Fotografías de hermandades: Laura Arroyo · Objetivo Cofrade</p>`;

  const timers = [];
  return screen({ title:'Hoy', navTitle:'SS Ciudad Real', large:false, clearNav:true, right: profileBtn(), content, setup: s => {
    s.el.classList.add('has-stretch', 'home'); s.navbar.classList.remove('show-title');
    const hero = $('.home-hero', s.el), nav = s.navbar;
    s.scroller.addEventListener('scroll', () => {
      const yy = s.scroller.scrollTop;
      hero.querySelector('img').style.transform = yy < 0 ? `scale(${1 + -yy / 600})` : `translateY(${yy * 0.3}px)`;
      // El logo (Ajustes) va arriba a la derecha y se va con la página al bajar; sin barra ni fundido
      nav.style.transform = yy > 0 ? `translateY(${-yy}px)` : '';
    }, { passive:true });
    const band = $('.cband-today', s.el);
    curvedBand(band, bandItems('all'), { speed:3.6, tileHeight:72, curve:70, fade:10 });
    band.addEventListener('click', e => { const t = e.target.closest('[data-herm-band]'); if (!t) return; const [j, i] = t.dataset.hermBand.split('|'); const x = HERMS.find(z => z.j === j && z.i === +i); if (x) navigate(`/hermandades/${x.id}`); });

    // Sin fundido al bajar: las secciones están siempre visibles

    s.el.addEventListener('click', e => {
      const r = e.target.closest('[data-ev]'); if (r) { const [id, d] = r.dataset.ev.split('|'); openEvent(+id, d); return; }
      const nw = e.target.closest('[data-news]'); if (nw) { navigate(`/noticias/${nw.dataset.news}`); return; }
      const c = e.target.closest('[data-card]'); if (!c) return;
      const id = c.dataset.card;
      if (id === 'mia') { navigate(`/hermandades/${prefs.hermandad}`); return; }
      if (id === 'calle') { navigate('/hermandades'); return; }
      if (id === 'ensayos') { navigate('/ensayos'); return; }
      if (id === 'album') { navigate(`/fototeca/album/${NEW_ALBUM.id}`); return; }
      const b = bodies[id]; if (!b) return;
      const hero2 = xhero(b);
      if (b.event) { const v = eventView(b.event.id, b.event.d, { hero:false }); expandCard(c, { hero:hero2, body: v.html, label:b.title, wire: el => v.wire(el) }); return; }
      expandCard(c, { hero:hero2, body: b.body(), label:b.title, wire: el => el.addEventListener('click', ev => { if (ev.target.closest('[data-share=urda]')) share('Oración por las víctimas de Urda y dónde donar sangre', `${location.origin}/hoy`, toast); }) });
    });
    // Cuenta atrás al minuto (sin segundos: más calma)
    timers.push(setInterval(() => {
      const c = countdown(); if (c.live) return;
      const set = (k, v) => { const el = $(`[data-cd="${k}"]`, s.el); if (el && el.textContent != v) el.textContent = v; };
      set('d', c.d); set('h', pad(c.hh)); set('m', pad(c.mm));
    }, 15000));
  }, onDestroy: () => timers.forEach(clearInterval) });
});
