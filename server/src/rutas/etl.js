// /api/etl — Bitácora y ejecución del proceso ETL.
import { Router } from 'express';
import * as dssDao from '../dao/dss.js';
import { ejecutarEtl } from '../etl/ejecutar.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { fecha, paginacion } from '../validacion.js';

const router = Router();
const ENTIDADES = new Set(['parametros', 'entregas', 'ventas', 'resumen']);
const TIPOS = new Set(['LIMPIADO', 'IMPUTADO', 'RECHAZADO', 'CARGADO']);

router.get('/dias', requiere(P.VER_ETL), ruta(async (req, res) => {
  const mesRaw = String(req.query.mes ?? '').trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mesRaw);
  const hoy = new Date();
  const anio = match ? Number(match[1]) : hoy.getFullYear();
  const mes = match ? Number(match[2]) : hoy.getMonth() + 1;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const prefijo = `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}`;
  const desde = `${prefijo}-01`;
  const hasta = `${prefijo}-${String(ultimoDia).padStart(2, '0')}`;
  const dias = await dssDao.diasConCorridasEtl(req.consultar, { desde, hasta });
  res.json({ mes: prefijo, dias });
}));

router.get('/corridas', requiere(P.VER_ETL), ruta(async (req, res) => {
  const fechaFiltro = fecha(req.query.fecha, 'fecha');
  const corridas = await dssDao.listarCorridasEtl(req.consultar, 25, { fecha: fechaFiltro });
  res.json({ corridas });
}));

router.get('/cambios', requiere(P.VER_ETL), ruta(async (req, res) => {
  const corridaRaw = Number.parseInt(req.query.corridaId ?? '', 10);
  const fechaFiltro = fecha(req.query.fecha, 'fecha');
  const filtros = {
    corridaId: Number.isFinite(corridaRaw) && corridaRaw > 0 ? corridaRaw : null,
    fecha: fechaFiltro,
    entidad: ENTIDADES.has(req.query.entidad) ? req.query.entidad : null,
    tipo: TIPOS.has(req.query.tipo) ? req.query.tipo : null,
    buscar: req.query.buscar?.trim() || null,
  };
  const pag = paginacion(req.query, { limitePorDefecto: 40 });
  const [lista, resumen, corridas] = await Promise.all([
    dssDao.listarCambiosEtl(req.consultar, { ...filtros, ...pag }),
    dssDao.resumenCambiosEtl(req.consultar, filtros),
    dssDao.listarCorridasEtl(req.consultar, 25, { fecha: fechaFiltro }),
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
