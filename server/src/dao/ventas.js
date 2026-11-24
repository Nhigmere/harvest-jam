// Consultas de ventas (antes VentaDAO.java).
import { num, patronBusqueda } from '../db.js';

const FECHA = `to_char(v.fecha, 'YYYY-MM-DD"T"HH24:MI:SS')`;

function filtros({ desde, hasta, buscar, idEmpleado, idCliente }) {
  const condiciones = ['v.fecha >= $1::date', 'v.fecha < $2::date + 1'];
  const valores = [desde, hasta];
  if (buscar) {
    valores.push(patronBusqueda(buscar));
    const p = `$${valores.length}`;
    condiciones.push(`(v.folio_v::text = trim('%' from ${p}) or coalesce(pf.nombre, pm.razon_social) ilike ${p} or e.nombre ilike ${p})`);
  }
  if (idEmpleado) {
    valores.push(idEmpleado);
    condiciones.push(`v.id_e = $${valores.length}`);
  }
  if (idCliente) {
    valores.push(idCliente);
    condiciones.push(`v.id_c = $${valores.length}`);
  }
  return { where: `where ${condiciones.join(' and ')}`, valores };
}

const FROM_VENTA = `
  from venta v
  left join cliente c   on c.id_c = v.id_c
  left join p_fisica pf on pf.id_c = c.id_c
  left join p_moral pm  on pm.id_c = c.id_c
  left join empleado e  on e.id_e = v.id_e`;

export async function listar(q, opciones) {
  const { where, valores } = filtros(opciones);
  valores.push(opciones.limite, opciones.offset);
  const filas = await q(
    `select v.folio_v, ${FECHA} as fecha, v.id_c, coalesce(pf.nombre, pm.razon_social) as cliente,
            c.rfc, v.id_e, e.nombre as empleado,
            calcular_total_venta(v.folio_v) as total,
            (select count(*)::int from detalle_venta dv where dv.folio_v = v.folio_v) as renglones,
            count(*) over ()::int as total_filas
     ${FROM_VENTA}
     ${where}
     order by v.fecha desc, v.folio_v desc
     limit $${valores.length - 1} offset $${valores.length}`,
    valores,
  );
  return {
    total: filas[0]?.total_filas ?? 0,
    ventas: filas.map((f) => ({
      folio: f.folio_v,
      fecha: f.fecha,
      idCliente: f.id_c,
      cliente: f.cliente,
      idEmpleado: f.id_e,
      empleado: f.empleado,
      total: num(f.total),
      renglones: f.renglones,
    })),
  };
}

// Totales del mismo filtro (tarjetas de la pantalla de ventas).
export async function resumen(q, opciones) {
  const { where, valores } = filtros(opciones);
  const [f] = await q(
    `with ventas as (
       select v.folio_v, v.id_c
       ${FROM_VENTA}
       ${where}
     )
     select count(*)::int as ventas,
            coalesce(sum(t.total), 0) as ingresos,
            count(distinct ventas.id_c)::int as clientes
     from ventas
     left join lateral (
       select sum(dv.cantidad * dv.precio_unitario) as total
       from detalle_venta dv where dv.folio_v = ventas.folio_v
     ) t on true`,
    valores,
  );
  const ventas = f.ventas;
  const ingresos = num(f.ingresos);
  return {
    ventas,
    ingresos,
    ticketPromedio: ventas ? Math.round((ingresos / ventas) * 100) / 100 : 0,
    clientes: f.clientes,
  };
}

// Usa la función obtener_venta_con_detalles de la BD.
export async function obtener(q, folio) {
  const filas = await q(
    `select folio_venta, to_char(fecha_venta, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha, id_cliente, nombre_cliente,
            telefono_cliente, rfc_cliente, id_empleado, nombre_empleado, codigo_producto,
            descripcion_producto, unidad_medida, cantidad_producto, precio_unitario, subtotal_producto
     from obtener_venta_con_detalles($1)`,
    [folio],
  );
  if (!filas.length) return null;
  const f = filas[0];
  const renglones = filas
    .filter((r) => r.codigo_producto !== null)
    .map((r) => ({
      codigo: r.codigo_producto,
      descripcion: r.descripcion_producto,
      unidadMedida: r.unidad_medida,
      cantidad: num(r.cantidad_producto),
      precioUnitario: num(r.precio_unitario),
      subtotal: num(r.subtotal_producto),
    }));
  return {
    folio: f.folio_venta,
    fecha: f.fecha,
    cliente: {
      id: f.id_cliente,
      nombre: f.nombre_cliente,
      telefono: f.telefono_cliente,
      rfc: f.rfc_cliente,
    },
    empleado: { id: f.id_empleado, nombre: f.nombre_empleado },
    renglones,
    total: Math.round(renglones.reduce((s, r) => s + r.subtotal, 0) * 100) / 100,
  };
}

// Usa la función registrar_venta_completa de la BD (todo o nada).
export async function crear(q, { idCliente, idEmpleado, renglones }) {
  const [f] = await q(
    'select registrar_venta_completa($1, $2, $3::json) as folio',
    [idCliente, idEmpleado, JSON.stringify(renglones.map((r) => ({ codigo: r.codigo, cantidad: r.cantidad })))],
  );
  return f.folio;
}

