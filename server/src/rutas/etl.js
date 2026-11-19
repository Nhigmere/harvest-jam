// /api/etl — Bitácora y ejecución del proceso ETL.
import { Router } from 'express';
import * as dssDao from '../dao/dss.js';
import { ejecutarEtl } from '../etl/ejecutar.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { paginacion } from '../validacion.js';

const router = Router();
const ENTIDADES = new Set(['parametros', 'entregas', 'ventas', 'resumen']);
const TIPOS = new Set(['LIMPIADO', 'IMPUTADO', 'RECHAZADO', 'CARGADO']);

router.get('/corridas', requiere(P.VER_ETL), ruta(async (req, res) => {
  const corridas = await dssDao.listarCorridasEtl(req.consultar, 25);
  res.json({ corridas });
}));

router.get('/cambios', requiere(P.VER_ETL), ruta(async (req, res) => {
  const corridaRaw = Number.parseInt(req.query.corridaId ?? '', 10);
  const filtros = {
    corridaId: Number.isFinite(corridaRaw) && corridaRaw > 0 ? corridaRaw : null,
    entidad: ENTIDADES.has(req.query.entidad) ? req.query.entidad : null,
    tipo: TIPOS.has(req.query.tipo) ? req.query.tipo : null,
    buscar: req.query.buscar?.trim() || null,
  };
  const pag = paginacion(req.query, { limitePorDefecto: 40 });
  const [lista, resumen, corridas] = await Promise.all([
    dssDao.listarCambiosEtl(req.consultar, { ...filtros, ...pag }),
    dssDao.resumenCambiosEtl(req.consultar, filtros),
    dssDao.listarCorridasEtl(req.consultar, 20),
  ]);
  res.json({
    ...lista,
    resumen,
    corridas,
    ultimaCorrida: corridas[0] ?? null,
    pagina: pag.pagina,
    limite: pag.limite,
  });
}));

router.post('/ejecutar', requiere(P.EJECUTAR_ETL), ruta(async (req, res) => {
  const modo = req.body?.modo === 'prueba' ? 'prueba' : 'completo';
  const ejecutadoPor = req.sesion.empleado?.nombre ?? req.sesion.usuario;
  const resultado = await ejecutarEtl(req.sesion.pool, { modo, ejecutadoPor });
  res.status(201).json(resultado);
}));

export default router;
