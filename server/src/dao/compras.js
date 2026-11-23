// Consultas de compras a proveedores (antes CompraDAO.java).
import { num, patronBusqueda } from '../db.js';

function filtros({ desde, hasta, buscar, idProveedor }) {
  const condiciones = ['c.fecha >= $1::date', 'c.fecha < $2::date + 1'];
  const valores = [desde, hasta];
  if (buscar) {
    valores.push(patronBusqueda(buscar));
    const p = `$${valores.length}`;
    condiciones.push(`(c.folio_c::text = trim('%' from ${p}) or c.no_lote::text = trim('%' from ${p})
                       or p.nombre ilike ${p} or e.nombre ilike ${p})`);
  }
  if (idProveedor) {
    valores.push(idProveedor);
    condiciones.push(`c.id_p = $${valores.length}`);
  }
  return { where: `where ${condiciones.join(' and ')}`, valores };
}

const FROM_COMPRA = `
  from compra c
  join proveedor p     on p.id_p = c.id_p
  left join empleado e on e.id_e = c.id_e`;

export async function listar(q, opciones) {
  const { where, valores } = filtros(opciones);
  valores.push(opciones.limite, opciones.offset);
  const filas = await q(
    `select c.folio_c, c.no_lote, to_char(c.fecha, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha,
            c.id_p, p.nombre as proveedor, c.id_e, e.nombre as empleado,
            calcular_total_compra(c.folio_c) as total,
            (select count(*)::int from detalle_compra dc where dc.folio_c = c.folio_c) as renglones,
            count(*) over ()::int as total_filas
     ${FROM_COMPRA}
     ${where}
     order by c.fecha desc, c.folio_c desc
     limit $${valores.length - 1} offset $${valores.length}`,
    valores,
  );
  return {
    total: filas[0]?.total_filas ?? 0,
    compras: filas.map((f) => ({
      folio: f.folio_c,
      lote: f.no_lote,
      fecha: f.fecha,
      idProveedor: f.id_p,
      proveedor: f.proveedor,
      idEmpleado: f.id_e,
      empleado: f.empleado,
      total: num(f.total),
      renglones: f.renglones,
    })),
  };
}

export async function resumen(q, opciones) {
  const { where, valores } = filtros(opciones);
  const [f] = await q(
    `with compras as (select c.folio_c, c.id_p ${FROM_COMPRA} ${where})
     select count(*)::int as compras,
            coalesce(sum(calcular_total_compra(folio_c)), 0) as gasto,
            count(distinct id_p)::int as proveedores
     from compras`,
    valores,
  );
  const compras = f.compras;
  const gasto = num(f.gasto);
  return {
    compras,
    gasto,
    promedio: compras ? Math.round((gasto / compras) * 100) / 100 : 0,
    proveedores: f.proveedores,
  };
}

export async function obtener(q, folio) {
  const [c] = await q(
    `select c.folio_c, c.no_lote, to_char(c.fecha, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha,
            c.id_p, p.nombre as proveedor, p.ciudad, p.tel_contacto, c.id_e, e.nombre as empleado
     ${FROM_COMPRA}
     where c.folio_c = $1`,
    [folio],
  );
  if (!c) return null;
  const renglones = await q(
    `select dc.codigo, pr.descripcion, pr.unidad_medida, dc.cantidad,
            coalesce(dc.precio_unitario, pr.precio_c) as precio_unitario,
            round(dc.cantidad * coalesce(dc.precio_unitario, pr.precio_c), 2) as subtotal
     from detalle_compra dc
     join producto pr on pr.codigo = dc.codigo
     where dc.folio_c = $1
     order by pr.descripcion`,
    [folio],
  );
  const lineas = renglones.map((r) => ({
    codigo: r.codigo,
    descripcion: r.descripcion,
    unidadMedida: r.unidad_medida,
    cantidad: num(r.cantidad),
    precioUnitario: num(r.precio_unitario),
    subtotal: num(r.subtotal),
  }));
  return {
    folio: c.folio_c,
    lote: c.no_lote,
    fecha: c.fecha,
    proveedor: { id: c.id_p, nombre: c.proveedor, ciudad: c.ciudad, telefono: c.tel_contacto },
    empleado: { id: c.id_e, nombre: c.empleado },
    renglones: lineas,
    total: Math.round(lineas.reduce((s, r) => s + r.subtotal, 0) * 100) / 100,
  };
}

// Usa la función registrar_compra_completa de la BD (todo o nada).
export async function crear(q, { idProveedor, idEmpleado, lote, renglones }) {
  const [f] = await q(
    'select registrar_compra_completa($1, $2, $3::json, $4) as folio',
    [
      idProveedor,
      idEmpleado,
      JSON.stringify(renglones.map((r) => ({ codigo: r.codigo, cantidad: r.cantidad, precio_unitario: r.precioUnitario }))),
      lote,
    ],
  );
  return f.folio;
}

// Al borrar la compra, los triggers restan el stock (o la cancelan si ya se vendió).
export async function eliminar(q, folio) {
  const filas = await q('delete from compra where folio_c = $1 returning folio_c', [folio]);
  return filas.length > 0;
}

// Días del mes que tienen al menos una compra (para marcar el calendario).
export async function diasConCompras(q, { desde, hasta }) {
  const filas = await q(
    `select to_char(fecha::date, 'YYYY-MM-DD') as dia, count(*)::int as compras
     from compra
     where fecha >= $1::date and fecha < $2::date + 1
     group by fecha::date
     order by dia`,
    [desde, hasta],
  );
  const dias = {};
  for (const f of filas) dias[f.dia] = f.compras;
  return dias;
}
