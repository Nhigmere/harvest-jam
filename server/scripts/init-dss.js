// Inicializa el esquema etl (07_dss.sql) sobre la base existente sin borrar datos
// y ejecuta la primera carga completa del ETL.
//
//   npm run dss:init
import fs from 'node:fs';
import path from 'node:path';
import { config, RAIZ_PROYECTO } from '../src/config.js';
import { crearPool } from '../src/db.js';
import { ejecutarEtl } from '../src/etl/ejecutar.js';

const pool = crearPool({ usuario: config.admin.user, password: config.admin.password, max: 2 });

try {
  console.log(`Harvest JAM · inicializando esquema ETL/DSS en "${config.db.database}"...`);
  const sql = fs.readFileSync(path.join(RAIZ_PROYECTO, 'base-de-datos', '07_dss.sql'), 'utf8');
  await pool.query(sql);
  console.log('  ✓ 07_dss.sql aplicado');

  const r = await ejecutarEtl(pool, { modo: 'completo', ejecutadoPor: 'inicializacion' });
  console.log(`  ✓ Corrida ETL #${r.corridaId} (${r.estado}) en ${r.duracionMs} ms`);
  console.log(`    Leídas: ${r.filasLeidas} · Limpiadas: ${r.filasLimpiadas} · Imputadas: ${r.filasImputadas} · Cargadas: ${r.filasCargadas} · Rechazadas: ${r.filasRechazadas}`);
  console.log(`    Fecha de corte: ${r.fechaCorte}`);
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