// Al borrar la venta, los triggers regresan el stock.
export async function cancelar(q, folio) {
  const filas = await q('delete from venta where folio_v = $1 returning folio_v', [folio]);
  return filas.length > 0;
}

// Días del mes que tienen al menos una venta (para marcar el calendario).
export async function diasConVentas(q, { desde, hasta }) {
  const filas = await q(
    `select to_char(fecha::date, 'YYYY-MM-DD') as dia, count(*)::int as ventas
     from venta
     where fecha >= $1::date and fecha < $2::date + 1
     group by fecha::date
     order by dia`,
    [desde, hasta],
  );
  const dias = {};
  for (const f of filas) dias[f.dia] = f.ventas;
  return dias;
}

// Analítica filtrada para gráficas y rankings dentro de la pantalla de Ventas.
export async function analitica(q, opciones) {
  const { where, valores } = filtros(opciones);
  const diasRango = Math.max(
    1,
    Math.round((Date.parse(`${opciones.hasta}T00:00:00Z`) - Date.parse(`${opciones.desde}T00:00:00Z`)) / 86_400_000) + 1,
  );
  const paso = diasRango <= 92 ? 'day' : diasRango <= 400 ? 'week' : 'month';
  const granularidad = { day: 'dia', week: 'semana', month: 'mes' }[paso];

  const [serieRows, horasRows, empRows, cliRows, prodRows, maxRow] = await Promise.all([
    q(
      `with v_f as (
         select v.folio_v, v.fecha ${FROM_VENTA} ${where}
       )
       select to_char(date_trunc('${paso}', v_f.fecha)::date, 'YYYY-MM-DD') as periodo,
              count(distinct v_f.folio_v)::int as ventas,
              coalesce(sum(dv.cantidad * dv.precio_unitario), 0) as ingresos
       from v_f
       join detalle_venta dv on dv.folio_v = v_f.folio_v
       group by 1
       order by 1`,
      valores,
    ),
    q(
      `with v_f as (select v.folio_v, v.fecha ${FROM_VENTA} ${where})
       select extract(hour from v_f.fecha)::int as hora, count(*)::int as ventas
       from v_f
       group by 1
       order by 1`,
      valores,
    ),
    q(
      `with v_f as (select v.folio_v, coalesce(e.nombre, 'sin registro') as empleado ${FROM_VENTA} ${where})
       select v_f.empleado as nombre,
              count(distinct v_f.folio_v)::int as ventas,
              coalesce(sum(dv.cantidad * dv.precio_unitario), 0) as monto
       from v_f
       join detalle_venta dv on dv.folio_v = v_f.folio_v
       group by 1
       order by 3 desc
       limit 8`,
      valores,
    ),
    q(
      `with v_f as (
         select v.folio_v, coalesce(pf.nombre, pm.razon_social, 'público en general') as cliente,
                case when pm.id_c is not null then 'moral' else 'fisica' end as tipo
         ${FROM_VENTA} ${where}
       )
       select v_f.cliente as nombre, v_f.tipo,
              count(distinct v_f.folio_v)::int as ventas,
              coalesce(sum(dv.cantidad * dv.precio_unitario), 0) as monto
       from v_f
       join detalle_venta dv on dv.folio_v = v_f.folio_v
       group by 1, 2
       order by 4 desc
       limit 6`,
      valores,
    ),
    q(
      `with v_f as (select v.folio_v ${FROM_VENTA} ${where})
       select p.codigo, p.descripcion, p.unidad_medida,
              sum(dv.cantidad) as cantidad,
              sum(dv.cantidad * dv.precio_unitario) as importe
       from v_f
       join detalle_venta dv on dv.folio_v = v_f.folio_v
       join producto p on p.codigo = dv.codigo
       group by p.codigo, p.descripcion, p.unidad_medida
       order by 5 desc
       limit 6`,
      valores,
    ),
    q(
      `with v_f as (select v.folio_v ${FROM_VENTA} ${where})
       select max(t.total) as max_total
       from v_f
       left join lateral (
         select sum(dv.cantidad * dv.precio_unitario) as total
         from detalle_venta dv where dv.folio_v = v_f.folio_v
       ) t on true`,
      valores,
    ),
  ]);

  return {
    ventaMaxima: num(maxRow[0]?.max_total ?? 0),
    serie: {
      granularidad,
      puntos: serieRows.map((f) => ({
        periodo: f.periodo,
        ventas: f.ventas,
        ingresos: Math.round(num(f.ingresos) * 100) / 100,
      })),
    },
    horas: horasRows.map((f) => ({ hora: f.hora, ventas: f.ventas })),
    porEmpleado: empRows.map((f) => ({ nombre: f.nombre, ventas: f.ventas, monto: Math.round(num(f.monto) * 100) / 100 })),
    topClientes: cliRows.map((f) => ({ nombre: f.nombre, tipo: f.tipo, ventas: f.ventas, monto: Math.round(num(f.monto) * 100) / 100 })),
    topProductos: prodRows.map((f) => ({
      codigo: f.codigo,
      descripcion: f.descripcion,
      unidadMedida: f.unidad_medida,
      cantidad: num(f.cantidad),
      importe: Math.round(num(f.importe) * 100) / 100,
    })),
  };
}
