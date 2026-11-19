// Capa pura de indicadores del DSS (sin base de datos ni React).
// Implementa los 5 indicadores definidos en PLAN_DSS.md:
//   1. Cobertura (días)
//   2. Rotación
//   3. Brecha contra el stock mínimo
//   4. Margen de entrega
//   5. Riesgo de merma

const red = (n, dec = 2) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  const f = 10 ** dec;
  return Math.round(n * f) / f;
};

export const DEFINICION_INDICADORES = [
  {
    id: 'cobertura',
    nombre: 'Cobertura (días)',
    formula: 'existencia ÷ demanda_diaria',
    fuente: 'etl.resumen_producto (fruteria.producto + detalle_venta)',
    notas: 'Si demanda_diaria = 0 se reporta como "Sin demanda" para evitar división entre cero.',
  },
  {
    id: 'rotacion',
    nombre: 'Rotación',
    formula: 'unidades_vendidas_ventana ÷ max(existencia, 1)',
    fuente: 'etl.venta_limpia + fruteria.producto',
    notas: 'Mide cuántas veces se mueve el inventario actual durante la ventana de análisis.',
  },
  {
    id: 'brecha_minimo',
    nombre: 'Brecha contra mínimo',
    formula: 'existencia − stock_minimo',
    fuente: 'fruteria.producto + datos-externos/parametros_producto.csv',
    notas: 'Negativo indica que ya está por debajo del piso de seguridad.',
  },
  {
    id: 'margen_entrega',
    nombre: 'Margen de entrega',
    formula: 'cobertura − tiempo_entrega_dias',
    fuente: 'cobertura + datos-externos/tiempos_entrega_proveedor.csv',
    notas: 'Negativo significa que el producto se acabará antes de que llegue el pedido.',
  },
  {
    id: 'riesgo_merma',
    nombre: 'Riesgo de merma',
    formula: 'cobertura > vida_util_dias',
    fuente: 'cobertura + datos-externos/parametros_producto.csv',
    notas: 'Alerta que hay más inventario del que se alcanza a vender antes de echarse a perder.',
  },
];

export function calcularIndicadoresProducto({
  existencia = 0,
  unidadesVendidas = 0,
  ventanaDias = 28,
  demandaDiaria: demandaExplicita = null,
  stockMinimo = 10,
  diasEntrega = 2,
  vidaUtilDias = 7,
  precioCompra = 0,
  precioVenta = 0,
  diasConVentas = 0,
  minDiasVentas = 5,
  factorDemanda = 1,
  extraEntrega = 0,
}) {
  const dias = Math.max(Number(ventanaDias) || 28, 1);
  const stock = Math.max(Number(existencia) || 0, 0);
  const baseDemanda = demandaExplicita !== null && demandaExplicita !== undefined
    ? Number(demandaExplicita)
    : Number(unidadesVendidas) / dias;

  const demandaDiaria = Math.max(baseDemanda * (Number(factorDemanda) || 1), 0);
  const entregaEfectiva = Math.max((Number(diasEntrega) || 0) + (Number(extraEntrega) || 0), 0);

  // 1. Cobertura en días (nunca Infinity ni NaN)
  const diasCobertura = demandaDiaria > 0 ? red(stock / demandaDiaria, 2) : null;

  // 2. Rotación en la ventana
  const rotacion = red((demandaDiaria * dias) / Math.max(stock, 1), 3);

  // 3. Brecha contra stock mínimo
  const brechaMinimo = red(stock - Number(stockMinimo || 0), 3);

  // 4. Margen de entrega
  const margenEntrega = diasCobertura !== null ? red(diasCobertura - entregaEfectiva, 2) : null;

  // 5. Riesgo de merma (perecederos)
  const riesgoMerma = diasCobertura !== null && Number(vidaUtilDias) > 0
    ? diasCobertura > Number(vidaUtilDias)
    : false;

  // Margen comercial (%)
  const pv = Number(precioVenta) || 0;
  const pc = Number(precioCompra) || 0;
  const margenPct = pv > 0 ? red(((pv - pc) / pv) * 100, 2) : 0;

  // Suficiencia de datos (regla de honestidad del DSS)
  const datosSuficientes = Number(diasConVentas) >= Number(minDiasVentas) && demandaDiaria > 0;

  return {
    demandaDiaria: red(demandaDiaria, 4),
    diasCobertura,
    rotacion,
    brechaMinimo,
    margenEntrega,
    margenPct,
    riesgoMerma,
    datosSuficientes,
    diasEntregaEfectivos: entregaEfectiva,
  };
}
