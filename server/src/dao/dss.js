// Consultas SQL para la bitácora ETL y el módulo DSS (esquema etl.*).
import { num, patronBusqueda } from '../db.js';

export async function listarCorridasEtl(q, limite = 20, { fecha = null } = {}) {
  const valores = [];
  let where = '';
  if (fecha) {
    valores.push(fecha);
    where = `where iniciado_en >= $1::date and iniciado_en < $1::date + 1`;
  }
  valores.push(limite);
  const filas = await q(
    `select id,
            to_char(iniciado_en, 'YYYY-MM-DD"T"HH24:MI:SS') as iniciado_en,
            to_char(terminado_en, 'YYYY-MM-DD"T"HH24:MI:SS') as terminado_en,
            duracion_ms, modo, ejecutado_por, estado,
            filas_leidas, filas_limpiadas, filas_imputadas, filas_cargadas, filas_rechazadas,
            to_char(fecha_corte, 'YYYY-MM-DD') as fecha_corte,
            detalle_error
     from etl.corridas
     ${where}
     order by id desc
     limit $${valores.length}`,
    valores,
  );
  return filas.map((f) => ({
    id: Number(f.id),
    iniciadoEn: f.iniciado_en,
    terminadoEn: f.terminado_en,
    duracionMs: f.duracion_ms,
    modo: f.modo,
    ejecutadoPor: f.ejecutado_por,
    estado: f.estado,
    filasLeidas: f.filas_leidas,
    filasLimpiadas: f.filas_limpiadas,
    filasImputadas: f.filas_imputadas,
    filasCargadas: f.filas_cargadas,
    filasRechazadas: f.filas_rechazadas,
    fechaCorte: f.fecha_corte,
    detalleError: f.detalle_error,
  }));
}

export async function diasConCorridasEtl(q, { desde, hasta }) {
  const filas = await q(
    `select to_char(iniciado_en::date, 'YYYY-MM-DD') as dia, count(*)::int as corridas
     from etl.corridas
     where iniciado_en >= $1::date and iniciado_en < $2::date + 1
     group by iniciado_en::date
     order by dia`,
    [desde, hasta],
  );
  const dias = {};
  for (const f of filas) dias[f.dia] = f.corridas;
  return dias;
}

function filtrosCambios({ corridaId, entidad, tipo, buscar, fecha }) {
  const condiciones = [];
  const valores = [];
  const param = (v) => {
    valores.push(v);
    return `$${valores.length}`;
  };
  if (corridaId) condiciones.push(`corrida_id = ${param(corridaId)}`);
  if (fecha) {
    const p = param(fecha);
    condiciones.push(`fecha_hora >= ${p}::date and fecha_hora < ${p}::date + 1`);
  }
  if (entidad) condiciones.push(`entidad = ${param(entidad)}`);
  if (tipo) condiciones.push(`tipo = ${param(tipo)}`);
  if (buscar) {
    const p = param(patronBusqueda(buscar));
    condiciones.push(`(clave ilike ${p} or regla ilike ${p} or campo ilike ${p} or motivo ilike ${p} or coalesce(valor_antes,'') ilike ${p} or coalesce(valor_despues,'') ilike ${p})`);
  }
  return { where: condiciones.length ? `where ${condiciones.join(' and ')}` : '', valores };
}

export async function listarCambiosEtl(q, opciones) {
  const { where, valores } = filtrosCambios(opciones);
  valores.push(opciones.limite, opciones.offset);
  const filas = await q(
    `select id, corrida_id, to_char(fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_hora,
            entidad, fuente, clave, campo, tipo, regla,
            valor_antes, valor_despues, motivo, dato_antes, dato_despues,
            count(*) over ()::int as total_filas
     from etl.cambios
     ${where}
     order by id desc
     limit $${valores.length - 1} offset $${valores.length}`,
    valores,
  );
  return {
    total: filas[0]?.total_filas ?? 0,
    registros: filas.map((f) => ({
      id: Number(f.id),
      corridaId: Number(f.corrida_id),
      fechaHora: f.fecha_hora,
      entidad: f.entidad,
      fuente: f.fuente,
      clave: f.clave,
      campo: f.campo,
      tipo: f.tipo,
      regla: f.regla,
      valorAntes: f.valor_antes,
      valorDespues: f.valor_despues,
      motivo: f.motivo,
      datoAntes: f.dato_antes,
      datoDespues: f.dato_despues,
    })),
  };
}

