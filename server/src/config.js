// Configuración del servidor. Lee el archivo .env de la raíz del proyecto.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_PROYECTO = path.resolve(aqui, '..', '..');

const archivoEnv = path.join(RAIZ_PROYECTO, '.env');
if (fs.existsSync(archivoEnv)) {
  process.loadEnvFile(archivoEnv);
}

const entero = (valor, porDefecto) => {
  const n = Number.parseInt(valor ?? '', 10);
  return Number.isFinite(n) ? n : porDefecto;
};

export const config = {
  puerto: entero(process.env.PORT, 3001),
  produccion: process.env.NODE_ENV === 'production',

  // Cada usuario se conecta con su propio usuario de PostgreSQL; aquí solo
  // va a dónde conectarse.
  db: {
    host: process.env.PGHOST || 'localhost',
    port: entero(process.env.PGPORT, 5432),
    database: process.env.PGDATABASE || 'TBD',
    esquema: process.env.PGSCHEMA || 'fruteria',
  },

  // Credenciales de administrador, solo para "npm run db:setup".
  admin: {
    user: process.env.PGADMIN_USER || 'postgres',
    password: process.env.PGADMIN_PASSWORD || '',
  },

  // Una sesión se cierra sola tras estas horas sin actividad.
  sesionHoras: entero(process.env.SESION_HORAS, 8),

  // Datos que salen en el ticket.
  empresa: {
    nombre: process.env.EMPRESA_NOMBRE || 'Harvest JAM',
    subtitulo: process.env.EMPRESA_SUBTITULO || 'Frutas y verduras',
    telefono: process.env.EMPRESA_TELEFONO || '',
    direccion: process.env.EMPRESA_DIRECCION || '',
    mensajeTicket: process.env.EMPRESA_MENSAJE_TICKET || '¡Gracias por su compra! Vuelva pronto.',
  },

  // Existencia a partir de la cual un producto se considera "bajo".
  umbralStockBajo: entero(process.env.UMBRAL_STOCK_BAJO, 10),
};
