// Modelo explicable de decisión de reabastecimiento (6 pasos de PLAN_DSS.md).
// Funciones puras: reciben productos limpios + parámetros y regresan prioridades,
// cantidades sugeridas, asignación de presupuesto y explicaciones legibles.
import { calcularIndicadoresProducto } from './indicadores.js';

export const PARAMETROS_DEFECTO = Object.freeze({
  version: 'v1',
  ventanaDias: 28,
  colchonDias: 3,
  coberturaObjetivo: 7,
  minDiasVentas: 5,
  factorDemanda: 1,
  extraEntrega: 0,
  presupuesto: null, // null = sin tope
  pesos: {
    urgencia: 0.40,
    demanda: 0.25,
    margen: 0.20,
    brecha: 0.15,
  },
});

const ORDEN_PRIORIDAD = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
  sobreabastecido: 4,
  insuficientes: 5,
};

const ETIQUETA_PRIORIDAD = {
  critica: 'Crítica (Emergencia)',
  alta: 'Alta · Comprar ya',
  media: 'Media · Esta semana',
  baja: 'Baja · Monitorear',
  sobreabastecido: 'Sobreabastecido · No comprar',
  insuficientes: 'Datos insuficientes',
};

const FRACCIONABLES = new Set(['kilogramo', 'litro']);

function redondearComercial(valor, unidad) {
  if (!(valor > 0)) return 0;
  if (FRACCIONABLES.has(unidad)) return Math.ceil(valor * 2) / 2; // múltiplos de 0.5 kg / L
  return Math.ceil(valor);
}

