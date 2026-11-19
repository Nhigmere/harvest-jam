// Formatos para México: moneda, cantidades, fechas y nombres.

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const pesosEnteros = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const pesosCompactos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat('es-MX');
const decimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 });

export const moneda = (n) => (n === null || n === undefined ? '—' : pesos.format(n));
export const monedaRedonda = (n) => (n === null || n === undefined ? '—' : pesosEnteros.format(n));
export const monedaCompacta = (n) => (Math.abs(n) < 10_000 ? pesosEnteros.format(n) : pesosCompactos.format(n));
export const numero = (n) => (n === null || n === undefined ? '—' : entero.format(n));
export const porcentaje = (n, decimales = 1) => `${n.toLocaleString('es-MX', { maximumFractionDigits: decimales })} %`;

const UNIDADES = {
  kilogramo: ['kg', 'kg'],
  pieza: ['pza', 'pzas'],
  manojo: ['manojo', 'manojos'],
  charola: ['charola', 'charolas'],
  ramito: ['ramito', 'ramitos'],
  litro: ['L', 'L'],
  paquete: ['paq', 'paqs'],
};

export const FRACCIONABLES = ['kilogramo', 'litro'];
export const esFraccionable = (unidad) => FRACCIONABLES.includes(unidad);

export function abreviaturaUnidad(unidad, cantidad = 1) {
  const par = UNIDADES[unidad];
  if (!par) return unidad;
  return cantidad === 1 ? par[0] : par[1];
}

export const cantidad = (n, unidad) => `${decimal.format(n)} ${abreviaturaUnidad(unidad, n)}`;

// "2026-11-18T23:06:22" (hora local del servidor) → Date local
const aFecha = (texto) => {
  if (!texto) return null;
  const [d, t = '00:00:00'] = texto.split('T');
  const [a, m, dia] = d.split('-').map(Number);
  const [h, mi, s] = t.split(':').map(Number);
  return new Date(a, m - 1, dia, h, mi, s || 0);
};

const fmtFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtFechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDiaSemana = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

const mismoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function fecha(texto) {
  const f = aFecha(texto);
  return f ? fmtFecha.format(f).replace('.', '') : '—';
}

export function fechaCorta(texto) {
  const f = aFecha(texto);
  return f ? fmtFechaCorta.format(f).replace('.', '') : '—';
}

export function fechaHora(texto) {
  const f = aFecha(texto);
  if (!f) return '—';
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(f, hoy)) return `Hoy, ${fmtHora.format(f)}`;
  if (mismoDia(f, ayer)) return `Ayer, ${fmtHora.format(f)}`;
  return `${fmtFecha.format(f).replace('.', '')}, ${fmtHora.format(f)}`;
}

export const hora = (texto) => {
  const f = aFecha(texto);
  return f ? fmtHora.format(f) : '—';
};

export const hoyLargo = () => {
  const t = fmtDiaSemana.format(new Date());
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// "manzana roja" → "Manzana roja" (productos y categorías)
export const capitalizar = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

// "robert de niro" → "Robert de Niro" (personas y negocios)
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'al', 'por', 'su']);
export function nombrePropio(t) {
  if (!t) return '';
  if (t === 'público en general') return 'Público en general';
  return t
    .split(' ')
    .map((palabra, i) => {
      if (i > 0 && PARTICULAS.has(palabra)) return palabra;
      if (/^(s\.a\.|sa|de|cv|s\.a)$/i.test(palabra) && i > 0) return palabra.toUpperCase();
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

// Iniciales para el avatar: "manuel gómez" → "MG"
export const iniciales = (t) => (t ?? '?')
  .split(' ')
  .filter((p) => p && !PARTICULAS.has(p))
  .slice(0, 2)
  .map((p) => p.charAt(0).toUpperCase())
  .join('');

// Teléfono de 10 dígitos para WhatsApp (México: se antepone 52)
export function telefonoWhatsApp(tel) {
  const digitos = String(tel ?? '').replace(/\D/g, '');
  if (digitos.length === 10) return `52${digitos}`;
  if (digitos.length === 12 && digitos.startsWith('52')) return digitos;
  if (digitos.length === 13 && digitos.startsWith('521')) return digitos;
  return null;
}

export const plural = (n, uno, varios) => `${numero(n)} ${n === 1 ? uno : varios}`;
