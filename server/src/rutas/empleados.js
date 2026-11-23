// /api/empleados
import { Router } from 'express';
import * as empleados from '../dao/empleados.js';
import { HttpError, noEncontrado } from '../errores.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { NOMBRE_PERSONA, id, numero, opcion, texto } from '../validacion.js';

const router = Router();
const TURNOS = ['matutino', 'vespertino', 'nocturno'];

function validarEmpleado(cuerpo = {}, idActual = null) {
  const supervisorId = cuerpo.supervisorId ? id(cuerpo.supervisorId, 'El supervisor') : null;
  if (supervisorId && supervisorId === idActual) {
    throw new HttpError(400, 'Un empleado no puede ser su propio supervisor.', { campo: 'supervisorId' });
  }
  return {
    nombre: texto(cuerpo.nombre, {
      campo: 'nombre', etiqueta: 'El nombre', requerido: true, min: 3, max: 80,
      patron: NOMBRE_PERSONA, mensajePatron: 'El nombre solo puede tener letras y espacios.',
    }).toLowerCase(),
    turno: opcion(cuerpo.turno, TURNOS, { campo: 'turno', etiqueta: 'El turno', requerido: true }),
    salario: numero(cuerpo.salario, { campo: 'salario', etiqueta: 'El salario', requerido: true, min: 100, max: 999_999.99 }),
    supervisorId,
  };
}

router.get('/', requiere(P.VER_EMPLEADOS), ruta(async (req, res) => {
  const turno = TURNOS.includes(req.query.turno) ? req.query.turno : null;
  res.json({ empleados: await empleados.listar(req.consultar, { buscar: req.query.buscar?.trim() || null, turno }), turnos: TURNOS });
}));

router.get('/:id', requiere(P.VER_EMPLEADOS), ruta(async (req, res) => {
  const empleado = await empleados.obtener(req.consultar, id(req.params.id, 'El empleado'));
  if (!empleado) throw noEncontrado('El empleado');
  res.json(empleado);
}));

router.post('/', requiere(P.EDITAR_EMPLEADOS), ruta(async (req, res) => {
  const datos = validarEmpleado(req.body);
  const nuevoId = await req.transaccion((q) => empleados.crear(q, datos));
  res.status(201).json(await empleados.obtener(req.consultar, nuevoId));
}));

router.put('/:id', requiere(P.EDITAR_EMPLEADOS), ruta(async (req, res) => {
  const idEmpleado = id(req.params.id, 'El empleado');
  const datos = validarEmpleado(req.body, idEmpleado);
  const ok = await req.transaccion((q) => empleados.actualizar(q, idEmpleado, datos));
  if (!ok) throw noEncontrado('El empleado');
  res.json(await empleados.obtener(req.consultar, idEmpleado));
}));

router.delete('/:id', requiere(P.ELIMINAR_EMPLEADOS), ruta(async (req, res) => {
  const idEmpleado = id(req.params.id, 'El empleado');
  if (idEmpleado === req.sesion.empleado?.id) {
    throw new HttpError(409, 'No puedes eliminar al empleado con el que iniciaste sesión.');
  }
  const ok = await req.transaccion((q) => empleados.eliminar(q, idEmpleado));
  if (!ok) throw noEncontrado('El empleado');
  res.status(204).end();
}));

export default router;
