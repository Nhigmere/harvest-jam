// Conexiones a PostgreSQL.
//
// Cada usuario inicia sesión con su propio usuario de PostgreSQL (igual que
// en el sistema original). Por cada sesión se abre un pool pequeño con esas
// credenciales, así la base de datos aplica los permisos de su rol.
import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export function crearPool({ usuario, password, database = config.db.database, max = 4 }) {
  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database,
    user: usuario,
    password,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    application_name: 'harvest-jam',
    options: `-c search_path=${config.db.esquema},public`,
  });
  // Un error en una conexión inactiva no debe tumbar el servidor.
  pool.on('error', (err) => console.error('[pg] error en conexión inactiva:', err.message));
  return pool;
}

// Ejecuta una consulta y regresa los renglones.
export async function consultar(pool, texto, valores = []) {
  const resultado = await pool.query(texto, valores);
  return resultado.rows;
}

// Ejecuta varias consultas en una transacción. Todo o nada.
// etiquetaAuditoria es el nombre que quedará en la tabla auditoria.
export async function transaccion(pool, etiquetaAuditoria, trabajo) {
  const cliente = await pool.connect();
  try {
    await cliente.query('begin');
    await cliente.query("select set_config('app.usuario', $1, true)", [etiquetaAuditoria]);
    const q = async (texto, valores = []) => (await cliente.query(texto, valores)).rows;
    const resultado = await trabajo(q);
    await cliente.query('commit');
    return resultado;
  } catch (err) {
    await cliente.query('rollback').catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

// Convierte numeric (que pg entrega como texto) a número de JavaScript.
export const num = (valor) => (valor === null || valor === undefined ? null : Number(valor));

// Texto de búsqueda para ILIKE: escapa % y _ para que se busquen literales.
export const patronBusqueda = (texto) => `%${String(texto).replace(/[\\%_]/g, '\\$&')}%`;
