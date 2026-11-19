// Sesiones en memoria.
//
// Al iniciar sesión se genera un token aleatorio que viaja en una cookie
// HttpOnly (JavaScript del navegador no la puede leer). El servidor guarda
// el pool de PostgreSQL de ese usuario. Si el servidor se reinicia, todos
// vuelven a iniciar sesión.
import crypto from 'node:crypto';
import { config } from './config.js';

export const NOMBRE_COOKIE = 'hj_sesion';

const sesiones = new Map();
const duracionMs = () => config.sesionHoras * 60 * 60 * 1000;

export function crearSesion(datos) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ahora = Date.now();
  sesiones.set(token, { ...datos, token, creada: ahora, ultimoUso: ahora });
  return token;
}

export function obtenerSesion(token) {
  if (!token) return null;
  const sesion = sesiones.get(token);
  if (!sesion) return null;
  if (Date.now() - sesion.ultimoUso > duracionMs()) {
    cerrarSesion(token);
    return null;
  }
  sesion.ultimoUso = Date.now();
  return sesion;
}

export async function cerrarSesion(token) {
  const sesion = sesiones.get(token);
  sesiones.delete(token);
  if (sesion?.pool) await sesion.pool.end().catch(() => {});
}

export async function cerrarTodas() {
  await Promise.all([...sesiones.keys()].map(cerrarSesion));
}

// Limpieza periódica de sesiones vencidas.
setInterval(() => {
  const limite = Date.now() - duracionMs();
  for (const [token, sesion] of sesiones) {
    if (sesion.ultimoUso < limite) cerrarSesion(token);
  }
}, 10 * 60 * 1000).unref();

export function leerCookie(req, nombre) {
  const encabezado = req.headers.cookie;
  if (!encabezado) return null;
  for (const parte of encabezado.split(';')) {
    const i = parte.indexOf('=');
    if (i === -1) continue;
    if (parte.slice(0, i).trim() === nombre) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}

export function cookieDeSesion(token) {
  const segundos = Math.floor(duracionMs() / 1000);
  const seguro = config.produccion ? '; Secure' : '';
  return `${NOMBRE_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${segundos}${seguro}`;
}

export function cookieVencida() {
  return `${NOMBRE_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

// Freno simple contra adivinar contraseñas: 5 intentos fallidos por
// usuario e IP cada 10 minutos.
const intentos = new Map();
const VENTANA_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 5;

export function demasiadosIntentos(clave) {
  const registro = intentos.get(clave);
  if (!registro) return false;
  if (Date.now() - registro.desde > VENTANA_MS) {
    intentos.delete(clave);
    return false;
  }
  return registro.fallos >= MAX_INTENTOS;
}

export function registrarIntentoFallido(clave) {
  const registro = intentos.get(clave);
  if (!registro || Date.now() - registro.desde > VENTANA_MS) {
    intentos.set(clave, { fallos: 1, desde: Date.now() });
  } else {
    registro.fallos += 1;
  }
}

export function limpiarIntentos(clave) {
  intentos.delete(clave);
}