const limitar = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const red = (n, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;

function construirExplicacion(item, params) {
  const {
    descripcion, existencia, unidadMedida, demandaDiaria, diasCobertura,
    diasEntregaEfectivos, margenEntrega, stockMinimo, vidaUtilDias,
    diasConVentas, entregaImputada, prioridad, esEmergencia,
    cantidadSugerida, costoEstimado, limitadaPorVidaUtil, enPresupuesto,
  } = item;

  if (prioridad === 'insuficientes') {
    const razon = demandaDiaria <= 0
      ? 'no registra ventas en la ventana analizada'
      : `solo tiene ${diasConVentas} día(s) con ventas (mínimo requerido: ${params.minDiasVentas})`;
    return `${descripcion}: datos insuficientes porque ${razon}. No se emite recomendación automática para evitar compras sin sustento.`;
  }

  const partes = [
    `${descripcion}: prioridad ${ETIQUETA_PRIORIDAD[prioridad].toUpperCase()}.`,
    `Existencia ${existencia} ${unidadMedida}, demanda estimada ${demandaDiaria.toFixed(2)} ${unidadMedida}/día (${diasConVentas} días con ventas en ventana de ${params.ventanaDias} días) → cobertura de ${diasCobertura.toFixed(1)} días.`,
    `Plazo de entrega ${diasEntregaEfectivos} día(s)${entregaImputada ? ' (imputado por falta de dato del proveedor)' : ''}, margen de entrega ${margenEntrega >= 0 ? '+' : ''}${margenEntrega.toFixed(1)} días.`,
  ];

  if (esEmergencia) {
    partes.push(
      existencia <= 0
        ? 'Regla de emergencia activada: producto agotado con demanda activa.'
        : 'Regla de emergencia activada: el producto se agotará antes de que llegue el proveedor.',
    );
  } else if (prioridad === 'sobreabastecido') {
    partes.push(`Riesgo de merma: la cobertura (${diasCobertura.toFixed(1)} d) supera su vida útil (${vidaUtilDias} d). Se recomienda no comprar y promover su salida.`);
  } else if (existencia < stockMinimo) {
    partes.push(`Existencia por debajo del stock mínimo configurado (${stockMinimo} ${unidadMedida}).`);
  }

  if (cantidadSugerida > 0) {
    partes.push(
      `Cantidad sugerida: ${cantidadSugerida} ${unidadMedida} (costo estimado $${costoEstimado.toFixed(2)})${limitadaPorVidaUtil ? `, topada por vida útil de ${vidaUtilDias} días para evitar merma` : ''}.`,
    );
    if (!enPresupuesto) {
      partes.push('Advertencia: queda fuera del presupuesto semanal asignado en este escenario.');
    }
  } else if (prioridad !== 'sobreabastecido') {
    partes.push('Cobertura suficiente; no requiere compra en este ciclo.');
  }

  partes.push(`Parámetros ${params.version}. Recomendación sujeta a revisión humana.`);
  return partes.join(' ');
}

export function evaluarReabastecimiento(productos, opciones = {}) {
  const params = {
    ...PARAMETROS_DEFECTO,
    ...opciones,
    pesos: { ...PARAMETROS_DEFECTO.pesos, ...(opciones.pesos ?? {}) },
  };

  // Paso 0: calcular indicadores con el factor de demanda y retraso del escenario
  const calculados = productos.map((p) => {
    const ind = calcularIndicadoresProducto({
      existencia: p.existencia,
      unidadesVendidas: p.unidadesVendidas,
      demandaDiaria: p.demandaDiariaBase ?? p.demandaDiaria,
      ventanaDias: p.ventanaDias ?? params.ventanaDias,
      stockMinimo: p.stockMinimo,
      diasEntrega: p.diasEntrega,
      vidaUtilDias: p.vidaUtilDias,
      precioCompra: p.precioC,
      precioVenta: p.precioV,
      diasConVentas: p.diasConVentas,
      minDiasVentas: params.minDiasVentas,
      factorDemanda: params.factorDemanda,
      extraEntrega: params.extraEntrega,
    });
    return { ...p, ...ind };
  });

  // Máximos para normalizar componentes 0–100 de manera transparente
  const maxDemanda = Math.max(0.001, ...calculados.map((p) => p.demandaDiaria));
  const maxMargen = Math.max(1, ...calculados.map((p) => Math.max(p.margenPct, 0)));

  const evaluados = calculados.map((p) => {
    // Paso 1: ¿hay datos suficientes?
    if (!p.datosSuficientes) {
      const base = {
        ...p,
        prioridad: 'insuficientes',
        etiquetaPrioridad: ETIQUETA_PRIORIDAD.insuficientes,
        esEmergencia: false,
        puntaje: null,
        desglose: null,
        cantidadSugerida: 0,
        costoEstimado: 0,
        limitadaPorVidaUtil: false,
        enPresupuesto: true,
      };
      return { ...base, explicacion: construirExplicacion(base, params) };
    }

    // Paso 2 y 3: regla de emergencia + umbrales de clasificación
    let prioridad = 'baja';
    let esEmergencia = false;

    if (p.existencia <= 0 || p.margenEntrega < 0) {
      prioridad = 'critica';
      esEmergencia = true;
    } else if (p.diasCobertura > p.vidaUtilDias) {
      prioridad = 'sobreabastecido';
    } else if (p.diasCobertura <= p.diasEntregaEfectivos || p.existencia < p.stockMinimo) {
      prioridad = 'alta';
    } else if (p.diasCobertura <= p.diasEntregaEfectivos + params.colchonDias) {
      prioridad = 'media';
    } else {
      prioridad = 'baja';
    }

    // Paso 4: puntuación ponderada (0–100)
    const horizonteUrgencia = Math.max(p.diasEntregaEfectivos + params.colchonDias * 2, 7);
    const urgencia = p.margenEntrega <= 0
      ? 100
      : limitar(((horizonteUrgencia - p.diasCobertura) / horizonteUrgencia) * 100);
    const demandaScore = limitar((p.demandaDiaria / maxDemanda) * 100);
    const margenScore = limitar((Math.max(p.margenPct, 0) / maxMargen) * 100);
    const brechaScore = p.stockMinimo > 0
      ? limitar(((p.stockMinimo - p.existencia) / p.stockMinimo) * 100)
      : 0;

    const puntaje = red(
      params.pesos.urgencia * urgencia
      + params.pesos.demanda * demandaScore
      + params.pesos.margen * margenScore
      + params.pesos.brecha * brechaScore,
      2,
    );

    // Paso 5: cantidad sugerida con tope por vida útil (evita merma)
    let cantidadSugerida = 0;
    let limitadaPorVidaUtil = false;

    if (prioridad === 'critica' || prioridad === 'alta' || prioridad === 'media') {
      const necesaria = p.demandaDiaria * (p.diasEntregaEfectivos + params.coberturaObjetivo) - p.existencia;
      const topeMerma = p.demandaDiaria * p.vidaUtilDias - p.existencia;
      const bruta = Math.max(0, Math.min(necesaria, Math.max(topeMerma, 0)));
      if (necesaria > topeMerma && topeMerma >= 0) limitadaPorVidaUtil = true;
      cantidadSugerida = redondearComercial(bruta, p.unidadMedida);
    }

    const costoEstimado = red(cantidadSugerida * Number(p.precioC || 0), 2);

    return {
      ...p,
      prioridad,
      etiquetaPrioridad: ETIQUETA_PRIORIDAD[prioridad],
      esEmergencia,
      puntaje,
      desglose: {
        urgencia: red(urgencia, 1),
        demanda: red(demandaScore, 1),
        margen: red(margenScore, 1),
        brecha: red(brechaScore, 1),
      },
      cantidadSugerida,
      costoEstimado,
      limitadaPorVidaUtil,
      enPresupuesto: true,
    };
  });

  // Orden determinista: primero prioridad (Crítica → Alta → Media → Baja → Sobreabastecido → Insuficientes),
  // luego mayor puntaje y desempate por código.
  evaluados.sort((a, b) => (
    ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]
    || (b.puntaje ?? -1) - (a.puntaje ?? -1)
    || a.codigo - b.codigo
  ));

  // Paso 6: asignación de presupuesto semanal (si el usuario definió tope)
  const hayPresupuesto = params.presupuesto !== null && params.presupuesto !== undefined && params.presupuesto !== '';
  const presupuestoNum = hayPresupuesto ? Math.max(Number(params.presupuesto) || 0, 0) : null;
  let restante = presupuestoNum;
  let montoSugerido = 0;
  let montoCubierto = 0;
  let fueraPresupuesto = 0;

  const finales = evaluados.map((item) => {
    let enPresupuesto = true;
    if (item.cantidadSugerida > 0) {
      montoSugerido = red(montoSugerido + item.costoEstimado, 2);
      if (presupuestoNum !== null) {
        if (item.costoEstimado <= restante + 0.001) {
          restante = red(restante - item.costoEstimado, 2);
          montoCubierto = red(montoCubierto + item.costoEstimado, 2);
        } else {
          enPresupuesto = false;
          fueraPresupuesto += 1;
        }
      } else {
        montoCubierto = red(montoCubierto + item.costoEstimado, 2);
      }
    }
    const conPres = { ...item, enPresupuesto };
    return { ...conPres, explicacion: construirExplicacion(conPres, params) };
  });

  const conteos = {
    total: finales.length,
    critica: finales.filter((x) => x.prioridad === 'critica').length,
    alta: finales.filter((x) => x.prioridad === 'alta').length,
    media: finales.filter((x) => x.prioridad === 'media').length,
    baja: finales.filter((x) => x.prioridad === 'baja').length,
    sobreabastecido: finales.filter((x) => x.prioridad === 'sobreabastecido').length,
    insuficientes: finales.filter((x) => x.prioridad === 'insuficientes').length,
  };

  const conCobertura = finales.filter((x) => x.diasCobertura !== null);
  const coberturaPromedio = conCobertura.length
    ? red(conCobertura.reduce((s, x) => s + x.diasCobertura, 0) / conCobertura.length, 1)
    : null;

  return {
    parametros: params,
    resumen: {
      ...conteos,
      urgentes: conteos.critica + conteos.alta,
      montoSugerido,
      montoCubierto,
      presupuesto: presupuestoNum,
      saldoPresupuesto: presupuestoNum !== null ? red(presupuestoNum - montoCubierto, 2) : null,
      fueraPresupuesto,
      coberturaPromedio,
    },
    recomendaciones: finales,
  };
}
