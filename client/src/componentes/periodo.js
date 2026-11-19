// Periodos de tiempo para filtrar ventas, compras y reportes.
export const PERIODOS = [
  { valor: '1', etiqueta: 'Hoy' },
  { valor: '7', etiqueta: '7 días' },
  { valor: '30', etiqueta: '30 días' },
  { valor: '90', etiqueta: '90 días' },
  { valor: '365', etiqueta: '12 meses' },
  { valor: 'todo', etiqueta: 'Todo' },
];

const TEXTOS = {
  1: 'hoy',
  7: 'los últimos 7 días',
  30: 'los últimos 30 días',
  90: 'los últimos 90 días',
  365: 'los últimos 12 meses',
  todo: 'todo el historial',
};

export const paramsPeriodo = (periodo) => (periodo === 'todo' ? { desde: '2000-01-01' } : { dias: periodo });
export const textoPeriodo = (periodo) => TEXTOS[periodo] ?? '';
