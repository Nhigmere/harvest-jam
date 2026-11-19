// Consultas de reportes y del tablero (antes ReportesDAO.java).
// Usa las funciones de reporte de la BD: obtener_productos_mas_vendidos,
// obtener_ventas_por_empleado, obtener_clientes_frecuentes y
// obtener_productos_con_stock_bajo.
import { num } from '../db.js';
import { RFC_PUBLICO_GENERAL } from './clientes.js';

const dias = (desde, hasta) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000) + 1;

// Periodo inmediato anterior de la misma duración (para comparar).
export function periodoAnterior({ desde, hasta }) {
  const n = dias(desde, hasta);
  const fin = new Date(`${desde}T00:00:00Z`);
  fin.setUTCDate(fin.getUTCDate() - 1);
  const inicio = new Date(fin);
  inicio.setUTCDate(inicio.getUTCDate() - (n - 1));
  return { desde: inicio.toISOString().slice(0, 10), hasta: fin.toISOString().slice(0, 10) };
}

export async function resumenVentas(q, { desde, hasta }) {
  const [f] = await q(
    `with v as (
       select v.folio_v, v.id_c
       from venta v
       where v.fecha >= $1::date and v.fecha < $2::date + 1
     ),
     d as (
       select dv.folio_v, dv.cantidad, dv.precio_unitario, p.precio_c
       from detalle_venta dv
       join v on v.folio_v = dv.folio_v
       join producto p on p.codigo = dv.codigo
     )
     select (select count(*)::int from v) as ventas,
            (select coalesce(sum(cantidad * precio_unitario), 0) from d) as ingresos,
            (select coalesce(sum(cantidad * (precio_unitario - precio_c)), 0) from d) as margen,
            (select count(distinct v.id_c)::int
             from v join cliente c on c.id_c = v.id_c
             where coalesce(c.rfc, '') <> $3) as clientes`,
    [desde, hasta, RFC_PUBLICO_GENERAL],
  );
  const ventas = f.ventas;
  const ingresos = Math.round(num(f.ingresos) * 100) / 100;
  return {
    ventas,
    ingresos,
    ticketPromedio: ventas ? Math.round((ingresos / ventas) * 100) / 100 : 0,
    margenEstimado: Math.round(num(f.margen) * 100) / 100,
    clientes: f.clientes,
  };
}

export async function resumenCompras(q, { desde, hasta }) {
  const [f] = await q(
    `select count(*)::int as compras,
            coalesce(sum(calcular_total_compra(c.folio_c)), 0) as gasto,
            count(distinct c.id_p)::int as proveedores
     from compra c
     where c.fecha >= $1::date and c.fecha < $2::date + 1`,
    [desde, hasta],
  );
  return { compras: f.compras, gasto: num(f.gasto), proveedores: f.proveedores };
}

// Serie de ventas por día, semana o mes según lo largo del periodo.
export async function serieVentas(q, { desde, hasta }) {
  const n = dias(desde, hasta);
  const paso = n <= 92 ? 'day' : n <= 400 ? 'week' : 'month';
  const filas = await q(
    `with periodos as (
       select generate_series(date_trunc($3, $1::date), $2::date, ('1 ' || $3)::interval)::date as inicio
     ),
     totales as (
       select date_trunc($3, v.fecha)::date as inicio,
              count(distinct v.folio_v)::int as ventas,
              sum(dv.cantidad * dv.precio_unitario) as ingresos
       from venta v
       join detalle_venta dv on dv.folio_v = v.folio_v
       where v.fecha >= $1::date and v.fecha < $2::date + 1
       group by 1
     )
     select to_char(p.inicio, 'YYYY-MM-DD') as periodo,
            coalesce(t.ventas, 0) as ventas,
            coalesce(t.ingresos, 0) as ingresos
     from periodos p
     left join totales t on t.inicio = p.inicio
     order by p.inicio`,
    [desde, hasta, paso],
  );
  return {
    granularidad: { day: 'dia', week: 'semana', month: 'mes' }[paso],
    puntos: filas.map((f) => ({ periodo: f.periodo, ventas: f.ventas, ingresos: Math.round(num(f.ingresos) * 100) / 100 })),
  };
}

export async function masVendidos(q, { desde, hasta, limite = 10 }) {
  const filas = await q('select * from obtener_productos_mas_vendidos($1, $2, $3)', [limite, desde, hasta]);
  return filas.map((f) => ({
    codigo: f.codigo_producto_resultado,
    descripcion: f.nombre_producto_resultado,
    unidadMedida: f.unidad_medida_resultado,
    cantidad: num(f.total_unidades_vendidas),
    importe: num(f.importe_total),
  }));
}

export async function porEmpleado(q, { desde, hasta }) {
  const filas = await q('select * from obtener_ventas_por_empleado($1, $2)', [desde, hasta]);
  return filas.map((f) => ({
    id: f.id_empleado_resultado,
    nombre: f.nombre_empleado_resultado,
    ventas: Number(f.cantidad_total_ventas),
    monto: num(f.monto_total_ventas),
  }));
}