export async function resumenCambiosEtl(q, opciones) {
  const { where, valores } = filtrosCambios({ ...opciones, tipo: null });
  const [f] = await q(
    `select count(*)::int as total,
            count(*) filter (where tipo = 'LIMPIADO')::int  as limpiados,
            count(*) filter (where tipo = 'IMPUTADO')::int  as imputados,
            count(*) filter (where tipo = 'RECHAZADO')::int as rechazados,
            count(*) filter (where tipo = 'CARGADO')::int   as cargados
     from etl.cambios ${where}`,
    valores,
  );
  return f;
}

export async function leerResumenProductos(q) {
  const filas = await q(
    `select codigo, descripcion, categoria, unidad_medida,
            existencia, precio_c, precio_v,
            stock_minimo, vida_util_dias, dias_entrega, entrega_imputada, proveedor_principal,
            dias_con_ventas, unidades_vendidas, demanda_diaria, dias_cobertura,
            rotacion, brecha_minimo, margen_entrega, margen_pct,
            riesgo_merma, datos_suficientes, ventana_dias,
            to_char(fecha_corte, 'YYYY-MM-DD') as fecha_corte,
            to_char(actualizado_en, 'YYYY-MM-DD"T"HH24:MI:SS') as actualizado_en
     from etl.resumen_producto
     order by codigo`,
  );
  return filas.map((f) => ({
    codigo: f.codigo,
    descripcion: f.descripcion,
    categoria: f.categoria,
    unidadMedida: f.unidad_medida,
    existencia: num(f.existencia),
    precioC: num(f.precio_c),
    precioV: num(f.precio_v),
    stockMinimo: num(f.stock_minimo),
    vidaUtilDias: f.vida_util_dias,
    diasEntrega: f.dias_entrega,
    entregaImputada: f.entrega_imputada,
    proveedorPrincipal: f.proveedor_principal,
    diasConVentas: f.dias_con_ventas,
    unidadesVendidas: num(f.unidades_vendidas),
    demandaDiariaBase: num(f.demanda_diaria),
    demandaDiaria: num(f.demanda_diaria),
    diasCobertura: num(f.dias_cobertura),
    rotacion: num(f.rotacion),
    brechaMinimo: num(f.brecha_minimo),
    margenEntrega: num(f.margen_entrega),
    margenPct: num(f.margen_pct),
    riesgoMerma: f.riesgo_merma,
    datosSuficientes: f.datos_suficientes,
    ventanaDias: f.ventana_dias,
    fechaCorte: f.fecha_corte,
    actualizadoEn: f.actualizado_en,
  }));
}

export async function leerParametrosDss(q) {
  const [f] = await q(
    `select version, ventana_dias, colchon_dias, cobertura_objetivo, min_dias_ventas,
            peso_urgencia, peso_demanda, peso_margen, peso_brecha, notas
     from etl.dss_parametros
     order by creado_en desc
     limit 1`,
  );
  if (!f) return null;
  return {
    version: f.version,
    ventanaDias: f.ventana_dias,
    colchonDias: f.colchon_dias,
    coberturaObjetivo: f.cobertura_objetivo,
    minDiasVentas: f.min_dias_ventas,
    pesos: {
      urgencia: num(f.peso_urgencia),
      demanda: num(f.peso_demanda),
      margen: num(f.peso_margen),
      brecha: num(f.peso_brecha),
    },
    notas: f.notas,
  };
}

