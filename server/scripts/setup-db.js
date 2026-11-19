// Crea la base de datos y ejecuta los scripts de /base-de-datos en orden.
//
//   npm run db:setup                         crea todo (con datos simulados)
//   npm run db:setup -- --sin-simulados      sin 06_datos_simulados.sql
//   npm run db:setup -- --reiniciar          borra el esquema y lo vuelve a crear
//
// Usa PGADMIN_USER y PGADMIN_PASSWORD del archivo .env (normalmente postgres).
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { RAIZ_PROYECTO, config } from '../src/config.js';

const args = new Set(process.argv.slice(2));
const reiniciar = args.has('--reiniciar');
const conSimulados = !args.has('--sin-simulados');
const carpeta = path.join(RAIZ_PROYECTO, 'base-de-datos');

const conexion = (database) => ({
  host: config.db.host,
  port: config.db.port,
  user: config.admin.user,
  password: config.admin.password,
  database,
});

async function ejecutarArchivo(cliente, archivo) {
  const sql = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
  process.stdout.write(`  → ${archivo} ... `);
  const inicio = Date.now();
  await cliente.query(sql);
  console.log(`listo (${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
}

async function main() {
  const nombreBd = config.db.database;
  console.log(`Harvest JAM · preparando la base de datos "${nombreBd}" en ${config.db.host}:${config.db.port}\n`);

  // 1. Crear la base si no existe
  const servidor = new pg.Client(conexion('postgres'));
  await servidor.connect();
  const existe = (await servidor.query('select 1 from pg_database where datname = $1', [nombreBd])).rowCount > 0;
  if (!existe) {
    await servidor.query(`create database "${nombreBd.replaceAll('"', '""')}"`);
    console.log(`  ✓ base de datos "${nombreBd}" creada`);
  }
  await servidor.end();

  // 2. Ejecutar los scripts
  const cliente = new pg.Client(conexion(nombreBd));
  await cliente.connect();
  cliente.on('notice', (aviso) => console.log(`    ${aviso.message}`));

  const yaHayEsquema = (await cliente.query("select 1 from pg_namespace where nspname = 'fruteria'")).rowCount > 0;
  if (yaHayEsquema && !reiniciar) {
    console.log('\nLa base ya tiene el esquema "fruteria". Para borrarlo y crearlo de nuevo:');
    console.log('  npm run db:setup -- --reiniciar\n');
    await cliente.end();
    process.exit(1);
  }

  const archivos = [
    ...(yaHayEsquema ? ['99_borrar_todo.sql'] : []),
    '01_tablas.sql',
    '02_funciones.sql',
    '03_triggers.sql',
    '04_roles.sql',
    '05_datos.sql',
    ...(conSimulados ? ['06_datos_simulados.sql'] : []),
    '07_dss.sql',
  ];
  for (const archivo of archivos) await ejecutarArchivo(cliente, archivo);
  await cliente.end();

  console.log('\nListo. Usuarios de prueba (contraseña 12345):');
  console.log('  francisco_mendoza (administrador) · robert_de_niro (gerente) · manuel_gomez (cajero)');
  console.log('  ricardo_valencia (comprador) · juan_gonzales (admin. clientes) · laura_perez (contador)');
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  if (err.code === '28P01') console.error('  Revisa PGADMIN_USER y PGADMIN_PASSWORD en el archivo .env');
  if (err.code === 'ECONNREFUSED') console.error('  ¿Está encendido PostgreSQL? Revisa PGHOST y PGPORT en el archivo .env');
  process.exit(1);
});
