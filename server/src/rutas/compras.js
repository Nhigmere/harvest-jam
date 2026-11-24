// /api/compras
import { Router } from 'express';
import * as compras from '../dao/compras.js';
import { HttpError, noEncontrado } from '../errores.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { id, numero, paginacion, rangoFechas } from '../validacion.js';

const router = Router();

function leerFiltros(query) {
  return {
    ...rangoFechas(query, 90),
    buscar: query.buscar?.trim() || null,
    idProveedor: query.proveedor ? id(query.proveedor, 'El proveedor') : null,
  };
}

router.get('/', requiere(P.VER_COMPRAS), ruta(async (req, res) => {
  const filtros = leerFiltros(req.query);
  const pag = paginacion(req.query);
  const [lista, resumen, analitica] = await Promise.all([
    compras.listar(req.consultar, { ...filtros, ...pag }),
    compras.resumen(req.consultar, filtros),
    compras.analitica(req.consultar, filtros),
  ]);
  res.json({ ...lista, resumen, analitica, pagina: pag.pagina, limite: pag.limite, desde: filtros.desde, hasta: filtros.hasta });
}));

router.get('/dias', requiere(P.VER_COMPRAS), ruta(async (req, res) => {
  const mesRaw = String(req.query.mes ?? '').trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mesRaw);
  const hoy = new Date();
  const anio = match ? Number(match[1]) : hoy.getFullYear();
  const mes = match ? Number(match[2]) : hoy.getMonth() + 1;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const prefijo = `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}`;
  const desde = `${prefijo}-01`;
  const hasta = `${prefijo}-${String(ultimoDia).padStart(2, '0')}`;
  const dias = await compras.diasConCompras(req.consultar, { desde, hasta });
  res.json({ mes: prefijo, dias });
}));

router.get('/:folio', requiere(P.VER_COMPRAS), ruta(async (req, res) => {
  const compra = await compras.obtener(req.consultar, id(req.params.folio, 'El folio'));
  if (!compra) throw noEncontrado('La compra');
  res.json(compra);
}));

// Cuerpo: { idProveedor, lote?, idEmpleado?, renglones: [{ codigo, cantidad, precioUnitario? }] }
router.post('/', requiere(P.CREAR_COMPRAS), ruta(async (req, res) => {
  const cuerpo = req.body ?? {};
  const idProveedor = id(cuerpo.idProveedor, 'El proveedor');
  if (!Array.isArray(cuerpo.renglones) || cuerpo.renglones.length === 0) {
    throw new HttpError(400, 'Agrega al menos un producto a la compra.', { campo: 'renglones' });
  }
  if (cuerpo.renglones.length > 200) throw new HttpError(400, 'Una compra no puede tener más de 200 productos distintos.');

  const renglones = cuerpo.renglones.map((r, i) => ({
    codigo: id(r?.codigo, `El producto del renglón ${i + 1}`),
    cantidad: numero(r?.cantidad, { campo: 'cantidad', etiqueta: `La cantidad del renglón ${i + 1}`, requerido: true, mayorQue: 0, max: 999_999 }),
    precioUnitario: numero(r?.precioUnitario, { campo: 'precioUnitario', etiqueta: `El costo del renglón ${i + 1}`, min: 0, max: 999_999.99 }),
  }));

  const lote = numero(cuerpo.lote, { campo: 'lote', etiqueta: 'El número de lote', entero: true, min: 1, max: 2_147_483_647 });

  let idEmpleado = req.sesion.empleado?.id ?? null;
  if (!idEmpleado) {
    idEmpleado = cuerpo.idEmpleado ? id(cuerpo.idEmpleado, 'El empleado') : null;
    if (!idEmpleado) throw new HttpError(400, 'Tu usuario no está ligado a un empleado: elige quién recibe la compra.', { campo: 'idEmpleado' });
  }

  const folio = await req.transaccion((q) => compras.crear(q, { idProveedor, idEmpleado, lote, renglones }));
  res.status(201).json(await compras.obtener(req.consultar, folio));
}));

router.delete('/:folio', requiere(P.ELIMINAR_COMPRAS), ruta(async (req, res) => {
  const folio = id(req.params.folio, 'El folio');
  const ok = await req.transaccion((q) => compras.eliminar(q, folio));
  if (!ok) throw noEncontrado('La compra');
  res.status(204).end();
}));

export default router;
