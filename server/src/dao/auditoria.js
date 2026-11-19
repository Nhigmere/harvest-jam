// Consultas de la bitácora de auditoría (antes AuditoriaDAO.java).
import { patronBusqueda } from '../db.js';

// Grupos de tablas que se filtran juntos en la pantalla.
export const GRUPOS_TABLAS = {
  productos: ['producto'],
  ventas: ['venta', 'detalle_venta'],
  compras: ['compra', 'detalle_compra'],
  clientes: ['cliente', 'p_fisica', 'p_moral'],
  empleados: ['empleado'],
  proveedores: ['proveedor'],
};

function filtros({ grupo, operacion, buscar, desde, hasta }) {
  const condiciones = [];
  const valores = [];
  const param = (v) => {
    valores.push(v);
    return `$${valores.length}`;
  };
  if (grupo && GRUPOS_TABLAS[grupo]) condiciones.push(`tabla = any(${param(GRUPOS_TABLAS[grupo])}::text[])`);
  if (operacion) condiciones.push(`operacion = ${param(operacion)}`);
  if (buscar) {
    const p = param(patronBusqueda(buscar));
    condiciones.push(`(descripcion ilike ${p} or usuario ilike ${p} or tabla ilike ${p})`);
  }
  if (desde) condiciones.push(`fecha_hora >= ${param(desde)}::date`);
  if (hasta) condiciones.push(`fecha_hora < ${param(hasta)}::date + 1`);
  return { where: condiciones.length ? `where ${condiciones.join(' and ')}` : '', valores };
}

export async function listar(q, opciones) {
  const { where, valores } = filtros(opciones);
  valores.push(opciones.limite, opciones.offset);
  const filas = await q(
    `select id, to_char(fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_hora, tabla, operacion, usuario, descripcion,
            count(*) over ()::int as total_filas
     from auditoria
     ${where}
     order by fecha_hora desc, id desc
     limit $${valores.length - 1} offset $${valores.length}`,
    valores,
  );
  return {
    total: filas[0]?.total_filas ?? 0,
    registros: filas.map((f) => ({
      id: f.id,
      fechaHora: f.fecha_hora,
      tabla: f.tabla,
      operacion: f.operacion,
      usuario: f.usuario,
      descripcion: f.descripcion,
    })),
  };
}

// Conteo por operación con los mismos filtros (sin el de operación).
export async function resumen(q, opciones) {
  const { where, valores } = filtros({ ...opciones, operacion: null });
  const [f] = await q(
    `select count(*)::int as total,
            count(*) filter (where operacion = 'INSERT')::int as inserciones,
            count(*) filter (where operacion = 'UPDATE')::int as actualizaciones,
            count(*) filter (where operacion = 'DELETE')::int as eliminaciones
     from auditoria ${where}`,
    valores,
  );
  return f;
}

export async function recientes(q, limite = 6) {
  const { registros } = await listar(q, { limite, offset: 0 });
  return registros;
}
