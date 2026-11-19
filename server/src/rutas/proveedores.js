// /api/proveedores
import { Router } from 'express';
import * as proveedores from '../dao/proveedores.js';
import { noEncontrado } from '../errores.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { NOMBRE_PERSONA, id, telefono, texto } from '../validacion.js';

const router = Router();

function validarProveedor(cuerpo = {}) {
  return {
    nombre: texto(cuerpo.nombre, { campo: 'nombre', etiqueta: 'El nombre', requerido: true, min: 3, max: 100 }).toLowerCase(),
    ciudad: texto(cuerpo.ciudad, { campo: 'ciudad', etiqueta: 'La ciudad', requerido: true, min: 3, max: 50 }).toLowerCase(),
    contacto: texto(cuerpo.contacto, {
      campo: 'contacto', etiqueta: 'El contacto', requerido: true, min: 3, max: 100,
      patron: NOMBRE_PERSONA, mensajePatron: 'El contacto solo puede tener letras, puntos y espacios.',
    }).toLowerCase(),
    telefono: telefono(cuerpo.telefono, { requerido: true }),
  };
}

router.get('/', requiere(P.VER_PROVEEDORES, P.CREAR_COMPRAS), ruta(async (req, res) => {
  const lista = req.query.opciones === '1'
    ? await proveedores.opciones(req.consultar)
    : await proveedores.listar(req.consultar, { buscar: req.query.buscar?.trim() || null });
  res.json({ proveedores: lista });
}));

router.get('/:id', requiere(P.VER_PROVEEDORES), ruta(async (req, res) => {
  const proveedor = await proveedores.obtener(req.consultar, id(req.params.id, 'El proveedor'));
  if (!proveedor) throw noEncontrado('El proveedor');
  res.json(proveedor);
}));

router.post('/', requiere(P.EDITAR_PROVEEDORES), ruta(async (req, res) => {
  const datos = validarProveedor(req.body);
  const nuevoId = await req.transaccion((q) => proveedores.crear(q, datos));
  res.status(201).json(await proveedores.obtener(req.consultar, nuevoId));
}));

router.put('/:id', requiere(P.EDITAR_PROVEEDORES), ruta(async (req, res) => {
  const idProveedor = id(req.params.id, 'El proveedor');
  const datos = validarProveedor(req.body);
  const ok = await req.transaccion((q) => proveedores.actualizar(q, idProveedor, datos));
  if (!ok) throw noEncontrado('El proveedor');
  res.json(await proveedores.obtener(req.consultar, idProveedor));
}));

router.delete('/:id', requiere(P.ELIMINAR_PROVEEDORES), ruta(async (req, res) => {
  const idProveedor = id(req.params.id, 'El proveedor');
  const ok = await req.transaccion((q) => proveedores.eliminar(q, idProveedor));
  if (!ok) throw noEncontrado('El proveedor');
  res.status(204).end();
}));

export default router;