export async function guardarCorridaDss(q, { ejecutadoPor, escenario, evaluacion, fechaCorte }) {
  const { parametros, resumen, recomendaciones } = evaluacion;
  const [corrida] = await q(
    `insert into etl.dss_corridas (
       ejecutado_por, version_parametros, escenario, factor_demanda, extra_entrega,
       presupuesto, fecha_corte,
       total_critica, total_alta, total_media, total_baja, total_sobre, total_insuficientes,
       monto_sugerido, monto_cubierto, fuera_presupuesto
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     returning id, to_char(fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_hora`,
    [
      ejecutadoPor, parametros.version, escenario, parametros.factorDemanda, parametros.extraEntrega,
      resumen.presupuesto, fechaCorte ?? null,
      resumen.critica, resumen.alta, resumen.media, resumen.baja, resumen.sobreabastecido, resumen.insuficientes,
      resumen.montoSugerido, resumen.montoCubierto, resumen.fueraPresupuesto,
    ],
  );

  for (const r of recomendaciones) {
    await q(
      `insert into etl.dss_recomendaciones (
         corrida_id, codigo, descripcion, prioridad, es_emergencia, puntaje,
         cantidad_sugerida, costo_estimado, en_presupuesto, explicacion, desglose
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
      [
        corrida.id, r.codigo, r.descripcion, r.prioridad, r.esEmergencia, r.puntaje,
        r.cantidadSugerida, r.costoEstimado, r.enPresupuesto, r.explicacion,
        JSON.stringify(r.desglose ?? {}),
      ],
    );
  }

  return { id: Number(corrida.id), fechaHora: corrida.fecha_hora };
}

export async function listarCorridasDss(q, limite = 12) {
  const filas = await q(
    `select id, to_char(fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_hora,
            ejecutado_por, version_parametros, escenario,
            factor_demanda, extra_entrega, presupuesto,
            to_char(fecha_corte, 'YYYY-MM-DD') as fecha_corte,
            total_critica, total_alta, total_media, monto_sugerido, monto_cubierto, fuera_presupuesto
     from etl.dss_corridas
     order by id desc
     limit $1`,
    [limite],
  );
  return filas.map((f) => ({
    id: Number(f.id),
    fechaHora: f.fecha_hora,
    ejecutadoPor: f.ejecutado_por,
    versionParametros: f.version_parametros,
    escenario: f.escenario,
    factorDemanda: num(f.factor_demanda),
    extraEntrega: f.extra_entrega,
    presupuesto: num(f.presupuesto),
    fechaCorte: f.fecha_corte,
    totalCritica: f.total_critica,
    totalAlta: f.total_alta,
    totalMedia: f.total_media,
    montoSugerido: num(f.monto_sugerido),
    montoCubierto: num(f.monto_cubierto),
    fueraPresupuesto: f.fuera_presupuesto,
  }));
}

export async function obtenerCorridaDss(q, id) {
  const [c] = await q(
    `select id, to_char(fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha_hora,
            ejecutado_por, version_parametros, escenario,
            factor_demanda, extra_entrega, presupuesto,
            to_char(fecha_corte, 'YYYY-MM-DD') as fecha_corte,
            total_critica, total_alta, total_media, total_baja, total_sobre, total_insuficientes,
            monto_sugerido, monto_cubierto, fuera_presupuesto
     from etl.dss_corridas
     where id = $1`,
    [id],
  );
  if (!c) return null;

  const recs = await q(
    `select r.codigo, r.descripcion, r.prioridad, r.es_emergencia, r.puntaje,
            r.cantidad_sugerida, r.costo_estimado, r.en_presupuesto, r.explicacion,
            coalesce(p.unidad_medida, 'unidad') as unidad_medida
     from etl.dss_recomendaciones r
     left join fruteria.producto p on p.codigo = r.codigo
     where r.corrida_id = $1
     order by
       case r.prioridad
         when 'critica' then 1
         when 'alta' then 2
         when 'media' then 3
         when 'baja' then 4
         when 'sobreabastecido' then 5
         else 6
       end,
       r.puntaje desc nulls last,
       r.codigo asc`,
    [id],
  );

  return {
    id: Number(c.id),
    fechaHora: c.fecha_hora,
    ejecutadoPor: c.ejecutado_por,
    versionParametros: c.version_parametros,
    escenario: c.escenario,
    factorDemanda: num(c.factor_demanda),
    extraEntrega: c.extra_entrega,
    presupuesto: num(c.presupuesto),
    fechaCorte: c.fecha_corte,
    totalCritica: c.total_critica,
    totalAlta: c.total_alta,
    totalMedia: c.total_media,
    totalBaja: c.total_baja,
    totalSobre: c.total_sobre,
    totalInsuficientes: c.total_insuficientes,
    montoSugerido: num(c.monto_sugerido),
    montoCubierto: num(c.monto_cubierto),
    fueraPresupuesto: c.fuera_presupuesto,
    recomendaciones: recs.map((r) => ({
      codigo: r.codigo,
      descripcion: r.descripcion,
      unidadMedida: r.unidad_medida,
      prioridad: r.prioridad,
      esEmergencia: r.es_emergencia,
      puntaje: num(r.puntaje),
      cantidadSugerida: num(r.cantidad_sugerida),
      costoEstimado: num(r.costo_estimado),
      enPresupuesto: r.en_presupuesto,
      explicacion: r.explicacion,
    })),
  };
}
