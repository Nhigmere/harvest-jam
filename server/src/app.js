// Arma la aplicación Express (separado de index.js para poder probarla).
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { RAIZ_PROYECTO } from './config.js';
import { HttpError, manejadorErrores } from './errores.js';
import { encabezadosSeguridad, requiereSesion } from './middleware.js';
import authRouter from './rutas/auth.js';
import auditoriaRouter from './rutas/auditoria.js';
import clientesRouter from './rutas/clientes.js';
import comprasRouter from './rutas/compras.js';
import empleadosRouter from './rutas/empleados.js';
import productosRouter from './rutas/productos.js';
import proveedoresRouter from './rutas/proveedores.js';
import { dashboardRouter, reportesRouter } from './rutas/reportes.js';
import ventasRouter from './rutas/ventas.js';

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(encabezadosSeguridad);
  app.use(express.json({ limit: '200kb' }));

  // --- API -----------------------------------------------------------
  const api = express.Router();
  api.get('/salud', (req, res) => res.json({ ok: true }));
  api.use('/auth', authRouter);

  // Todo lo demás requiere sesión.
  api.use(requiereSesion);
  api.use('/dashboard', dashboardRouter);
  api.use('/productos', productosRouter);
  api.use('/clientes', clientesRouter);
  api.use('/proveedores', proveedoresRouter);
  api.use('/empleados', empleadosRouter);
  api.use('/ventas', ventasRouter);
  api.use('/compras', comprasRouter);
  api.use('/reportes', reportesRouter);
  api.use('/auditoria', auditoriaRouter);
  api.use((req, res, next) => next(new HttpError(404, 'Ruta de la API no encontrada.')));

  app.use('/api', api);

  // --- Interfaz React ya compilada (npm run build) --------------------
  const dist = path.join(RAIZ_PROYECTO, 'client', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    // Cualquier otra ruta la resuelve el enrutador de React.
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(manejadorErrores);
  return app;
}
