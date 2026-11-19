// Consultas de clientes (antes ClienteDAO.java).
import { patronBusqueda } from '../db.js';
// Un cliente es persona física (p_fisica) o moral (p_moral).
export const RFC_PUBLICO_GENERAL = 'XAXX010101000';

const mapear = (f) => ({
  id: f.id_c,
  tipo: f.tipo,
  nombre: f.nombre,
  telefono: f.telefono,
  rfc: f.rfc,
  domicilio: f.domicilio,
  publicoGeneral: f.rfc === RFC_PUBLICO_GENERAL,
});

const SELECT_CLIENTE = `
  select c.id_c, c.telefono, c.rfc, c.domicilio,
         coalesce(pf.nombre, pm.razon_social, 'sin nombre') as nombre,
         case when pf.id_c is not null then 'fisica' else 'moral' end as tipo
  from cliente c
  left join p_fisica pf on pf.id_c = c.id_c
  left join p_moral pm  on pm.id_c = c.id_c`;

export async function listar(q, { buscar, tipo }) {
  const condiciones = [];
  const valores = [];
  if (buscar) {
    valores.push(patronBusqueda(buscar));
    condiciones.push(`(coalesce(pf.nombre, pm.razon_social) ilike $1 or c.rfc ilike $1
                       or c.telefono ilike $1 or c.domicilio ilike $1 or c.id_c::text = trim('%' from $1))`);
  }
  if (tipo === 'fisica') condiciones.push('pf.id_c is not null');
  if (tipo === 'moral') condiciones.push('pm.id_c is not null');

  const filas = await q(
    `${SELECT_CLIENTE}
     ${condiciones.length ? `where ${condiciones.join(' and ')}` : ''}
     order by (c.rfc = '${RFC_PUBLICO_GENERAL}') desc nulls last, coalesce(pf.nombre, pm.razon_social)`,
    valores,
  );
  return filas.map(mapear);
}

export async function conteoPorTipo(q) {
  const [f] = await q(
    `select count(*)::int as total,
            count(pf.id_c)::int as fisica,
            count(pm.id_c)::int as moral
     from cliente c
     left join p_fisica pf on pf.id_c = c.id_c
     left join p_moral pm  on pm.id_c = c.id_c`,
  );
  return f;
}

export async function obtener(q, id) {
  const filas = await q(`${SELECT_CLIENTE} where c.id_c = $1`, [id]);
  return filas[0] ? mapear(filas[0]) : null;
}

export async function idPublicoGeneral(q) {
  const filas = await q('select id_c from cliente where rfc = $1 order by id_c limit 1', [RFC_PUBLICO_GENERAL]);
  return filas[0]?.id_c ?? null;
}

// Usan las funciones registrar_cliente y actualizar_cliente de la BD.
export async function crear(q, d) {
  const [f] = await q('select registrar_cliente($1, $2, $3, $4, $5) as id', [d.tipo, d.nombre, d.telefono, d.rfc, d.domicilio]);
  return f.id;
}

export async function actualizar(q, id, d) {
  const [f] = await q('select actualizar_cliente($1, $2, $3, $4, $5, $6) as ok', [id, d.tipo, d.nombre, d.telefono, d.rfc, d.domicilio]);
  return f.ok;
}

export async function eliminar(q, id) {
  const filas = await q('delete from cliente where id_c = $1 returning id_c', [id]);
  return filas.length > 0;
}
