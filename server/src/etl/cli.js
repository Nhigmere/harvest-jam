// Ejecución por consola del ETL:
//   npm run etl          → modo completo (fruteria + datos-externos/*.csv)
//   npm run etl:prueba   → modo prueba con datos inválidos controlados
import { config } from '../config.js';
import { crearPool } from '../db.js';
import { ejecutarEtl } from './ejecutar.js';

const modo = process.argv.includes('--prueba') ? 'prueba' : 'completo';
const pool = crearPool({ usuario: config.admin.user, password: config.admin.password, max: 2 });

try {
  console.log(`Harvest JAM · ejecutando ETL (modo: ${modo})...`);
  const r = await ejecutarEtl(pool, { modo, ejecutadoPor: 'cli' });
  console.log(`✓ Corrida #${r.corridaId} terminada (${r.estado}) en ${r.duracionMs} ms`);
  console.log(`  Leídas: ${r.filasLeidas} · Limpiadas: ${r.filasLimpiadas} · Imputadas: ${r.filasImputadas} · Cargadas: ${r.filasCargadas} · Rechazadas: ${r.filasRechazadas}`);
  if (r.fechaCorte) console.log(`  Fecha de corte de ventas: ${r.fechaCorte}`);
} catch (err) {
  console.error(`✗ Error en ETL: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
