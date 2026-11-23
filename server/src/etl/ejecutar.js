// Motor ETL de Harvest JAM: Extracción → Limpieza/Validación → Carga idempotente.
// Regla de Oro: solo LEE de fruteria.* y solo ESCRIBE en etl.*.
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ_PROYECTO } from '../config.js';
import { calcularIndicadoresProducto } from '../dss/indicadores.js';
import { LOTE_PRUEBA_PARAMETROS, LOTE_PRUEBA_VENTAS } from './datosPrueba.js';
import {
  leerCsv, limpiarTexto, normalizarCategoria, normalizarUnidad,
  procesarEntregasCsv, procesarParametrosCsv, procesarVentas,
} from './reglas.js';

const VENTANA_DIAS_DEFECTO = 28;
const MIN_DIAS_VENTAS_DEFECTO = 5;

function leerCsvExterno(nombreArchivo) {
  const ruta = path.join(RAIZ_PROYECTO, 'datos-externos', nombreArchivo);
  if (!fs.existsSync(ruta)) return [];
  return leerCsv(fs.readFileSync(ruta, 'utf8'));
}

async function insertarCambiosYRechazos(cliente, corridaId, cambios, rechazos) {
  for (const c of cambios) {
    await cliente.query(
      `insert into etl.cambios
         (corrida_id, entidad, fuente, clave, campo, tipo, regla, valor_antes, valor_despues, motivo, dato_antes, dato_despues)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)`,
      [
        corridaId, c.entidad, c.fuente, c.clave, c.campo, c.tipo, c.regla,
        c.valorAntes ?? null, c.valorDespues ?? null, c.motivo,
        c.datoAntes ? JSON.stringify(c.datoAntes) : null,
        c.datoDespues ? JSON.stringify(c.datoDespues) : null,
      ],
    );
  }

  for (const r of rechazos) {
    await cliente.query(
      `insert into etl.rechazos (corrida_id, entidad, fuente, clave, regla, motivo, dato_original)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [corridaId, r.entidad, r.fuente, r.clave, r.regla, r.motivo, JSON.stringify(r.datoOriginal)],
    );
  }
}

export async function ejecutarEtl(pool, { modo = 'completo', ejecutadoPor = 'sistema' } = {}) {
  const inicio = Date.now();
  const cliente = await pool.connect();
  let corridaId = null;

  try {
    // 1. Abrir corrida en bitácora (fuera de la transacción para que un fallo quede registrado)
    const { rows: [corrida] } = await cliente.query(
      `insert into etl.corridas (modo, ejecutado_por, estado)
       values ($1, $2, 'en_curso') returning id`,
      [modo, ejecutadoPor],
    );
    corridaId = Number(corrida.id);

    // 2. EXTRACCIÓN (solo lectura sobre fruteria.*)
    const { rows: productosDb } = await cliente.query(`
      select p.codigo, p.descripcion, p.categoria, p.unidad_medida,
             p.existencia::float as existencia, p.precio_c::float as precio_c, p.precio_v::float as precio_v,
             p.stock_minimo::float as stock_minimo_bd, p.vida_util_dias as vida_util_bd,
             (
               select pr.nombre
               from fruteria.producto_proveedor pp
               join fruteria.proveedor pr on pr.id_p = pp.id_p
               where pp.codigo = p.codigo
               order by (pp.dias_entrega is null) asc, pp.dias_entrega asc, pp.id_p asc
               limit 1
             ) as proveedor_principal,
             (
               select pp.dias_entrega
               from fruteria.producto_proveedor pp
               where pp.codigo = p.codigo and pp.dias_entrega is not null
               order by pp.dias_entrega asc, pp.id_p asc
               limit 1
             ) as dias_entrega_bd
      from fruteria.producto p
      order by p.codigo
    `);

    const codigosValidos = new Set(productosDb.map((p) => Number(p.codigo)));
    const catalogoPorCodigo = new Map(productosDb.map((p) => [Number(p.codigo), p]));
    const hoyIso = new Date().toISOString().slice(0, 10);

    // -----------------------------------------------------------------
    // MODO PRUEBA: ejecuta anomalías controladas sin tocar tablas limpias
    // -----------------------------------------------------------------
    if (modo === 'prueba') {
      const resParam = procesarParametrosCsv(LOTE_PRUEBA_PARAMETROS, codigosValidos, {
        fuente: 'lote_prueba_parametros', hoyIso,
      });
      const resVentas = procesarVentas(LOTE_PRUEBA_VENTAS, catalogoPorCodigo, {
        fuente: 'lote_prueba_ventas', hoyIso,
      });

      const cambios = [...resParam.cambios, ...resVentas.cambios];
      const rechazos = [...resParam.rechazos, ...resVentas.rechazos];
      const leidas = LOTE_PRUEBA_PARAMETROS.length + LOTE_PRUEBA_VENTAS.length;
      const limpiadas = cambios.filter((c) => c.tipo === 'LIMPIADO').length;
      const imputadas = cambios.filter((c) => c.tipo === 'IMPUTADO').length;
      const cargadas = resParam.limpios.length + resVentas.limpios.length;
      const duracionMs = Date.now() - inicio;

      await cliente.query('begin');
      await insertarCambiosYRechazos(cliente, corridaId, cambios, rechazos);
      await cliente.query(
        `update etl.corridas
         set terminado_en = localtimestamp(0), duracion_ms = $2,
             estado = $3, filas_leidas = $4, filas_limpiadas = $5,
             filas_imputadas = $6, filas_cargadas = $7, filas_rechazadas = $8
         where id = $1`,
        [
          corridaId, duracionMs, rechazos.length ? 'con_rechazos' : 'ok',
          leidas, limpiadas, imputadas, cargadas, rechazos.length,
        ],
      );
      await cliente.query('commit');

      return {
        corridaId, modo, estado: rechazos.length ? 'con_rechazos' : 'ok', duracionMs,
        filasLeidas: leidas, filasLimpiadas: limpiadas, filasImputadas: imputadas,
        filasCargadas: cargadas, filasRechazadas: rechazos.length,
      };
    }

    // -----------------------------------------------------------------
    // MODO COMPLETO: reconstrucción idempotente desde fruteria + CSVs
    // -----------------------------------------------------------------
    const filasParamCsv = leerCsvExterno('parametros_producto.csv');
    const filasEntregaCsv = leerCsvExterno('tiempos_entrega_proveedor.csv');

    const { rows: ventasDb } = await cliente.query(`
      select dv.folio_v, dv.codigo,
             to_char(v.fecha, 'YYYY-MM-DD"T"HH24:MI:SS') as fecha,
             dv.cantidad::float as cantidad,
             coalesce(dv.precio_unitario, p.precio_v)::float as precio_unitario
      from fruteria.detalle_venta dv
      join fruteria.venta v on v.folio_v = dv.folio_v
      join fruteria.producto p on p.codigo = dv.codigo
      order by v.fecha asc, dv.folio_v asc, dv.codigo asc
    `);

    const { rows: [paramsDss] } = await cliente.query(
      `select ventana_dias, min_dias_ventas from etl.dss_parametros order by creado_en desc limit 1`,
    );
    const ventanaDias = Number(paramsDss?.ventana_dias ?? VENTANA_DIAS_DEFECTO);
    const minDiasVentas = Number(paramsDss?.min_dias_ventas ?? MIN_DIAS_VENTAS_DEFECTO);

    // 3. TRANSFORMACIÓN y VALIDACIÓN
    const resParam = procesarParametrosCsv(filasParamCsv, codigosValidos, { hoyIso });
    const resEntregas = procesarEntregasCsv(filasEntregaCsv, codigosValidos, { hoyIso });
    const resVentas = procesarVentas(ventasDb, catalogoPorCodigo, { hoyIso });

    const paramPorCodigo = new Map(resParam.limpios.map((p) => [p.codigo, p]));
    const entregaPorCodigo = new Map(resEntregas.limpios.map((e) => [e.codigo, e]));

    const cambios = [...resParam.cambios, ...resEntregas.cambios, ...resVentas.cambios];
    const rechazos = [...resParam.rechazos, ...resEntregas.rechazos, ...resVentas.rechazos];

    // Fecha de corte = fecha de la venta más reciente disponible (o hoy si no hay ventas)
    const fechaCorte = resVentas.limpios.length
      ? resVentas.limpios.reduce((max, v) => (v.fecha.slice(0, 10) > max ? v.fecha.slice(0, 10) : max), '0000-00-00')
      : hoyIso;

    // Ventana de demanda de los últimos N días hasta fechaCorte
    const dCorte = new Date(`${fechaCorte}T12:00:00Z`);
    const dInicio = new Date(dCorte.getTime() - (ventanaDias - 1) * 86_400_000);
    const inicioVentana = dInicio.toISOString().slice(0, 10);

    // Agregar ventas en la ventana por producto
    const ventasVentanaPorProd = new Map();
    for (const v of resVentas.limpios) {
      const dia = v.fecha.slice(0, 10);
      if (dia < inicioVentana || dia > fechaCorte) continue;
      let acc = ventasVentanaPorProd.get(v.codigo);
      if (!acc) {
        acc = { unidades: 0, dias: new Set() };
        ventasVentanaPorProd.set(v.codigo, acc);
      }
      acc.unidades += v.cantidad;
      acc.dias.add(dia);
    }

    // Construir etl.resumen_producto con variables limpias + los 5 indicadores
    const resumenes = productosDb.map((p) => {
      const codigo = Number(p.codigo);
      const param = paramPorCodigo.get(codigo);
      const entrega = entregaPorCodigo.get(codigo);
      const agg = ventasVentanaPorProd.get(codigo);

      const desc = limpiarTexto(p.descripcion);
      const cat = normalizarCategoria(p.categoria);
      const uni = normalizarUnidad(p.unidad_medida);

      // Prioridad de fuentes: 1) dato real capturado en fruteria.*, 2) CSV externo limpio, 3) estándar seguro.
      const tieneMinBd = p.stock_minimo_bd !== null && p.stock_minimo_bd !== undefined;
      const tieneVidaBd = p.vida_util_bd !== null && p.vida_util_bd !== undefined;
      const tieneEntregaBd = p.dias_entrega_bd !== null && p.dias_entrega_bd !== undefined;

      const stockMinimo = tieneMinBd ? Number(p.stock_minimo_bd) : (param?.stockMinimo ?? 10);
      const vidaUtilDias = tieneVidaBd ? Number(p.vida_util_bd) : (param?.vidaUtilDias ?? 7);
      const diasEntrega = tieneEntregaBd ? Number(p.dias_entrega_bd) : (entrega?.diasEntrega ?? 2);
      const entregaImputada = tieneEntregaBd ? false : (entrega ? entrega.entregaImputada : true);
      const fuenteParam = (tieneMinBd || tieneVidaBd || tieneEntregaBd)
        ? (param || entrega ? 'fruteria + csv' : 'fruteria (BD)')
        : 'datos-externos/*.csv';
      const unidadesVendidas = Math.round((agg?.unidades ?? 0) * 1000) / 1000;
      const diasConVentas = agg?.dias.size ?? 0;

      const ind = calcularIndicadoresProducto({
        existencia: Number(p.existencia),
        unidadesVendidas,
        ventanaDias,
        stockMinimo,
        diasEntrega,
        vidaUtilDias,
        precioCompra: Number(p.precio_c),
        precioVenta: Number(p.precio_v),
        diasConVentas,
        minDiasVentas,
      });

      return {
        codigo,
        descripcion: desc.valor,
        categoria: cat.valor,
        unidadMedida: uni.valor,
        existencia: Number(p.existencia),
        precioC: Number(p.precio_c),
        precioV: Number(p.precio_v),
        stockMinimo,
        vidaUtilDias,
        diasEntrega,
        entregaImputada,
        fuenteParam,
        proveedorPrincipal: p.proveedor_principal ? limpiarTexto(p.proveedor_principal).valor : 'Sin proveedor asignado',
        diasConVentas,
        unidadesVendidas,
        ...ind,
        ventanaDias,
        fechaCorte,
      };
    });

    // Evento resumen de carga para visibilidad en la bitácora
    cambios.push({
      entidad: 'resumen',
      fuente: 'fruteria + datos-externos',
      clave: `${resumenes.length} productos`,
      campo: 'etl.resumen_producto',
      tipo: 'CARGADO',
      regla: 'LD-01',
      valorAntes: `${resVentas.limpios.length} ventas · ventana ${ventanaDias}d`,
      valorDespues: `${resumenes.length} productos listos para DSS (corte ${fechaCorte})`,
      motivo: 'Carga idempotente completada en etl.venta_limpia y etl.resumen_producto',
      datoAntes: { ventasLeidas: ventasDb.length, csvParametros: filasParamCsv.length, csvEntregas: filasEntregaCsv.length },
      datoDespues: { productosCargados: resumenes.length, ventasCargadas: resVentas.limpios.length, fechaCorte },
    });

    // 4. CARGA IDEMPOTENTE (todo o nada en una sola transacción)
    await cliente.query('begin');

    await cliente.query('truncate table etl.parametros_producto, etl.venta_limpia, etl.resumen_producto');

    for (const r of resumenes) {
      await cliente.query(
        `insert into etl.parametros_producto
           (codigo, stock_minimo, vida_util_dias, dias_entrega, entrega_imputada, proveedor_principal, fuente)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          r.codigo, r.stockMinimo, r.vidaUtilDias, r.diasEntrega,
          r.entregaImputada, r.proveedorPrincipal, r.fuenteParam,
        ],
      );

      await cliente.query(
        `insert into etl.resumen_producto (
           codigo, descripcion, categoria, unidad_medida, existencia, precio_c, precio_v,
           stock_minimo, vida_util_dias, dias_entrega, entrega_imputada, proveedor_principal,
           dias_con_ventas, unidades_vendidas, demanda_diaria, dias_cobertura, rotacion,
           brecha_minimo, margen_entrega, margen_pct, riesgo_merma, datos_suficientes,
           ventana_dias, fecha_corte
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
         )`,
        [
          r.codigo, r.descripcion, r.categoria, r.unidadMedida, r.existencia, r.precioC, r.precioV,
          r.stockMinimo, r.vidaUtilDias, r.diasEntrega, r.entregaImputada, r.proveedorPrincipal,
          r.diasConVentas, r.unidadesVendidas, r.demandaDiaria, r.diasCobertura, r.rotacion,
          r.brechaMinimo, r.margenEntrega, r.margenPct, r.riesgoMerma, r.datosSuficientes,
          r.ventanaDias, r.fechaCorte,
        ],
      );
    }

    // Inserción rápida en lotes para etl.venta_limpia
    const TAM_LOTE = 250;
    for (let i = 0; i < resVentas.limpios.length; i += TAM_LOTE) {
      const lote = resVentas.limpios.slice(i, i + TAM_LOTE);
      const vals = [];
      const placeholders = lote.map((v, idx) => {
        const b = idx * 11;
        vals.push(
          v.folioV, v.codigo, v.fecha, v.producto, v.categoria, v.unidadMedida,
          v.cantidad, v.precioUnitario, v.costoUnitario, v.importe, v.margen,
        );
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
      });
      await cliente.query(
        `insert into etl.venta_limpia
           (folio_v, codigo, fecha, producto, categoria, unidad_medida, cantidad, precio_unitario, costo_unitario, importe, margen)
         values ${placeholders.join(',')}`,
        vals,
      );
    }

    await insertarCambiosYRechazos(cliente, corridaId, cambios, rechazos);

    const leidas = filasParamCsv.length + filasEntregaCsv.length + ventasDb.length;
    const limpiadas = cambios.filter((c) => c.tipo === 'LIMPIADO').length;
    const imputadas = cambios.filter((c) => c.tipo === 'IMPUTADO').length;
    const cargadas = resVentas.limpios.length + resumenes.length;
    const duracionMs = Date.now() - inicio;
    const estadoFinal = rechazos.length ? 'con_rechazos' : 'ok';

    await cliente.query(
      `update etl.corridas
       set terminado_en = localtimestamp(0), duracion_ms = $2, estado = $3,
           filas_leidas = $4, filas_limpiadas = $5, filas_imputadas = $6,
           filas_cargadas = $7, filas_rechazadas = $8, fecha_corte = $9
       where id = $1`,
      [corridaId, duracionMs, estadoFinal, leidas, limpiadas, imputadas, cargadas, rechazos.length, fechaCorte],
    );

    await cliente.query('commit');

    return {
      corridaId,
      modo,
      estado: estadoFinal,
      duracionMs,
      fechaCorte,
      filasLeidas: leidas,
      filasLimpiadas: limpiadas,
      filasImputadas: imputadas,
      filasCargadas: cargadas,
      filasRechazadas: rechazos.length,
    };
  } catch (err) {
    await cliente.query('rollback').catch(() => {});
    if (corridaId) {
      await cliente.query(
        `update etl.corridas
         set terminado_en = localtimestamp(0), duracion_ms = $2, estado = 'error', detalle_error = $3
         where id = $1`,
        [corridaId, Date.now() - inicio, err.message],
      ).catch(() => {});
    }
    throw err;
  } finally {
    cliente.release();
  }
}
