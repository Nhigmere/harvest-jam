// Consultas de empleados (antes EmpleadoDAO.java).
import { num, patronBusqueda } from '../db.js';

const mapear = (f) => ({
  id: f.id_e,
  nombre: f.nombre,
  turno: f.turno,
  salario: num(f.salario),
  usuario: f.usuario,
  supervisorId: f.id_s ?? null,
  supervisorNombre: f.supervisor_nombre ?? null,
});

const SELECT_EMPLEADO = `
  select e.id_e, e.nombre, e.turno, e.salario, e.usuario,
         s.id_s, jefe.nombre as supervisor_nombre
  from empleado e
  left join supervisor s on s.id_e = e.id_e
  left join empleado jefe on jefe.id_e = s.id_s`;

export async function listar(q, { buscar, turno }) {
  const condiciones = [];
  const valores = [];
  if (buscar) {
    valores.push(patronBusqueda(buscar));
    condiciones.push(`(e.nombre ilike $${valores.length} or e.turno ilike $${valores.length} or e.usuario ilike $${valores.length})`);
  }
  if (turno) {
    valores.push(turno);
    condiciones.push(`e.turno = $${valores.length}`);
  }
  const filas = await q(
    `${SELECT_EMPLEADO}
     ${condiciones.length ? `where ${condiciones.join(' and ')}` : ''}
     order by e.nombre`,
    valores,
  );
  return filas.map(mapear);
}

export async function obtener(q, id) {
  const filas = await q(`${SELECT_EMPLEADO} where e.id_e = $1`, [id]);
  return filas[0] ? mapear(filas[0]) : null;
}

async function guardarSupervisor(q, id, supervisorId) {
  await q('delete from supervisor where id_e = $1', [id]);
  if (supervisorId) {
    await q('insert into supervisor (id_e, id_s) values ($1, $2)', [id, supervisorId]);
  }
}

export async function crear(q, d) {
  const [f] = await q(
    `insert into empleado (nombre, turno, salario, usuario)
     values ($1, $2, $3, $4) returning id_e`,
    [d.nombre, d.turno, d.salario, d.usuario],
  );
  await guardarSupervisor(q, f.id_e, d.supervisorId);
  return f.id_e;
}

export async function actualizar(q, id, d) {
  const filas = await q(
    `update empleado set nombre = $2, turno = $3, salario = $4, usuario = $5
     where id_e = $1 returning id_e`,
    [id, d.nombre, d.turno, d.salario, d.usuario],
  );
  if (!filas.length) return false;
  await guardarSupervisor(q, id, d.supervisorId);
  return true;
}

export async function eliminar(q, id) {
  const filas = await q('delete from empleado where id_e = $1 returning id_e', [id]);
  return filas.length > 0;
}
