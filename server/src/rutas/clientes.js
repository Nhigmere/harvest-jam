// /api/clientes
import { Router } from 'express';
import * as clientes from '../dao/clientes.js';
import { noEncontrado } from '../errores.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { NOMBRE_PERSONA, id, opcion, rfc, telefono, texto } from '../validacion.js';

const router = Router();

function validarCliente(cuerpo = {}) {
  const tipo = opcion(String(cuerpo.tipo ?? '').normalize('NFD').replace(/[̀-ͯ]/g, ''), ['fisica', 'moral'], {
    campo: 'tipo', etiqueta: 'El tipo de persona', requerido: true,
  });
  const nombre = tipo === 'fisica'
    ? texto(cuerpo.nombre, {
      campo: 'nombre', etiqueta: 'El nombre', requerido: true, min: 3, max: 80,
      patron: NOMBRE_PERSONA, mensajePatron: 'El nombre solo puede tener letras y espacios.',
    })
    : texto(cuerpo.nombre, { campo: 'nombre', etiqueta: 'La razón social', requerido: true, min: 3, max: 100 });

  return {
    tipo,
    nombre: nombre.toLowerCase(),
    telefono: telefono(cuerpo.telefono, { requerido: true }),
    rfc: rfc(cuerpo.rfc),
    domicilio: texto(cuerpo.domicilio, { campo: 'domicilio', etiqueta: 'El domicilio', requerido: true, min: 5, max: 200 })?.toLowerCase(),
  };
}

router.get('/', requiere(P.VER_CLIENTES), ruta(async (req, res) => {
  const tipo = ['fisica', 'moral'].includes(req.query.tipo) ? req.query.tipo : null;
  const [lista, conteo] = await Promise.all([
    clientes.listar(req.consultar, { buscar: req.query.buscar?.trim() || null, tipo }),
    clientes.conteoPorTipo(req.consultar),
  ]);
  res.json({ clientes: lista, conteo });
}));

router.get('/:id', requiere(P.VER_CLIENTES), ruta(async (req, res) => {
  const cliente = await clientes.obtener(req.consultar, id(req.params.id, 'El cliente'));
  if (!cliente) throw noEncontrado('El cliente');
  res.json(cliente);
}));

router.post('/', requiere(P.EDITAR_CLIENTES), ruta(async (req, res) => {
  const datos = validarCliente(req.body);
  const nuevoId = await req.transaccion((q) => clientes.crear(q, datos));
  res.status(201).json(await clientes.obtener(req.consultar, nuevoId));
}));

router.put('/:id', requiere(P.EDITAR_CLIENTES), ruta(async (req, res) => {
  const idCliente = id(req.params.id, 'El cliente');
  const datos = validarCliente(req.body);
  const ok = await req.transaccion((q) => clientes.actualizar(q, idCliente, datos));
  if (!ok) throw noEncontrado('El cliente');
  res.json(await clientes.obtener(req.consultar, idCliente));
}));

router.delete('/:id', requiere(P.ELIMINAR_CLIENTES), ruta(async (req, res) => {
  const idCliente = id(req.params.id, 'El cliente');
  const ok = await req.transaccion((q) => clientes.eliminar(q, idCliente));
  if (!ok) throw noEncontrado('El cliente');
  res.status(204).end();
}));

export default router;
