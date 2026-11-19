// Consultas de proveedores (antes ProveedorDAO.java).
import { patronBusqueda } from '../db.js';

const mapear = (f) => ({
  id: f.id_p,
  nombre: f.nombre,
  ciudad: f.ciudad,
  contacto: f.contacto,
  telefono: f.tel_contacto,
  ...(f.num_productos !== undefined && { numProductos: f.num_productos }),
  ...(f.num_compras !== undefined && { numCompras: f.num_compras }),
  ...(f.ultima_compra !== undefined && { ultimaCompra: f.ultima_compra }),
});

export async function listar(q, { buscar }) {
  const valores = [];
  let where = '';
  if (buscar) {
    valores.push(patronBusqueda(buscar));
    where = `where p.nombre ilike $1 or p.ciudad ilike $1 or p.contacto ilike $1 or p.tel_contacto ilike $1`;
  }
  const filas = await q(
    `select p.id_p, p.nombre, p.ciudad, p.contacto, p.tel_contacto,
            (select count(*)::int from producto_proveedor pp where pp.id_p = p.id_p) as num_productos,
            (select count(*)::int from compra c where c.id_p = p.id_p) as num_compras,
            (select to_char(max(c.fecha), 'YYYY-MM-DD') from compra c where c.id_p = p.id_p) as ultima_compra
     from proveedor p
     ${where}
     order by p.nombre`,
    valores,
  );
  return filas.map(mapear);
}

// Lista corta para selects (formularios de compra y producto).
export async function opciones(q) {
  const filas = await q('select id_p, nombre, ciudad, contacto, tel_contacto from proveedor order by nombre');
  return filas.map(mapear);
}

export async function obtener(q, id) {
  const filas = await q(
    `select p.id_p, p.nombre, p.ciudad, p.contacto, p.tel_contacto,
            (select count(*)::int from compra c where c.id_p = p.id_p) as num_compras,
            (select to_char(max(c.fecha), 'YYYY-MM-DD') from compra c where c.id_p = p.id_p) as ultima_compra
     from proveedor p where p.id_p = $1`,
    [id],
  );
  if (!filas[0]) return null;
  const productos = await q(
    `select pr.codigo, pr.descripcion, pr.unidad_medida, pr.existencia::float8 as existencia, pr.precio_c::float8 as precio_c
     from producto_proveedor pp join producto pr on pr.codigo = pp.codigo
     where pp.id_p = $1
     order by pr.descripcion`,
    [id],
  );
  return {
    ...mapear(filas[0]),
    productos: productos.map((p) => ({
      codigo: p.codigo, descripcion: p.descripcion, unidadMedida: p.unidad_medida,
      existencia: p.existencia, precioCompra: p.precio_c,
    })),
  };
}

export async function crear(q, d) {
  const [f] = await q(
    `insert into proveedor (nombre, ciudad, contacto, tel_contacto)
     values ($1, $2, $3, $4) returning id_p`,
    [d.nombre, d.ciudad, d.contacto, d.telefono],
  );
  return f.id_p;
}

export async function actualizar(q, id, d) {
  const filas = await q(
    `update proveedor set nombre = $2, ciudad = $3, contacto = $4, tel_contacto = $5
     where id_p = $1 returning id_p`,
    [id, d.nombre, d.ciudad, d.contacto, d.telefono],
  );
  return filas.length > 0;
}

export async function eliminar(q, id) {
  const filas = await q('delete from proveedor where id_p = $1 returning id_p', [id]);
  return filas.length > 0;
}
