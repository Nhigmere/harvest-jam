// Reportes y analítica ejecutiva: tendencias, rentabilidad, productos, equipo, clientes e historial de tickets.
import { useEffect, useMemo, useState } from 'react';
import {
  LuAward, LuCalendarRange, LuChartColumn, LuChevronDown, LuClock, LuDownload, LuPackage, LuPrinter,
  LuReceipt, LuShoppingBag, LuSparkles, LuTrendingUp, LuUsers, LuWallet, LuX,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { useDialogos } from '../componentes/dialogos.jsx';
import { ContadorAnimado, EsqueletoDashboard } from '../componentes/Efectos.jsx';
import { BarraSegmentada, BarrasRanking, GraficaArea, GraficaColumnas, PanelGrafica } from '../componentes/graficas.jsx';
import { PERIODOS, paramsPeriodo, textoPeriodo } from '../componentes/periodo.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, Buscador, CabeceraPagina, Cargando, Insignia, MensajeError, Paginacion, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import {
  capitalizar, cantidad, fecha, fechaCorta, fechaHora, moneda, monedaRedonda, nombrePropio, numero, plural, porcentaje,
} from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';
import { Link } from '../router.jsx';

const ETIQUETA_SERIE = { dia: 'por día', semana: 'por semana', mes: 'por mes' };

function etiquetaPeriodoSerie(granularidad) {
  if (granularidad === 'mes') {
    return (p) => new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' })
      .format(new Date(`${p}T12:00:00`)).replace('.', '');
  }
  if (granularidad === 'semana') return (p) => `Sem. del ${fechaCorta(p)}`;
  return fechaCorta;
}

