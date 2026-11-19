// Middlewares de sesión y permisos.
import { consultar, transaccion } from './db.js';
import { HttpError } from './errores.js';
import { tienePermiso } from './permisos.js';
import { NOMBRE_COOKIE, leerCookie, obtenerSesion } from './sesiones.js';

// Exige una sesión válida y prepara req.consultar / req.transaccion con el
// pool del usuario.
export function requiereSesion(req, res, next) {
  const sesion = obtenerSesion(leerCookie(req, NOMBRE_COOKIE));
  if (!sesion) {
    return next(new HttpError(401, 'Tu sesión terminó. Inicia sesión de nuevo.'));
  }
  req.sesion = sesion;
  req.consultar = (texto, valores) => consultar(sesion.pool, texto, valores);
  req.transaccion = (trabajo) => transaccion(sesion.pool, sesion.etiquetaAuditoria, trabajo);
  return next();
}

// Exige uno o más permisos del rol (basta con tener uno de ellos).
export function requiere(...permisos) {
  return (req, res, next) => {
    if (permisos.some((p) => tienePermiso(req.sesion, p))) return next();
    return next(new HttpError(403, 'Tu rol no tiene permiso para esta sección.'));
  };
}

// Envuelve un manejador async para que sus errores lleguen al manejador
// de errores (Express 5 ya lo hace; así también funciona en Express 4).
export const ruta = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Encabezados de seguridad básicos.
export function encabezadosSeguridad(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
}
