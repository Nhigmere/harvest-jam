// Compras: consola de abastecimiento con gráficas de gasto, proveedores, lotes y órdenes.
import { useEffect, useState } from 'react';
import {
  LuArrowUpRight, LuChartColumn, LuCompass, LuLayoutGrid, LuPackagePlus, LuPrinter, LuReceiptText,
  LuTable, LuTrash2, LuTruck,
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

function DetalleCompra({ folio, alCerrar, alEliminar }) {
  const { puede } = useSesion();
  const { datos, error, cargando } = useApi(folio ? `/compras/${folio}` : null);
  return (
    <Modal
      abierto={Boolean(folio)}
      alCerrar={alCerrar}
      titulo={`Compra #${folio ?? ''}`}
      descripcion={datos ? `${nombrePropio(datos.proveedor.nombre)}, ${fechaHora(datos.fecha)}` : undefined}
      ancho="grande"
      pie={datos && (
        <>
          {puede('ELIMINAR_COMPRAS') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(datos)}>Eliminar compra</Boton>
          )}
          <Boton variante="primario" onClick={alCerrar}>Listo</Boton>
        </>
      )}
    >
      <MensajeError error={error} />
      {cargando && <Cargando />}
      {datos && !cargando && (
        <>
          <dl className="datos-en-linea">
            <div><dt>Proveedor</dt><dd>{nombrePropio(datos.proveedor.nombre)} ({capitalizar(datos.proveedor.ciudad)})</dd></div>
            <div><dt>Lote</dt><dd>{datos.lote ?? 'Sin número'}</dd></div>
            <div><dt>Recibió</dt><dd>{nombrePropio(datos.empleado.nombre) || '—'}</dd></div>
          </dl>
          <div className="tabla-contenedor tabla-contenedor--compacta">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col" className="tabla__th">Producto</th>
                  <th scope="col" className="tabla__th tabla__th--der">Cantidad</th>
                  <th scope="col" className="tabla__th tabla__th--der">Costo unitario</th>
                  <th scope="col" className="tabla__th tabla__th--der">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {datos.renglones.map((r) => (
                  <tr key={r.codigo}>
                    <td className="tabla__td">{capitalizar(r.descripcion)}</td>
                    <td className="tabla__td tabla__td--der numeros">{cantidad(r.cantidad, r.unidadMedida)}</td>
                    <td className="tabla__td tabla__td--der numeros">{moneda(r.precioUnitario)}</td>
                    <td className="tabla__td tabla__td--der numeros">{moneda(r.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="tabla__td" colSpan={3}><strong>Total</strong></td>
                  <td className="tabla__td tabla__td--der numeros"><strong>{moneda(datos.total)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

function TarjetaCompra({ compra, alAbrir }) {
  const tono = tonoDeTexto(compra.proveedor || String(compra.folio));
  return (
    <button type="button" className="vc-ticket-card" onClick={() => alAbrir(compra.folio)}>
      <div className="vc-ticket-card__top">
        <div className="vc-ticket-card__ident">
          <Monograma texto={compra.proveedor || 'PR'} tono={tono} />
          <div>
            <span className="vc-ticket-card__folio numeros">
              Folio #{compra.folio}{compra.lote ? ` · Lote ${compra.lote}` : ''}
            </span>
            <strong className="vc-ticket-card__cliente">{nombrePropio(compra.proveedor)}</strong>
          </div>
        </div>
        <strong className="vc-ticket-card__monto numeros">{moneda(compra.total)}</strong>
      </div>
      <div className="vc-ticket-card__pie">
        <span>Recibió: <strong>{nombrePropio(compra.empleado) || '—'}</strong></span>
        <span className="numeros">{plural(compra.renglones, 'producto', 'productos')}</span>
      </div>
      <div className="vc-ticket-card__fecha">
        <span>{fechaHora(compra.fecha)}</span>
        <span className="vc-ticket-card__ver">Ver orden <LuArrowUpRight aria-hidden="true" /></span>
      </div>
    </button>
  );
}

export default function Compras() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { search } = useUbicacion();
  const navegar = useNavegar();

  const [periodo, setPeriodo] = useState('90');
  const [fechaExacta, setFechaExacta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tabActiva, setTabActiva] = useState('graficas');
  const [vistaLista, setVistaLista] = useState('tarjetas');
  const [metricaSerie, setMetricaSerie] = useState('gasto');

  const buscar = useRetardo(busqueda);
  const folioUrl = new URLSearchParams(search).get('folio');
  const [abierta, setAbierta] = useState(folioUrl ? Number(folioUrl) : null);

  useEffect(() => setPagina(1), [periodo, fechaExacta, buscar]);
  useEffect(() => {
    if (folioUrl) setAbierta(Number(folioUrl));
  }, [folioUrl]);

  const filtroFechas = fechaExacta ? { desde: fechaExacta, hasta: fechaExacta } : paramsPeriodo(periodo);
  const { datos, error, cargando, recargar } = useApi('/compras', { ...filtroFechas, buscar, pagina, limite: 12 });

  const cambiarPeriodo = (nuevo) => {
    setFechaExacta('');
    setPeriodo(nuevo);
  };

  const etiquetaLapso = fechaExacta ? `del ${fecha(fechaExacta)}` : `de ${textoPeriodo(periodo)}`;

  const cerrarDetalle = () => {
    setAbierta(null);
    if (folioUrl) navegar('/compras', { reemplazar: true });
  };

  const eliminar = async (compra) => {
    const ok = await confirmar({
      titulo: `¿Eliminar la compra #${compra.folio}?`,
      mensaje: `Se resta del inventario lo que entró con esta compra (${moneda(compra.total)}). Si parte ya se vendió, no se podrá eliminar.`,
      accion: 'Eliminar compra',
      cancelar: 'No, conservarla',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/compras/${compra.folio}`);
      avisar(`Compra #${compra.folio} eliminada`);
      cerrarDetalle();
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const resumen = datos?.resumen;
  const an = datos?.analitica;
  const formatoX = formatoPeriodo(an?.serie?.granularidad);
  const proveedorPrincipal = an?.porProveedor?.[0] ?? null;
  const productoMasSurtido = an?.topProductos?.[0] ?? null;

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Compras"
        descripcion={datos ? `Abastecimiento y lotes recibidos del ${fecha(datos.desde)} al ${fecha(datos.hasta)}.` : 'Mercancía recibida de proveedores y control de inversión.'}
        acciones={
          <>
            {puede('VER_DSS') && (
              <Link to="/decisiones" className="boton boton--secundario boton--normal">
                <LuCompass className="boton__icono" aria-hidden="true" /> Qué conviene pedir
              </Link>
            )}
            <Boton variante="secundario" icono={LuPrinter} onClick={() => window.print()}>
              Imprimir
            </Boton>
            {puede('CREAR_COMPRAS') && (
              <Link to="/compras/nueva" className="boton boton--primario boton--normal">
                <LuPackagePlus className="boton__icono" aria-hidden="true" /> Registrar compra
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
            if (f) setTabActiva('ordenes');
          }}
          rutaDias="/compras/dias"
          etiqueta="Consultar compras por fecha"
          placeholder="Buscar por fecha"
          singular="compra"
          plural="compras"
        />
        <Buscador
          valor={busqueda}
          alCambiar={(v) => {
            setBusqueda(v);
            if (v.trim()) setTabActiva('ordenes');
          }}
          etiqueta="Buscar compra"
          placeholder="Folio, lote, proveedor o empleado"
          className="filtros__buscador"
        />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoDashboard />}

      {datos && resumen && (
        <div className={`reportes ${cargando ? 'recargando' : ''}`}>
          {/* Franja KPI Premium de Compras */}
          <section className="vc-hero glass-card lujo-brillo" aria-label="Resumen de compras">
            <div className="vc-hero__card vc-hero__card--principal">
              <span className="vc-hero__etq">Inversión {etiquetaLapso}</span>
              <strong className="vc-hero__val vc-hero__val--grande numeros">
                <ContadorAnimado valor={resumen.gasto} formato={monedaRedonda} />
              </strong>
              <span className="vc-hero__sub numeros">
                {an?.compraMaxima > 0 ? `Orden más alta: ${moneda(an.compraMaxima)}` : 'Sin órdenes en este rango'}
              </span>
            </div>

            <div className="vc-hero__card">
              <span className="vc-hero__etq">Órdenes recibidas</span>
              <strong className="vc-hero__val numeros">
                <ContadorAnimado valor={resumen.compras} formato={numero} />
              </strong>
              <span className="vc-hero__sub">
                {productoMasSurtido ? `Más surtido: ${capitalizar(productoMasSurtido.descripcion)}` : 'Sin recepciones'}
              </span>
            </div>

            <div className="vc-hero__card">
              <span className="vc-hero__etq">Promedio por orden</span>
              <strong className="vc-hero__val numeros" style={{ color: 'var(--accent-bright)' }}>
                <ContadorAnimado valor={resumen.promedio} formato={moneda} />
              </strong>
              <span className="vc-hero__sub">Gasto medio por pedido</span>
            </div>

            <div className="vc-hero__card">
              <span className="vc-hero__etq">Proveedores activos</span>
              <strong className="vc-hero__val numeros">
                <ContadorAnimado valor={resumen.proveedores} formato={numero} />
              </strong>
              <span className="vc-hero__sub">
                {proveedorPrincipal ? `Principal: ${nombrePropio(proveedorPrincipal.nombre)}` : 'Sin proveedores'}
              </span>
            </div>
          </section>

          {/* Navegación por 3 pestañas limpias */}
          <nav className="vc-tabs" role="tablist" aria-label="Vistas de compras">
            {[
              { id: 'graficas', etiqueta: 'Gráficas de gasto', icono: LuChartColumn, conteo: `${an?.serie?.puntos?.length ?? 0} pts`, tono: 'oro' },
              { id: 'ordenes', etiqueta: 'Órdenes y lotes', icono: LuReceiptText, conteo: numero(datos.total), tono: 'neutro' },
              { id: 'proveedores', etiqueta: 'Proveedores y recepción', icono: LuTruck, conteo: `${an?.porProveedor?.length ?? 0}`, tono: 'neutro' },
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

          {/* PESTAÑA 1: GRÁFICAS DE GASTO Y ABASTECIMIENTO */}
          {tabActiva === 'graficas' && (
            <div key="compras-graficas" className="dss-vista-etapa">
              <PanelGrafica
                titulo={`${metricaSerie === 'gasto' ? 'Gasto en compras' : 'Órdenes recibidas'} ${ETIQUETA_SERIE[an?.serie?.granularidad ?? 'dia']}`}
                descripcion={`${plural(resumen.compras, 'orden', 'órdenes')} ${etiquetaLapso}`}
                acciones={
                  <div className="dss-kpi-toggle" role="group" aria-label="Métrica de gráfica">
                    <button
                      type="button"
                      className={`dss-kpi-toggle__btn ${metricaSerie === 'gasto' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                      onClick={() => setMetricaSerie('gasto')}
                    >
                      Gasto ($)
                    </button>
                    <button
                      type="button"
                      className={`dss-kpi-toggle__btn ${metricaSerie === 'compras' ? 'dss-kpi-toggle__btn--activo' : ''}`}
                      onClick={() => setMetricaSerie('compras')}
                    >
                      Órdenes
                    </button>
                  </div>
                }
                columnas={[
                  { clave: 'periodo', titulo: 'Periodo', render: (f) => formatoX(f.periodo) },
                  { clave: 'compras', titulo: 'Órdenes', alinear: 'der', render: (f) => numero(f.compras) },
                  { clave: 'gasto', titulo: 'Gasto', alinear: 'der', render: (f) => moneda(f.gasto) },
                ]}
                filas={an?.serie?.puntos ?? []}
              >
                {an?.serie?.puntos?.length ? (
                  metricaSerie === 'gasto' ? (
                    <GraficaArea
                      puntos={an.serie.puntos}
                      campoY="gasto"
                      formatoX={formatoX}
                      detalleTooltip={(p) => plural(p.compras, 'orden', 'órdenes')}
                      etiqueta="Gasto en compras"
                      alto={250}
                    />
                  ) : (
                    <GraficaColumnas
                      datos={an.serie.puntos}
                      campoX="periodo"
                      campoY="compras"
                      formatoX={formatoX}
                      formatoValor={(v) => plural(v, 'orden', 'órdenes')}
                      etiqueta="Órdenes de compra"
                    />
                  )
                ) : <Vacio titulo={`No hay compras ${etiquetaLapso}`} />}
              </PanelGrafica>

              <div className="reportes__rejilla reportes__rejilla--estirar">
                <Panel titulo="Inversión por proveedor" descripcion="Cuánto se ha invertido con cada proveedor en este periodo.">
                  {an?.porProveedor?.length ? (
                    <BarrasRanking
                      datos={an.porProveedor.map((p) => ({ ...p, nombre: nombrePropio(p.nombre) }))}
                      campoEtiqueta="nombre"
                      campoValor="gasto"
                      formatoValor={monedaRedonda}
                      detalle={(p) => plural(p.compras, 'orden', 'órdenes')}
                      etiqueta="Gasto por proveedor"
                    />
                  ) : <Vacio titulo="Sin compras en este periodo" />}
                </Panel>

                <Panel titulo="Productos más surtidos" descripcion="Frutas y verduras con mayor inversión recibida.">
                  {an?.topProductos?.length ? (
                    <BarrasRanking
                      datos={an.topProductos.map((p) => ({ ...p, nombre: capitalizar(p.descripcion) }))}
                      campoEtiqueta="nombre"
                      campoValor="gasto"
                      formatoValor={monedaRedonda}
                      detalle={(p) => cantidad(p.cantidad, p.unidadMedida)}
                      etiqueta="Productos más comprados"
                    />
                  ) : <Vacio titulo="Sin productos recibidos en este periodo" />}
                </Panel>
              </div>

              {datos.compras.length > 0 && (
                <Panel
                  titulo="Últimas órdenes recibidas"
                  descripcion="Haz clic en una orden para revisar sus productos, lote y costos."
                  acciones={
                    <Boton variante="secundario" talla="chico" onClick={() => setTabActiva('ordenes')}>
                      Ver todas ({numero(datos.total)})
                    </Boton>
                  }
                >
                  <div className="vc-tickets-grid dss-stagger">
                    {datos.compras.slice(0, 4).map((c) => (
                      <TarjetaCompra key={c.folio} compra={c} alAbrir={setAbierta} />
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          )}

          {/* PESTAÑA 2: ÓRDENES Y LOTES */}
          {tabActiva === 'ordenes' && (
            <div key="compras-ordenes" className="dss-vista-etapa">
              <Panel
                titulo="Historial de órdenes y lotes"
                descripcion="Haz clic en cualquier compra para revisar los productos recibidos y sus costos."
                acciones={
                  <div className="dss-kpi-toggle" role="group" aria-label="Cambiar vista de órdenes">
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
                {datos.compras.length ? (
                  vistaLista === 'tarjetas' ? (
                    <div className="vc-tickets-grid dss-stagger">
                      {datos.compras.map((c) => (
                        <TarjetaCompra key={c.folio} compra={c} alAbrir={setAbierta} />
                      ))}
                    </div>
                  ) : (
                    <Tabla
                      etiqueta="Compras"
                      clave="folio"
                      cargando={cargando}
                      filas={datos.compras}
                      alAbrir={(c) => setAbierta(c.folio)}
                      columnas={[
                        { clave: 'folio', titulo: 'Folio', render: (c) => <span className="numeros codigo-mono">#{c.folio}</span>, ancho: '96px' },
                        { clave: 'lote', titulo: 'Lote', render: (c) => <span className="numeros texto-2">{c.lote ?? '—'}</span> },
                        { clave: 'fecha', titulo: 'Fecha', render: (c) => fechaHora(c.fecha) },
                        { clave: 'proveedor', titulo: 'Proveedor', render: (c) => nombrePropio(c.proveedor) },
                        { clave: 'empleado', titulo: 'Recibió', render: (c) => nombrePropio(c.empleado) || '—' },
                        { clave: 'renglones', titulo: 'Productos', alinear: 'der', render: (c) => <span className="numeros">{c.renglones}</span> },
                        { clave: 'total', titulo: 'Total', alinear: 'der', render: (c) => <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(c.total)}</strong> },
                      ]}
                    />
                  )
                ) : (
                  <Vacio
                    titulo={
                      buscar
                        ? 'Ninguna compra coincide con la búsqueda'
                        : fechaExacta
                          ? `No hay compras el ${fecha(fechaExacta)}`
                          : `No hay compras en ${textoPeriodo(periodo)}`
                    }
                  >
                    {buscar
                      ? 'Prueba con el folio, el lote o el nombre del proveedor.'
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

          {/* PESTAÑA 3: PROVEEDORES Y RECEPCIÓN */}
          {tabActiva === 'proveedores' && (
            <div key="compras-proveedores" className="dss-vista-etapa">
              <div className="reportes__rejilla reportes__rejilla--estirar">
                <Panel titulo="Proveedores del periodo" descripcion="Haz clic en un proveedor para filtrar sus órdenes recibidas.">
                  {an?.porProveedor?.length ? (
                    <ul className="vc-ranking-lista dss-stagger">
                      {an.porProveedor.map((p) => (
                        <li key={p.nombre}>
                          <button
                            type="button"
                            className="vc-ranking-fila"
                            onClick={() => {
                              setBusqueda(p.nombre);
                              setTabActiva('ordenes');
                            }}
                          >
                            <div className="vc-ranking-fila__izq">
                              <Monograma texto={p.nombre} tono={tonoDeTexto(p.ciudad || p.nombre)} />
                              <div>
                                <strong>{nombrePropio(p.nombre)}</strong>
                                <small>{capitalizar(p.ciudad || 'Sin ciudad')} · {plural(p.compras, 'orden', 'órdenes')}</small>
                              </div>
                            </div>
                            <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>{moneda(p.gasto)}</strong>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <Vacio titulo="Sin proveedores con órdenes en este periodo" />}
                </Panel>

                <Panel titulo="Recepción por empleado" descripcion="Quién recibió y validó más pedidos en bodega.">
                  {an?.porEmpleado?.length ? (
                    <BarrasRanking
                      datos={an.porEmpleado.map((e) => ({ ...e, nombre: nombrePropio(e.nombre) }))}
                      campoEtiqueta="nombre"
                      campoValor="gasto"
                      formatoValor={monedaRedonda}
                      detalle={(e) => plural(e.compras, 'recepción', 'recepciones')}
                      etiqueta="Recepciones por empleado"
                    />
                  ) : <Vacio titulo="Sin recepciones registradas en este periodo" />}
                </Panel>
              </div>
            </div>
          )}
        </div>
      )}

      <DetalleCompra folio={abierta} alCerrar={cerrarDetalle} alEliminar={eliminar} />
    </div>
  );
}
