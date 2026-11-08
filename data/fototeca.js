/* SS Ciudad Real · Fototeca propia: un álbum por triduo o culto.
   Las fotos llevan ya la marca de agua (fundido oscuro y logo blanco).
   Para añadir un álbum: deja las fotos en «PÁGINA WEB/Fototeca/<fecha> <nombre>/»
   y ejecuta _build/marca.py (ver CAMBIOS.md). */
const ALBUMES = [
  {
    id: '2026-09-15-dolores-santiago',
    fecha: '2026-09-15',
    tipo: 'culto',                          // culto | triduo | quinario | septenario | besamanos | traslado…
    titulo: 'Nuestra Señora de los Dolores',
    hermandad: 'Dolores (Santiago)',        // se busca en HERMANDADES_DATA para enlazar su ficha
    lugar: '',                              // vacío: se usa la sede de la hermandad
    portada: 2,                             // la de cuerpo entero con la corona
    fotos: ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp']
  },
  /* Próximamente: álbumes sin fotos todavía (fotos: []). En la tarjeta sale «Próximamente».
     fechaTxt: lo que se muestra cuando aún no hay día exacto (fecha solo sirve para ordenar). */
  {
    id: '2026-11-05-soledad-triduo',
    fecha: '2026-11-05',
    fechaTxt: '5, 6 y 7 de noviembre de 2026',
    tipo: 'triduo',
    titulo: 'Triduo a Nuestra Señora de la Soledad',
    hermandad: 'Soledad',
    lugar: '',
    fotos: []
  },
  {
    id: '2026-09-15-dolores-ave-maria',
    fecha: '2026-09-15',
    tipo: 'culto',
    titulo: 'Nuestra Señora de los Dolores (Ave María)',
    hermandad: 'Ave María',
    lugar: 'Catedral',
    portada: 4,
    fotos: ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp', '06.webp', '07.webp']
  },
  {
    id: '2026-09-dulce-nombre',
    fecha: '2026-09-12',
    tipo: 'culto',
    titulo: 'María Santísima del Dulce Nombre',
    hermandad: 'Santa Cena',
    lugar: '',
    portada: 6,
    fotos: ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp', '06.webp', '07.webp', '08.webp', '09.webp', '10.webp']
  },
  {
    id: '2026-09-misericordia',
    fecha: '2026-09-25',
    tipo: 'culto',
    titulo: 'Santísima Virgen de la Misericordia',
    hermandad: 'Misericordia',
    lugar: '',
    portada: 0,
    fotos: ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp', '06.webp', '07.webp']
  }
];
