// Ventas: consola boutique con gráficas de rendimiento, tarjetas de ticket, equipo y clientes.
import { useEffect, useMemo, useState } from 'react';
import {
  LuArrowUpRight, LuBan, LuChartColumn, LuClock, LuDownload, LuLayoutGrid, LuPrinter, LuReceiptText,
  LuShoppingBasket, LuSparkles, LuTable, LuUsers,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { CalendarioFecha } from '../componentes/CalendarioFecha.jsx';
import { Monograma, tonoDeTexto } from '../componentes/Catalogo.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { ContadorAnimado, EsqueletoDashboard } from '../componentes/Efectos.jsx';
import { BarrasRanking, GraficaArea, GraficaColumnas, PanelGrafica } from '../componentes/graficas.jsx';
import { PERIODOS, paramsPeriodo, textoPeriodo } from '../componentes/periodo.js';
import { Tabla } from '../componentes/Tabla.jsx';
import { AccionesTicket, Ticket } from '../componentes/Ticket.jsx';
import {
  Boton, Buscador, CabeceraPagina, Cargando, Insignia, MensajeError, Paginacion, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import {
  capitalizar, cantidad, fecha, fechaCorta, fechaHora, moneda, monedaRedonda, nombrePropio, numero, plural,
} from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';
import { Link, useNavegar, useUbicacion } from '../router.jsx';

const ETIQUETA_SERIE = { dia: 'por día', semana: 'por semana', mes: 'por mes' };

function formatoPeriodo(granularidad) {
  if (granularidad === 'mes') {
    return (p) => new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' })
      .format(new Date(`${p}T12:00:00`)).replace('.', '');
  }
  if (granularidad === 'semana') return (p) => `Sem. ${fechaCorta(p)}`;
  return fechaCorta;
}

function descargarCsvVentas(nombre, ventas) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const encabezados = ['Folio', 'Fecha', 'Cliente', 'Atendió', 'Productos', 'Total'];
  const filas = ventas.map((v) => [
    v.folio, v.fecha.replace('T', ' '), nombrePropio(v.cliente), nombrePropio(v.empleado), v.renglones, v.total.toFixed(2),
  ]);
  const csv = [encabezados, ...filas].map((f) => f.map(esc).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function DetalleVenta({ folio, alCerrar, alCancelar }) {
  const { puede } = useSesion();
  const { datos, error, cargando } = useApi(folio ? `/ventas/${folio}` : null);
  return (
    <Modal
      abierto={Boolean(folio)}
      alCerrar={alCerrar}
      titulo={`Venta #${folio ?? ''}`}
      ancho="ticket"
      pie={datos && (
        <>
          {puede('ELIMINAR_VENTAS') && (
            <Boton variante="peligro-suave" icono={LuBan} onClick={() => alCancelar(datos)}>Cancelar venta</Boton>
          )}
          <AccionesTicket venta={datos} />
        </>
      )}
    >
      <MensajeError error={error} />
      {cargando && <Cargando />}
      {datos && !cargando && <Ticket venta={datos} />}
    </Modal>
  );
}

function TarjetaTicket({ venta, alAbrir }) {
  const tono = tonoDeTexto(venta.cliente || String(venta.folio));
  return (
    <button type="button" className="vc-ticket-card" onClick={() => alAbrir(venta.folio)}>
      <div className="vc-ticket-card__top">
        <div className="vc-ticket-card__ident">
          <Monograma texto={venta.cliente || 'PG'} tono={tono} />
          <div>
            <span className="vc-ticket-card__folio numeros">Folio #{venta.folio}</span>
            <strong className="vc-ticket-card__cliente">{nombrePropio(venta.cliente)}</strong>
          </div>
        </div>
        <strong className="vc-ticket-card__monto numeros">{moneda(venta.total)}</strong>
      </div>
      <div className="vc-ticket-card__pie">
        <span>Atendió: <strong>{nombrePropio(venta.empleado)}</strong></span>
        <span className="numeros">{plural(venta.renglones, 'producto', 'productos')}</span>
      </div>
      <div className="vc-ticket-card__fecha">
        <span>{fechaHora(venta.fecha)}</span>
        <span className="vc-ticket-card__ver">Ver ticket <LuArrowUpRight aria-hidden="true" /></span>
      </div>
    </button>
  );
}

export default function Ventas() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { search } = useUbicacion();
  const navegar = useNavegar();

  const [periodo, setPeriodo] = useState('30');
  const [fechaExacta, setFechaExacta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tabActiva, setTabActiva] = useState('graficas');
  const [vistaLista, setVistaLista] = useState('tarjetas');
  const [metricaSerie, setMetricaSerie] = useState('ingresos');
  const [exportando, setExportando] = useState(false);

  const buscar = useRetardo(busqueda);
  const folioUrl = new URLSearchParams(search).get('folio');
  const [abierta, setAbierta] = useState(folioUrl ? Number(folioUrl) : null);

  useEffect(() => setPagina(1), [periodo, fechaExacta, buscar]);
  useEffect(() => {
    if (folioUrl) setAbierta(Number(folioUrl));
  }, [folioUrl]);

  const filtroFechas = fechaExacta ? { desde: fechaExacta, hasta: fechaExacta } : paramsPeriodo(periodo);
  const { datos, error, cargando, recargar } = useApi('/ventas', { ...filtroFechas, buscar, pagina, limite: 12 });

  const cambiarPeriodo = (nuevo) => {
    setFechaExacta('');
    setPeriodo(nuevo);
  };

  const etiquetaLapso = fechaExacta ? `del ${fecha(fechaExacta)}` : `de ${textoPeriodo(periodo)}`;

  const cerrarDetalle = () => {
    setAbierta(null);
    if (folioUrl) navegar('/ventas', { reemplazar: true });
  };

  const cancelar = async (venta) => {
    const ok = await confirmar({
      titulo: `¿Cancelar la venta #${venta.folio}?`,
      mensaje: `Se borra el ticket de ${moneda(venta.total)} y los productos regresan al inventario. Queda registrado en la auditoría.`,
      accion: 'Cancelar venta',
      cancelar: 'No, conservarla',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/ventas/${venta.folio}`);
      avisar(`Venta #${venta.folio} cancelada; el stock se devolvió`);
      cerrarDetalle();
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const r = await api.get('/ventas', { ...filtroFechas, buscar, pagina: 1, limite: 500 });
      descargarCsvVentas(`ventas_${r.desde}_a_${r.hasta}.csv`, r.ventas ?? []);
      avisar(`Se exportaron ${plural(r.ventas?.length ?? 0, 'ticket', 'tickets')}.`);
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setExportando(false);
    }
  };

  const resumen = datos?.resumen;
  const an = datos?.analitica;
  const formatoX = formatoPeriodo(an?.serie?.granularidad);

  const horaPico = useMemo(
    () => (an?.horas ?? []).reduce((m, h) => (h.ventas > (m?.ventas ?? -1) ? h : m), null),
    [an],
  );
  const mejorEmpleado = an?.porEmpleado?.[0] ?? null;
  const productoLider = an?.topProductos?.[0] ?? null;

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Ventas"
        descripcion={datos ? `Panorama de cobros y tickets del ${fecha(datos.desde)} al ${fecha(datos.hasta)}.` : 'Tickets cobrados, tendencias de caja y rendimiento de mostrador.'}
        acciones={
          <>
            <Boton variante="secundario" icono={LuDownload} onClick={exportar} cargando={exportando}>
              Exportar CSV
            </Boton>
            <Boton variante="secundario" icono={LuPrinter} onClick={() => window.print()}>
              Imprimir
            </Boton>
            {puede('CREAR_VENTAS') && (
              <Link to="/vender" className="boton boton--primario boton--normal">
                <LuShoppingBasket className="boton__icono" aria-hidden="true" /> Abrir caja
              </Link>
            )}
          </>
        }
      />

      <div className="filtros">
        <Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={fechaExacta ? '' : periodo} alCambiar={cambiarPeriodo} />
        <CalendarioFecha
          valor={fechaExacta}
          alCambiar={(f) => {
            setFechaExacta(f);
            if (f) setTabActiva('tickets');
          }}
          rutaDias="/ventas/dias"
          etiqueta="Consultar ventas por fecha"
          placeholder="Buscar por fecha"
        />
        <Buscador
          valor={busqueda}
          alCambiar={(v) => {
            setBusqueda(v);
            if (v.trim()) setTabActiva('tickets');
          }}
          etiqueta="Buscar venta"
          placeholder="Folio, cliente o empleado"
          className="filtros__buscador"
        />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoDashboard />}

      {datos && resumen && (
        <div className={`reportes ${cargando ? 'recargando' : ''}`}>
          {/* Franja KPI Premium de Ventas */}
          <section className="vc-hero glass-card lujo-brillo" aria-label="Resumen de ventas">
            <div className="vc-hero__card vc-hero__card--principal">
              <span className="vc-hero__etq">Ingresos {etiquetaLapso}</span>
              <strong className="vc-hero__val vc-hero__val--grande numeros">
                <ContadorAnimado valor={resumen.ingresos} formato={monedaRedonda} />
              </strong>
              <span className="vc-hero__sub numeros">
                {an?.ventaMaxima > 0 ? `Ticket más alto: ${moneda(an.ventaMaxima)}` : 'Sin cobros en este rango'}
              </span>
            </div>

            <div className="vc-hero__card">
              <span className="vc-hero__etq">Tickets cobrados</span>
              <strong className="vc-hero__val numeros">
                <ContadorAnimado valor={resumen.ventas} formato={numero} />
              </strong>
              <span className="vc-hero__sub">
                {horaPico ? `Hora pico: ${horaPico.hora}:00 – ${horaPico.hora + 1}:00` : 'Sin actividad'}
              </span>
            </div>

            <div className="vc-hero__card">
              <span className="vc-hero__etq">Ticket promedio</span>
              <strong className="vc-hero__val numeros" style={{ color: 'var(--accent-bright)' }}>
                <ContadorAnimado valor={resumen.ticketPromedio} formato={moneda} />
              </strong>
              <span className="vc-hero__sub">
                {productoLider ? `Estrella: ${capitalizar(productoLider.descripcion)}` : 'Promedio por venta'}
              </span>
            </div>

            <div className="vc-hero__card">
              <span className="vc-hero__etq">Clientes distintos</span>
              <strong className="vc-hero__val numeros">
                <ContadorAnimado valor={resumen.clientes} formato={numero} />
              </strong>
              <span className="vc-hero__sub">
                {mejorEmpleado ? `Líder: ${nombrePropio(mejorEmpleado.nombre)}` : 'Sin registro'}
              </span>
            </div>
          </section>

          {/* Navegación por 3 pestañas limpias */}
          <nav className="vc-tabs" role="tablist" aria-label="Vistas de ventas">
            {[
              { id: 'graficas', etiqueta: 'Gráficas y pulso', icono: LuChartColumn, conteo: `${an?.serie?.puntos?.length ?? 0} pts`, tono: 'oro' },
              { id: 'tickets', etiqueta: 'Tickets cobrados', icono: LuReceiptText, conteo: numero(datos.total), tono: 'neutro' },
              { id: 'equipo', etiqueta: 'Equipo y clientes', icono: LuUsers, conteo: `${(an?.porEmpleado?.length ?? 0) + (an?.topClientes?.length ?? 0)}`, tono: 'neutro' },
            ].map((t) => {
              const Icono = t.icono;
              const activa = tabActiva === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  className={`dss-tab-btn ${activa ? 'dss-tab-btn--activa' : ''}`}
                  onClick={() => setTabActiva(t.id)}
                >
                  <Icono className="dss-tab-btn__icono" aria-hidden="true" />
                  <span>{t.etiqueta}</span>
                  <span className={`dss-tab-btn__badge dss-tab-btn__badge--${t.tono} numeros`}>{t.conteo}</span>
                </button>
              );
            })}
          </nav>

          {/* PESTAÑA 1: GRÁFICAS Y PULSO DE VENTAS */}
          {tabActiva === 'graficas' && (
            <div key="ventas-graficas" className="dss-vista-etapa">
              <PanelGrafica
                titulo={`${metricaSerie === 'ingresos' ? 'Ingresos' : 'Tickets cobrados'} ${ETIQUETA_SERIE[an?.serie?.granularidad ?? 'dia']}`}
                descripcion={`${plural(resumen.ventas, 'venta', 'ventas')} ${etiquetaLapso}`}
                acciones={
                  <div className="dss-kpi-toggle" role="group" aria-label="Métrica de gráfica">
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
                  { clave: 'periodo', titulo: 'Periodo', render: (f) => formatoX(f.periodo) },
                  { clave: 'ventas', titulo: 'Tickets', alinear: 'der', render: (f) => numero(f.ventas) },
                  { clave: 'ingresos', titulo: 'Ingresos', alinear: 'der', render: (f) => moneda(f.ingresos) },
                ]}
                filas={an?.serie?.puntos ?? []}
              >
                {an?.serie?.puntos?.length ? (
                  metricaSerie === 'ingresos' ? (
                    <GraficaArea
                      puntos={an.serie.puntos}
                      formatoX={formatoX}
                      detalleTooltip={(p) => plural(p.ventas, 'ticket', 'tickets')}
                      etiqueta="Ingresos de ventas"
                      alto={250}
                    />
                  ) : (
                    <GraficaColumnas
                      datos={an.serie.puntos}
                      campoX="periodo"
                      campoY="ventas"
                      formatoX={formatoX}
                      formatoValor={(v) => plural(v, 'ticket', 'tickets')}
                      etiqueta="Tickets cobrados"
                    />
                  )
                ) : <Vacio titulo={`No hay ventas ${etiquetaLapso}`} />}
              </PanelGrafica>

              <div className="reportes__rejilla reportes__rejilla--estirar">
                <PanelGrafica
                  titulo="Actividad por hora del día"
                  descripcion={horaPico ? `Mayor afluencia entre las ${horaPico.hora}:00 y ${horaPico.hora + 1}:00 (${plural(horaPico.ventas, 'ticket', 'tickets')}).` : 'Distribución horaria de ventas.'}
                  columnas={[
                    { clave: 'hora', titulo: 'Hora', render: (f) => `${f.hora}:00 – ${f.hora + 1}:00` },
                    { clave: 'ventas', titulo: 'Tickets', alinear: 'der', render: (f) => numero(f.ventas) },
                  ]}
                  filas={an?.horas ?? []}
                >
                  {an?.horas?.length ? (
                    <GraficaColumnas
                      datos={an.horas}
                      campoX="hora"
                      campoY="ventas"
                      formatoX={(h) => `${h}h`}
                      formatoValor={(v) => plural(v, 'ticket', 'tickets')}
                      etiqueta="Ventas por hora"
                    />
                  ) : <Vacio titulo="Sin datos horarios en este periodo" />}
                </PanelGrafica>

                <Panel titulo="Frutas y productos más vendidos" descripcion="Top del periodo por importe vendido">
                  {an?.topProductos?.length ? (
                    <BarrasRanking
                      datos={an.topProductos.map((p) => ({ ...p, nombre: capitalizar(p.descripcion) }))}
                      campoEtiqueta="nombre"
                      campoValor="importe"
                      formatoValor={monedaRedonda}
                      detalle={(p) => cantidad(p.cantidad, p.unidadMedida)}
                      etiqueta="Top productos vendidos"
                    />
                  ) : <Vacio titulo="Sin productos vendidos en este periodo" />}
                </Panel>
              </div>

              {datos.ventas.length > 0 && (
                <Panel
                  titulo="Últimos tickets cobrados"
                  descripcion="Haz clic en cualquier recibo para ver su detalle, imprimir o enviar por WhatsApp."
                  acciones={
                    <Boton variante="secundario" talla="chico" onClick={() => setTabActiva('tickets')}>
                      Ver todos ({numero(datos.total)})
                    </Boton>
                  }
                >
                  <div className="vc-tickets-grid dss-stagger">
                    {datos.ventas.slice(0, 4).map((v) => (
                      <TarjetaTicket key={v.folio} venta={v} alAbrir={setAbierta} />
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          )}

          {/* PESTAÑA 2: TICKETS COBRADOS (TARJETAS BOUTIQUE O TABLA COMPACTA) */}
          {tabActiva === 'tickets' && (
            <div key="ventas-tickets" className="dss-vista-etapa">
              <Panel
                titulo="Historial de tickets cobrados"
                descripcion="Haz clic en cualquier ticket para abrir el recibo completo, reimprimir o cancelar."
                acciones={
                  <div className="dss-kpi-toggle" role="group" aria-label="Cambiar vista de tickets">
                    <button
                      type="button"
                      className={`dss-kpi-toggle__btn ${vistaLista === 'tarjetas' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                      onClick={() => setVistaLista('tarjetas')}
                    >
                      <LuLayoutGrid size={13} aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-2px' }} />
                      Tarjetas
                    </button>
                    <button
                      type="button"
                      className={`dss-kpi-toggle__btn ${vistaLista === 'tabla' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                      onClick={() => setVistaLista('tabla')}
                    >
                      <LuTable size={13} aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-2px' }} />
                      Tabla
                    </button>
                  </div>
                }
              >
                {datos.ventas.length ? (
                  vistaLista === 'tarjetas' ? (
                    <div className="vc-tickets-grid dss-stagger">
                      {datos.ventas.map((v) => (
                        <TarjetaTicket key={v.folio} venta={v} alAbrir={setAbierta} />
                      ))}
                    </div>
                  ) : (
                    <Tabla
                      etiqueta="Ventas"
                      clave="folio"
                      cargando={cargando}
                      filas={datos.ventas}
                      alAbrir={(v) => setAbierta(v.folio)}
                      columnas={[
                        { clave: 'folio', titulo: 'Folio', render: (v) => <span className="numeros codigo-mono">#{v.folio}</span>, ancho: '96px' },
                        { clave: 'fecha', titulo: 'Fecha', render: (v) => fechaHora(v.fecha) },
                        { clave: 'cliente', titulo: 'Cliente', render: (v) => nombrePropio(v.cliente) },
                        { clave: 'empleado', titulo: 'Atendió', render: (v) => nombrePropio(v.empleado) },
                        { clave: 'renglones', titulo: 'Productos', alinear: 'der', render: (v) => <span className="numeros">{v.renglones}</span> },
                        { clave: 'total', titulo: 'Total', alinear: 'der', render: (v) => <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(v.total)}</strong> },
                      ]}
                    />
                  )
                ) : (
                  <Vacio
                    titulo={
                      buscar
                        ? 'Ninguna venta coincide con la búsqueda'
                        : fechaExacta
                          ? `No hay ventas el ${fecha(fechaExacta)}`
                          : `No hay ventas en ${textoPeriodo(periodo)}`
                    }
                  >
                    {buscar
                      ? 'Prueba con el folio o con otro nombre.'
                      : 'Elige en el calendario un día marcado con punto dorado o cambia el periodo.'}
                  </Vacio>
                )}
                {datos.total > datos.limite && (
                  <div className="dss-liq-paginacion">
                    <Paginacion pagina={datos.pagina} limite={datos.limite} total={datos.total} alCambiar={setPagina} />
                  </div>
                )}
              </Panel>
            </div>
          )}

          {/* PESTAÑA 3: EQUIPO Y CLIENTES */}
          {tabActiva === 'equipo' && (
            <div key="ventas-equipo" className="dss-vista-etapa">
              <div className="reportes__rejilla reportes__rejilla--estirar">
                <Panel titulo="Desempeño por vendedor" descripcion="Importe cobrado, tickets y promedio en el periodo elegido.">
                  {an?.porEmpleado?.length ? (
                    <BarrasRanking
                      datos={an.porEmpleado.map((e) => ({ ...e, nombre: nombrePropio(e.nombre) }))}
                      campoEtiqueta="nombre"
                      campoValor="monto"
                      formatoValor={monedaRedonda}
                      detalle={(e) => `${plural(e.ventas, 'ticket', 'tickets')} · prom. ${moneda(e.ventas ? e.monto / e.ventas : 0)}`}
                      etiqueta="Ventas por vendedor"
                    />
                  ) : <Vacio titulo="Sin actividad de vendedores en este periodo" />}
                </Panel>

                <Panel titulo="Clientes destacados" descripcion="Haz clic en cualquier cliente para ver sus tickets cobrados.">
                  {an?.topClientes?.length ? (
                    <ul className="vc-ranking-lista dss-stagger">
                      {an.topClientes.map((c) => (
                        <li key={c.nombre}>
                          <button
                            type="button"
                            className="vc-ranking-fila"
                            onClick={() => {
                              setBusqueda(c.nombre);
                              setTabActiva('tickets');
                            }}
                          >
                            <div className="vc-ranking-fila__izq">
                              <Monograma texto={c.nombre} tono={tonoDeTexto(c.nombre)} />
                              <div>
                                <strong>{nombrePropio(c.nombre)}</strong>
                                <small>{c.tipo === 'moral' ? 'Empresa' : 'Persona física'} · {plural(c.ventas, 'compra', 'compras')}</small>
                              </div>
                            </div>
                            <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(c.monto)}</strong>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <Vacio titulo="Sin clientes en este periodo" />}
                </Panel>
              </div>
            </div>
          )}
        </div>
      )}

      <DetalleVenta folio={abierta} alCerrar={cerrarDetalle} alCancelar={cancelar} />
    </div>
  );
}
