import assert from 'node:assert/strict';
import test from 'node:test';
import { compararEscenarios } from '../src/dss/escenarios.js';
import { calcularIndicadoresProducto } from '../src/dss/indicadores.js';
import { evaluarReabastecimiento } from '../src/dss/modelo.js';

const prodEjemploGuia = {
  codigo: 5023,
  descripcion: 'Cebolla',
  categoria: 'verdura',
  unidadMedida: 'kilogramo',
  existencia: 12,
  precioC: 18,
  precioV: 30,
  stockMinimo: 15,
  vidaUtilDias: 21,
  diasEntrega: 5,
  entregaImputada: false,
  proveedorPrincipal: 'Verduras la Guadalupana',
  diasConVentas: 24,
  unidadesVendidas: 112, // 112 / 28 = 4 kg/día
  demandaDiariaBase: 4,
  ventanaDias: 28,
};

test('Ejemplo de la guía: 12 u, 4/día, entrega 5 días → cobertura 3.0, margen -2, Crítica', () => {
  const ind = calcularIndicadoresProducto({
    existencia: 12,
    demandaDiaria: 4,
    stockMinimo: 15,
    diasEntrega: 5,
    vidaUtilDias: 21,
    precioCompra: 18,
    precioVenta: 30,
    diasConVentas: 24,
    minDiasVentas: 5,
  });
  assert.equal(ind.diasCobertura, 3);
  assert.equal(ind.margenEntrega, -2);
  assert.equal(ind.brechaMinimo, -3);
  assert.equal(ind.riesgoMerma, false);

  const res = evaluarReabastecimiento([prodEjemploGuia]);
  assert.equal(res.recomendaciones[0].prioridad, 'critica');
  assert.equal(res.recomendaciones[0].esEmergencia, true);
  assert.ok(res.recomendaciones[0].cantidadSugerida > 0);
});

test('Casos límite: demanda 0 sin Infinity, existencia 0 emergencia y datos insuficientes', () => {
  const sinDemanda = {
    ...prodEjemploGuia, codigo: 5030, descripcion: 'Arandano', existencia: 20,
    demandaDiariaBase: 0, unidadesVendidas: 0, diasConVentas: 0,
  };
  const pocosDias = {
    ...prodEjemploGuia, codigo: 5031, descripcion: 'Mango', existencia: 10,
    demandaDiariaBase: 2, unidadesVendidas: 6, diasConVentas: 3,
  };
  const agotado = {
    ...prodEjemploGuia, codigo: 5032, descripcion: 'Fresa', existencia: 0,
    demandaDiariaBase: 3, unidadesVendidas: 84, diasConVentas: 20, diasEntrega: 1, vidaUtilDias: 4,
  };

  const res = evaluarReabastecimiento([sinDemanda, pocosDias, agotado]);
  const porCodigo = new Map(res.recomendaciones.map((r) => [r.codigo, r]));

  assert.equal(porCodigo.get(5030).diasCobertura, null);
  assert.equal(porCodigo.get(5030).prioridad, 'insuficientes');
  assert.equal(porCodigo.get(5031).prioridad, 'insuficientes');
  assert.equal(porCodigo.get(5031).cantidadSugerida, 0);

  // Agotado → emergencia crítica y topada por vida útil de 4 días (4 * 3 = 12 kg máximo)
  assert.equal(porCodigo.get(5032).prioridad, 'critica');
  assert.equal(porCodigo.get(5032).esEmergencia, true);
  assert.equal(porCodigo.get(5032).cantidadSugerida, 12);
  assert.equal(porCodigo.get(5032).limitadaPorVidaUtil, true);
});

test('Presupuesto restringido y sobreabastecido por riesgo de merma', () => {
  const sobre = {
    ...prodEjemploGuia, codigo: 5050, descripcion: 'Cilantro', existencia: 90,
    demandaDiariaBase: 5, diasConVentas: 20, diasEntrega: 1, vidaUtilDias: 3, stockMinimo: 25,
  };
  const res = evaluarReabastecimiento([prodEjemploGuia, sobre], { presupuesto: 100 });
  const porCodigo = new Map(res.recomendaciones.map((r) => [r.codigo, r]));

  // Cobertura 18 días > vida útil 3 días → sobreabastecido, 0 compra
  assert.equal(porCodigo.get(5050).prioridad, 'sobreabastecido');
  assert.equal(porCodigo.get(5050).cantidadSugerida, 0);

  // Con presupuesto de $100 no alcanza el pedido de cebolla → fuera de presupuesto
  assert.equal(porCodigo.get(5023).enPresupuesto, false);
  assert.equal(res.resumen.fueraPresupuesto, 1);
});

test('Escenarios comparan 4 casos y el orden es reproducible', () => {
  const escenarios = compararEscenarios([prodEjemploGuia]);
  assert.equal(escenarios.length, 4);
  assert.deepEqual(escenarios.map((e) => e.id), ['base', 'demanda_alta', 'demanda_baja', 'retraso_proveedor']);

  const r1 = evaluarReabastecimiento([prodEjemploGuia]);
  const r2 = evaluarReabastecimiento([prodEjemploGuia]);
  assert.deepEqual(r1.recomendaciones, r2.recomendaciones);
});
