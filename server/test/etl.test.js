import assert from 'node:assert/strict';
import test from 'node:test';
import { LOTE_PRUEBA_PARAMETROS, LOTE_PRUEBA_VENTAS } from '../src/etl/datosPrueba.js';
import {
  leerCsv, limpiarTexto, normalizarCodigo, normalizarFecha, normalizarNumero,
  procesarEntregasCsv, procesarParametrosCsv, procesarVentas,
} from '../src/etl/reglas.js';

test('L1–L3: normaliza códigos, textos, decimales con coma y fechas mixtas', () => {
  assert.deepEqual(normalizarCodigo(' 5000'), { valor: 5000, cambio: true, valido: true });
  assert.deepEqual(normalizarCodigo('05001'), { valor: 5001, cambio: true, valido: true });
  assert.equal(limpiarTexto('  cebolla   BLANCA ').valor, 'Cebolla blanca');
  assert.equal(normalizarNumero('12,5').valor, 12.5);
  assert.equal(normalizarFecha('05/11/2026', '2026-11-19').valor, '2026-11-05');
  assert.equal(normalizarFecha('2099-05-01', '2026-11-19').valido, false);
});

test('CSV parametros: limpia sucios, deduplica por fecha reciente y rechaza inválidos', () => {
  const codigos = new Set([5023, 5027]);
  const res = procesarParametrosCsv(LOTE_PRUEBA_PARAMETROS, codigos, { hoyIso: '2026-11-19' });

  // Solo 5023 queda limpio (con el registro más reciente: stockMinimo 15)
  assert.equal(res.limpios.length, 1);
  assert.equal(res.limpios[0].codigo, 5023);
  assert.equal(res.limpios[0].stockMinimo, 15);

  // 9999 (V1) y 5027 con vida útil 0 (V3) van a cuarentena
  assert.equal(res.rechazos.length, 2);
  assert.deepEqual(res.rechazos.map((r) => r.regla).sort(), ['V1', 'V3']);

  // Registra limpiezas L1, L2, L3, L4 y rechazos V1, V3
  const reglas = new Set(res.cambios.map((c) => c.regla));
  assert.ok(reglas.has('L1'));
  assert.ok(reglas.has('L2'));
  assert.ok(reglas.has('L3'));
  assert.ok(reglas.has('L4'));
});

test('CSV entregas: imputa faltantes (I1) y rechaza fuera de rango (V3) o fecha mala (V4)', () => {
  const csv = [
    'codigo,id_p,dias_entrega,fecha_actualizacion',
    '5017,2004,,2026-11-05',
    '5014,2009,400,2026-11-05',
    '5008,2015,2,fecha-mala',
  ].join('\n');
  const filas = leerCsv(csv);
  const res = procesarEntregasCsv(filas, new Set([5017, 5014, 5008]), { hoyIso: '2026-11-19' });

  assert.equal(res.limpios.length, 1);
  assert.equal(res.limpios[0].codigo, 5017);
  assert.equal(res.limpios[0].diasEntrega, 2);
  assert.equal(res.limpios[0].entregaImputada, true);
  assert.equal(res.cambios.some((c) => c.tipo === 'IMPUTADO' && c.regla === 'I1'), true);
  assert.deepEqual(res.rechazos.map((r) => r.regla).sort(), ['V3', 'V4']);
});

test('Ventas de prueba: deduplica (L4) y rechaza cantidad negativa, precio 0 y fecha futura', () => {
  const catalogo = new Map([
    [5000, { codigo: 5000, descripcion: 'manzana roja', categoria: 'fruta', unidad_medida: 'kilogramo', precio_c: 40.5, precio_v: 65 }],
    [5023, { codigo: 5023, descripcion: 'cebolla', categoria: 'verdura', unidad_medida: 'kilogramo', precio_c: 18, precio_v: 23 }],
    [5024, { codigo: 5024, descripcion: 'tomate rojo', categoria: 'verdura', unidad_medida: 'kilogramo', precio_c: 15, precio_v: 23 }],
    [5007, { codigo: 5007, descripcion: 'naranja', categoria: 'fruta', unidad_medida: 'kilogramo', precio_c: 20, precio_v: 35 }],
  ]);
  const res = procesarVentas(LOTE_PRUEBA_VENTAS, catalogo, { hoyIso: '2026-11-19' });

  // Solo 1 venta válida (el duplicado de 99001 se descartó con L4)
  assert.equal(res.limpios.length, 1);
  assert.equal(res.limpios[0].folioV, 99001);
  assert.equal(res.limpios[0].importe, 162.5);

  // 3 rechazos: V2 (-4), V3 (precio 0), V4 (fecha 2099)
  assert.equal(res.rechazos.length, 3);
  assert.deepEqual(res.rechazos.map((r) => r.regla).sort(), ['V2', 'V3', 'V4']);
});