const csvCelda = (v) => {
  const t = String(v ?? '');
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

function descargarCsv(nombre, encabezados, filas) {
  const contenido = [encabezados, ...filas].map((f) => f.map(csvCelda).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function BadgeVariacion({ valor }) {
  if (valor === null || valor === undefined) return null;
  const sube = valor >= 0;
  return (
    <span className={`cifra__variacion cifra__variacion--${sube ? 'sube' : 'baja'}`}>
      {sube ? '+' : '−'}{Math.abs(valor).toLocaleString('es-MX', { maximumFractionDigits: 1 })} %
    </span>
  );
}

function VentasDetalladas({ paramsRango, etiquetaPeriodo, alExportar, exportando }) {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const buscar = useRetardo(busqueda, 220);

  useEffect(() => {
    setPagina(1);
  }, [paramsRango.desde, paramsRango.hasta, paramsRango.dias, buscar]);

  const { datos, error, cargando } = useApi('/reportes/ventas', {
    ...paramsRango,
    pagina,
    limite: 15,
    buscar: buscar || null,
  });

  return (
    <Panel
      titulo="Historial completo de tickets"
      descripcion="Un renglón por venta cobrada con sus productos. Filtra al instante por folio, cliente, cajero o producto."
      acciones={
        <Boton variante="secundario" talla="chico" icono={LuDownload} onClick={alExportar} cargando={exportando}>
          Descargar CSV
        </Boton>
      }
    >
      <div className="rep-tickets-barra">
        <Buscador
          valor={busqueda}
          alCambiar={setBusqueda}
          etiqueta="Buscar en tickets"
          placeholder="Buscar por folio, cliente, empleado o fruta…"
        />
        {datos && (
          <span className="texto-3 numeros" style={{ fontSize: '0.78rem' }}>
            {plural(datos.total, 'ticket encontrado', 'tickets encontrados')}
          </span>
        )}
      </div>

      <MensajeError error={error} />
      {cargando && !datos && <Cargando />}
      {datos && (
        <>
          <Tabla
            etiqueta="Reporte completo de ventas"
            clave="folio"
            cargando={cargando}
            filas={datos.ventas}
            columnas={[
              { clave: 'folio', titulo: 'Folio', ancho: '92px', render: (v) => <span className="numeros codigo-mono">#{v.folio}</span> },
              { clave: 'fecha', titulo: 'Fecha y hora', ancho: '156px', render: (v) => fechaHora(v.fecha) },
              {
                clave: 'cliente', titulo: 'Cliente', ancho: '200px',
                render: (v) => (
                  <span className="celda-doble">
                    <span>{nombrePropio(v.cliente)}</span>
                    <span className="celda-doble__detalle">{v.tipoCliente === 'fisica' ? 'Persona física' : 'Empresa'}</span>
                  </span>
                ),
              },
              { clave: 'empleado', titulo: 'Atendió', ancho: '175px', render: (v) => nombrePropio(v.empleado) },
              { clave: 'productos', titulo: 'Productos', className: 'tabla__td--texto-largo', render: (v) => capitalizar(v.productos) },
              { clave: 'total', titulo: 'Total', ancho: '116px', alinear: 'der', render: (v) => <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(v.total)}</strong> },
            ]}
            vacio={<Vacio titulo={buscar ? 'Ningún ticket coincide con tu búsqueda' : `No hay ventas en ${etiquetaPeriodo}`} />}
          />
          <Paginacion pagina={datos.pagina} limite={datos.limite} total={datos.total} alCambiar={setPagina} />
        </>
      )}
    </Panel>
  );
}

const KPI_REP_META = {
  ingresos: {
    icono: LuTrendingUp,
    tono: 'oro',
    titulo: 'Análisis de ingresos del periodo',
    subtitulo: 'Comparativo contra el periodo inmediato anterior y ritmo promedio.',
  },
  margen: {
    icono: LuWallet,
    tono: 'ok',
    titulo: 'Rentabilidad y utilidad estimada',
    subtitulo: 'Diferencia entre ingresos de caja y costo actual de la mercancía vendida.',
  },
  ventas: {
    icono: LuReceipt,
    tono: 'info',
    titulo: 'Ritmo de tickets y clientela',
    subtitulo: 'Comportamiento de cobros en mostrador, ticket promedio y hora pico.',
  },
  compras: {
    icono: LuShoppingBag,
    tono: 'aviso',
    titulo: 'Gasto en proveedores y flujo neto',
    subtitulo: 'Relación entre lo que entró por ventas y lo que se invirtió en surtir.',
  },
  inventario: {
    icono: LuPackage,
    tono: 'critico',
    titulo: 'Salud actual del inventario',
    subtitulo: 'Valor en bodega al día de hoy y productos por debajo del mínimo.',
  },
};

function PanelKpiReporte({
  kpiActivo,
  datos,
  mejorPunto,
  horaPico,
  formatoSerie,
  puedeProductos,
  alCerrar,
  alCambiarTab,
}) {
  const meta = kpiActivo ? KPI_REP_META[kpiActivo] : null;
  const Icono = meta?.icono ?? LuSparkles;
  const r = datos?.resumen;
  const inv = datos?.inventario;
  const puntosActivos = datos?.serie?.puntos?.filter((p) => p.ventas > 0) ?? [];
  const promedioPorJornada = puntosActivos.length ? r.ingresos / puntosActivos.length : 0;
  const costoVendido = Math.max(0, (r?.ingresos ?? 0) - (r?.margenEstimado ?? 0));
  const utilidadPorTicket = r?.ventas ? r.margenEstimado / r.ventas : 0;
  const gastoPorCompra = r?.compras?.compras ? r.compras.gasto / r.compras.compras : 0;

  return (
    <div className={`dss-kpi-panel-wrap ${kpiActivo ? 'dss-kpi-panel-wrap--abierto' : ''}`} aria-hidden={!kpiActivo}>
      <div className="dss-kpi-panel-inner">
        {kpiActivo && meta && r && (
          <section key={kpiActivo} className={`dss-kpi-panel dss-kpi-panel--${meta.tono}`} aria-label={meta.titulo}>
            <header className="dss-kpi-panel__cabecera">
              <div className="dss-kpi-panel__titulo-bloque">
                <span className={`dss-kpi-panel__icono dss-kpi-panel__icono--${meta.tono}`} aria-hidden="true">
                  <Icono />
                </span>
                <div>
                  <h3 className="dss-kpi-panel__titulo">{meta.titulo}</h3>
                  <p className="dss-kpi-panel__sub">{meta.subtitulo}</p>
                </div>
              </div>
              <div className="dss-kpi-panel__acciones">
                {kpiActivo === 'inventario' && puedeProductos && (
                  <Link to="/productos" className="boton boton--secundario boton--chico">
                    Ir a Productos
                  </Link>
                )}
                {kpiActivo === 'ventas' && (
                  <Boton variante="secundario" talla="chico" onClick={() => { alCambiarTab('tickets'); alCerrar(); }}>
                    Ver tickets
                  </Boton>
                )}
                {kpiActivo === 'inventario' && (
                  <Boton variante="secundario" talla="chico" onClick={() => { alCambiarTab('productos'); alCerrar(); }}>
                    Ver stock bajo
                  </Boton>
                )}
                <button type="button" className="dss-kpi-panel__cerrar" onClick={alCerrar} aria-label="Cerrar panel">
                  <LuX aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="rep-kpi-detalle-grid">
              {kpiActivo === 'ingresos' && (
                <>
                  <div className="rep-mini-card">
                    <span>Periodo anterior</span>
                    <strong className="numeros">{monedaRedonda(r.ingresosAnterior ?? 0)}</strong>
                    <small>{datos.anterior ? `${fechaCorta(datos.anterior.desde)} – ${fechaCorta(datos.anterior.hasta)}` : 'Sin comparativo'}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Diferencia neta</span>
                    <strong className="numeros" style={{ color: r.ingresos - (r.ingresosAnterior ?? 0) >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                      {r.ingresos - (r.ingresosAnterior ?? 0) >= 0 ? '+' : '−'}{monedaRedonda(Math.abs(r.ingresos - (r.ingresosAnterior ?? 0)))}
                    </strong>
                    <small>Respecto al periodo previo</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Mejor jornada</span>
                    <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>
                      {mejorPunto ? monedaRedonda(mejorPunto.ingresos) : '—'}
                    </strong>
                    <small>{mejorPunto ? `${formatoSerie(mejorPunto.periodo)} · ${plural(mejorPunto.ventas, 'venta', 'ventas')}` : 'Sin ventas'}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Promedio por jornada activa</span>
                    <strong className="numeros">{monedaRedonda(promedioPorJornada)}</strong>
                    <small>{plural(puntosActivos.length, 'jornada con venta', 'jornadas con venta')}</small>
                  </div>
                </>
              )}

              {kpiActivo === 'margen' && (
                <>
                  <div className="rep-mini-card">
                    <span>Rentabilidad bruta</span>
                    <strong className="numeros" style={{ color: 'var(--success-text)' }}>{porcentaje(r.margenPct ?? 0, 1)}</strong>
                    <small>De cada $100 vendidos, quedan {moneda(r.margenPct ?? 0)}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Costo de mercancía vendida</span>
                    <strong className="numeros">{monedaRedonda(costoVendido)}</strong>
                    <small>Calculado al costo actual</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Utilidad promedio / ticket</span>
                    <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(utilidadPorTicket)}</strong>
                    <small>Sobre {plural(r.ventas, 'ticket', 'tickets')}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Margen periodo anterior</span>
                    <strong className="numeros">{monedaRedonda(r.margenAnterior ?? 0)}</strong>
                    <small>{r.variacionMargen !== null && r.variacionMargen !== undefined ? `Variación ${r.variacionMargen >= 0 ? '+' : '−'}${Math.abs(r.variacionMargen)} %` : 'Sin comparativo'}</small>
                  </div>
                </>
              )}

              {kpiActivo === 'ventas' && (
                <>
                  <div className="rep-mini-card">
                    <span>Ticket promedio</span>
                    <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(r.ticketPromedio)}</strong>
                    <small>{r.variacionTicket !== null && r.variacionTicket !== undefined ? `${r.variacionTicket >= 0 ? '+' : '−'}${Math.abs(r.variacionTicket)} % vs. periodo anterior` : 'Importe medio por cobro'}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Hora pico de caja</span>
                    <strong className="numeros">{horaPico ? `${horaPico.hora}:00 – ${horaPico.hora + 1}:00` : '—'}</strong>
                    <small>{horaPico ? `${plural(horaPico.ventas, 'ticket cobrado', 'tickets cobrados')} en esa franja` : 'Sin ventas'}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Clientes registrados</span>
                    <strong className="numeros">{numero(r.clientes)}</strong>
                    <small>Clientes con cuenta que compraron</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Tickets periodo anterior</span>
                    <strong className="numeros">{numero(r.ventasAnterior ?? 0)}</strong>
                    <small>Comparativo directo del mismo lapso</small>
                  </div>
                </>
              )}

              {kpiActivo === 'compras' && (
                <>
                  <div className="rep-mini-card">
                    <span>Balance neto (Ventas − Compras)</span>
                    <strong className="numeros" style={{ color: (r.balanceNeto ?? 0) >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                      {(r.balanceNeto ?? 0) >= 0 ? '+' : '−'}{monedaRedonda(Math.abs(r.balanceNeto ?? 0))}
                    </strong>
                    <small>Efectivo libre tras surtir mercancía</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Órdenes de compra</span>
                    <strong className="numeros">{numero(r.compras.compras)}</strong>
                    <small>Surtido a {plural(r.compras.proveedores, 'proveedor', 'proveedores')}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Promedio por compra</span>
                    <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{monedaRedonda(gastoPorCompra)}</strong>
                    <small>Inversión media por pedido</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Relación compra / ingreso</span>
                    <strong className="numeros">{r.ingresos > 0 ? porcentaje((r.compras.gasto / r.ingresos) * 100, 1) : '—'}</strong>
                    <small>Porcentaje de ingresos reinvertido</small>
                  </div>
                </>
              )}

              {kpiActivo === 'inventario' && inv && (
                <>
                  <div className="rep-mini-card">
                    <span>Valor total en bodega</span>
                    <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{monedaRedonda(inv.valorCosto)}</strong>
                    <small>Valuado a costo de compra</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Catálogo activo</span>
                    <strong className="numeros">{numero(inv.productos)}</strong>
                    <small>Productos registrados</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Agotados hoy</span>
                    <strong className="numeros" style={{ color: inv.agotados > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                      {numero(inv.agotados)}
                    </strong>
                    <small>{inv.agotados > 0 ? 'Requieren surtido inmediato' : 'Ningún producto en cero'}</small>
                  </div>
                  <div className="rep-mini-card">
                    <span>Con stock bajo (≤ {datos.stockBajo.umbral})</span>
                    <strong className="numeros" style={{ color: inv.bajos > 0 ? 'var(--accent-bright)' : 'var(--success-text)' }}>
                      {numero(inv.bajos)}
                    </strong>
                    <small>Productos cerca de acabarse</small>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function Reportes() {
  const { puede } = useSesion();
  const { avisar } = useDialogos();
  const [periodo, setPeriodo] = useState('30');
  const [usarRangoCustom, setUsarRangoCustom] = useState(false);
  const [desdeCustom, setDesdeCustom] = useState('');
  const [hastaCustom, setHastaCustom] = useState('');
  const [tabActiva, setTabActiva] = useState('resumen');
  const [kpiActivo, setKpiActivo] = useState(null);
  const [metricaSerie, setMetricaSerie] = useState('ingresos');
  const [exportando, setExportando] = useState(false);

  const paramsRango = useMemo(() => {
    if (usarRangoCustom && desdeCustom && hastaCustom && desdeCustom <= hastaCustom) {
      return { desde: desdeCustom, hasta: hastaCustom };
    }
    return paramsPeriodo(periodo);
  }, [periodo, usarRangoCustom, desdeCustom, hastaCustom]);

  const { datos, error, cargando, recargar } = useApi('/reportes', paramsRango);

  const etiquetaPeriodo = usarRangoCustom && desdeCustom && hastaCustom
    ? `del ${fecha(desdeCustom)} al ${fecha(hastaCustom)}`
    : textoPeriodo(periodo);

  const exportar = async () => {
    setExportando(true);
    try {
      const r = await api.get('/reportes/ventas', { ...paramsRango, limite: 5000 });
      descargarCsv(
        `ventas_${r.desde}_a_${r.hasta}.csv`,
        ['Folio', 'Fecha', 'Cliente', 'Tipo de cliente', 'Atendió', 'Productos', 'Total'],
        r.ventas.map((v) => [
          v.folio,
          v.fecha.replace('T', ' '),
          nombrePropio(v.cliente),
          v.tipoCliente === 'fisica' ? 'Física' : 'Moral',
          nombrePropio(v.empleado),
          v.productos,
          v.total.toFixed(2),
        ]),
      );
      avisar(
        r.total > r.ventas.length
          ? `Se exportaron las ${numero(r.ventas.length)} ventas más recientes de ${numero(r.total)}`
          : `Se exportaron ${plural(r.ventas.length, 'venta', 'ventas')}`,
      );
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setExportando(false);
    }
  };

  const r = datos?.resumen;
  const inv = datos?.inventario;
  const formatoSerie = etiquetaPeriodoSerie(datos?.serie.granularidad);

  const horas = useMemo(() => {
    if (!datos) return [];
    const conVentas = datos.horas.filter((h) => h.ventas > 0).map((h) => h.hora);
    if (!conVentas.length) return [];
    const ini = Math.max(Math.min(...conVentas) - 1, 0);
    const fin = Math.min(Math.max(...conVentas) + 1, 23);
    return datos.horas.filter((h) => h.hora >= ini && h.hora <= fin);
  }, [datos]);

  const horaPico = useMemo(
    () => horas.reduce((m, h) => (h.ventas > (m?.ventas ?? -1) ? h : m), null),
    [horas],
  );

  const mejorPunto = useMemo(() => {
    if (!datos?.serie?.puntos?.length) return null;
    const top = datos.serie.puntos.reduce((m, p) => (p.ingresos > (m?.ingresos ?? -1) ? p : m), null);
    return top && top.ingresos > 0 ? top : null;
  }, [datos]);

  const productoLider = datos?.masVendidos?.[0] ?? null;
  const categoriaLider = datos?.categorias?.[0] ?? null;
  const totalCategorias = (datos?.categorias ?? []).reduce((s, c) => s + c.ingresos, 0);

  const alternarKpi = (id) => setKpiActivo((actual) => (actual === id ? null : id));

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Reportes y analítica"
        descripcion={datos ? `Panorama completo del ${fecha(datos.desde)} al ${fecha(datos.hasta)}.` : 'Indicadores, tendencias y ventas del periodo que elijas.'}
        acciones={
          <>
            <Boton variante="secundario" icono={LuPrinter} onClick={() => window.print()}>
              Imprimir
            </Boton>
            <Boton variante="primario" icono={LuDownload} onClick={exportar} cargando={exportando}>
              Exportar CSV
            </Boton>
          </>
        }
      />

      {/* Selector de periodo + rango personalizado colapsable */}
      <div className="rep-controles-periodo">
        <Segmentado
          etiqueta="Periodo"
          opciones={PERIODOS}
          valor={usarRangoCustom ? '' : periodo}
          alCambiar={(val) => {
            setUsarRangoCustom(false);
            setPeriodo(val);
          }}
        />
        <button
          type="button"
          className={`dss-esc-ajustes-btn ${usarRangoCustom ? 'dss-esc-ajustes-btn--abierto' : ''}`}
          aria-expanded={usarRangoCustom}
          onClick={() => {
            if (!usarRangoCustom && datos) {
              setDesdeCustom(datos.desde);
              setHastaCustom(datos.hasta);
            }
            setUsarRangoCustom((v) => !v);
          }}
        >
          <LuCalendarRange aria-hidden="true" />
          <span>{usarRangoCustom ? 'Usando fechas personalizadas' : 'Elegir fechas'}</span>
          <LuChevronDown className="dss-esc-ajustes-btn__flecha" aria-hidden="true" />
        </button>
      </div>

      <div className={`dss-ajustes-colapso ${usarRangoCustom ? 'dss-ajustes-colapso--abierto' : ''}`}>
        <div className="dss-ajustes-colapso__inner">
          <div className="rep-rango-custom glass-card">
            <label className="rep-rango-campo">
              <span>Desde</span>
              <input
                type="date"
                className="entrada numeros"
                value={desdeCustom}
                onChange={(e) => setDesdeCustom(e.target.value)}
              />
            </label>
            <label className="rep-rango-campo">
              <span>Hasta</span>
              <input
                type="date"
                className="entrada numeros"
                value={hastaCustom}
                min={desdeCustom || undefined}
                onChange={(e) => setHastaCustom(e.target.value)}
              />
            </label>
            <span className="texto-3" style={{ fontSize: '0.78rem' }}>
              El reporte se actualiza al instante al elegir ambas fechas.
            </span>
          </div>
        </div>
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoDashboard />}

      {datos && r && (
        <div className={`reportes ${cargando ? 'recargando' : ''}`}>
          {/* 5 KPIs ejecutivos interactivos + panel desplegable animado */}
          <div className="dss-kpis-bloque">
            <div className="cifras cifras--fila dss-kpis lujo-brillo" role="region" aria-label="Indicadores financieros interactivos">
              {[
                {
                  id: 'ingresos',
                  principal: true,
                  etiqueta: 'Ingresos',
                  valor: <ContadorAnimado valor={r.ingresos} formato={monedaRedonda} />,
                  variacion: r.variacionIngresos,
                  detalle: 'vs. periodo anterior',
                },
                {
                  id: 'margen',
                  etiqueta: 'Margen estimado',
                  valor: <ContadorAnimado valor={r.margenEstimado} formato={monedaRedonda} />,
                  variacion: r.variacionMargen,
                  detalle: `${porcentaje(r.margenPct ?? 0, 1)} rentabilidad`,
                },
                {
                  id: 'ventas',
                  etiqueta: 'Tickets cobrados',
                  valor: <ContadorAnimado valor={r.ventas} formato={numero} />,
                  variacion: r.variacionVentas,
                  detalle: `Promedio ${moneda(r.ticketPromedio)}`,
                },
                {
                  id: 'compras',
                  etiqueta: 'Gasto en compras',
                  valor: <ContadorAnimado valor={r.compras.gasto} formato={monedaRedonda} />,
                  detalle: `${plural(r.compras.compras, 'compra', 'compras')} · neto ${(r.balanceNeto ?? 0) >= 0 ? '+' : '−'}${monedaRedonda(Math.abs(r.balanceNeto ?? 0))}`,
                },
                {
                  id: 'inventario',
                  etiqueta: 'Valor en bodega',
                  valor: <ContadorAnimado valor={inv?.valorCosto ?? 0} formato={monedaRedonda} />,
                  detalle: `${numero((inv?.agotados ?? 0) + (inv?.bajos ?? 0))} alertas de stock hoy`,
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
                    <span className="cifra__detalle">
                      <BadgeVariacion valor={k.variacion} />
                      {k.detalle}
                    </span>
                  </button>
                );
              })}
            </div>

            <PanelKpiReporte
              kpiActivo={kpiActivo}
              datos={datos}
              mejorPunto={mejorPunto}
              horaPico={horaPico}
              formatoSerie={formatoSerie}
              puedeProductos={puede('VER_PRODUCTOS')}
              alCerrar={() => setKpiActivo(null)}
              alCambiarTab={setTabActiva}
            />
          </div>

          {/* Franja de hallazgos clave del periodo (resumen ejecutivo en 1 vistazo) */}
          <div className="rep-insights dss-stagger" aria-label="Hallazgos clave del periodo">
            <div className="rep-insight">
              <span className="rep-insight__icono" aria-hidden="true"><LuSparkles /></span>
              <div>
                <span className="rep-insight__etq">Mejor jornada</span>
                <strong className="rep-insight__val numeros">
                  {mejorPunto ? `${formatoSerie(mejorPunto.periodo)} · ${monedaRedonda(mejorPunto.ingresos)}` : 'Sin ventas'}
                </strong>
              </div>
            </div>

            <div className="rep-insight">
              <span className="rep-insight__icono" aria-hidden="true"><LuClock /></span>
              <div>
                <span className="rep-insight__etq">Hora pico</span>
                <strong className="rep-insight__val numeros">
                  {horaPico ? `${horaPico.hora}:00 – ${horaPico.hora + 1}:00 (${horaPico.ventas} tickets)` : 'Sin datos'}
                </strong>
              </div>
            </div>

            <div className="rep-insight">
              <span className="rep-insight__icono" aria-hidden="true"><LuAward /></span>
              <div>
                <span className="rep-insight__etq">Producto estrella</span>
                <strong className="rep-insight__val">
                  {productoLider
                    ? `${capitalizar(productoLider.descripcion)} (${r.ingresos > 0 ? porcentaje((productoLider.importe / r.ingresos) * 100, 0) : '0 %'})`
                    : 'Sin ventas'}
                </strong>
              </div>
            </div>

            <div className="rep-insight">
              <span className="rep-insight__icono" aria-hidden="true"><LuTrendingUp /></span>
              <div>
                <span className="rep-insight__etq">Categoría líder</span>
                <strong className="rep-insight__val">
                  {categoriaLider && totalCategorias > 0
                    ? `${capitalizar(categoriaLider.categoria)} (${porcentaje((categoriaLider.ingresos / totalCategorias) * 100, 0)})`
                    : 'Sin datos'}
                </strong>
              </div>
            </div>
          </div>

          {/* Barra de navegación estructurada por 4 secciones */}
          <nav className="dss-tabs-barra" role="tablist" aria-label="Secciones de reportes">
            {[
              { id: 'resumen', etiqueta: 'Tendencias', icono: LuChartColumn, conteo: `${datos.serie.puntos.length} pts`, tono: 'oro' },
              {
                id: 'productos',
                etiqueta: 'Productos y stock',
                icono: LuPackage,
                conteo: datos.stockBajo.productos.length > 0 ? `${datos.stockBajo.productos.length} bajos` : 'Stock OK',
                tono: datos.stockBajo.productos.length > 0 ? 'aviso' : 'neutro',
              },
              { id: 'equipo', etiqueta: 'Equipo y clientes', icono: LuUsers, conteo: `${datos.empleados.length + datos.clientesFrecuentes.length}`, tono: 'neutro' },
              { id: 'tickets', etiqueta: 'Historial de tickets', icono: LuReceipt, conteo: numero(r.ventas), tono: 'neutro' },
            ].map((tab) => {
              const IconoTab = tab.icono;
              const activa = tabActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  className={`dss-tab-btn ${activa ? 'dss-tab-btn--activa' : ''}`}
                  onClick={() => setTabActiva(tab.id)}
                >
                  <IconoTab className="dss-tab-btn__icono" aria-hidden="true" />
                  <span>{tab.etiqueta}</span>
                  <span className={`dss-tab-btn__badge dss-tab-btn__badge--${tab.tono} numeros`}>
                    {tab.conteo}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* SECCIÓN 1: TENDENCIAS Y HORARIOS */}
          {tabActiva === 'resumen' && (
            <div key="rep-resumen" className="dss-vista-etapa">
              <PanelGrafica
                titulo={`${metricaSerie === 'ingresos' ? 'Ingresos' : 'Tickets cobrados'} ${ETIQUETA_SERIE[datos.serie.granularidad]}`}
                descripcion={`${plural(r.ventas, 'venta', 'ventas')} en ${etiquetaPeriodo}`}
                acciones={
                  <div className="dss-kpi-toggle" role="tablist" aria-label="Métrica de la gráfica">
                    <button
                      type="button"
                      className={`dss-kpi-toggle__btn ${metricaSerie === 'ingresos' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                      onClick={() => setMetricaSerie('ingresos')}
                    >
                      Ingresos ($)
                    </button>
                    <button
                      type="button"
                      className={`dss-kpi-toggle__btn ${metricaSerie === 'ventas' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                      onClick={() => setMetricaSerie('ventas')}
                    >
                      Tickets
                    </button>
                  </div>
                }
                columnas={[
                  { clave: 'periodo', titulo: 'Periodo', render: (f) => formatoSerie(f.periodo) },
                  { clave: 'ventas', titulo: 'Ventas', alinear: 'der', render: (f) => numero(f.ventas) },
                  { clave: 'ingresos', titulo: 'Ingresos', alinear: 'der', render: (f) => moneda(f.ingresos) },
                ]}
                filas={datos.serie.puntos}
              >
                {r.ventas > 0 ? (
                  metricaSerie === 'ingresos' ? (
                    <GraficaArea
                      puntos={datos.serie.puntos}
                      formatoX={formatoSerie}
                      detalleTooltip={(p) => plural(p.ventas, 'venta', 'ventas')}
                      etiqueta={`Ingresos ${ETIQUETA_SERIE[datos.serie.granularidad]}`}
                      alto={265}
                    />
                  ) : (
                    <GraficaColumnas
                      datos={datos.serie.puntos}
                      campoX="periodo"
                      campoY="ventas"
                      formatoX={formatoSerie}
                      formatoValor={(v) => plural(v, 'ticket', 'tickets')}
                      etiqueta={`Tickets ${ETIQUETA_SERIE[datos.serie.granularidad]}`}
                    />
                  )
                ) : <Vacio titulo={`No hay ventas en ${etiquetaPeriodo}`} />}
              </PanelGrafica>

              <div className="reportes__rejilla reportes__rejilla--estirar">
                <PanelGrafica
                  titulo="Ventas por hora del día"
                  descripcion={horaPico && horaPico.ventas > 0 ? `Franja con más movimiento: ${horaPico.hora}:00 a ${horaPico.hora + 1}:00 (${plural(horaPico.ventas, 'ticket', 'tickets')}).` : 'Número de tickets según la hora.'}
                  columnas={[
                    { clave: 'hora', titulo: 'Hora', render: (f) => `${f.hora}:00 a ${f.hora + 1}:00` },
                    { clave: 'ventas', titulo: 'Ventas', alinear: 'der', render: (f) => numero(f.ventas) },
                  ]}
                  filas={horas}
                >
                  {horas.length ? (
                    <GraficaColumnas
                      datos={horas}
                      campoX="hora"
                      campoY="ventas"
                      formatoX={(h) => `${h}h`}
                      formatoValor={(v) => plural(v, 'venta', 'ventas')}
                      etiqueta="Ventas por hora del día"
                    />
                  ) : <Vacio titulo="Sin ventas en este periodo" />}
                </PanelGrafica>

                <PanelGrafica
                  titulo="Ingresos por categoría"
                  descripcion="Distribución de ventas entre frutas, verduras y demás categorías."
                  columnas={[
                    { clave: 'categoria', titulo: 'Categoría', render: (f) => capitalizar(f.categoria) },
                    { clave: 'ingresos', titulo: 'Ingresos', alinear: 'der', render: (f) => moneda(f.ingresos) },
                  ]}
                  filas={datos.categorias}
                >
                  {datos.categorias.length ? (
                    <BarraSegmentada
                      partes={datos.categorias.map((c) => ({ nombre: capitalizar(c.categoria), valor: c.ingresos }))}
                      formatoValor={monedaRedonda}
                      etiqueta="Ingresos por categoría"
                    />
                  ) : <Vacio titulo="Sin ventas en este periodo" />}
                </PanelGrafica>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: PRODUCTOS Y SALUD DE INVENTARIO */}
          {tabActiva === 'productos' && (
            <div key="rep-productos" className="dss-vista-etapa">
              <div className="reportes__rejilla reportes__rejilla--estirar">
                <Panel
                  titulo="Top 10 productos más vendidos"
                  descripcion="Ordenados por importe vendido y su participación sobre el ingreso total."
                >
                  {datos.masVendidos.length ? (
                    <BarrasRanking
                      datos={datos.masVendidos.map((p) => ({ ...p, nombre: capitalizar(p.descripcion) }))}
                      campoEtiqueta="nombre"
                      campoValor="importe"
                      formatoValor={monedaRedonda}
                      detalle={(p) => {
                        const share = r.ingresos > 0 ? ` · ${porcentaje((p.importe / r.ingresos) * 100, 1)}` : '';
                        return `${cantidad(p.cantidad, p.unidadMedida)}${share}`;
                      }}
                      etiqueta="Productos más vendidos"
                    />
                  ) : <Vacio titulo="Sin ventas en este periodo" />}
                </Panel>

                <Panel
                  titulo="Alertas de inventario bajo"
                  descripcion={`Productos con ${numero(datos.stockBajo.umbral)} o menos en existencia hoy.`}
                  acciones={puede('VER_PRODUCTOS') && (
                    <Link to="/productos" className="boton boton--secundario boton--chico">
                      Administrar productos
                    </Link>
                  )}
                >
                  {datos.stockBajo.productos.length ? (
                    <Tabla
                      etiqueta="Inventario bajo"
                      clave="codigo"
                      filas={datos.stockBajo.productos}
                      porPagina={10}
                      columnas={[
                        {
                          clave: 'descripcion', titulo: 'Producto',
                          render: (p) => (
                            <span className="celda-doble">
                              <span>{capitalizar(p.descripcion)}</span>
                              <span className="celda-doble__detalle">#{p.codigo}</span>
                            </span>
                          ),
                        },
                        {
                          clave: 'existencia', titulo: 'Existencia', ancho: '124px', alinear: 'der',
                          render: (p) => (p.existencia === 0
                            ? <Insignia tono="critico">Agotado</Insignia>
                            : <span className="numeros">{cantidad(p.existencia, p.unidadMedida)}</span>),
                        },
                        { clave: 'precioCompra', titulo: 'Costo', ancho: '104px', alinear: 'der', render: (p) => <span className="numeros">{moneda(p.precioCompra)}</span> },
                      ]}
                    />
                  ) : <Vacio titulo="Todo el inventario está por encima del mínimo" />}
                </Panel>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: EQUIPO Y MEJORES CLIENTES */}
          {tabActiva === 'equipo' && (
            <div key="rep-equipo" className="dss-vista-etapa">
              <div className="reportes__rejilla reportes__rejilla--estirar">
                <Panel titulo="Desempeño por empleado" descripcion="Tickets cobrados, monto total y ticket promedio por persona.">
                  {datos.empleados.length ? (
                    <BarrasRanking
                      datos={datos.empleados.map((e) => ({ ...e, nombre: nombrePropio(e.nombre) }))}
                      campoEtiqueta="nombre"
                      campoValor="monto"
                      formatoValor={monedaRedonda}
                      detalle={(e) => `${plural(e.ventas, 'venta', 'ventas')} · prom. ${moneda(e.ventas ? e.monto / e.ventas : 0)}`}
                      etiqueta="Ventas por empleado"
                    />
                  ) : <Vacio titulo="Sin ventas en este periodo" />}
                </Panel>

                <Panel titulo="Mejores clientes" descripcion="Clientes registrados con mayor importe comprado en el periodo.">
                  {datos.clientesFrecuentes.length ? (
                    <Tabla
                      etiqueta="Mejores clientes"
                      filas={datos.clientesFrecuentes}
                      columnas={[
                        { clave: 'nombre', titulo: 'Cliente', render: (c) => nombrePropio(c.nombre) },
                        { clave: 'tipo', titulo: 'Tipo', ancho: '96px', render: (c) => <Insignia tono="neutro" icono={false}>{c.tipo === 'fisica' ? 'Física' : 'Moral'}</Insignia> },
                        {
                          clave: 'compras', titulo: 'Compras', ancho: '96px', alinear: 'der',
                          render: (c) => (
                            <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                              <span className="numeros">{numero(c.compras)}</span>
                              <span className="celda-doble__detalle numeros">prom. {moneda(c.compras ? c.monto / c.compras : 0)}</span>
                            </span>
                          ),
                        },
                        { clave: 'monto', titulo: 'Importe', ancho: '116px', alinear: 'der', render: (c) => <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(c.monto)}</strong> },
                      ]}
                    />
                  ) : <Vacio titulo="Ningún cliente registrado compró en este periodo" />}
                </Panel>
              </div>
            </div>
          )}

          {/* SECCIÓN 4: HISTORIAL COMPLETO DE TICKETS */}
          {tabActiva === 'tickets' && (
            <div key="rep-tickets" className="dss-vista-etapa">
              <VentasDetalladas
                paramsRango={paramsRango}
                etiquetaPeriodo={etiquetaPeriodo}
                alExportar={exportar}
                exportando={exportando}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
