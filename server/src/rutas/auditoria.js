// /api/auditoria
import { Router } from 'express';
import * as auditoria from '../dao/auditoria.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { fecha, paginacion } from '../validacion.js';

const router = Router();

router.get('/', requiere(P.VER_AUDITORIA), ruta(async (req, res) => {
  const filtros = {
    grupo: Object.hasOwn(auditoria.GRUPOS_TABLAS, req.query.tabla) ? req.query.tabla : null,
    operacion: ['INSERT', 'UPDATE', 'DELETE'].includes(req.query.operacion) ? req.query.operacion : null,
    buscar: req.query.buscar?.trim() || null,
    desde: fecha(req.query.desde, 'desde'),
    hasta: fecha(req.query.hasta, 'hasta'),
  };
  const pag = paginacion(req.query, { limitePorDefecto: 50 });
  const [lista, resumen] = await Promise.all([
    auditoria.listar(req.consultar, { ...filtros, ...pag }),
    auditoria.resumen(req.consultar, filtros),
  ]);
  res.json({ ...lista, resumen, pagina: pag.pagina, limite: pag.limite, grupos: Object.keys(auditoria.GRUPOS_TABLAS) });
}));

export default router;
