// Validaciones de los datos que llegan a la API.
// Las reglas vienen del sistema original (VALIDACIONES_SISTEMA.md).
import { HttpError } from './errores.js';

const invalido = (campo, mensaje) => new HttpError(400, mensaje, { campo });

export function texto(valor, { campo, etiqueta = campo, requerido = false, min = 0, max = 255, patron, mensajePatron } = {}) {
  const limpio = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : valor == null ? '' : String(valor).trim();
  if (!limpio) {
    if (requerido) throw invalido(campo, `${etiqueta} es obligatorio.`);
    return null;
  }
  if (limpio.length < min) throw invalido(campo, `${etiqueta} debe tener al menos ${min} caracteres.`);
  if (limpio.length > max) throw invalido(campo, `${etiqueta} no puede pasar de ${max} caracteres.`);
  if (patron && !patron.test(limpio)) throw invalido(campo, mensajePatron ?? `${etiqueta} no tiene un formato válido.`);
  return limpio;
}

export function numero(valor, { campo, etiqueta = campo, requerido = false, min, max, entero = false, mayorQue } = {}) {
  if (valor === null || valor === undefined || valor === '') {
    if (requerido) throw invalido(campo, `${etiqueta} es obligatorio.`);
    return null;
  }
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) throw invalido(campo, `${etiqueta} debe ser un número.`);
  if (entero && !Number.isInteger(n)) throw invalido(campo, `${etiqueta} debe ser un número entero.`);
  if (mayorQue !== undefined && !(n > mayorQue)) throw invalido(campo, `${etiqueta} debe ser mayor a ${mayorQue}.`);
  if (min !== undefined && n < min) throw invalido(campo, `${etiqueta} no puede ser menor a ${min.toLocaleString('es-MX')}.`);
  if (max !== undefined && n > max) throw invalido(campo, `${etiqueta} no puede pasar de ${max.toLocaleString('es-MX')}.`);
  return n;
}

export function id(valor, etiqueta = 'El identificador') {
  return numero(valor, { campo: 'id', etiqueta, requerido: true, entero: true, min: 1, max: 2_147_483_647 });
}

export function opcion(valor, opciones, { campo, etiqueta = campo, requerido = false } = {}) {
  if (valor === null || valor === undefined || valor === '') {
    if (requerido) throw invalido(campo, `${etiqueta} es obligatorio.`);
    return null;
  }
  const v = String(valor).trim().toLowerCase();
  if (!opciones.includes(v)) throw invalido(campo, `${etiqueta} debe ser: ${opciones.join(', ')}.`);
  return v;
}

// Teléfono: 10 a 15 caracteres con números, guiones, paréntesis o espacios,
// y al menos 10 dígitos.
export function telefono(valor, { campo = 'telefono', etiqueta = 'El teléfono', requerido = false } = {}) {
  const t = texto(valor, {
    campo, etiqueta, requerido, max: 15,
    patron: /^[0-9()\-\s+]+$/,
    mensajePatron: `${etiqueta} solo puede tener números, guiones, espacios y paréntesis.`,
  });
  if (t && t.replace(/\D/g, '').length < 10) throw invalido(campo, `${etiqueta} debe tener al menos 10 dígitos.`);
  return t;
}

// RFC del SAT: 3 letras (moral) o 4 (física), 6 dígitos de fecha y 3 de homoclave.
export function rfc(valor, { campo = 'rfc', requerido = false } = {}) {
  const r = texto(typeof valor === 'string' ? valor.toUpperCase().replace(/\s/g, '') : valor, {
    campo, etiqueta: 'El RFC', requerido, min: 12, max: 13,
    patron: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/,
    mensajePatron: 'El RFC debe tener 3 o 4 letras, 6 dígitos de fecha y 3 caracteres de homoclave (12 o 13 en total).',
  });
  return r;
}

export const NOMBRE_PERSONA = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ.'\s-]+$/;

// Lee ?pagina=&limite= con valores seguros.
export function paginacion(query, { limitePorDefecto = 25, limiteMaximo = 200 } = {}) {
  const limite = Math.min(Math.max(Number.parseInt(query.limite, 10) || limitePorDefecto, 1), limiteMaximo);
  const pagina = Math.max(Number.parseInt(query.pagina, 10) || 1, 1);
  return { limite, pagina, offset: (pagina - 1) * limite };
}

// Fechas AAAA-MM-DD (rango de reportes).
export function fecha(valor, campo = 'fecha') {
  if (valor === undefined || valor === null || valor === '') return null;
  const v = String(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
    throw invalido(campo, 'La fecha debe tener el formato AAAA-MM-DD.');
  }
  return v;
}

// Rango de fechas: ?desde=&hasta= o ?dias=30 (por defecto, últimos 30 días).
export function rangoFechas(query, diasPorDefecto = 30) {
  let desde = fecha(query.desde, 'desde');
  let hasta = fecha(query.hasta, 'hasta');
  if (!desde && !hasta) {
    const dias = Math.min(Math.max(Number.parseInt(query.dias, 10) || diasPorDefecto, 1), 3660);
    const hoy = new Date();
    const fin = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    const inicio = new Date(fin);
    inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));
    desde = inicio.toISOString().slice(0, 10);
    hasta = fin.toISOString().slice(0, 10);
  } else {
    desde ??= '2000-01-01';
    hasta ??= new Date().toISOString().slice(0, 10);
  }
  if (desde > hasta) throw invalido('desde', 'La fecha inicial no puede ser posterior a la final.');
  return { desde, hasta };
}
