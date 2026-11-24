// Módulo de Apoyo a Decisiones (DSS): Priorización de reabastecimiento y escenarios.
import { useEffect, useMemo, useState } from 'react';
import {
  LuBookmarkCheck, LuChevronDown, LuCircleAlert, LuCircleCheck, LuCircleHelp, LuClock, LuCompass, LuDownload,
  LuEye, LuFilter, LuHourglass, LuInfo, LuPackagePlus, LuPrinter, LuRefreshCw, LuRotateCcw, LuShieldAlert,
  LuSlidersHorizontal, LuTag, LuTrendingUp, LuTriangleAlert, LuTruck, LuWallet, LuX,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { ContadorAnimado, EsqueletoDashboard } from '../componentes/Efectos.jsx';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, Buscador, CabeceraPagina, Campo, Cargando, Insignia, MensajeError, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { abreviaturaUnidad, cantidad, fecha, fechaHora, moneda, monedaRedonda, numero, porcentaje } from '../formato.js';
import { useApi } from '../hooks.js';
import { Link } from '../router.jsx';

const PRIORIDAD_META = {
  critica: { etiqueta: 'Pedir hoy', tono: 'critico' },
  alta: { etiqueta: 'Pedir pronto', tono: 'critico' },
  media: { etiqueta: 'Esta semana', tono: 'aviso' },
  baja: { etiqueta: 'Bien surtido', tono: 'ok' },
  sobreabastecido: { etiqueta: 'Riesgo merma', tono: 'info' },
  insuficientes: { etiqueta: 'Faltan ventas', tono: 'neutro' },
};

const VEREDICTO_META = {
  critica: {
    titulo: 'Pedido de emergencia hoy',
    subtitulo: 'El inventario actual se agota antes de que llegue el proveedor.',
    tono: 'critico',
  },
  alta: {
    titulo: 'Prioridad alta de compra',
    subtitulo: 'El stock está al límite del plazo de entrega o por debajo del mínimo.',
    tono: 'critico',
  },
  media: {
    titulo: 'Incluir en la compra de esta semana',
    subtitulo: 'Todavía hay margen, pero conviene pedir pronto para no quedar justo.',
    tono: 'aviso',
  },
  baja: {
    titulo: 'Sin compra necesaria por ahora',
    subtitulo: 'La existencia actual cubre cómodamente los próximos días.',
    tono: 'ok',
  },
  sobreabastecido: {
    titulo: 'No comprar · Riesgo de merma',
    subtitulo: 'El stock actual dura más días que la vida útil del producto; conviene promover su salida.',
    tono: 'aviso',
  },
  insuficientes: {
    titulo: 'Aún faltan datos de venta',
    subtitulo: 'No hay suficientes días con movimiento reciente para sugerir una compra confiable.',
    tono: 'neutro',
  },
};

function ModalPorQue({ item, parametros, fechaCorte, puedeComprar, alCerrar }) {
  const veredicto = item ? (VEREDICTO_META[item.prioridad] ?? VEREDICTO_META.baja) : null;
  const ventana = parametros?.ventanaDias ?? 28;
  const minDias = parametros?.minDiasVentas ?? 5;
  const unidadCorta = item ? abreviaturaUnidad(item.unidadMedida) : '';
  const excesoMerma = item && item.diasCobertura !== null ? Math.max(0, item.diasCobertura - item.vidaUtilDias) : 0;

  return (
    <Modal
      abierto={Boolean(item)}
      alCerrar={alCerrar}
      titulo={item ? `¿Por qué? · ${item.descripcion}` : ''}
      descripcion={item ? `Código ${item.codigo} · Proveedor: ${item.proveedorPrincipal} · Corte ${fechaCorte ? fecha(fechaCorte) : '—'}` : undefined}
      ancho="grande"
      pie={
        <>
          {item && item.cantidadSugerida > 0 && puedeComprar && (
            <Link to="/compras/nueva" className="boton boton--secundario boton--normal modal__accion-izq">
              <LuPackagePlus className="boton__icono" aria-hidden="true" />
              Ir a registrar compra
            </Link>
          )}
          <Boton variante="primario" onClick={alCerrar}>Entendido</Boton>
        </>
      }
    >
      {item && veredicto && (
        <div className="dss-porque">
          <div className="dss-porque__resumen">
            <Insignia tono={PRIORIDAD_META[item.prioridad]?.tono ?? 'neutro'}>
              {item.etiquetaPrioridad}
            </Insignia>
            {item.puntaje !== null && (
              <span className="dss-porque__puntaje numeros">Puntaje: <strong>{item.puntaje}</strong> / 100</span>
            )}
            {item.entregaImputada && (
              <Insignia tono="aviso">Entrega estimada</Insignia>
            )}
            {item.limitadaPorVidaUtil && (
              <Insignia tono="info">Topada por vida útil ({item.vidaUtilDias} d)</Insignia>
            )}
            {!item.enPresupuesto && item.cantidadSugerida > 0 && (
              <Insignia tono="critico">Fuera de presupuesto</Insignia>
            )}
          </div>

          <div className={`dss-veredicto dss-veredicto--${veredicto.tono}`}>
            <div className="dss-veredicto__cabecera">
              <div>
                <p className="dss-veredicto__titulo">{veredicto.titulo}</p>
                <p className="dss-veredicto__sub">{veredicto.subtitulo}</p>
              </div>
              <div className="dss-veredicto__accion">
                {item.cantidadSugerida > 0 ? (
                  <>
                    <span className="dss-veredicto__accion-etq">Pedido sugerido</span>
                    <strong className="dss-veredicto__accion-val numeros">
                      {cantidad(item.cantidadSugerida, item.unidadMedida)}
                    </strong>
                    <span className="dss-veredicto__accion-meta numeros">
                      Costo est. {moneda(item.costoEstimado)}
                    </span>
                  </>
                ) : item.liquidacion ? (
                  <>
                    <span className="dss-veredicto__accion-etq">{item.liquidacion.etiqueta}</span>
                    <strong className="dss-veredicto__accion-val numeros">
                      {moneda(item.liquidacion.precioSugerido)}
                    </strong>
                    <span className="dss-veredicto__accion-meta numeros">
                      Antes {moneda(item.liquidacion.precioActual)} · Costo {moneda(item.liquidacion.precioCosto)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="dss-veredicto__accion-etq">Acción</span>
                    <strong className="dss-veredicto__accion-val">No comprar</strong>
                    <span className="dss-veredicto__accion-meta numeros">
                      {item.prioridad === 'insuficientes'
                        ? `${item.diasConVentas} / ${minDias} días con venta`
                        : 'Inventario cubierto'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <ul className="dss-motivos">
              <li className="dss-motivo">
                <LuTrendingUp aria-hidden="true" />
                <span>
                  {item.prioridad === 'insuficientes' ? (
                    <>
                      Solo registró <strong>{item.diasConVentas} de {minDias} días</strong> necesarios con venta en los últimos {ventana} días
                      ({cantidad(item.unidadesVendidas, item.unidadMedida)} vendidos).
                    </>
                  ) : (
                    <>
                      Se vende a <strong>{item.demandaDiaria.toFixed(2)} {unidadCorta}/día</strong> ({item.diasConVentas} de {ventana} días)
                      → tus <strong>{cantidad(item.existencia, item.unidadMedida)}</strong> cubren{' '}
                      <strong>{item.diasCobertura !== null ? `${item.diasCobertura.toFixed(1)} días` : 'sin demanda'}</strong>.
                    </>
                  )}
                </span>
              </li>

              {item.prioridad !== 'insuficientes' && (
                <li className="dss-motivo">
                  <LuTruck aria-hidden="true" />
                  <span>
                    El proveedor tarda <strong>{item.diasEntregaEfectivos} {item.diasEntregaEfectivos === 1 ? 'día' : 'días'}</strong> en surtir
                    {item.margenEntrega !== null && (
                      item.margenEntrega < 0
                        ? <> → <strong className="dss-motivo--peligro">faltan {Math.abs(item.margenEntrega).toFixed(1)} días</strong> antes de que llegue el pedido.</>
                        : <> → tienes un margen de <strong>+{item.margenEntrega.toFixed(1)} días</strong> antes de agotar stock.</>
                    )}
                  </span>
                </li>
              )}

              <li className="dss-motivo">
                <LuHourglass aria-hidden="true" />
                <span>
                  {item.prioridad === 'sobreabastecido' ? (
                    <>
                      Cobertura de <strong>{item.diasCobertura?.toFixed(1)} días</strong> supera su vida útil de{' '}
                      <strong>{item.vidaUtilDias} días</strong> (exceso de <strong>+{excesoMerma.toFixed(1)} días</strong>).
                    </>
                  ) : item.existencia < item.stockMinimo ? (
                    <>
                      Existencia por debajo del stock mínimo (<strong>{cantidad(item.stockMinimo, item.unidadMedida)}</strong>);
                      vida útil de <strong>{item.vidaUtilDias} días</strong>.
                    </>
                  ) : (
                    <>
                      Por encima del stock mínimo (<strong>{cantidad(item.stockMinimo, item.unidadMedida)}</strong>) y dentro de su vida útil de{' '}
                      <strong>{item.vidaUtilDias} días</strong>.
                    </>
                  )}
                </span>
              </li>

              {item.liquidacion && (
                <li className="dss-motivo">
                  <LuTag aria-hidden="true" />
                  <span>
                    Hay <strong>{cantidad(item.liquidacion.unidadesEnRiesgo, item.unidadMedida)}</strong> que no alcanzarían a salir en su vida útil.
                    Véndelo a <strong>{moneda(item.liquidacion.precioSugerido)}</strong>{' '}
                    ({item.liquidacion.descuentoPct > 0 ? `−${item.liquidacion.descuentoPct} %` : 'al costo'},{' '}
                    {item.liquidacion.gananciaUnitaria > 0
                      ? `aún deja +${moneda(item.liquidacion.gananciaUnitaria)} por ${unidadCorta}`
                      : 'exacto al costo, sin pérdida'})
                    {' '}para recuperar <strong>{moneda(item.liquidacion.recuperacionEstimada)}</strong>.
                  </span>
                </li>
              )}
            </ul>

            <p className="dss-veredicto__pie">
              <LuInfo aria-hidden="true" />
              Recomendación sujeta a revisión humana{parametros?.version ? ` · Modelo ${parametros.version}` : ''}.
            </p>
          </div>

          <dl className="datos-en-linea">
            <div><dt>Existencia</dt><dd>{cantidad(item.existencia, item.unidadMedida)}</dd></div>
            <div><dt>Stock mínimo</dt><dd>{cantidad(item.stockMinimo, item.unidadMedida)}</dd></div>
            <div><dt>Venta diaria</dt><dd>{item.demandaDiaria.toFixed(2)} {abreviaturaUnidad(item.unidadMedida)}/día</dd></div>
            <div><dt>Alcanza para</dt><dd>{item.diasCobertura !== null ? `${item.diasCobertura.toFixed(1)} días` : 'Sin ventas'}</dd></div>
            <div><dt>Plazo de entrega</dt><dd>{item.diasEntregaEfectivos} días</dd></div>
            <div><dt>Colchón de entrega</dt><dd>{item.margenEntrega !== null ? `${item.margenEntrega >= 0 ? '+' : ''}${item.margenEntrega.toFixed(1)} días` : '—'}</dd></div>
            <div><dt>Vida útil</dt><dd>{item.vidaUtilDias} días</dd></div>
            <div><dt>Ganancia</dt><dd>{porcentaje(item.margenPct, 1)}</dd></div>
          </dl>

          {item.desglose && parametros && (
            <div className="dss-desglose">
              <div className="dss-desglose__cabecera">
                <h3 className="subtitulo">Cómo se calculó la prioridad</h3>
                <span className="texto-3" style={{ fontSize: '0.75rem' }}>
                  Cada factor se califica del 0 al 100 según su importancia
                </span>
              </div>
              <ul className="dss-desglose__lista">
                {[
                  {
                    nombre: 'Qué tan rápido se acaba',
                    detalle: 'Compara los días que alcanza el stock contra el tiempo de entrega.',
                    peso: parametros.pesos.urgencia,
                    val: item.desglose.urgencia,
                  },
                  {
                    nombre: 'Qué tanto se vende',
                    detalle: 'Nivel de venta diaria comparado con el resto de los productos.',
                    peso: parametros.pesos.demanda,
                    val: item.desglose.demanda,
                  },
                  {
                    nombre: 'Ganancia que deja',
                    detalle: 'Porcentaje de utilidad entre lo que cuesta y el precio al público.',
                    peso: parametros.pesos.margen,
                    val: item.desglose.margen,
                  },
                  {
                    nombre: 'Qué tan debajo del mínimo está',
                    detalle: 'Qué tanto falta para llegar a la cantidad mínima recomendada.',
                    peso: parametros.pesos.brecha,
                    val: item.desglose.brecha,
                  },
                ].map((f) => (
                  <li key={f.nombre} className="dss-desglose__fila">
                    <div className="dss-desglose__texto">
                      <span className="dss-desglose__nombre">
                        {f.nombre} <span className="texto-3">(peso {Math.round(f.peso * 100)} %)</span>
                      </span>
                      <span className="dss-desglose__detalle">{f.detalle}</span>
                    </div>
                    <span className="ranking__pista" aria-hidden="true">
                      <span className="ranking__barra" style={{ width: `${Math.max(f.val, 2)}%` }} />
                    </span>
                    <strong className="numeros">{f.val} / 100</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

const KPI_META = {
  inversion: {
    icono: LuWallet,
    tono: 'oro',
    titulo: 'Desglose de inversión sugerida',
    subtitulo: 'Productos con pedido recomendado ordenados por mayor costo estimado.',
  },
  urgentes: {
    icono: LuTriangleAlert,
    tono: 'critico',
    titulo: 'Productos urgentes (Crítica y Alta)',
    subtitulo: 'Existencias que se agotan antes de que llegue el proveedor o por debajo del mínimo.',
  },
  cobertura: {
    icono: LuClock,
    tono: 'info',
    titulo: 'Radiografía de cobertura de inventario',
    subtitulo: 'Cuántos días aguanta el stock actual según la demanda diaria reciente.',
  },
  merma: {
    icono: LuHourglass,
    tono: 'aviso',
    titulo: 'Productos sobreabastecidos (Riesgo de merma)',
    subtitulo: 'Su cobertura supera los días de vida útil: conviene frenar compras y promover su salida.',
  },
  insuficientes: {
    icono: LuCircleAlert,
    tono: 'neutro',
    titulo: 'Productos con datos insuficientes',
    subtitulo: 'Tienen pocos días con venta reciente para proyectar una compra confiable.',
  },
};

function PanelKpiDesplegable({
  kpiActivo,
  recomendaciones,
  resumen,
  parametros,
  escenarios,
  puedeComprar,
  puedeProductos,
  alCerrar,
  alAbrirDetalle,
  alFiltrarTabla,
  alAplicarEscenario,
}) {
  const [busquedaKpi, setBusquedaKpi] = useState('');
  const [ordenCobertura, setOrdenCobertura] = useState('menor');

  useEffect(() => {
    setBusquedaKpi('');
  }, [kpiActivo]);

  const meta = kpiActivo ? KPI_META[kpiActivo] : null;
  const Icono = meta?.icono ?? LuInfo;

  const q = busquedaKpi.trim().toLowerCase();
  const coincide = (r) => !q
    || r.descripcion.toLowerCase().includes(q)
    || String(r.codigo) === q
    || (r.proveedorPrincipal ?? '').toLowerCase().includes(q);

  const listaInversion = useMemo(
    () => recomendaciones
      .filter((r) => r.cantidadSugerida > 0)
      .sort((a, b) => b.costoEstimado - a.costoEstimado),
    [recomendaciones],
  );

  const listaUrgentes = useMemo(
    () => recomendaciones
      .filter((r) => r.prioridad === 'critica' || r.prioridad === 'alta')
      .sort((a, b) => Number(b.esEmergencia) - Number(a.esEmergencia) || (a.margenEntrega ?? 999) - (b.margenEntrega ?? 999)),
    [recomendaciones],
  );

  const conCobertura = useMemo(
    () => recomendaciones.filter((r) => r.diasCobertura !== null),
    [recomendaciones],
  );

  const rangosCobertura = useMemo(() => {
    const total = Math.max(conCobertura.length, 1);
    const bloques = [
      { id: 'corta', etiqueta: 'Menos de 7 d', tono: 'critico', n: conCobertura.filter((r) => r.diasCobertura < 7).length },
      { id: 'media', etiqueta: '7 a 15 d', tono: 'ok', n: conCobertura.filter((r) => r.diasCobertura >= 7 && r.diasCobertura <= 15).length },
      { id: 'alta', etiqueta: '16 a 30 d', tono: 'aviso', n: conCobertura.filter((r) => r.diasCobertura > 15 && r.diasCobertura <= 30).length },
      { id: 'muy_alta', etiqueta: 'Más de 30 d', tono: 'info', n: conCobertura.filter((r) => r.diasCobertura > 30).length },
    ];
    return bloques.map((b) => ({ ...b, pct: Math.round((b.n / total) * 100) }));
  }, [conCobertura]);

  const listaCobertura = useMemo(
    () => [...conCobertura].sort((a, b) => (
      ordenCobertura === 'menor' ? a.diasCobertura - b.diasCobertura : b.diasCobertura - a.diasCobertura
    )),
    [conCobertura, ordenCobertura],
  );

  const listaMerma = useMemo(
    () => recomendaciones
      .filter((r) => r.prioridad === 'sobreabastecido' || r.riesgoMerma)
      .sort((a, b) => ((b.diasCobertura ?? 0) - b.vidaUtilDias) - ((a.diasCobertura ?? 0) - a.vidaUtilDias)),
    [recomendaciones],
  );

  const capitalEnMerma = useMemo(
    () => listaMerma.reduce((s, r) => s + Number(r.existencia || 0) * Number(r.precioC || 0), 0),
    [listaMerma],
  );

  const listaInsuficientes = useMemo(
    () => recomendaciones
      .filter((r) => r.prioridad === 'insuficientes')
      .sort((a, b) => a.diasConVentas - b.diasConVentas || a.descripcion.localeCompare(b.descripcion)),
    [recomendaciones],
  );

  const escDemandaAlta = escenarios?.find((e) => e.id === 'demanda_alta');
  const escRetraso = escenarios?.find((e) => e.id === 'retraso_proveedor');

  const itemsBase = kpiActivo === 'inversion'
    ? listaInversion
    : kpiActivo === 'urgentes'
      ? listaUrgentes
      : kpiActivo === 'cobertura'
        ? listaCobertura
        : kpiActivo === 'merma'
          ? listaMerma
          : listaInsuficientes;

  const itemsFiltrados = itemsBase.filter(coincide);

  const accionTabla = kpiActivo === 'merma'
    ? { etiqueta: 'Ver solo Merma en tabla', prioridad: 'sobreabastecido' }
    : kpiActivo === 'urgentes'
      ? { etiqueta: 'Filtrar Crítica en tabla', prioridad: 'critica' }
      : kpiActivo === 'insuficientes'
        ? { etiqueta: 'Ver Sin datos en tabla', prioridad: 'insuficientes' }
        : null;

  return (
    <div className={`dss-kpi-panel-wrap ${kpiActivo ? 'dss-kpi-panel-wrap--abierto' : ''}`} aria-hidden={!kpiActivo}>
      <div className="dss-kpi-panel-inner">
        {kpiActivo && meta && (
          <section key={kpiActivo} className={`dss-kpi-panel dss-kpi-panel--${meta.tono}`} aria-label={meta.titulo}>
            <header className="dss-kpi-panel__cabecera">
              <div className="dss-kpi-panel__titulo-bloque">
                <span className={`dss-kpi-panel__icono dss-kpi-panel__icono--${meta.tono}`} aria-hidden="true">
                  <Icono />
                </span>
                <div>
                  <h3 className="dss-kpi-panel__titulo">
                    {meta.titulo}
                    <span className="dss-kpi-panel__conteo numeros">{numero(itemsBase.length)}</span>
                  </h3>
                  <p className="dss-kpi-panel__sub">{meta.subtitulo}</p>
                </div>
              </div>

              <div className="dss-kpi-panel__acciones">
                {kpiActivo === 'merma' && listaMerma.length > 0 && (
                  <span className="dss-kpi-chip dss-kpi-chip--aviso numeros">
                    Capital en riesgo a costo: <strong>{monedaRedonda(capitalEnMerma)}</strong>
                  </span>
                )}
                {kpiActivo === 'inversion' && resumen?.presupuesto !== null && listaInversion.length > 0 && (
                  <span className="dss-kpi-chip numeros">
                    Cubierto: <strong>{monedaRedonda(resumen.montoCubierto)}</strong> / {monedaRedonda(resumen.presupuesto)}
                  </span>
                )}
                {kpiActivo === 'inversion' && listaInversion.length > 0 && puedeComprar && (
                  <Link to="/compras/nueva" className="boton boton--primario boton--chico">
                    <LuPackagePlus className="boton__icono" aria-hidden="true" />
                    Registrar compra
                  </Link>
                )}
                {kpiActivo === 'insuficientes' && puedeProductos && (
                  <Link to="/productos" className="boton boton--secundario boton--chico">
                    Ir a Productos
                  </Link>
                )}
                {accionTabla && itemsBase.length > 0 && (
                  <Boton
                    variante="secundario"
                    talla="chico"
                    icono={LuFilter}
                    onClick={() => alFiltrarTabla(accionTabla.prioridad)}
                  >
                    {accionTabla.etiqueta}
                  </Boton>
                )}
                <button
                  type="button"
                  className="dss-kpi-panel__cerrar"
                  onClick={alCerrar}
                  aria-label="Cerrar panel de detalle"
                  title="Cerrar"
                >
                  <LuX aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* Controles específicos por KPI */}
            {kpiActivo === 'cobertura' && conCobertura.length > 0 && (
              <div className="dss-kpi-cobertura-resumen">
                <div className="dss-kpi-rangos">
                  {rangosCobertura.map((r) => (
                    <div key={r.id} className="dss-kpi-rango">
                      <div className="dss-kpi-rango__fila">
                        <span>{r.etiqueta}</span>
                        <strong className="numeros">{r.n} <span className="texto-3">({r.pct} %)</span></strong>
                      </div>
                      <span className="dss-kpi-rango__pista">
                        <span className={`dss-kpi-rango__barra dss-kpi-rango__barra--${r.tono}`} style={{ width: `${Math.max(r.pct, r.n > 0 ? 5 : 0)}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="dss-kpi-toggle">
                  <button
                    type="button"
                    className={`dss-kpi-toggle__btn ${ordenCobertura === 'menor' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                    onClick={() => setOrdenCobertura('menor')}
                  >
                    Menor cobertura primero
                  </button>
                  <button
                    type="button"
                    className={`dss-kpi-toggle__btn ${ordenCobertura === 'mayor' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                    onClick={() => setOrdenCobertura('mayor')}
                  >
                    Mayor cobertura primero
                  </button>
                </div>
              </div>
            )}

            {itemsBase.length > 6 && (
              <div className="dss-kpi-panel__barra-filtro">
                <Buscador
                  valor={busquedaKpi}
                  alCambiar={setBusquedaKpi}
                  etiqueta="Buscar dentro del panel"
                  placeholder="Filtrar producto, código o proveedor…"
                />
                <span className="texto-3 numeros" style={{ fontSize: '0.75rem' }}>
                  Mostrando {numero(itemsFiltrados.length)} de {numero(itemsBase.length)}
                </span>
              </div>
            )}

            {/* Contenido de tarjetas o estado vacío específico */}
            {itemsFiltrados.length > 0 ? (
              <div className="dss-kpi-lista">
                {itemsFiltrados.map((r) => {
                  const excesoMerma = r.diasCobertura !== null ? Math.max(0, r.diasCobertura - r.vidaUtilDias) : 0;
                  const valorStock = Number(r.existencia || 0) * Number(r.precioC || 0);
                  const ratioMerma = r.vidaUtilDias > 0 && r.diasCobertura !== null
                    ? Math.min(100, Math.round((r.diasCobertura / Math.max(r.vidaUtilDias * 2, 1)) * 100))
                    : 0;
                  const faltanDias = Math.max(0, (parametros?.minDiasVentas ?? 5) - r.diasConVentas);

                  return (
                    <button
                      key={r.codigo}
                      type="button"
                      className={`dss-kpi-item dss-kpi-item--${meta.tono}`}
                      onClick={() => alAbrirDetalle(r)}
                    >
                      <div className="dss-kpi-item__top">
                        <div className="dss-kpi-item__identidad">
                          <span className="dss-kpi-item__nombre">{r.descripcion}</span>
                          <span className="dss-kpi-item__meta">#{r.codigo} · {r.proveedorPrincipal}</span>
                        </div>

                        {kpiActivo === 'inversion' && (
                          <Insignia tono={r.enPresupuesto ? 'ok' : 'critico'} icono={false}>
                            {r.enPresupuesto ? moneda(r.costoEstimado) : 'Fuera presup.'}
                          </Insignia>
                        )}
                        {kpiActivo === 'urgentes' && (
                          <Insignia tono="critico" icono={false}>
                            {r.esEmergencia ? 'Emergencia' : 'Alta'}
                          </Insignia>
                        )}
                        {kpiActivo === 'cobertura' && (
                          <Insignia tono={r.diasCobertura < 7 ? 'critico' : r.riesgoMerma ? 'aviso' : 'ok'} icono={false}>
                            {r.diasCobertura.toFixed(1)} d
                          </Insignia>
                        )}
                        {kpiActivo === 'merma' && (
                          <Insignia tono="aviso" icono={false}>
                            +{excesoMerma.toFixed(1)} d exceso
                          </Insignia>
                        )}
                        {kpiActivo === 'insuficientes' && (
                          <Insignia tono="neutro" icono={false}>
                            {r.diasConVentas} / {parametros?.minDiasVentas ?? 5} d
                          </Insignia>
                        )}
                      </div>

                      {/* Cuerpo específico por KPI */}
                      {kpiActivo === 'inversion' && (
                        <div className="dss-kpi-item__datos">
                          <div><span>Pedir</span><strong className="numeros">{cantidad(r.cantidadSugerida, r.unidadMedida)}</strong></div>
                          <div><span>Costo est.</span><strong className="numeros">{moneda(r.costoEstimado)}</strong></div>
                          <div><span>Margen</span><strong className="numeros">{porcentaje(r.margenPct, 0)}</strong></div>
                        </div>
                      )}

                      {kpiActivo === 'urgentes' && (
                        <div className="dss-kpi-item__datos">
                          <div><span>Stock / Mín</span><strong className="numeros">{cantidad(r.existencia, r.unidadMedida)} / {r.stockMinimo}</strong></div>
                          <div><span>Margen entrega</span><strong className="numeros" style={{ color: (r.margenEntrega ?? 0) < 0 ? 'var(--danger-text)' : 'var(--warning-text)' }}>{r.margenEntrega !== null ? `${r.margenEntrega >= 0 ? '+' : ''}${r.margenEntrega.toFixed(1)} d` : '—'}</strong></div>
                          <div><span>Sugerido</span><strong className="numeros">{cantidad(r.cantidadSugerida, r.unidadMedida)}</strong></div>
                        </div>
                      )}

                      {kpiActivo === 'cobertura' && (
                        <div className="dss-kpi-item__datos">
                          <div><span>Existencia</span><strong className="numeros">{cantidad(r.existencia, r.unidadMedida)}</strong></div>
                          <div><span>Demanda/día</span><strong className="numeros">{r.demandaDiaria.toFixed(2)} {abreviaturaUnidad(r.unidadMedida)}</strong></div>
                          <div><span>Vida útil</span><strong className="numeros">{r.vidaUtilDias} d</strong></div>
                        </div>
                      )}

                      {kpiActivo === 'merma' && (
                        <>
                          <div className="dss-kpi-item__datos">
                            <div><span>Existencia</span><strong className="numeros">{cantidad(r.existencia, r.unidadMedida)}</strong></div>
                            <div><span>Cobertura / Vida</span><strong className="numeros">{r.diasCobertura !== null ? `${r.diasCobertura.toFixed(1)} d` : '—'} / {r.vidaUtilDias} d</strong></div>
                            <div>
                              <span>{r.liquidacion ? r.liquidacion.etiqueta : 'Valor a costo'}</span>
                              <strong className="numeros" style={r.liquidacion ? { color: 'var(--accent-bright)' } : undefined}>
                                {r.liquidacion ? moneda(r.liquidacion.precioSugerido) : moneda(valorStock)}
                              </strong>
                            </div>
                          </div>
                          <div className="dss-kpi-merma-barra" aria-hidden="true">
                            <span style={{ width: `${Math.max(ratioMerma, 18)}%` }} />
                          </div>
                          <p className="dss-kpi-item__consejo">
                            {r.liquidacion
                              ? `Bajar de ${moneda(r.liquidacion.precioActual)} a ${moneda(r.liquidacion.precioSugerido)} (costo ${moneda(r.liquidacion.precioCosto)}) · ${cantidad(r.liquidacion.unidadesEnRiesgo, r.unidadMedida)} en riesgo.`
                              : `Demanda ${r.demandaDiaria.toFixed(2)} ${abreviaturaUnidad(r.unidadMedida)}/día · No comprar, promover salida.`}
                          </p>
                        </>
                      )}

                      {kpiActivo === 'insuficientes' && (
                        <>
                          <div className="dss-kpi-item__datos">
                            <div><span>Existencia</span><strong className="numeros">{cantidad(r.existencia, r.unidadMedida)}</strong></div>
                            <div><span>Vendido (28 d)</span><strong className="numeros">{cantidad(r.unidadesVendidas, r.unidadMedida)}</strong></div>
                            <div><span>Vida útil</span><strong className="numeros">{r.vidaUtilDias} d</strong></div>
                          </div>
                          <p className="dss-kpi-item__consejo">
                            {r.diasConVentas === 0
                              ? 'Sin ventas registradas en la ventana reciente.'
                              : `Faltan ${faltanDias} día(s) con venta para proyectar compra confiable.`}
                          </p>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="dss-kpi-vacio">
                <span className="dss-kpi-vacio__icono" aria-hidden="true">
                  {kpiActivo === 'urgentes' || kpiActivo === 'inversion' ? <LuCircleCheck /> : <LuInfo />}
                </span>
                <div>
                  <p className="dss-kpi-vacio__titulo">
                    {itemsBase.length > 0
                      ? 'Ningún producto coincide con esa búsqueda'
                      : kpiActivo === 'inversion'
                        ? 'No se requiere inversión de compra en este escenario'
                        : kpiActivo === 'urgentes'
                          ? 'Sin emergencias ni alertas altas de abasto'
                          : kpiActivo === 'merma'
                            ? 'Ningún producto está en riesgo de merma'
                            : 'Todos los productos cuentan con datos suficientes'}
                  </p>
                  <p className="dss-kpi-vacio__texto">
                    {itemsBase.length > 0
                      ? 'Prueba borrando el texto del filtro de arriba.'
                      : kpiActivo === 'inversion'
                        ? 'El inventario actual cubre la demanda proyectada sin necesidad de levantar pedidos hoy.'
                        : kpiActivo === 'urgentes'
                          ? 'Todo el inventario con historial suficiente aguanta por encima del tiempo de entrega.'
                          : kpiActivo === 'merma'
                            ? 'La cobertura actual está dentro de la vida útil de cada producto perecedero.'
                            : 'Ya puedes consultar las prioridades completas en la tabla inferior.'}
                  </p>
                </div>
                {itemsBase.length === 0 && kpiActivo === 'inversion' && escDemandaAlta && (
                  <Boton variante="secundario" talla="chico" icono={LuTrendingUp} onClick={() => alAplicarEscenario(escDemandaAlta)}>
                    Simular demanda +20 %
                  </Boton>
                )}
                {itemsBase.length === 0 && kpiActivo === 'urgentes' && escRetraso && (
                  <Boton variante="secundario" talla="chico" icono={LuClock} onClick={() => alAplicarEscenario(escRetraso)}>
                    Simular retraso +2 días
                  </Boton>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function exportarFotoCsv(foto) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const filas = (foto.recomendaciones ?? []).filter((r) => r.cantidadSugerida > 0);
  const lista = filas.length ? filas : (foto.recomendaciones ?? []);
  const encabezados = ['Código', 'Producto', 'Acción', 'Cantidad sugerida', 'Unidad', 'Costo estimado', 'En presupuesto'];
  const cuerpo = lista.map((r) => [
    r.codigo,
    r.descripcion,
    PRIORIDAD_META[r.prioridad]?.etiqueta ?? r.prioridad,
    r.cantidadSugerida,
    r.unidadMedida,
    r.costoEstimado,
    r.enPresupuesto ? 'Sí' : 'Fuera de presupuesto',
  ]);
  const csv = [encabezados, ...cuerpo].map((fila) => fila.map(esc).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foto_decision_${foto.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ModalFotoDss({ fotoId, resumenActual, alCerrar, alAplicarParametros }) {
  const { datos: foto, error, cargando } = useApi(fotoId ? `/dss/corridas/${fotoId}` : null);
  const [tab, setTab] = useState('pedido');

  useEffect(() => {
    setTab('pedido');
  }, [fotoId]);

  const recs = foto?.recomendaciones ?? [];
  const conPedido = useMemo(() => recs.filter((r) => r.cantidadSugerida > 0), [recs]);
  const urgentes = useMemo(() => recs.filter((r) => r.prioridad === 'critica' || r.prioridad === 'alta'), [recs]);
  const merma = useMemo(() => recs.filter((r) => r.prioridad === 'sobreabastecido'), [recs]);

  const visibles = tab === 'pedido'
    ? conPedido
    : tab === 'urgentes'
      ? urgentes
      : tab === 'merma'
        ? merma
        : recs;

  const diffMonto = foto && resumenActual ? foto.montoSugerido - resumenActual.montoSugerido : null;
  const urgFoto = foto ? foto.totalCritica + foto.totalAlta : 0;
  const diffUrg = foto && resumenActual ? urgFoto - resumenActual.urgentes : null;

  return (
    <Modal
      abierto={Boolean(fotoId)}
      alCerrar={alCerrar}
      titulo={foto ? `Foto #${foto.id} · ${foto.escenario}` : 'Cargando foto guardada…'}
      descripcion={foto ? `Guardada el ${fechaHora(foto.fechaHora)} por ${foto.ejecutadoPor} · Corte ${foto.fechaCorte ? fecha(foto.fechaCorte) : '—'}` : undefined}
      ancho="grande"
      pie={
        <>
          {foto && (
            <>
              <Boton variante="secundario" icono={LuDownload} onClick={() => exportarFotoCsv(foto)} className="modal__accion-izq">
                Exportar lista (CSV)
              </Boton>
              <Boton
                variante="secundario"
                icono={LuRotateCcw}
                onClick={() => {
                  alAplicarParametros(foto);
                  alCerrar();
                }}
              >
                Cargar en simulador
              </Boton>
            </>
          )}
          <Boton variante="primario" onClick={alCerrar}>Cerrar</Boton>
        </>
      }
    >
      <MensajeError error={error} />
      {cargando && <Cargando texto="Cargando detalle de la foto guardada…" />}
      {foto && !cargando && (
        <div className="dss-foto-modal">
          <div className="dss-foto-resumen">
            <div className="dss-foto-stat">
              <span className="dss-foto-stat__etq">Inversión en esta foto</span>
              <strong className="dss-foto-stat__val dss-foto-stat__val--oro numeros">{monedaRedonda(foto.montoSugerido)}</strong>
              {diffMonto !== null && (
                <span className="dss-foto-stat__diff numeros">
                  {Math.abs(diffMonto) < 1
                    ? 'Igual al escenario actual'
                    : `${diffMonto > 0 ? '+' : '−'}${monedaRedonda(Math.abs(diffMonto))} vs. hoy`}
                </span>
              )}
            </div>

            <div className="dss-foto-stat">
              <span className="dss-foto-stat__etq">Urgentes</span>
              <strong className="dss-foto-stat__val numeros">{numero(urgFoto)}</strong>
              {diffUrg !== null && (
                <span className="dss-foto-stat__diff numeros">
                  {diffUrg === 0
                    ? 'Igual que hoy'
                    : `${diffUrg > 0 ? `+${diffUrg}` : diffUrg} vs. hoy`}
                </span>
              )}
            </div>

            <div className="dss-foto-stat">
              <span className="dss-foto-stat__etq">Supuestos guardados</span>
              <strong className="dss-foto-stat__val numeros" style={{ fontSize: '1.05rem', fontFamily: 'var(--font-sans)' }}>
                Demanda {Math.round(foto.factorDemanda * 100)} % · +{foto.extraEntrega} d entrega
              </strong>
              <span className="dss-foto-stat__diff numeros">
                {foto.presupuesto !== null ? `Presupuesto: ${monedaRedonda(foto.presupuesto)}` : 'Sin tope de presupuesto'}
              </span>
            </div>
          </div>

          <div className="dss-foto-tabs" role="tablist" aria-label="Filtrar productos de esta foto">
            {[
              { id: 'pedido', etiqueta: `Con pedido (${conPedido.length})` },
              { id: 'urgentes', etiqueta: `Urgentes (${urgentes.length})` },
              { id: 'merma', etiqueta: `Riesgo merma (${merma.length})` },
              { id: 'todos', etiqueta: `Todos (${recs.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`dss-kpi-toggle__btn ${tab === t.id ? 'dss-kpi-toggle__btn--activo' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.etiqueta}
              </button>
            ))}
          </div>

          {visibles.length ? (
            <ul className="dss-foto-productos">
              {visibles.map((r) => (
                <li key={r.codigo} className="dss-foto-producto">
                  <div className="dss-foto-producto__izq">
                    <span className="dss-foto-producto__nombre">{r.descripcion}</span>
                    <span className="dss-foto-producto__meta">
                      #{r.codigo}
                      {r.puntaje !== null ? ` · urgencia ${Math.round(r.puntaje)}/100` : ''}
                      {!r.enPresupuesto && r.cantidadSugerida > 0 ? ' · fuera de presupuesto' : ''}
                    </span>
                  </div>
                  <div className="dss-foto-producto__der">
                    <Insignia tono={PRIORIDAD_META[r.prioridad]?.tono ?? 'neutro'} icono={false}>
                      {PRIORIDAD_META[r.prioridad]?.etiqueta ?? r.prioridad}
                    </Insignia>
                    {r.cantidadSugerida > 0 ? (
                      <span className="dss-foto-producto__pedido numeros">
                        <strong>{cantidad(r.cantidadSugerida, r.unidadMedida)}</strong>
                        <span>{moneda(r.costoEstimado)}</span>
                      </span>
                    ) : (
                      <span className="dss-foto-producto__pedido texto-3">No comprar</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-3" style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.85rem' }}>
              No hay productos en esta categoría dentro de la foto #{foto.id}.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

const NIVEL_LIQ_TONO = {
  remate: 'critico',
  rapida: 'aviso',
  suave: 'info',
};

function PanelLiquidacionMerma({
  recomendaciones,
  puedeEditarPrecio,
  preciosAplicados,
  aplicandoCodigo,
  alAplicarPrecio,
  alAbrirDetalle,
}) {
  const [nivelFiltro, setNivelFiltro] = useState('todos');
  const [buscarLiq, setBuscarLiq] = useState('');

  const enMerma = useMemo(
    () => recomendaciones
      .filter((r) => r.liquidacion)
      .sort((a, b) => b.liquidacion.capitalEnRiesgo - a.liquidacion.capitalEnRiesgo || b.liquidacion.excesoDias - a.liquidacion.excesoDias),
    [recomendaciones],
  );

  const conteos = useMemo(() => ({
    todos: enMerma.length,
    remate: enMerma.filter((r) => r.liquidacion.nivel === 'remate').length,
    rapida: enMerma.filter((r) => r.liquidacion.nivel === 'rapida').length,
    suave: enMerma.filter((r) => r.liquidacion.nivel === 'suave').length,
  }), [enMerma]);

  const capitalRiesgo = useMemo(
    () => enMerma.reduce((s, r) => s + r.liquidacion.capitalEnRiesgo, 0),
    [enMerma],
  );
  const recuperable = useMemo(
    () => enMerma.reduce((s, r) => s + r.liquidacion.recuperacionEstimada, 0),
    [enMerma],
  );

  const q = buscarLiq.trim().toLowerCase();
  const visibles = enMerma.filter((r) => (
    (nivelFiltro === 'todos' || r.liquidacion.nivel === nivelFiltro)
    && (!q || r.descripcion.toLowerCase().includes(q) || String(r.codigo) === q)
  ));

  if (!enMerma.length) return null;

  return (
    <Panel
      titulo="Plan de liquidación para evitar merma (sin perder dinero)"
      descripcion="Cuando un producto rebasa su vida útil, el sistema calcula automáticamente a qué precio conviene rebajarlo o rematarlo sin bajar jamás de su costo de compra."
      acciones={
        <div className="dss-liq-resumen-chips">
          <span className="dss-liq-chip dss-liq-chip--peligro numeros">
            Riesgo si caduca: <strong>{monedaRedonda(capitalRiesgo)}</strong>
          </span>
          <span className="dss-liq-chip dss-liq-chip--ok numeros">
            Recuperable sin pérdida: <strong>{monedaRedonda(recuperable)}</strong>
          </span>
        </div>
      }
    >
      <div className="dss-liq-controles">
        <Buscador
          valor={buscarLiq}
          alCambiar={setBuscarLiq}
          etiqueta="Buscar producto por liquidar"
          placeholder="Buscar producto o código…"
        />
        <div className="dss-foto-tabs" role="tablist" aria-label="Filtrar por tipo de rebaja">
          {[
            { id: 'todos', etiqueta: `Todos (${conteos.todos})` },
            { id: 'remate', etiqueta: `Remate al costo (${conteos.remate})` },
            { id: 'rapida', etiqueta: `Oferta rápida (${conteos.rapida})` },
            { id: 'suave', etiqueta: `Promoción suave (${conteos.suave})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={nivelFiltro === t.id}
              className={`dss-kpi-toggle__btn ${nivelFiltro === t.id ? 'dss-kpi-toggle__btn--activo' : ''}`}
              onClick={() => setNivelFiltro(t.id)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {visibles.length ? (
        <div className="dss-liq-grid">
          {visibles.map((r) => {
            const l = r.liquidacion;
            const precioYaAplicado = preciosAplicados[r.codigo];
            const yaIgualAlSugerido = Math.abs((precioYaAplicado ?? l.precioActual) - l.precioSugerido) < 0.01;
            const unidadCorta = abreviaturaUnidad(r.unidadMedida, 1);

            return (
              <article key={r.codigo} className={`dss-liq-card dss-liq-card--${l.nivel}`}>
                <div className="dss-liq-card__top">
                  <div className="dss-liq-card__identidad">
                    <h3 className="dss-liq-card__nombre">{r.descripcion}</h3>
                    <span className="dss-liq-card__meta">
                      #{r.codigo} · Stock {cantidad(r.existencia, r.unidadMedida)} · dura {r.diasCobertura?.toFixed(1)} d vs vida {r.vidaUtilDias} d
                    </span>
                  </div>
                  <Insignia tono={NIVEL_LIQ_TONO[l.nivel] ?? 'aviso'} icono={false}>
                    {l.etiqueta}
                  </Insignia>
                </div>

                <div className="dss-liq-precio-caja">
                  <div className="dss-liq-precio-flujo">
                    <span className="dss-liq-precio-antes numeros">{moneda(l.precioActual)}</span>
                    <span className="dss-liq-precio-flecha" aria-hidden="true">→</span>
                    <strong className="dss-liq-precio-nuevo numeros">{moneda(l.precioSugerido)}</strong>
                    <span className="dss-liq-precio-unidad">/ {unidadCorta}</span>
                    {l.descuentoPct > 0 && (
                      <span className="dss-liq-descuento numeros">−{l.descuentoPct} %</span>
                    )}
                  </div>
                  <p className="dss-liq-garantia numeros">
                    Costo: <strong>{moneda(l.precioCosto)}</strong> ·{' '}
                    {l.gananciaUnitaria > 0
                      ? <>Conserva <strong>+{moneda(l.gananciaUnitaria)}/{unidadCorta}</strong> de ganancia</>
                      : <strong>Exacto al costo (cero pérdida)</strong>}
                  </p>
                </div>

                <div className="dss-liq-metricas">
                  <div>
                    <span>Excedente en riesgo</span>
                    <strong className="numeros">{cantidad(l.unidadesEnRiesgo, r.unidadMedida)}</strong>
                  </div>
                  <div>
                    <span>Si caduca pierdes</span>
                    <strong className="numeros" style={{ color: 'var(--danger-text)' }}>{moneda(l.capitalEnRiesgo)}</strong>
                  </div>
                  <div>
                    <span>Recuperas vendiendo</span>
                    <strong className="numeros" style={{ color: 'var(--success-text)' }}>{moneda(l.recuperacionEstimada)}</strong>
                  </div>
                </div>

                <div className="dss-liq-acciones">
                  <Boton variante="fantasma" talla="chico" icono={LuCircleHelp} onClick={() => alAbrirDetalle(r)}>
                    Ver análisis
                  </Boton>
                  {puedeEditarPrecio && (
                    yaIgualAlSugerido ? (
                      <span className="dss-liq-aplicado">
                        <LuCircleCheck aria-hidden="true" /> Precio aplicado ({moneda(l.precioSugerido)})
                      </span>
                    ) : (
                      <Boton
                        variante="primario"
                        talla="chico"
                        icono={LuTag}
                        cargando={aplicandoCodigo === r.codigo}
                        onClick={() => alAplicarPrecio(r)}
                      >
                        Aplicar {moneda(l.precioSugerido)}
                      </Boton>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="texto-3" style={{ textAlign: 'center', padding: '18px 0', fontSize: '0.85rem' }}>
          Ningún producto en merma coincide con ese filtro.
        </p>
      )}
    </Panel>
  );
}

export default function Decisiones() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();

  // Parámetros del escenario activo
  const [escenarioActivo, setEscenarioActivo] = useState('base');
  const [factorDemanda, setFactorDemanda] = useState(1.0);
  const [extraEntrega, setExtraEntrega] = useState(0);
  const [coberturaObjetivo, setCoberturaObjetivo] = useState(7);
  const [presupuesto, setPresupuesto] = useState('');

  // Filtros de tabla, KPI desplegado y foto seleccionada
  const [kpiActivo, setKpiActivo] = useState(null);
  const [fotoActivaId, setFotoActivaId] = useState(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aplicandoCodigo, setAplicandoCodigo] = useState(null);
  const [preciosAplicados, setPreciosAplicados] = useState({});

  const alternarKpi = (id) => setKpiActivo((actual) => (actual === id ? null : id));

  const aplicarPrecioLiquidacion = async (r) => {
    const l = r.liquidacion;
    if (!l) return;
    const ok = await confirmar({
      titulo: `¿Cambiar precio de ${r.descripcion} a ${moneda(l.precioSugerido)}?`,
      mensaje: `Pasará de ${moneda(l.precioActual)} a ${moneda(l.precioSugerido)} (${l.etiqueta}). Su costo es ${moneda(l.precioCosto)}, así que no pierdes dinero y se actualizará de inmediato en el Punto de Venta y el catálogo.`,
      accion: `Aplicar ${moneda(l.precioSugerido)}`,
      cancelar: 'Cancelar',
    });
    if (!ok) return;

    setAplicandoCodigo(r.codigo);
    try {
      const actual = await api.get(`/productos/${r.codigo}`);
      await api.put(`/productos/${r.codigo}`, {
        descripcion: actual.descripcion,
        categoria: actual.categoria,
        unidadMedida: actual.unidadMedida,
        existencia: actual.existencia,
        precioCompra: actual.precioCompra,
        precioVenta: l.precioSugerido,
        stockMinimo: actual.stockMinimo,
        vidaUtilDias: actual.vidaUtilDias,
      });
      setPreciosAplicados((prev) => ({ ...prev, [r.codigo]: l.precioSugerido }));
      avisar(`Precio de ${r.descripcion} actualizado a ${moneda(l.precioSugerido)} en caja y catálogo.`);
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setAplicandoCodigo(null);
    }
  };

  const aplicarParametrosDeFoto = (foto) => {
    setEscenarioActivo('personalizado');
    setFactorDemanda(foto.factorDemanda ?? 1);
    setExtraEntrega(foto.extraEntrega ?? 0);
    setPresupuesto(foto.presupuesto !== null && foto.presupuesto !== undefined ? String(foto.presupuesto) : '');
    avisar(`Se cargaron los parámetros de la foto #${foto.id} (${foto.escenario}) en el simulador.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const paramsApi = useMemo(() => ({
    factorDemanda,
    extraEntrega,
    coberturaObjetivo,
    presupuesto: presupuesto.trim() === '' ? null : presupuesto.trim(),
  }), [factorDemanda, extraEntrega, coberturaObjetivo, presupuesto]);

  const { datos, error, cargando, recargar } = useApi('/dss/analisis', paramsApi);

  const aplicarEscenario = (esc) => {
    setEscenarioActivo(esc.id);
    setFactorDemanda(esc.factorDemanda);
    setExtraEntrega(esc.extraEntrega);
  };

  const guardarFoto = async () => {
    setGuardando(true);
    try {
      const nombreEsc = datos?.escenarios?.find((e) => e.id === escenarioActivo)?.nombre ?? 'Escenario personalizado';
      const r = await api.post('/dss/guardar-corrida', {
        escenario: nombreEsc,
        ...paramsApi,
      });
      avisar(`Corrida DSS #${r.id} guardada para trazabilidad (${nombreEsc})`);
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const ev = datos?.evaluacion;
  const res = ev?.resumen;
  const recomendaciones = ev?.recomendaciones ?? [];

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return recomendaciones.filter((r) => (
      (filtroPrioridad === 'todos' || r.prioridad === filtroPrioridad)
      && (!q || r.descripcion.toLowerCase().includes(q) || String(r.codigo) === q || (r.proveedorPrincipal ?? '').toLowerCase().includes(q))
    ));
  }, [recomendaciones, filtroPrioridad, busqueda]);

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Decisiones de reabastecimiento"
        descripcion="¿Qué productos perecederos conviene comprar esta semana, en qué cantidad y con qué prioridad?"
        acciones={
          <>
            {puede('VER_ETL') && (
              <Link to="/etl" className="boton boton--secundario boton--normal">
                <LuRefreshCw className="boton__icono" aria-hidden="true" />
                Ver bitácora ETL
              </Link>
            )}
            <Boton variante="secundario" icono={LuPrinter} onClick={() => window.print()}>
              Imprimir
            </Boton>
            {puede('EJECUTAR_DSS') && datos?.etlListo && (
              <Boton variante="primario" icono={LuBookmarkCheck} cargando={guardando} onClick={guardarFoto}>
                {guardando ? 'Guardando…' : 'Guardar foto DSS'}
              </Boton>
            )}
          </>
        }
      />

      <div className="dss-aviso-honestidad" role="note">
        <LuInfo aria-hidden="true" />
        <span>
          <strong>Recomendación sujeta a revisión humana.</strong> El sistema nunca registra compras automáticamente.
          {datos?.fechaCorte && <> Fecha de corte de ventas: <strong>{fecha(datos.fechaCorte)}</strong>.</>}
          {' '}Los tiempos de entrega, stock mínimo y vida útil se toman del catálogo de productos (con respaldo de datos simulados para productos aún sin definir).
        </span>
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoDashboard />}

      {datos && !datos.etlListo && (
        <Panel>
          <Vacio
            icono={LuCompass}
            titulo="Aún no hay datos limpios del ETL"
            accion={puede('VER_ETL') && <Link to="/etl" className="boton boton--primario boton--normal">Ir a ejecutar el ETL</Link>}
          >
            Ejecuta el proceso ETL primero para calcular indicadores y recomendaciones de reabastecimiento.
          </Vacio>
        </Panel>
      )}

      {datos && datos.etlListo && res && (
        <div className={`reportes ${cargando ? 'recargando' : ''}`}>
          {/* 5 KPIs principales interactivos + panel desplegable animado */}
          <div className="dss-kpis-bloque">
            <div className="cifras cifras--fila dss-kpis lujo-brillo" role="region" aria-label="Indicadores clave interactivos">
              {[
                {
                  id: 'inversion',
                  principal: true,
                  etiqueta: 'Inversión sugerida',
                  valor: <ContadorAnimado valor={res.montoSugerido} formato={monedaRedonda} />,
                  detalle: res.presupuesto !== null
                    ? `Cubierto: ${monedaRedonda(res.montoCubierto)} (${res.fueraPresupuesto} fuera de presupuesto)`
                    : 'Sin tope de presupuesto',
                },
                {
                  id: 'urgentes',
                  etiqueta: 'Urgentes (Crítica + Alta)',
                  valor: <ContadorAnimado valor={res.urgentes} formato={numero} />,
                  detalle: `${res.critica} en emergencia · ${res.alta} alta`,
                },
                {
                  id: 'cobertura',
                  etiqueta: 'Cobertura promedio',
                  valor: res.coberturaPromedio !== null ? `${res.coberturaPromedio} días` : '—',
                  detalle: `Ventana ${ev.parametros.ventanaDias} días`,
                },
                {
                  id: 'merma',
                  etiqueta: 'Sobreabastecidos (Merma)',
                  valor: <ContadorAnimado valor={res.sobreabastecido} formato={numero} />,
                  detalle: 'Cobertura > vida útil',
                },
                {
                  id: 'insuficientes',
                  etiqueta: 'Datos insuficientes',
                  valor: <ContadorAnimado valor={res.insuficientes} formato={numero} />,
                  detalle: `Menos de ${ev.parametros.minDiasVentas} días con venta`,
                },
              ].map((k) => {
                const abierto = kpiActivo === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    aria-expanded={abierto}
                    className={`cifra dss-kpi-btn ${k.principal ? 'cifra--principal' : ''} ${abierto ? 'dss-kpi-btn--activo' : ''}`}
                    onClick={() => alternarKpi(k.id)}
                  >
                    <span className="dss-kpi-btn__cabecera">
                      <span className="cifra__etiqueta">{k.etiqueta}</span>
                      <LuChevronDown className="dss-kpi-btn__flecha" aria-hidden="true" />
                    </span>
                    <span className="cifra__valor">{k.valor}</span>
                    <span className="cifra__detalle">{k.detalle}</span>
                  </button>
                );
              })}
            </div>

            <PanelKpiDesplegable
              kpiActivo={kpiActivo}
              recomendaciones={recomendaciones}
              resumen={res}
              parametros={ev.parametros}
              escenarios={datos.escenarios}
              puedeComprar={puede('CREAR_COMPRAS')}
              puedeProductos={puede('VER_PRODUCTOS')}
              alCerrar={() => setKpiActivo(null)}
              alAbrirDetalle={(item) => setDetalle(item)}
              alFiltrarTabla={(prioridad) => {
                setFiltroPrioridad(prioridad);
                setKpiActivo(null);
              }}
              alAplicarEscenario={(esc) => aplicarEscenario(esc)}
            />
          </div>

          {/* Comparador de 4 escenarios */}
          <Panel
            titulo="Comparador de escenarios"
            descripcion="Haz clic en cualquier escenario para ver el detalle o ajusta los parámetros abajo."
          >
            <div className="dss-escenarios">
              {datos.escenarios.map((esc) => {
                const activo = escenarioActivo === esc.id;
                return (
                  <button
                    key={esc.id}
                    type="button"
                    className={`dss-escenario ${activo ? 'dss-escenario--activo' : ''}`}
                    onClick={() => aplicarEscenario(esc)}
                  >
                    <div className="dss-escenario__cabecera">
                      <span className="dss-escenario__titulo">{esc.nombre}</span>
                      {esc.cambiosPrioridad.length > 0 && (
                        <Insignia tono="aviso" icono={false}>{esc.cambiosPrioridad.length} cambios</Insignia>
                      )}
                    </div>
                    <p className="dss-escenario__desc">{esc.descripcion}</p>
                    <div className="dss-escenario__metricas">
                      <div>
                        <span className="dss-escenario__etq">Urgentes</span>
                        <strong className="numeros">{esc.resumen.urgentes}</strong>
                      </div>
                      <div>
                        <span className="dss-escenario__etq">Pedido total</span>
                        <strong className="numeros">{monedaRedonda(esc.resumen.montoSugerido)}</strong>
                      </div>
                      {esc.resumen.presupuesto !== null && (
                        <div>
                          <span className="dss-escenario__etq">Sin cubrir</span>
                          <strong className="numeros" style={{ color: esc.resumen.fueraPresupuesto > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                            {esc.resumen.fueraPresupuesto}
                          </strong>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="dss-parametros">
              <div className="dss-parametros__titulo">
                <LuSlidersHorizontal aria-hidden="true" />
                <span>Simular supuestos personalizados</span>
              </div>
              <div className="dss-parametros__grid">
                <Campo etiqueta={`Demanda (${Math.round(factorDemanda * 100)} %)`}>
                  {(p) => (
                    <input
                      {...p}
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.05"
                      value={factorDemanda}
                      onChange={(e) => {
                        setEscenarioActivo('personalizado');
                        setFactorDemanda(Number(e.target.value));
                      }}
                    />
                  )}
                </Campo>

                <Campo etiqueta="Retraso proveedor (+ días)">
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      min="0"
                      max="10"
                      className="entrada numeros"
                      value={extraEntrega}
                      onChange={(e) => {
                        setEscenarioActivo('personalizado');
                        setExtraEntrega(Math.max(0, Number(e.target.value) || 0));
                      }}
                    />
                  )}
                </Campo>

                <Campo etiqueta="Cobertura objetivo (días)">
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      min="2"
                      max="21"
                      className="entrada numeros"
                      value={coberturaObjetivo}
                      onChange={(e) => setCoberturaObjetivo(Math.max(1, Number(e.target.value) || 7))}
                    />
                  )}
                </Campo>

                <Campo etiqueta="Presupuesto semanal ($ MXN)" opcional ayuda="Déjalo vacío para sin tope.">
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      min="0"
                      step="500"
                      className="entrada numeros"
                      placeholder="Ej. 15000"
                      value={presupuesto}
                      onChange={(e) => setPresupuesto(e.target.value)}
                    />
                  )}
                </Campo>
              </div>
            </div>
          </Panel>

          {res.fueraPresupuesto > 0 && (
            <div className="aviso-error" role="alert">
              <LuTriangleAlert aria-hidden="true" />
              <span>
                Con el presupuesto de <strong>{moneda(res.presupuesto)}</strong> quedan <strong>{res.fueraPresupuesto}</strong> producto(s) sin cubrir
                (se necesitan {moneda(res.montoSugerido)} en total). Revisa las prioridades más altas o aumenta el presupuesto.
              </span>
            </div>
          )}

          {/* Filtros de la tabla de priorización */}
          <div className="filtros filtros--columna">
            <div className="filtros__fila">
              <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar producto" placeholder="Producto, código o proveedor" className="filtros__buscador" />
              <Segmentado
                etiqueta="Prioridad"
                valor={filtroPrioridad}
                alCambiar={setFiltroPrioridad}
                opciones={[
                  { valor: 'todos', etiqueta: 'Todos', conteo: res.total },
                  { valor: 'critica', etiqueta: 'Pedir hoy', conteo: res.critica },
                  { valor: 'alta', etiqueta: 'Pedir pronto', conteo: res.alta },
                  { valor: 'media', etiqueta: 'Esta semana', conteo: res.media },
                  { valor: 'baja', etiqueta: 'Bien surtido', conteo: res.baja },
                  { valor: 'sobreabastecido', etiqueta: 'Riesgo merma', conteo: res.sobreabastecido },
                  { valor: 'insuficientes', etiqueta: 'Sin datos', conteo: res.insuficientes },
                ]}
              />
            </div>
          </div>

          {/* Tabla de recomendaciones explicables */}
          <Panel
            titulo="Qué conviene comprar (ordenado por urgencia)"
            descripcion='Primero aparecen los productos que se acaban antes. Haz clic en cualquier fila o en "¿Por qué?" para ver la explicación completa.'
          >
            <Tabla
              etiqueta="Recomendaciones de reabastecimiento"
              clave="codigo"
              cargando={cargando}
              filas={visibles}
              alAbrir={(r) => setDetalle(r)}
              porPagina={30}
              columnas={[
                {
                  clave: 'descripcion', titulo: 'Producto', ordenable: true,
                  render: (r) => (
                    <span className="celda-doble">
                      <span style={{ fontWeight: 500 }}>{r.descripcion}</span>
                      <span className="celda-doble__detalle">
                        #{r.codigo} · {r.proveedorPrincipal}
                        {r.entregaImputada ? ' · entrega estimada' : ''}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'prioridad', titulo: 'Acción',
                  render: (r) => (
                    <Insignia tono={PRIORIDAD_META[r.prioridad]?.tono ?? 'neutro'}>
                      {PRIORIDAD_META[r.prioridad]?.etiqueta ?? r.prioridad}
                    </Insignia>
                  ),
                },
                {
                  clave: 'existencia', titulo: 'Tienes hoy', ordenable: true, alinear: 'der',
                  render: (r) => (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <span className="numeros" style={{ fontWeight: 500 }}>{cantidad(r.existencia, r.unidadMedida)}</span>
                      <span
                        className="celda-doble__detalle numeros"
                        style={
                          r.existencia <= 0
                            ? { color: 'var(--danger-text)' }
                            : r.existencia < r.stockMinimo
                              ? { color: 'var(--accent-bright)' }
                              : undefined
                        }
                      >
                        {r.existencia <= 0
                          ? 'Agotado'
                          : r.existencia < r.stockMinimo
                            ? `Bajo el mínimo (${r.stockMinimo})`
                            : `Mínimo: ${r.stockMinimo}`}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'demandaDiaria', titulo: 'Se vende / día', ordenable: true, alinear: 'der',
                  render: (r) => (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <span className="numeros">
                        {r.demandaDiaria > 0
                          ? `${r.demandaDiaria.toFixed(2)} ${abreviaturaUnidad(r.unidadMedida)} / día`
                          : 'Sin ventas'}
                      </span>
                      <span className="celda-doble__detalle numeros">
                        {r.diasConVentas > 0
                          ? `${r.diasConVentas} de ${ev.parametros.ventanaDias} días`
                          : 'Sin movimiento reciente'}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'diasCobertura', titulo: 'Alcanza para', ordenable: true, alinear: 'der',
                  render: (r) => (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <span className="numeros" style={{ fontWeight: 500 }}>
                        {r.diasCobertura !== null ? `${r.diasCobertura.toFixed(1)} días` : 'Sin ventas'}
                      </span>
                      <span
                        className="celda-doble__detalle numeros"
                        style={
                          r.prioridad !== 'insuficientes' && r.margenEntrega !== null && r.margenEntrega < 0
                            ? { color: 'var(--danger-text)' }
                            : r.riesgoMerma
                              ? { color: 'var(--accent-bright)' }
                              : undefined
                        }
                      >
                        {r.prioridad === 'insuficientes'
                          ? `Vida útil: ${r.vidaUtilDias} d`
                          : r.margenEntrega !== null && r.margenEntrega < 0
                            ? `Faltan ${Math.abs(r.margenEntrega).toFixed(1)} d antes del surtido`
                            : r.riesgoMerma
                              ? `Supera vida útil (${r.vidaUtilDias} d)`
                              : r.margenEntrega !== null
                                ? `Sobra +${r.margenEntrega.toFixed(1)} d · entrega ${r.diasEntregaEfectivos} d`
                                : `Vida útil: ${r.vidaUtilDias} d`}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'puntaje', titulo: 'Urgencia', ordenable: true, alinear: 'der',
                  render: (r) => (r.puntaje !== null ? (
                    <span className="dss-urgencia-celda">
                      <span className="dss-urgencia-celda__valor numeros">
                        <strong>{Math.round(r.puntaje)}</strong>
                        <span className="texto-3"> / 100</span>
                      </span>
                      <span className="dss-urgencia-celda__pista" aria-hidden="true">
                        <span
                          className={`dss-urgencia-celda__barra ${
                            r.puntaje >= 70
                              ? 'dss-urgencia-celda__barra--alta'
                              : r.puntaje >= 40
                                ? 'dss-urgencia-celda__barra--media'
                                : 'dss-urgencia-celda__barra--baja'
                          }`}
                          style={{ width: `${Math.max(Math.min(r.puntaje, 100), 6)}%` }}
                        />
                      </span>
                    </span>
                  ) : <span className="texto-3">—</span>),
                },
                {
                  clave: 'cantidadSugerida', titulo: 'Qué comprar', ordenable: true, alinear: 'der',
                  render: (r) => (r.cantidadSugerida > 0 ? (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>
                        {cantidad(r.cantidadSugerida, r.unidadMedida)}
                      </strong>
                      <span className="celda-doble__detalle numeros">
                        ≈ {moneda(r.costoEstimado)}
                        {!r.enPresupuesto && <span style={{ color: 'var(--danger-text)', marginLeft: 6 }}>· Fuera presup.</span>}
                      </span>
                    </span>
                  ) : (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <span className="texto-2">
                        {r.prioridad === 'insuficientes' ? 'Sin sugerencia' : 'No comprar'}
                      </span>
                      <span className="celda-doble__detalle">
                        {r.prioridad === 'sobreabastecido'
                          ? 'Promover salida'
                          : r.prioridad === 'insuficientes'
                            ? 'Pocas ventas'
                            : 'Stock suficiente'}
                      </span>
                    </span>
                  )),
                },
                {
                  clave: 'porque', titulo: 'Detalle', alinear: 'der',
                  render: (r) => (
                    <Boton variante="fantasma" talla="chico" icono={LuCircleHelp} onClick={() => setDetalle(r)}>
                      ¿Por qué?
                    </Boton>
                  ),
                },
              ]}
              vacio={<Vacio icono={LuShieldAlert} titulo="No hay productos en esta categoría" />}
            />
          </Panel>

          {/* Plan de liquidación automática para productos en riesgo de merma */}
          <PanelLiquidacionMerma
            recomendaciones={recomendaciones}
            puedeEditarPrecio={puede('EDITAR_PRODUCTOS')}
            preciosAplicados={preciosAplicados}
            aplicandoCodigo={aplicandoCodigo}
            alAplicarPrecio={aplicarPrecioLiquidacion}
            alAbrirDetalle={(item) => setDetalle(item)}
          />

          {/* Documentación en vivo de los 5 indicadores + historial de fotos guardadas */}
          <div className="reportes__rejilla">
            <Panel titulo="Fórmulas de indicadores" descripcion="Cómo se calcula cada métrica a partir del inventario y las ventas recientes">
              <ul className="lista-movimientos">
                {datos.definicionIndicadores.map((ind) => (
                  <li key={ind.id}>
                    <div className="lista-movimientos__fila">
                      <span>
                        <span className="lista-movimientos__titulo">{ind.nombre}</span>
                        <span className="lista-movimientos__detalle">
                          <span className="codigo-mono">{ind.formula}</span> · {ind.notas}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              titulo="Fotos de decisión guardadas"
              descripcion="Haz clic en cualquier foto para ver qué productos recomendó, compararla contra hoy o volver a cargar sus parámetros."
            >
              {datos.corridasGuardadas.length ? (
                <ul className="dss-fotos-lista">
                  {datos.corridasGuardadas.map((c) => (
                    <li key={c.id} className="dss-foto-fila">
                      <button
                        type="button"
                        className="dss-foto-fila__main"
                        onClick={() => setFotoActivaId(c.id)}
                      >
                        <span className="dss-foto-fila__texto">
                          <span className="dss-foto-fila__titulo">
                            #{c.id} · {c.escenario}
                            {c.presupuesto !== null && (
                              <span className="dss-foto-fila__tag numeros">Tope {monedaRedonda(c.presupuesto)}</span>
                            )}
                          </span>
                          <span className="dss-foto-fila__meta">
                            {fechaHora(c.fechaHora)} · {c.ejecutadoPor} · {c.totalCritica + c.totalAlta} urgentes · Demanda {Math.round(c.factorDemanda * 100)} %
                            {c.extraEntrega > 0 ? ` · +${c.extraEntrega} d entrega` : ''}
                          </span>
                        </span>
                        <span className="dss-foto-fila__monto numeros">{monedaRedonda(c.montoSugerido)}</span>
                      </button>

                      <div className="dss-foto-fila__acciones">
                        <button
                          type="button"
                          className="dss-foto-accion"
                          title="Ver productos de esta foto"
                          onClick={() => setFotoActivaId(c.id)}
                        >
                          <LuEye aria-hidden="true" /> Ver
                        </button>
                        <button
                          type="button"
                          className="dss-foto-accion dss-foto-accion--oro"
                          title="Volver a cargar estos supuestos en el simulador"
                          onClick={() => aplicarParametrosDeFoto(c)}
                        >
                          <LuRotateCcw aria-hidden="true" /> Aplicar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vacio titulo="Aún no hay fotos guardadas">
                  Pulsa «Guardar foto DSS» arriba para registrar el escenario actual y poder consultarlo o compararlo después.
                </Vacio>
              )}
            </Panel>
          </div>
        </div>
      )}

      <ModalPorQue
        item={detalle}
        parametros={ev?.parametros}
        fechaCorte={datos?.fechaCorte}
        puedeComprar={puede('CREAR_COMPRAS')}
        alCerrar={() => setDetalle(null)}
      />

      <ModalFotoDss
        fotoId={fotoActivaId}
        resumenActual={res}
        alCerrar={() => setFotoActivaId(null)}
        alAplicarParametros={aplicarParametrosDeFoto}
      />
    </div>
  );
}
