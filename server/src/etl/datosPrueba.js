// Casos de prueba con anomalías controladas para demostrar limpieza y cuarentena en vivo.
// Este lote nunca modifica las tablas del POS ni las cifras reales de etl.venta_limpia.

export const LOTE_PRUEBA_PARAMETROS = [
  {
    _renglon: 1,
    codigo: ' 5023',
    descripcion: '  cebolla   BLANCA ',
    categoria: 'VERDURAS ',
    unidad_medida: 'kg',
    stock_minimo: '12,5',
    vida_util_dias: '21',
    fecha_actualizacion: '05/11/2026',
  },
  {
    _renglon: 2,
    codigo: '5023',
    descripcion: 'cebolla',
    categoria: 'verdura',
    unidad_medida: 'kilogramo',
    stock_minimo: '15',
    vida_util_dias: '21',
    fecha_actualizacion: '2026-11-10',
  },
  {
    _renglon: 3,
    codigo: '9999',
    descripcion: 'producto inexistente',
    categoria: 'fruta',
    unidad_medida: 'kilogramo',
    stock_minimo: '10',
    vida_util_dias: '7',
    fecha_actualizacion: '2026-11-10',
  },
  {
    _renglon: 4,
    codigo: '5027',
    descripcion: 'fresa sin vida util',
    categoria: 'fruta',
    unidad_medida: 'kilogramo',
    stock_minimo: '10',
    vida_util_dias: '0',
    fecha_actualizacion: '2026-11-10',
  },
];

export const LOTE_PRUEBA_VENTAS = [
  {
    folio_v: 99001,
    fecha: '2026-11-10T10:15:00',
    codigo: 5000,
    cantidad: '2.5',
    precio_unitario: '65',
  },
  {
    // Duplicado exacto del folio 99001 producto 5000 → L4
    folio_v: 99001,
    fecha: '2026-11-10T10:15:00',
    codigo: 5000,
    cantidad: '2.5',
    precio_unitario: '65',
  },
  {
    // Cantidad negativa → V2 (Cuarentena)
    folio_v: 99002,
    fecha: '2026-11-10T11:00:00',
    codigo: 5023,
    cantidad: '-4',
    precio_unitario: '23',
  },
  {
    // Precio en cero → V3 (Cuarentena)
    folio_v: 99003,
    fecha: '2026-11-10T11:30:00',
    codigo: 5024,
    cantidad: '3',
    precio_unitario: '0',
  },
  {
    // Fecha futura → V4 (Cuarentena)
    folio_v: 99004,
    fecha: '2099-05-01T09:00:00',
    codigo: 5007,
    cantidad: '2',
    precio_unitario: '35',
  },
];