export async function clientesFrecuentes(q, { desde, hasta, limite = 5 }) {
  const filas = await q('select * from obtener_clientes_frecuentes($1, $2, $3)', [limite, desde, hasta]);
  return filas.map((f) => ({
    id: f.id_cliente_resultado,
    nombre: f.nombre_cliente_resultado,
    tipo: f.tipo_cliente_resultado,
    compras: Number(f.total_compras_realizadas),
    monto: num(f.monto_total),
  }));
}

export async function stockBajo(q, umbral) {
  const filas = await q('select * from obtener_productos_con_stock_bajo($1)', [umbral]);
  return filas.map((f) => ({
    codigo: f.codigo_producto_resultado,
    descripcion: f.nombre_producto_resultado,
    existencia: num(f.existencia_producto_resultado),
    unidadMedida: f.unidad_medida_resultado,
    precioCompra: num(f.precio_compra_resultado),
  }));
}

export async function porCategoria(q, { desde, hasta }) {
  const filas = await q(
    `select p.categoria, sum(dv.cantidad * dv.precio_unitario) as ingresos
     from detalle_venta dv
     join venta v on v.folio_v = dv.folio_v
     join producto p on p.codigo = dv.codigo
     where v.fecha >= $1::date and v.fecha < $2::date + 1
     group by p.categoria
     order by 2 desc`,
    [desde, hasta],
  );
  return filas.map((f) => ({ categoria: f.categoria, ingresos: Math.round(num(f.ingresos) * 100) / 100 }));
}

// Ventas por hora del día (para ver las horas con más clientela).
export async function porHora(q, { desde, hasta }) {
  const filas = await q(
    `select h.hora, coalesce(t.ventas, 0) as ventas
     from generate_series(0, 23) as h(hora)
     left join (
       select extract(hour from v.fecha)::int as hora, count(*)::int as ventas
       from venta v
       where v.fecha >= $1::date and v.fecha < $2::date + 1
       group by 1
     ) t on t.hora = h.hora
     order by h.hora`,
    [desde, hasta],
  );
  return filas.map((f) => ({ hora: f.hora, ventas: f.ventas }));
}

// "Reporte completo de ventas": un renglón por venta con sus productos.
export async function ventasDetalladas(q, { desde, hasta, limite, offset }) {
  const filas = await q(
    `select v.folio_v, to_char(v.fecha, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha,
            coalesce(pf.nombre, pm.razon_social, 'sin nombre') as cliente,
            case when pf.id_c is not null then 'fisica' else 'moral' end as tipo_cliente,
            e.nombre as empleado,
            string_agg(p.descripcion, ', ' order by p.descripcion) as productos,
            sum(dv.cantidad * dv.precio_unitario) as total,
            count(*) over ()::int as total_filas
     from venta v
     join detalle_venta dv on dv.folio_v = v.folio_v
     join producto p on p.codigo = dv.codigo
     left join cliente c on c.id_c = v.id_c
     left join p_fisica pf on pf.id_c = c.id_c
     left join p_moral pm on pm.id_c = c.id_c
     left join empleado e on e.id_e = v.id_e
     where v.fecha >= $1::date and v.fecha < $2::date + 1
     group by v.folio_v, v.fecha, pf.nombre, pm.razon_social, pf.id_c, e.nombre
     order by v.fecha desc, v.folio_v desc
     limit $3 offset $4`,
    [desde, hasta, limite, offset],
  );
  return {
    total: filas[0]?.total_filas ?? 0,
    ventas: filas.map((f) => ({
      folio: f.folio_v,
      fecha: f.fecha,
      cliente: f.cliente,
      tipoCliente: f.tipo_cliente,
      empleado: f.empleado,
      productos: f.productos,
      total: Math.round(num(f.total) * 100) / 100,
    })),
  };
}

export async function conteos(q, { productos = false, clientes = false, empleados = false, proveedores = false }) {
  const partes = [];
  if (productos) partes.push('(select count(*)::int from producto) as productos');
  if (clientes) partes.push('(select count(*)::int from cliente) as clientes');
  if (empleados) partes.push('(select count(*)::int from empleado) as empleados');
  if (proveedores) partes.push('(select count(*)::int from proveedor) as proveedores');
  if (!partes.length) return {};
  const [f] = await q(`select ${partes.join(', ')}`);
  return f;
}

export async function inventario(q, umbral) {
  const [f] = await q(
    `select count(*)::int as productos,
            count(*) filter (where existencia = 0)::int as agotados,
            count(*) filter (where existencia > 0 and existencia <= $1)::int as bajos,
            coalesce(sum(existencia * precio_c), 0) as valor_costo
     from producto`,
    [umbral],
  );
  return { productos: f.productos, agotados: f.agotados, bajos: f.bajos, valorCosto: Math.round(num(f.valor_costo) * 100) / 100 };
}
