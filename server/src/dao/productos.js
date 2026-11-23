// Consultas de productos (antes ProductoDAO.java).
import { num, patronBusqueda } from '../db.js';

const mapear = (f) => ({
  codigo: f.codigo,
  descripcion: f.descripcion,
  categoria: f.categoria,
  unidadMedida: f.unidad_medida,
  existencia: num(f.existencia),
  precioCompra: num(f.precio_c),
  precioVenta: num(f.precio_v),
  stockMinimo: num(f.stock_minimo),
  vidaUtilDias: f.vida_util_dias ?? null,
  ...(f.proveedores !== undefined && { proveedores: f.proveedores ?? [] }),
});

// estado: 'disponible' | 'bajo' | 'agotado'
export async function listar(q, { buscar, categoria, estado, umbral, idProveedor }) {
  const condiciones = [];
  const valores = [];
  const param = (v) => {
    valores.push(v);
    return `$${valores.length}`;
  };

  if (buscar) {
    const p = param(patronBusqueda(buscar));
    const exacto = param(buscar);
    condiciones.push(`(p.descripcion ilike ${p} or p.codigo::text = ${exacto})`);
  }
  if (categoria) condiciones.push(`p.categoria = ${param(categoria)}`);
  if (estado === 'agotado') condiciones.push('p.existencia = 0');
  if (estado === 'bajo') condiciones.push(`p.existencia > 0 and p.existencia <= ${param(umbral)}`);
  if (estado === 'disponible') condiciones.push(`p.existencia > ${param(umbral)}`);
  if (idProveedor) {
    condiciones.push(`exists (select 1 from producto_proveedor pp where pp.codigo = p.codigo and pp.id_p = ${param(idProveedor)})`);
  }

  const filas = await q(
    `select p.codigo, p.descripcion, p.categoria, p.unidad_medida, p.existencia, p.precio_c, p.precio_v,
            p.stock_minimo, p.vida_util_dias
     from producto p
     ${condiciones.length ? `where ${condiciones.join(' and ')}` : ''}
     order by p.descripcion`,
    valores,
  );
  return filas.map(mapear);
}

export async function categorias(q) {
  const filas = await q('select distinct categoria from producto order by categoria');
  return filas.map((f) => f.categoria);
}

export async function obtener(q, codigo, { conProveedores = false } = {}) {
  const filas = await q(
    `select p.codigo, p.descripcion, p.categoria, p.unidad_medida, p.existencia, p.precio_c, p.precio_v,
            p.stock_minimo, p.vida_util_dias
            ${conProveedores ? `, (select coalesce(json_agg(json_build_object('id', pr.id_p, 'nombre', pr.nombre, 'ciudad', pr.ciudad, 'diasEntrega', pp.dias_entrega) order by pr.nombre), '[]')
                                  from producto_proveedor pp join proveedor pr on pr.id_p = pp.id_p
                                  where pp.codigo = p.codigo) as proveedores` : ''}
     from producto p
     where p.codigo = $1`,
    [codigo],
  );
  return filas[0] ? mapear(filas[0]) : null;
}

async function guardarProveedores(q, codigo, proveedores) {
  if (!Array.isArray(proveedores)) return;
  await q('delete from producto_proveedor where codigo = $1', [codigo]);
  for (const prov of proveedores) {
    await q(
      `insert into producto_proveedor (codigo, id_p, dias_entrega)
       values ($1, $2, $3)
       on conflict (codigo, id_p) do update set dias_entrega = excluded.dias_entrega`,
      [codigo, prov.id, prov.diasEntrega ?? null],
    );
  }
}

export async function crear(q, d) {
  const [fila] = await q(
    `insert into producto (descripcion, categoria, unidad_medida, existencia, precio_c, precio_v, stock_minimo, vida_util_dias)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning codigo`,
    [d.descripcion, d.categoria, d.unidadMedida, d.existencia, d.precioCompra, d.precioVenta, d.stockMinimo ?? null, d.vidaUtilDias ?? null],
  );
  await guardarProveedores(q, fila.codigo, d.proveedores);
  return fila.codigo;
}

export async function actualizar(q, codigo, d) {
  const filas = await q(
    `update producto
     set descripcion = $2, categoria = $3, unidad_medida = $4, existencia = $5,
         precio_c = $6, precio_v = $7, stock_minimo = $8, vida_util_dias = $9
     where codigo = $1
     returning codigo`,
    [codigo, d.descripcion, d.categoria, d.unidadMedida, d.existencia, d.precioCompra, d.precioVenta, d.stockMinimo ?? null, d.vidaUtilDias ?? null],
  );
  if (!filas.length) return false;
  await guardarProveedores(q, codigo, d.proveedores);
  return true;
}

export async function eliminar(q, codigo) {
  const filas = await q('delete from producto where codigo = $1 returning codigo', [codigo]);
  return filas.length > 0;
}
