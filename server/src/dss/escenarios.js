// Comparador de escenarios del DSS (4 escenarios de PLAN_DSS.md).
import { evaluarReabastecimiento } from './modelo.js';

export const ESCENARIOS_PREDEFINIDOS = [
  {
    id: 'base',
    nombre: 'Escenario base',
    descripcion: 'Demanda normal y plazos estándar de proveedores',
    factorDemanda: 1.0,
    extraEntrega: 0,
  },
  {
    id: 'demanda_alta',
    nombre: 'Demanda +20 %',
    descripcion: 'Temporada alta o fin de semana fuerte',
    factorDemanda: 1.2,
    extraEntrega: 0,
  },
  {
    id: 'demanda_baja',
    nombre: 'Demanda −20 %',
    descripcion: 'Semana tranquila con menor afluencia',
    factorDemanda: 0.8,
    extraEntrega: 0,
  },
  {
    id: 'retraso_proveedor',
    nombre: 'Proveedor +2 días',
    descripcion: 'Retraso logístico en entregas de abasto',
    factorDemanda: 1.0,
    extraEntrega: 2,
  },
];

export function compararEscenarios(productos, parametrosBase = {}) {
  const baseEval = evaluarReabastecimiento(productos, {
    ...parametrosBase,
    factorDemanda: 1.0,
    extraEntrega: 0,
  });
  const prioridadBase = new Map(baseEval.recomendaciones.map((r) => [r.codigo, r.prioridad]));

  return ESCENARIOS_PREDEFINIDOS.map((esc) => {
    const res = evaluarReabastecimiento(productos, {
      ...parametrosBase,
      factorDemanda: esc.factorDemanda,
      extraEntrega: esc.extraEntrega,
    });

    const cambiosPrioridad = res.recomendaciones
      .filter((r) => prioridadBase.get(r.codigo) !== r.prioridad)
      .map((r) => ({
        codigo: r.codigo,
        descripcion: r.descripcion,
        antes: prioridadBase.get(r.codigo),
        despues: r.prioridad,
      }));

    return {
      ...esc,
      resumen: res.resumen,
      cambiosPrioridad,
    };
  });
}
