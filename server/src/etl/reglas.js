// Reglas puras del ETL: limpieza (L1–L4), imputación (I1) y validación (V1–V4).
// Son funciones puras (sin base de datos) para que sean fáciles de leer y probar.

const ALIAS_UNIDADES = {
  kg: 'kilogramo',
  kgs: 'kilogramo',
  kilo: 'kilogramo',
  kilos: 'kilogramo',
  pza: 'pieza',
  pzas: 'pieza',
  pz: 'pieza',
  lt: 'litro',
  lts: 'litro',
  l: 'litro',
  paq: 'paquete',
  paqs: 'paquete',
};

const ALIAS_CATEGORIAS = {
  fruta: 'fruta',
  frutas: 'fruta',
  verdura: 'verdura',
  verduras: 'verdura',
};

// Parser ligero de CSV con soporte para valores entre comillas (ej. "12,5" o " 5000").
export function leerCsv(contenido) {
  const lineas = String(contenido ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lineas.length < 2) return [];

  const partirLinea = (linea) => {
    const celdas = [];
    let actual = '';
    let enComillas = false;
    for (let i = 0; i < linea.length; i += 1) {
      const ch = linea[i];
      if (ch === '"') {
        if (enComillas && linea[i + 1] === '"') {
          actual += '"';
          i += 1;
        } else {
          enComillas = !enComillas;
        }
      } else if (ch === ',' && !enComillas) {
        celdas.push(actual);
        actual = '';
      } else {
        actual += ch;
      }
    }
    celdas.push(actual);
    return celdas;
  };

  const encabezados = partirLinea(lineas[0]).map((h) => h.trim());
  return lineas.slice(1).map((linea, idx) => {
    const valores = partirLinea(linea);
    const fila = { _renglon: idx + 2 };
    encabezados.forEach((h, i) => {
      fila[h] = valores[i] ?? '';
    });
    return fila;
  });
}

// L1 · Limpia espacios extra y unifica texto en formato legible ("  cebolla  BLANCA " → "Cebolla blanca").
export function limpiarTexto(valor) {
  const crudo = String(valor ?? '');
  const colapsado = crudo.trim().replace(/\s+/g, ' ');
  if (!colapsado) return { valor: '', cambio: false };
  const limpio = colapsado.charAt(0).toUpperCase() + colapsado.slice(1).toLowerCase();
  return { valor: limpio, cambio: limpio !== crudo };
}

// L1 · Normaliza un código numérico con espacios o ceros a la izquierda (" 5000", "05001" → 5000, 5001).
export function normalizarCodigo(valor) {
  const crudo = String(valor ?? '');
  const sinEspacios = crudo.trim();
  if (!/^\d+$/.test(sinEspacios)) return { valor: null, cambio: false, valido: false };
  const num = Number.parseInt(sinEspacios, 10);
  return { valor: num, cambio: String(num) !== crudo, valido: num > 0 };
}

// L2 · Convierte números escritos con coma decimal ("12,5" → 12.5).
export function normalizarNumero(valor) {
  const crudo = String(valor ?? '').trim();
  if (crudo === '') return { valor: null, cambio: false, vacio: true, valido: false };
  const conPunto = crudo.replace(',', '.');
  const num = Number(conPunto);
  if (!Number.isFinite(num)) return { valor: null, cambio: false, vacio: false, valido: false };
  return { valor: num, cambio: conPunto !== crudo, vacio: false, valido: true };
}

