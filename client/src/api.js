// Cliente de la API. La sesión viaja en una cookie HttpOnly, así que aquí
// no se guarda ningún token.

export class ApiError extends Error {
  constructor(status, mensaje, campo) {
    super(mensaje);
    this.status = status;
    this.campo = campo;
  }
}

const SESION_TERMINADA = 'harvest-jam:sesion-terminada';

export function alTerminarSesion(fn) {
  window.addEventListener(SESION_TERMINADA, fn);
  return () => window.removeEventListener(SESION_TERMINADA, fn);
}

function armarUrl(ruta, params) {
  const url = new URL(`/api${ruta}`, window.location.origin);
  for (const [clave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, valor);
  }
  return url.pathname + url.search;
}

async function pedir(metodo, ruta, { params, cuerpo, signal } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(armarUrl(ruta, params), {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa que la API esté encendida.');
  }

  if (respuesta.status === 204) return null;

  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 && !ruta.startsWith('/auth/login')) {
      window.dispatchEvent(new Event(SESION_TERMINADA));
    }
    throw new ApiError(respuesta.status, datos?.error ?? `Error ${respuesta.status} del servidor.`, datos?.campo);
  }
  return datos;
}

export const api = {
  get: (ruta, params, signal) => pedir('GET', ruta, { params, signal }),
  post: (ruta, cuerpo) => pedir('POST', ruta, { cuerpo: cuerpo ?? {} }),
  put: (ruta, cuerpo) => pedir('PUT', ruta, { cuerpo }),
  borrar: (ruta) => pedir('DELETE', ruta),
};
