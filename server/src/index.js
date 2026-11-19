// Punto de entrada del servidor: node src/index.js
import { crearApp } from './app.js';
import { config } from './config.js';
import { cerrarTodas } from './sesiones.js';

const app = crearApp();

const servidor = app.listen(config.puerto, () => {
  console.log(`Harvest JAM API escuchando en http://localhost:${config.puerto}`);
  console.log(`Base de datos: ${config.db.database} en ${config.db.host}:${config.db.port} (esquema ${config.db.esquema})`);
});

async function apagar() {
  console.log('\nCerrando sesiones y conexiones...');
  servidor.close();
  await cerrarTodas();
  process.exit(0);
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
