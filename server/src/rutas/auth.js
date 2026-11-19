// Inicio y cierre de sesión con usuarios de PostgreSQL.
import { Router } from 'express';
import { config } from '../config.js';
import { crearPool } from '../db.js';
import { HttpError, traducirErrorPg } from '../errores.js';
import { PRIORIDAD_ROLES, ROLES, permisosDeRol } from '../permisos.js';
import {
  NOMBRE_COOKIE, cerrarSesion, cookieDeSesion, cookieVencida, crearSesion,
  demasiadosIntentos, leerCookie, limpiarIntentos, registrarIntentoFallido,
} from '../sesiones.js';
import { requiereSesion, ruta } from '../middleware.js';

const router = Router();

// Los usuarios de PostgreSQL creados sin comillas van en minúsculas.
const USUARIO_VALIDO = /^[a-z_][a-z0-9_$]{0,62}$/;

function datosPublicos(sesion) {
  return {
    usuario: sesion.usuario,
    rol: sesion.rol,
    rolNombre: ROLES[sesion.rol]?.nombre ?? sesion.rol,
    permisos: sesion.permisos,
    empleado: sesion.empleado,
    empresa: config.empresa,
    umbralStockBajo: config.umbralStockBajo,
  };
}

async function leerPerfil(pool, usuario) {
  const [cuenta] = (await pool.query(
    `select u.rolsuper as superusuario,
            array(select r.rolname::text
                  from pg_auth_members m
                  join pg_roles r on r.oid = m.roleid
                  where m.member = u.oid) as roles
     from pg_roles u
     where u.rolname = session_user`,
  )).rows;

  const roles = cuenta?.roles ?? [];
  let rol = PRIORIDAD_ROLES.find((r) => roles.includes(r)) ?? null;
  if (!rol && cuenta?.superusuario) rol = 'administrador';

  let empleado = null;
  if (rol) {
    // Primero por la columna empleado.usuario; si no, por el nombre
    // ("manuel_gomez" ↔ "manuel gómez"), como hacía el sistema original.
    const filas = (await pool.query(
      `select id_e, nombre, turno
       from empleado
       where usuario = $1
          or replace(translate(lower(nombre), 'áéíóúüñ', 'aeiouun'), ' ', '_') = $1
       order by (usuario = $1) desc nulls last
       limit 1`,
      [usuario],
    )).rows;
    if (filas[0]) empleado = { id: filas[0].id_e, nombre: filas[0].nombre, turno: filas[0].turno };
  }
  return { rol, empleado };
}

router.post('/login', ruta(async (req, res) => {
  const usuario = String(req.body?.usuario ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!usuario || !password) throw new HttpError(400, 'Escribe tu usuario y tu contraseña.');
  if (!USUARIO_VALIDO.test(usuario)) throw new HttpError(401, 'Usuario o contraseña incorrectos.');

  const claveIntentos = `${req.ip}|${usuario}`;
  if (demasiadosIntentos(claveIntentos)) {
    throw new HttpError(429, 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.');
  }

  const pool = crearPool({ usuario, password });
  let perfil;
  try {
    perfil = await leerPerfil(pool, usuario);
  } catch (err) {
    await pool.end().catch(() => {});
    const traducido = traducirErrorPg(err);
    if (traducido?.status === 401) registrarIntentoFallido(claveIntentos);
    throw traducido ?? err;
  }

  if (!perfil.rol) {
    await pool.end().catch(() => {});
    throw new HttpError(403, 'Tu usuario de PostgreSQL no tiene un rol de Harvest JAM (administrador, gerente, cajero, comprador, admin_clientes o contador).');
  }

  limpiarIntentos(claveIntentos);
  const sesion = {
    usuario,
    rol: perfil.rol,
    permisos: permisosDeRol(perfil.rol),
    empleado: perfil.empleado,
    etiquetaAuditoria: perfil.empleado?.nombre ?? usuario,
    pool,
  };
  const token = crearSesion(sesion);
  res.setHeader('Set-Cookie', cookieDeSesion(token));
  res.json(datosPublicos(sesion));
}));

router.post('/logout', ruta(async (req, res) => {
  await cerrarSesion(leerCookie(req, NOMBRE_COOKIE));
  res.setHeader('Set-Cookie', cookieVencida());
  res.json({ ok: true });
}));

router.get('/me', requiereSesion, (req, res) => {
  res.json(datosPublicos(req.sesion));
});

export default router;
