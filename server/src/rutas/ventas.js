// /api/ventas
import { Router } from 'express';
import * as clientes from '../dao/clientes.js';
import * as ventas from '../dao/ventas.js';
import { HttpError, noEncontrado } from '../errores.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { id, numero, paginacion, rangoFechas } from '../validacion.js';

const router = Router();

function leerFiltros(query) {
  return {
    ...rangoFechas(query, 30),
    buscar: query.buscar?.trim() || null,
    idEmpleado: query.empleado ? id(query.empleado, 'El empleado') : null,
    idCliente: query.cliente ? id(query.cliente, 'El cliente') : null,
  };
}

router.get('/', requiere(P.VER_VENTAS), ruta(async (req, res) => {
  const filtros = leerFiltros(req.query);
  const pag = paginacion(req.query);
  const [lista, resumen] = await Promise.all([
    ventas.listar(req.consultar, { ...filtros, ...pag }),
    ventas.resumen(req.consultar, filtros),
  ]);
  res.json({ ...lista, resumen, pagina: pag.pagina, limite: pag.limite, desde: filtros.desde, hasta: filtros.hasta });
}));

router.get('/dias', requiere(P.VER_VENTAS), ruta(async (req, res) => {
  const mesRaw = String(req.query.mes ?? '').trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mesRaw);
  const hoy = new Date();
  const anio = match ? Number(match[1]) : hoy.getFullYear();
  const mes = match ? Number(match[2]) : hoy.getMonth() + 1;
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const prefijo = `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}`;
  const desde = `${prefijo}-01`;
  const hasta = `${prefijo}-${String(ultimoDia).padStart(2, '0')}`;
  const dias = await ventas.diasConVentas(req.consultar, { desde, hasta });
  res.json({ mes: prefijo, dias });
}));

router.get('/:folio', requiere(P.VER_VENTAS), ruta(async (req, res) => {
  const venta = await ventas.obtener(req.consultar, id(req.params.folio, 'El folio'));
  if (!venta) throw noEncontrado('La venta');
  res.json(venta);
}));

// Cuerpo: { idCliente?, idEmpleado?, renglones: [{ codigo, cantidad }] }
router.post('/', requiere(P.CREAR_VENTAS), ruta(async (req, res) => {
  const cuerpo = req.body ?? {};
  if (!Array.isArray(cuerpo.renglones) || cuerpo.renglones.length === 0) {
    throw new HttpError(400, 'Agrega al menos un producto a la venta.', { campo: 'renglones' });
  }
  if (cuerpo.renglones.length > 100) throw new HttpError(400, 'Una venta no puede tener más de 100 productos distintos.');

  const renglones = cuerpo.renglones.map((r, i) => ({
    codigo: id(r?.codigo, `El producto del renglón ${i + 1}`),
    cantidad: numero(r?.cantidad, { campo: 'cantidad', etiqueta: `La cantidad del renglón ${i + 1}`, requerido: true, mayorQue: 0, max: 99_999 }),
  }));

  // El empleado es quien inició sesión. Solo si la cuenta no está ligada a
  // un empleado (por ejemplo, un superusuario) se acepta el que venga.
  let idEmpleado = req.sesion.empleado?.id ?? null;
  if (!idEmpleado) {
    idEmpleado = cuerpo.idEmpleado ? id(cuerpo.idEmpleado, 'El empleado') : null;
    if (!idEmpleado) throw new HttpError(400, 'Tu usuario no está ligado a un empleado: elige quién atiende la venta.', { campo: 'idEmpleado' });
  }

  const idCliente = cuerpo.idCliente
    ? id(cuerpo.idCliente, 'El cliente')
    : await clientes.idPublicoGeneral(req.consultar);

  const folio = await req.transaccion((q) => ventas.crear(q, { idCliente, idEmpleado, renglones }));
  res.status(201).json(await ventas.obtener(req.consultar, folio));
}));

router.delete('/:folio', requiere(P.ELIMINAR_VENTAS), ruta(async (req, res) => {
  const folio = id(req.params.folio, 'El folio');
  const ok = await req.transaccion((q) => ventas.cancelar(q, folio));
  if (!ok) throw noEncontrado('La venta');
  res.status(204).end();
}));

export default router;
