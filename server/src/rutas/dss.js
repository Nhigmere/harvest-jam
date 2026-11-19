// /api/dss — Módulo de apoyo a decisiones (indicadores, prioridades y escenarios).
import { Router } from 'express';
import * as dssDao from '../dao/dss.js';
import { compararEscenarios } from '../dss/escenarios.js';
import { DEFINICION_INDICADORES } from '../dss/indicadores.js';
import { evaluarReabastecimiento, PARAMETROS_DEFECTO } from '../dss/modelo.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';

const router = Router();

function leerOpcionesEscenario(origen, paramsBd) {
  const base = paramsBd ?? PARAMETROS_DEFECTO;
  const numAcotado = (valor, defecto, min, max) => {
    if (valor === undefined || valor === null || valor === '') return defecto;
    const n = Number(valor);
    if (!Number.isFinite(n)) return defecto;
    return Math.min(Math.max(n, min), max);
  };
  const presRaw = origen.presupuesto;
  const presupuesto = presRaw === undefined || presRaw === null || presRaw === ''
    ? null
    : Math.max(Number(presRaw) || 0, 0);

  return {
    ...base,
    factorDemanda: numAcotado(origen.factorDemanda, 1, 0.2, 3),
    extraEntrega: Math.round(numAcotado(origen.extraEntrega, 0, 0, 15)),
    colchonDias: Math.round(numAcotado(origen.colchonDias, base.colchonDias, 0, 14)),
    coberturaObjetivo: Math.round(numAcotado(origen.coberturaObjetivo, base.coberturaObjetivo, 1, 30)),
    minDiasVentas: Math.round(numAcotado(origen.minDiasVentas, base.minDiasVentas, 1, 28)),
    presupuesto,
  };
}

router.get('/analisis', requiere(P.VER_DSS), ruta(async (req, res) => {
  const [productos, paramsBd, corridasEtl, corridasDss] = await Promise.all([
    dssDao.leerResumenProductos(req.consultar),
    dssDao.leerParametrosDss(req.consultar),
    dssDao.listarCorridasEtl(req.consultar, 5),
    dssDao.listarCorridasDss(req.consultar, 8),
  ]);

  const opciones = leerOpcionesEscenario(req.query, paramsBd);
  const evaluacion = evaluarReabastecimiento(productos, opciones);
  const escenarios = compararEscenarios(productos, {
    ...opciones,
    factorDemanda: 1,
    extraEntrega: 0,
  });

  const ultimaCompleta = corridasEtl.find((c) => c.modo === 'completo') ?? null;

  res.json({
    etlListo: productos.length > 0,
    fechaCorte: productos[0]?.fechaCorte ?? ultimaCompleta?.fechaCorte ?? null,
    ultimaCorridaEtl: ultimaCompleta,
    definicionIndicadores: DEFINICION_INDICADORES,
    evaluacion,
    escenarios,
    corridasGuardadas: corridasDss,
  });
}));

router.post('/guardar-corrida', requiere(P.EJECUTAR_DSS), ruta(async (req, res) => {
  const [productos, paramsBd] = await Promise.all([
    dssDao.leerResumenProductos(req.consultar),
    dssDao.leerParametrosDss(req.consultar),
  ]);

  const opciones = leerOpcionesEscenario(req.body ?? {}, paramsBd);
  const escenario = String(req.body?.escenario ?? 'Escenario personalizado').slice(0, 60);
  const evaluacion = evaluarReabastecimiento(productos, opciones);
  const fechaCorte = productos[0]?.fechaCorte ?? null;

  const guardada = await req.transaccion((q) => dssDao.guardarCorridaDss(q, {
    ejecutadoPor: req.sesion.empleado?.nombre ?? req.sesion.usuario,
    escenario,
    evaluacion,
    fechaCorte,
  }));

  res.status(201).json({ ...guardada, escenario, resumen: evaluacion.resumen });
}));

export default router;