// L2 · Convierte fechas en formato YYYY-MM-DD o DD/MM/YYYY a ISO YYYY-MM-DD.
export function normalizarFecha(valor, hoyIso = new Date().toISOString().slice(0, 10)) {
  const crudo = String(valor ?? '').trim();
  if (!crudo) return { valor: null, cambio: false, valido: false, motivo: 'Fecha vacía' };

  let iso = null;
  let cambio = false;

  const mIso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(crudo);
  const mLatam = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(crudo);

  if (mIso) {
    iso = `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
  } else if (mLatam) {
    iso = `${mLatam[3]}-${mLatam[2]}-${mLatam[1]}`;
    cambio = true;
  } else {
    return { valor: null, cambio: false, valido: false, motivo: `Formato de fecha no reconocido ("${crudo}")` };
  }

  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    return { valor: null, cambio: false, valido: false, motivo: `Fecha inexistente ("${crudo}")` };
  }
  if (iso > hoyIso) {
    return { valor: null, cambio: false, valido: false, motivo: `Fecha futura (${iso} > ${hoyIso})` };
  }
  return { valor: iso, cambio, valido: true };
}

// L2 · Homologa categoría a minúsculas estándar.
export function normalizarCategoria(valor) {
  const crudo = String(valor ?? '');
  const base = crudo.trim().toLowerCase();
  if (!base) return { valor: 'sin_clasificar', cambio: true };
  const limpia = ALIAS_CATEGORIAS[base] ?? base;
  return { valor: limpia, cambio: limpia !== crudo };
}

// L3 · Homologa unidad de medida ("kg" → "kilogramo", "pza" → "pieza").
export function normalizarUnidad(valor) {
  const crudo = String(valor ?? '');
  const base = crudo.trim().toLowerCase();
  const limpia = ALIAS_UNIDADES[base] ?? base;
  return { valor: limpia, cambio: limpia !== crudo };
}

// Procesa filas de parametros_producto.csv aplicando L1–L4 y V1–V4.
export function procesarParametrosCsv(filas, codigosValidos, { fuente = 'parametros_producto.csv', hoyIso } = {}) {
  const cambios = [];
  const rechazos = [];
  const porCodigo = new Map();

  for (const fila of filas) {
    const claveCruda = String(fila.codigo ?? `fila-${fila._renglon}`).trim() || `fila-${fila._renglon}`;

    // L1 + V1: código
    const cod = normalizarCodigo(fila.codigo);
    if (!cod.valido || (codigosValidos && !codigosValidos.has(cod.valor))) {
      const motivo = !cod.valido
        ? `Código no numérico o vacío ("${fila.codigo}")`
        : `El código ${cod.valor} no existe en el catálogo de productos`;
      rechazos.push({ entidad: 'parametros', fuente, clave: claveCruda, regla: 'V1', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'parametros', fuente, clave: claveCruda, campo: 'codigo', tipo: 'RECHAZADO', regla: 'V1',
        valorAntes: String(fila.codigo ?? ''), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }

    const clave = String(cod.valor);
    if (cod.cambio) {
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'codigo', tipo: 'LIMPIADO', regla: 'L1',
        valorAntes: String(fila.codigo), valorDespues: clave,
        motivo: 'Se eliminaron espacios o ceros a la izquierda en el código', datoAntes: fila, datoDespues: null,
      });
    }

    // L1: descripción
    const desc = limpiarTexto(fila.descripcion);
    if (desc.cambio && fila.descripcion) {
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'descripcion', tipo: 'LIMPIADO', regla: 'L1',
        valorAntes: String(fila.descripcion), valorDespues: desc.valor,
        motivo: 'Se quitaron espacios extra y se unificó la capitalización', datoAntes: fila, datoDespues: null,
      });
    }

    // L2: categoría
    const cat = normalizarCategoria(fila.categoria);
    if (cat.cambio) {
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'categoria', tipo: 'LIMPIADO', regla: 'L2',
        valorAntes: String(fila.categoria ?? ''), valorDespues: cat.valor,
        motivo: 'Se homologó la categoría al vocabulario estándar', datoAntes: fila, datoDespues: null,
      });
    }

    // L3: unidad de medida
    const uni = normalizarUnidad(fila.unidad_medida);
    if (uni.cambio) {
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'unidad_medida', tipo: 'LIMPIADO', regla: 'L3',
        valorAntes: String(fila.unidad_medida ?? ''), valorDespues: uni.valor,
        motivo: 'Se convirtió abreviatura de unidad a su nombre oficial', datoAntes: fila, datoDespues: null,
      });
    }

    // L2 + V2: stock mínimo
    const min = normalizarNumero(fila.stock_minimo);
    if (!min.valido || min.valor < 0) {
      const motivo = `Stock mínimo inválido ("${fila.stock_minimo}"); debe ser un número mayor o igual a 0`;
      rechazos.push({ entidad: 'parametros', fuente, clave, regla: 'V2', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'stock_minimo', tipo: 'RECHAZADO', regla: 'V2',
        valorAntes: String(fila.stock_minimo ?? ''), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }
    if (min.cambio) {
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'stock_minimo', tipo: 'LIMPIADO', regla: 'L2',
        valorAntes: String(fila.stock_minimo), valorDespues: String(min.valor),
        motivo: 'Se convirtió coma decimal a punto', datoAntes: fila, datoDespues: null,
      });
    }

    // V3: vida útil (1 a 60 días)
    const vida = normalizarNumero(fila.vida_util_dias);
    if (!vida.valido || !Number.isInteger(vida.valor) || vida.valor < 1 || vida.valor > 60) {
      const motivo = `Vida útil fuera de rango ("${fila.vida_util_dias}"); debe estar entre 1 y 60 días`;
      rechazos.push({ entidad: 'parametros', fuente, clave, regla: 'V3', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'vida_util_dias', tipo: 'RECHAZADO', regla: 'V3',
        valorAntes: String(fila.vida_util_dias ?? ''), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }

    // L2 + V4: fecha
    const f = normalizarFecha(fila.fecha_actualizacion, hoyIso);
    if (!f.valido) {
      rechazos.push({ entidad: 'parametros', fuente, clave, regla: 'V4', motivo: f.motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'fecha_actualizacion', tipo: 'RECHAZADO', regla: 'V4',
        valorAntes: String(fila.fecha_actualizacion ?? ''), valorDespues: 'Cuarentena', motivo: f.motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }
    if (f.cambio) {
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'fecha_actualizacion', tipo: 'LIMPIADO', regla: 'L2',
        valorAntes: String(fila.fecha_actualizacion), valorDespues: f.valor,
        motivo: 'Se normalizó la fecha a formato estándar YYYY-MM-DD', datoAntes: fila, datoDespues: null,
      });
    }

    const limpio = {
      codigo: cod.valor,
      descripcion: desc.valor,
      categoria: cat.valor,
      unidadMedida: uni.valor,
      stockMinimo: min.valor,
      vidaUtilDias: vida.valor,
      fechaActualizacion: f.valor,
    };

    // L4: duplicado por código → conservar el registro más reciente
    const previo = porCodigo.get(cod.valor);
    if (previo) {
      const ganador = limpio.fechaActualizacion >= previo.fechaActualizacion ? limpio : previo;
      const descartado = ganador === limpio ? previo : limpio;
      porCodigo.set(cod.valor, ganador);
      cambios.push({
        entidad: 'parametros', fuente, clave, campo: 'codigo', tipo: 'LIMPIADO', regla: 'L4',
        valorAntes: `Duplicado (${descartado.fechaActualizacion}, min ${descartado.stockMinimo})`,
        valorDespues: `Conservado (${ganador.fechaActualizacion}, min ${ganador.stockMinimo})`,
        motivo: 'Código repetido en el CSV; se conservó el registro más reciente',
        datoAntes: descartado, datoDespues: ganador,
      });
    } else {
      porCodigo.set(cod.valor, limpio);
    }
  }

  return { limpios: [...porCodigo.values()], cambios, rechazos };
}

// Procesa filas de tiempos_entrega_proveedor.csv aplicando L1–L4, I1 y V1–V4.
export function procesarEntregasCsv(filas, codigosValidos, { fuente = 'tiempos_entrega_proveedor.csv', entregaPorDefecto = 2, hoyIso } = {}) {
  const cambios = [];
  const rechazos = [];
  const porCodigo = new Map();

  for (const fila of filas) {
    const claveCruda = String(fila.codigo ?? `fila-${fila._renglon}`).trim() || `fila-${fila._renglon}`;
    const cod = normalizarCodigo(fila.codigo);
    if (!cod.valido || (codigosValidos && !codigosValidos.has(cod.valor))) {
      const motivo = !cod.valido ? `Código inválido ("${fila.codigo}")` : `El código ${cod.valor} no existe en el catálogo`;
      rechazos.push({ entidad: 'entregas', fuente, clave: claveCruda, regla: 'V1', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'entregas', fuente, clave: claveCruda, campo: 'codigo', tipo: 'RECHAZADO', regla: 'V1',
        valorAntes: String(fila.codigo ?? ''), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }

    const clave = String(cod.valor);
    if (cod.cambio) {
      cambios.push({
        entidad: 'entregas', fuente, clave, campo: 'codigo', tipo: 'LIMPIADO', regla: 'L1',
        valorAntes: String(fila.codigo), valorDespues: clave,
        motivo: 'Se quitaron espacios en el código del producto', datoAntes: fila, datoDespues: null,
      });
    }

    const f = normalizarFecha(fila.fecha_actualizacion, hoyIso);
    if (!f.valido) {
      rechazos.push({ entidad: 'entregas', fuente, clave, regla: 'V4', motivo: f.motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'entregas', fuente, clave, campo: 'fecha_actualizacion', tipo: 'RECHAZADO', regla: 'V4',
        valorAntes: String(fila.fecha_actualizacion ?? ''), valorDespues: 'Cuarentena', motivo: f.motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }
    if (f.cambio) {
      cambios.push({
        entidad: 'entregas', fuente, clave, campo: 'fecha_actualizacion', tipo: 'LIMPIADO', regla: 'L2',
        valorAntes: String(fila.fecha_actualizacion), valorDespues: f.valor,
        motivo: 'Se convirtió la fecha al formato ISO YYYY-MM-DD', datoAntes: fila, datoDespues: null,
      });
    }

    // I1 (faltante → imputado) o V3 (fuera de rango 0..30)
    const ent = normalizarNumero(fila.dias_entrega);
    let diasEntrega = entregaPorDefecto;
    let imputada = false;

    if (ent.vacio) {
      imputada = true;
      cambios.push({
        entidad: 'entregas', fuente, clave, campo: 'dias_entrega', tipo: 'IMPUTADO', regla: 'I1',
        valorAntes: '(vacío)', valorDespues: `${entregaPorDefecto} días (imputado)`,
        motivo: `Faltaba el tiempo de entrega; se imputó el estándar de ${entregaPorDefecto} días y se marcó para revisión`,
        datoAntes: fila, datoDespues: { codigo: cod.valor, diasEntrega: entregaPorDefecto, entregaImputada: true },
      });
    } else if (!ent.valido || !Number.isInteger(ent.valor) || ent.valor < 0 || ent.valor > 30) {
      const motivo = `Tiempo de entrega fuera de rango ("${fila.dias_entrega}"); debe estar entre 0 y 30 días`;
      rechazos.push({ entidad: 'entregas', fuente, clave, regla: 'V3', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'entregas', fuente, clave, campo: 'dias_entrega', tipo: 'RECHAZADO', regla: 'V3',
        valorAntes: String(fila.dias_entrega), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    } else {
      diasEntrega = ent.valor;
    }

    const limpio = {
      codigo: cod.valor,
      idProveedor: normalizarCodigo(fila.id_p).valor,
      diasEntrega,
      entregaImputada: imputada,
      fechaActualizacion: f.valor,
    };

    const previo = porCodigo.get(cod.valor);
    if (previo) {
      const ganador = limpio.fechaActualizacion >= previo.fechaActualizacion ? limpio : previo;
      const descartado = ganador === limpio ? previo : limpio;
      porCodigo.set(cod.valor, ganador);
      cambios.push({
        entidad: 'entregas', fuente, clave, campo: 'codigo', tipo: 'LIMPIADO', regla: 'L4',
        valorAntes: `Duplicado (${descartado.diasEntrega} días)`,
        valorDespues: `Conservado (${ganador.diasEntrega} días)`,
        motivo: 'Registro duplicado de entrega; se conservó el más reciente',
        datoAntes: descartado, datoDespues: ganador,
      });
    } else {
      porCodigo.set(cod.valor, limpio);
    }
  }

  return { limpios: [...porCodigo.values()], cambios, rechazos };
}

// Procesa renglones de ventas (tanto reales de BD como de lote de prueba) con L1–L4 y V1–V4.
export function procesarVentas(filas, catalogoPorCodigo, { fuente = 'fruteria.venta', hoyIso } = {}) {
  const cambios = [];
  const rechazos = [];
  const vistos = new Map();

  for (const fila of filas) {
    const folio = Number(fila.folio_v);
    const cod = normalizarCodigo(fila.codigo);
    const clave = Number.isFinite(folio) && cod.valido ? `#${folio} · ${cod.valor}` : String(fila.folio_v ?? 'sin-folio');

    // V1: producto existente
    if (!cod.valido || !catalogoPorCodigo.has(cod.valor)) {
      const motivo = `El código de producto "${fila.codigo}" no existe en el catálogo`;
      rechazos.push({ entidad: 'ventas', fuente, clave, regla: 'V1', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'ventas', fuente, clave, campo: 'codigo', tipo: 'RECHAZADO', regla: 'V1',
        valorAntes: String(fila.codigo ?? ''), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }

    const prod = catalogoPorCodigo.get(cod.valor);

    // V2: cantidad > 0
    const cant = normalizarNumero(fila.cantidad);
    if (!cant.valido || cant.valor <= 0) {
      const motivo = `Cantidad vendida inválida ("${fila.cantidad}"); debe ser mayor a 0`;
      rechazos.push({ entidad: 'ventas', fuente, clave, regla: 'V2', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'ventas', fuente, clave, campo: 'cantidad', tipo: 'RECHAZADO', regla: 'V2',
        valorAntes: String(fila.cantidad ?? ''), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }

    // V3: precio > 0
    const precio = normalizarNumero(fila.precio_unitario ?? prod.precio_v);
    if (!precio.valido || precio.valor <= 0) {
      const motivo = `Precio unitario inválido ("${fila.precio_unitario}"); debe ser mayor a 0`;
      rechazos.push({ entidad: 'ventas', fuente, clave, regla: 'V3', motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'ventas', fuente, clave, campo: 'precio_unitario', tipo: 'RECHAZADO', regla: 'V3',
        valorAntes: String(fila.precio_unitario ?? ''), valorDespues: 'Cuarentena', motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }

    // V4: fecha válida y no futura
    const f = normalizarFecha(fila.fecha, hoyIso);
    if (!f.valido) {
      rechazos.push({ entidad: 'ventas', fuente, clave, regla: 'V4', motivo: f.motivo, datoOriginal: fila });
      cambios.push({
        entidad: 'ventas', fuente, clave, campo: 'fecha', tipo: 'RECHAZADO', regla: 'V4',
        valorAntes: String(fila.fecha ?? ''), valorDespues: 'Cuarentena', motivo: f.motivo, datoAntes: fila, datoDespues: null,
      });
      continue;
    }

    const desc = limpiarTexto(prod.descripcion);
    const cat = normalizarCategoria(prod.categoria);
    const uni = normalizarUnidad(prod.unidad_medida);
    const costo = Number(prod.precio_c ?? 0);
    const importe = Math.round(cant.valor * precio.valor * 100) / 100;
    const margen = Math.round((importe - cant.valor * costo) * 100) / 100;

    const llave = `${folio}:${cod.valor}`;
    const limpio = {
      folioV: folio,
      codigo: cod.valor,
      fecha: String(fila.fecha).includes('T') ? String(fila.fecha).slice(0, 19) : `${f.valor}T12:00:00`,
      producto: desc.valor,
      categoria: cat.valor,
      unidadMedida: uni.valor,
      cantidad: cant.valor,
      precioUnitario: precio.valor,
      costoUnitario: costo,
      importe,
      margen,
    };

    // L4: duplicado en mismo lote
    if (vistos.has(llave)) {
      cambios.push({
        entidad: 'ventas', fuente, clave, campo: 'folio_v,codigo', tipo: 'LIMPIADO', regla: 'L4',
        valorAntes: `Renglón duplicado (${cant.valor} ${uni.valor})`,
        valorDespues: 'Conservado 1 renglón',
        motivo: 'Se descartó un renglón repetido con el mismo folio y producto',
        datoAntes: fila, datoDespues: vistos.get(llave),
      });
      continue;
    }

    vistos.set(llave, limpio);
  }

  return { limpios: [...vistos.values()], cambios, rechazos };
}
