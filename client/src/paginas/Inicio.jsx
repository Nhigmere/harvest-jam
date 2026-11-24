// Inicio: centro de mando ejecutivo con identidad de frutería Obsidian & Champagne Gold.
import { useMemo, useState } from 'react';
import {
  LuActivity, LuArrowUpRight, LuChartColumn, LuCompass, LuPackage, LuPackagePlus, LuReceipt,
  LuShoppingBasket, LuSparkles, LuTriangleAlert, LuTruck, LuUserPlus,
} from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { ContadorAnimado, EsqueletoDashboard } from '../componentes/Efectos.jsx';
import { BarrasRanking, GraficaArea, PanelGrafica } from '../componentes/graficas.jsx';
import { Insignia, MensajeError, Panel, Vacio } from '../componentes/ui.jsx';
import {
  capitalizar, cantidad, fechaCorta, fechaHora, hoyLargo, moneda, monedaRedonda, nombrePropio, numero, plural, saludo,
} from '../formato.js';
import { useApi } from '../hooks.js';
import { Link } from '../router.jsx';

const OPERACIONES = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' };

// --- Ilustraciones botánicas minimalistas animadas (estética Obsidian & Champagne Gold) ---
function IlustracionZanahoria({ partida = false, grande = false }) {
  return (
    <svg
      className={`frut-svg frut-zanahoria ${partida ? 'frut-zanahoria--partida' : ''} ${grande ? 'frut-svg--grande' : ''}`}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
    >
      {/* Mitad superior + hojas verdes */}
      <g className="frut-zanahoria__sup">
        <path d="M27 11C29 6 33 5 35 6" stroke="#52b788" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M28 12C32 10 36 11 37 14" stroke="#74c69d" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M25 10C25 6 27 4 29 3" stroke="#40916c" strokeWidth="1.7" strokeLinecap="round" />
        <path
          d="M23.5 11.5L32.5 20.5L26 27L17 18L23.5 11.5Z"
          fill="rgba(224, 138, 75, 0.24)"
          stroke="#e08a4b"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M22.5 16L26 19.5" stroke="#d4af6a" strokeWidth="1.3" strokeLinecap="round" />
      </g>
      {/* Línea sutil de corte dorado al abrirse */}
      <line className="frut-zanahoria__corte" x1="15" y1="19" x2="25" y2="29" stroke="#f0d599" strokeWidth="1.2" strokeDasharray="2.5 2.5" strokeLinecap="round" />
      {/* Mitad inferior (punta) */}
      <g className="frut-zanahoria__inf">
        <path
          d="M15.5 19.5L24.5 28.5L11.2 35.6C9.7 36.4 8.2 34.9 9 33.4L15.5 19.5Z"
          fill="rgba(212, 175, 106, 0.2)"
          stroke="#e08a4b"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M15 25.5L18.5 29" stroke="#d4af6a" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function IlustracionCitrico({ activo = false }) {
  return (
    <svg className={`frut-svg frut-citrico ${activo ? 'frut-citrico--activo' : ''}`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="rgba(212, 175, 106, 0.14)" stroke="#d4af6a" strokeWidth="1.7" />
      <circle cx="20" cy="20" r="10.2" stroke="#e8c980" strokeWidth="1.1" strokeDasharray="2 2" />
      <path d="M20 9.5V30.5M9.5 20H30.5M12.6 12.6L27.4 27.4M27.4 12.6L12.6 27.4" stroke="#d4af6a" strokeWidth="1.15" strokeLinecap="round" opacity="0.85" />
      <circle cx="20" cy="20" r="2.2" fill="#f0d599" />
    </svg>
  );
}

function IlustracionManzana({ activo = false }) {
  return (
    <svg className={`frut-svg frut-manzana ${activo ? 'frut-manzana--activo' : ''}`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path className="frut-manzana__hoja" d="M21 11C23 6.5 27.5 6 29 8.5C27 11.2 23.8 11.8 21 11Z" fill="rgba(82, 183, 136, 0.35)" stroke="#52b788" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 12.5V8.5" stroke="#d4af6a" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M20 13.5C15.5 11.5 10.2 14.5 10.5 21C10.8 27.5 15.2 33 18.6 32.5C19.4 32.4 19.8 31.8 20 31.8C20.2 31.8 20.6 32.4 21.4 32.5C24.8 33 29.2 27.5 29.5 21C29.8 14.5 24.5 11.5 20 13.5Z"
        fill="rgba(226, 98, 98, 0.18)"
        stroke="#e27d60"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14.5 18.5C14.2 20.8 14.8 23.2 16 25" stroke="#f0d599" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

function IlustracionCosecha({ activo = false }) {
  return (
    <svg className={`frut-svg frut-cosecha ${activo ? 'frut-cosecha--activo' : ''}`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path className="frut-cosecha__brote" d="M20 20C20 14 24.5 10.5 29.5 11C29 16 25.5 20 20 20Z" fill="rgba(82, 183, 136, 0.32)" stroke="#52b788" strokeWidth="1.6" strokeLinejoin="round" />
      <path className="frut-cosecha__brote-izq" d="M20 22C20 17 16 13.5 11 14C11.5 18.8 15 22 20 22Z" fill="rgba(212, 175, 106, 0.22)" stroke="#d4af6a" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 20V31" stroke="#d4af6a" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 31H28" stroke="rgba(235, 222, 196, 0.35)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function OrnamentoBotanicoHero() {
  return (
    <svg className="inicio-hero__ornamento" viewBox="0 0 260 150" fill="none" aria-hidden="true">
      <g className="inicio-hero__flotar-1">
        <circle cx="195" cy="54" r="34" stroke="rgba(212, 175, 106, 0.24)" strokeWidth="1.4" />
        <circle cx="195" cy="54" r="24" stroke="rgba(212, 175, 106, 0.16)" strokeWidth="1.1" strokeDasharray="3 4" />
        <path d="M195 24V84M165 54H225M174 33L216 75M216 33L174 75" stroke="rgba(212, 175, 106, 0.14)" strokeWidth="1" />
      </g>
      <g className="inicio-hero__flotar-2">
        <path d="M112 118C118 92 138 78 164 80C156 106 136 120 112 118Z" fill="rgba(82, 183, 136, 0.08)" stroke="rgba(82, 183, 136, 0.28)" strokeWidth="1.3" />
        <path d="M112 118C128 106 144 94 160 82" stroke="rgba(212, 175, 106, 0.2)" strokeWidth="1" />
      </g>
      <g className="inicio-hero__flotar-3">
        <path d="M225 112L242 95L228 134C226.8 137 222.8 135 223.8 131.5L225 112Z" fill="rgba(224, 138, 75, 0.1)" stroke="rgba(224, 138, 75, 0.28)" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

function AccionesRapidas({ puede }) {
  const accesos = [
    puede('CREAR_VENTAS') && { to: '/vender', etiqueta: 'Abrir caja', sub: 'Cobrar en mostrador', icono: LuShoppingBasket, primario: true },
    puede('CREAR_COMPRAS') && { to: '/compras/nueva', etiqueta: 'Nueva compra', sub: 'Surtir mercancía', icono: LuPackagePlus },
    puede('VER_DSS') && { to: '/decisiones', etiqueta: 'Decisiones', sub: 'Qué pedir y merma', icono: LuCompass },
    puede('VER_PRODUCTOS') && { to: '/productos', etiqueta: 'Productos', sub: 'Precios e inventario', icono: LuPackage },
    puede('VER_REPORTES') && { to: '/reportes', etiqueta: 'Reportes', sub: 'Tendencias y ventas', icono: LuChartColumn },
    !puede('CREAR_VENTAS') && !puede('CREAR_COMPRAS') && puede('EDITAR_CLIENTES') && {
      to: '/clientes?nuevo=1', etiqueta: 'Nuevo cliente', sub: 'Registrar cuenta', icono: LuUserPlus, primario: true,
    },
  ].filter(Boolean).slice(0, 5);

  if (!accesos.length) return null;

  return (
    <div className="inicio-dock dss-stagger" role="navigation" aria-label="Accesos rápidos">
      {accesos.map((a) => {
        const Icono = a.icono;
        return (
          <Link key={a.to} to={a.to} className={`inicio-dock__btn ${a.primario ? 'inicio-dock__btn--primario' : ''}`}>
            <span className="inicio-dock__icono" aria-hidden="true"><Icono /></span>
            <span className="inicio-dock__texto">
              <strong>{a.etiqueta}</strong>
              <small>{a.sub}</small>
            </span>
            <LuArrowUpRight className="inicio-dock__flecha" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}

function PanelFaltantes({ productos, umbral, puedeComprar, puedeDecisiones, mermaCount }) {
  const [filtroStock, setFiltroStock] = useState('todos');
  const agotados = productos.filter((p) => p.existencia <= 0);
  const bajos = productos.filter((p) => p.existencia > 0);

  const lista = filtroStock === 'agotados'
    ? agotados
    : filtroStock === 'bajos'
      ? bajos
      : [...agotados, ...bajos];

  return (
    <Panel
      titulo="Lo que ya no hay y lo que se acaba"
      descripcion={`Productos agotados hoy o con ${numero(umbral)} o menos en existencia.`}
      acciones={
        <div className="inicio-stock-acciones">
          {agotados.length > 0 && <Insignia tono="critico">{agotados.length} sin stock</Insignia>}
          {puedeDecisiones && mermaCount > 0 && (
            <Link to="/decisiones" className="inicio-chip-merma">
              <LuSparkles aria-hidden="true" /> {mermaCount} por liquidar (merma)
            </Link>
          )}
        </div>
      }
    >
      {productos.length > 0 && (
        <div className="inicio-stock-tabs" role="tablist" aria-label="Filtrar faltantes">
          {[
            { id: 'todos', etiqueta: `Todos (${productos.length})` },
            { id: 'agotados', etiqueta: `Ya no hay (${agotados.length})` },
            { id: 'bajos', etiqueta: `Por acabarse (${bajos.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filtroStock === t.id}
              className={`dss-kpi-toggle__btn ${filtroStock === t.id ? 'dss-kpi-toggle__btn--activo' : ''}`}
              onClick={() => setFiltroStock(t.id)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      )}

      {lista.length ? (
        <ul className="inicio-faltantes dss-stagger">
          {lista.slice(0, 10).map((p) => {
            const agotado = p.existencia <= 0;
            return (
              <li key={p.codigo} className={`inicio-faltante ${agotado ? 'inicio-faltante--agotado' : ''}`}>
                <div className="inicio-faltante__izq">
                  <span className={`inicio-faltante__punto ${agotado ? 'inicio-faltante__punto--critico' : ''}`} aria-hidden="true" />
                  <div>
                    <span className="inicio-faltante__nombre">{capitalizar(p.descripcion)}</span>
                    <span className="inicio-faltante__meta">
                      #{p.codigo} · Costo {moneda(p.precioCompra)}
                    </span>
                  </div>
                </div>
                <div className="inicio-faltante__der">
                  {agotado
                    ? <Insignia tono="critico">Agotado</Insignia>
                    : <Insignia tono="aviso">Quedan {cantidad(p.existencia, p.unidadMedida)}</Insignia>}
                  {puedeComprar && (
                    <Link to="/compras/nueva" className="dss-foto-accion dss-foto-accion--oro">
                      Surtir
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vacio titulo={productos.length ? 'No hay productos en este filtro' : 'Todo tu inventario está bien surtido hoy'}>
          {productos.length ? 'Prueba cambiando a la otra pestaña.' : `Ningún producto tiene ${numero(umbral)} o menos en existencia.`}
        </Vacio>
      )}
    </Panel>
  );
}

export default function Inicio() {
  const { usuario, puede } = useSesion();
  const [diasGrafica, setDiasGrafica] = useState(30);
  const [tabActiva, setTabActiva] = useState('pulso');

  const { datos, error, cargando, recargar } = useApi('/dashboard', { dias: diasGrafica });
  const dssApi = useApi('/dss/analisis', null, { activo: puede('VER_DSS') });

  const nombre = nombrePropio((usuario.empleado?.nombre ?? usuario.usuario).split(' ')[0]);
  const agotadosHoy = useMemo(
    () => (datos?.stockBajo ?? []).filter((p) => p.existencia <= 0),
    [datos],
  );
  const dssResumen = dssApi.datos?.evaluacion?.resumen;

  const tabsDisponibles = useMemo(() => {
    if (!datos) return [];
    const lista = [];
    if (datos.ventas || datos.masVendidos || datos.clientesRecientes) {
      lista.push({
        id: 'pulso',
        etiqueta: 'Pulso de ventas',
        conteo: datos.ventas ? `${numero(datos.ventas.ventas)}` : `${datos.clientesRecientes?.length ?? 0}`,
        arte: (activa) => <IlustracionCitrico activo={activa} />,
      });
    }
    if (datos.stockBajo) {
      lista.push({
        id: 'faltantes',
        etiqueta: 'Sin stock y alertas',
        conteo: agotadosHoy.length > 0 ? `${agotadosHoy.length} agot.` : `${datos.stockBajo.length}`,
        tono: agotadosHoy.length > 0 ? 'critico' : datos.stockBajo.length > 0 ? 'aviso' : 'neutro',
        arte: (activa) => <IlustracionManzana activo={activa} />,
      });
    }
    if (datos.ultimasVentas || datos.compras) {
      lista.push({
        id: 'movimientos',
        etiqueta: 'Movimientos',
        conteo: `${(datos.ultimasVentas?.length ?? 0) + (datos.ultimasCompras?.length ?? 0)}`,
        arte: (activa) => <IlustracionCosecha activo={activa} />,
      });
    }
    if (datos.actividad) {
      lista.push({
        id: 'actividad',
        etiqueta: 'Actividad',
        conteo: `${datos.actividad.length}`,
        arte: (activa) => <IlustracionZanahoria partida={activa} />,
      });
    }
    return lista;
  }, [datos, agotadosHoy.length]);

  const tabEfectiva = tabsDisponibles.some((t) => t.id === tabActiva)
    ? tabActiva
    : (tabsDisponibles[0]?.id ?? 'pulso');

  return (
    <div className="pagina inicio">
      <header className="inicio__cabecera">
        <div>
          <h1>{saludo()}, {nombre}</h1>
          <div className="inicio__meta">
            <span>{hoyLargo()}</span>
            <span className="inicio__pulso">
              <span className="inicio__pulso-punto" aria-hidden="true" />
              {usuario.rolNombre}
            </span>
          </div>
        </div>
        <div className="inicio__acciones">
          {puede('VER_DSS') && dssResumen && (dssResumen.urgentes > 0 || dssResumen.sobreabastecido > 0) && (
            <Link to="/decisiones" className="inicio-alerta-dss">
              <LuCompass aria-hidden="true" />
              <span>
                {dssResumen.urgentes > 0
                  ? `${dssResumen.urgentes} por pedir hoy`
                  : `${dssResumen.sobreabastecido} en riesgo de merma`}
              </span>
              <LuArrowUpRight aria-hidden="true" />
            </Link>
          )}
        </div>
      </header>

      {/* Accesos rápidos interactivos */}
      <AccionesRapidas puede={puede} />

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoDashboard />}

      {datos && (
        <div className={`inicio__contenido ${cargando ? 'recargando' : ''}`}>
          {/* Banda Hero principal con ambientación botánica sutil */}
          {datos.ventasHoy && (
            <section className="hoy inicio-hero glass-card lujo-brillo" aria-label="Resumen de hoy">
              <OrnamentoBotanicoHero />
              <div className="hoy__principal">
                <p className="hoy__etiqueta">Vendido hoy en mostrador</p>
                <p className="hoy__monto">
                  <ContadorAnimado valor={datos.ventasHoy.ingresos} formato={moneda} />
                </p>
                <p className="hoy__detalle">
                  {plural(datos.ventasHoy.ventas, 'ticket cobrado', 'tickets cobrados')}
                  {datos.ventasHoy.ventas > 0 && <> · ticket promedio {moneda(datos.ventasHoy.ticketPromedio)}</>}
                </p>
              </div>

              <div className="inicio-hero__stats">
                {datos.ventas && (
                  <button type="button" className="inicio-hero__stat" onClick={() => setTabActiva('pulso')}>
                    <span className="hoy__stat-etiqueta">Últimos {diasGrafica} días</span>
                    <strong className="hoy__stat-valor">
                      <ContadorAnimado valor={datos.ventas.ingresos} formato={monedaRedonda} />
                    </strong>
                    {datos.ventas.variacionIngresos !== null && datos.ventas.variacionIngresos !== undefined && (
                      <span className={`inicio-hero__var ${datos.ventas.variacionIngresos >= 0 ? 'inicio-hero__var--sube' : 'inicio-hero__var--baja'}`}>
                        {datos.ventas.variacionIngresos >= 0 ? '+' : '−'}{Math.abs(datos.ventas.variacionIngresos)} %
                      </span>
                    )}
                  </button>
                )}

                {datos.stockBajo && (
                  <button
                    type="button"
                    className={`inicio-hero__stat ${agotadosHoy.length > 0 ? 'inicio-hero__stat--critico' : ''}`}
                    onClick={() => setTabActiva('faltantes')}
                  >
                    <span className="hoy__stat-etiqueta">Ya no hay (agotados)</span>
                    <strong className="hoy__stat-valor">
                      <ContadorAnimado valor={agotadosHoy.length} formato={numero} />
                    </strong>
                    <span className="inicio-hero__sub">
                      {datos.stockBajo.length - agotadosHoy.length} por acabarse
                    </span>
                  </button>
                )}

                {datos.ventas && (
                  <button type="button" className="inicio-hero__stat" onClick={() => setTabActiva('pulso')}>
                    <span className="hoy__stat-etiqueta">Ganancia estimada</span>
                    <strong className="hoy__stat-valor">
                      <ContadorAnimado valor={datos.ventas.margenEstimado} formato={monedaRedonda} />
                    </strong>
                    <span className="inicio-hero__sub">en los últimos {diasGrafica} días</span>
                  </button>
                )}

                {datos.inventario && (
                  <button type="button" className="inicio-hero__stat" onClick={() => setTabActiva('faltantes')}>
                    <span className="hoy__stat-etiqueta">Valor en bodega</span>
                    <strong className="hoy__stat-valor">
                      <ContadorAnimado valor={datos.inventario.valorCosto} formato={monedaRedonda} />
                    </strong>
                    <span className="inicio-hero__sub">{plural(datos.inventario.productos, 'producto', 'productos')}</span>
                  </button>
                )}
              </div>
            </section>
          )}

          {!datos.ventasHoy && datos.inventario && (
            <section className="hoy inicio-hero glass-card lujo-brillo" aria-label="Inventario">
              <OrnamentoBotanicoHero />
              <div className="hoy__principal">
                <p className="hoy__etiqueta">Valor del inventario a costo</p>
                <p className="hoy__monto">
                  <ContadorAnimado valor={datos.inventario.valorCosto} formato={moneda} />
                </p>
                <p className="hoy__detalle">
                  {plural(datos.inventario.productos, 'producto', 'productos')} · {datos.inventario.agotados} agotados · {datos.inventario.bajos} por acabarse
                </p>
              </div>
            </section>
          )}

          {datos.clientesPorTipo && (
            <section className="hoy inicio-hero glass-card lujo-brillo" aria-label="Clientes">
              <OrnamentoBotanicoHero />
              <div className="hoy__principal">
                <p className="hoy__etiqueta">Clientes registrados</p>
                <p className="hoy__monto">
                  <ContadorAnimado valor={datos.clientesPorTipo.total} formato={numero} />
                </p>
                <p className="hoy__detalle">
                  {numero(datos.clientesPorTipo.fisica)} personas físicas y {numero(datos.clientesPorTipo.moral)} empresas
                </p>
              </div>
            </section>
          )}

          {/* Barra interactiva de pestañas con ilustraciones botánicas animadas (incluyendo zanahoria partida en Actividad) */}
          {tabsDisponibles.length > 1 && (
            <nav className="inicio-tabs" role="tablist" aria-label="Paneles de inicio">
              {tabsDisponibles.map((t) => {
                const activa = tabEfectiva === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activa}
                    className={`inicio-tab ${activa ? 'inicio-tab--activa' : ''}`}
                    onClick={() => setTabActiva(t.id)}
                  >
                    <span className="inicio-tab__arte">{t.arte(activa)}</span>
                    <span className="inicio-tab__texto">
                      <span className="inicio-tab__etq">{t.etiqueta}</span>
                    </span>
                    <span className={`dss-tab-btn__badge dss-tab-btn__badge--${t.tono ?? 'neutro'} numeros`}>
                      {t.conteo}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* VISTA 1: PULSO DE VENTAS + LO MÁS VENDIDO + FALTANTES CLAVE */}
          {tabEfectiva === 'pulso' && (
            <div key="inicio-pulso" className="dss-vista-etapa">
              {datos.ventas && datos.serie && (
                <PanelGrafica
                  className="inicio__ingresos"
                  titulo={`Ingresos de los últimos ${diasGrafica} días`}
                  descripcion={`Del ${fechaCorta(datos.desde)} al ${fechaCorta(datos.hasta)} · ${plural(datos.ventas.ventas, 'venta', 'ventas')}`}
                  acciones={
                    <div className="dss-kpi-toggle" role="group" aria-label="Rango de gráfica">
                      {[7, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`dss-kpi-toggle__btn ${diasGrafica === d ? 'dss-kpi-toggle__btn--activo' : ''}`}
                          onClick={() => setDiasGrafica(d)}
                        >
                          {d} días
                        </button>
                      ))}
                    </div>
                  }
                  columnas={[
                    { clave: 'periodo', titulo: 'Día', render: (f) => fechaCorta(f.periodo) },
                    { clave: 'ventas', titulo: 'Ventas', alinear: 'der', render: (f) => numero(f.ventas) },
                    { clave: 'ingresos', titulo: 'Ingresos', alinear: 'der', render: (f) => moneda(f.ingresos) },
                  ]}
                  filas={datos.serie.puntos}
                >
                  <GraficaArea
                    puntos={datos.serie.puntos}
                    formatoX={fechaCorta}
                    detalleTooltip={(p) => plural(p.ventas, 'venta', 'ventas')}
                    etiqueta={`Ingresos por día de los últimos ${diasGrafica} días`}
                    alto={235}
                  />
                </PanelGrafica>
              )}

              <div className="inicio__rejilla reportes__rejilla--estirar">
                {datos.masVendidos && (
                  <Panel
                    titulo="Lo más vendido"
                    descripcion={`Top productos en los últimos ${diasGrafica} días`}
                    acciones={puede('VER_REPORTES') && (
                      <Link to="/reportes">Ver reporte <LuArrowUpRight aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /></Link>
                    )}
                  >
                    {datos.masVendidos.length ? (
                      <BarrasRanking
                        datos={datos.masVendidos.map((p) => ({ ...p, nombre: capitalizar(p.descripcion) }))}
                        campoEtiqueta="nombre"
                        campoValor="importe"
                        formatoValor={monedaRedonda}
                        detalle={(p) => cantidad(p.cantidad, p.unidadMedida)}
                        etiqueta="Productos más vendidos"
                      />
                    ) : <Vacio titulo="Aún no hay ventas en este periodo" />}
                  </Panel>
                )}

                {datos.stockBajo && (
                  <PanelFaltantes
                    productos={datos.stockBajo}
                    umbral={datos.umbralStockBajo}
                    puedeComprar={puede('CREAR_COMPRAS')}
                    puedeDecisiones={puede('VER_DSS')}
                    mermaCount={dssResumen?.sobreabastecido ?? 0}
                  />
                )}

                {datos.clientesRecientes && (
                  <Panel titulo="Clientes registrados recientemente" acciones={<Link to="/clientes">Ver todos</Link>}>
                    <ul className="lista-movimientos">
                      {datos.clientesRecientes.map((c) => (
                        <li key={c.id}>
                          <div className="lista-movimientos__fila">
                            <span>
                              <span className="lista-movimientos__titulo">{nombrePropio(c.nombre)}</span>
                              <span className="lista-movimientos__detalle">{c.tipo === 'fisica' ? 'Persona física' : 'Empresa'} · RFC {c.rfc}</span>
                            </span>
                            <span className="numeros texto-2">{c.telefono ?? 'Sin teléfono'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: SIN STOCK Y ALERTAS */}
          {tabEfectiva === 'faltantes' && datos.stockBajo && (
            <div key="inicio-faltantes" className="dss-vista-etapa">
              <div className="inicio__rejilla reportes__rejilla--estirar">
                <PanelFaltantes
                  productos={datos.stockBajo}
                  umbral={datos.umbralStockBajo}
                  puedeComprar={puede('CREAR_COMPRAS')}
                  puedeDecisiones={puede('VER_DSS')}
                  mermaCount={dssResumen?.sobreabastecido ?? 0}
                />

                <Panel
                  titulo="Resumen de salud en bodega"
                  descripcion="Estado actual de tu mercancía para decidir surtido o remate."
                  acciones={puede('VER_DSS') && (
                    <Link to="/decisiones">Abrir Decisiones <LuArrowUpRight aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /></Link>
                  )}
                >
                  <div className="inicio-salud-grid dss-stagger">
                    <div className="rep-mini-card">
                      <span>Ya no hay hoy</span>
                      <strong className="numeros" style={{ color: agotadosHoy.length > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                        {numero(agotadosHoy.length)}
                      </strong>
                      <small>{agotadosHoy.length > 0 ? 'Productos en 0 existencia' : 'Todo con existencia'}</small>
                    </div>
                    <div className="rep-mini-card">
                      <span>Por acabarse</span>
                      <strong className="numeros" style={{ color: 'var(--accent-bright)' }}>
                        {numero(datos.stockBajo.length - agotadosHoy.length)}
                      </strong>
                      <small>Con {datos.umbralStockBajo} o menos hoy</small>
                    </div>
                    {dssResumen && (
                      <>
                        <div className="rep-mini-card">
                          <span>Urgentes en Decisiones</span>
                          <strong className="numeros" style={{ color: dssResumen.urgentes > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                            {numero(dssResumen.urgentes)}
                          </strong>
                          <small>Se acaban antes del surtido</small>
                        </div>
                        <div className="rep-mini-card">
                          <span>En riesgo de merma</span>
                          <strong className="numeros" style={{ color: dssResumen.sobreabastecido > 0 ? 'var(--accent-bright)' : 'var(--success-text)' }}>
                            {numero(dssResumen.sobreabastecido)}
                          </strong>
                          <small>
                            {dssResumen.capitalEnRiesgoMerma > 0
                              ? `${monedaRedonda(dssResumen.capitalEnRiesgoMerma)} en riesgo`
                              : 'Sin exceso perecedero'}
                          </small>
                        </div>
                      </>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* VISTA 3: MOVIMIENTOS (VENTAS Y COMPRAS) */}
          {tabEfectiva === 'movimientos' && (
            <div key="inicio-movimientos" className="dss-vista-etapa">
              <div className="inicio__rejilla reportes__rejilla--estirar">
                {datos.ultimasVentas && (
                  <Panel
                    titulo="Últimas ventas cobradas"
                    descripcion="Tickets más recientes en caja"
                    acciones={<Link to="/ventas">Ver todas <LuArrowUpRight aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /></Link>}
                  >
                    <ul className="lista-movimientos dss-stagger">
                      {datos.ultimasVentas.map((v) => (
                        <li key={v.folio}>
                          <Link to={`/ventas?folio=${v.folio}`} className="lista-movimientos__fila">
                            <span>
                              <span className="lista-movimientos__titulo">
                                <LuReceipt size={13} aria-hidden="true" style={{ marginRight: 6, color: 'var(--accent)' }} />
                                Folio <span className="codigo-mono">#{v.folio}</span>
                              </span>
                              <span className="lista-movimientos__detalle">{fechaHora(v.fecha)} · {nombrePropio(v.cliente)}</span>
                            </span>
                            <span className="lista-movimientos__monto numeros">{moneda(v.total)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}

                {datos.compras && (
                  <Panel
                    titulo={`Compras de los últimos ${diasGrafica} días`}
                    descripcion={`${plural(datos.compras.compras, 'orden registrada', 'órdenes registradas')} con ${plural(datos.compras.proveedores, 'proveedor', 'proveedores')} · total ${monedaRedonda(datos.compras.gasto)}`}
                    acciones={<Link to="/compras">Ver todas <LuArrowUpRight aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /></Link>}
                  >
                    <ul className="lista-movimientos dss-stagger">
                      {datos.ultimasCompras.map((c) => (
                        <li key={c.folio}>
                          <Link to={`/compras?folio=${c.folio}`} className="lista-movimientos__fila">
                            <span>
                              <span className="lista-movimientos__titulo">
                                <LuTruck size={13} aria-hidden="true" style={{ marginRight: 6, color: 'var(--accent)' }} />
                                {nombrePropio(c.proveedor)}
                              </span>
                              <span className="lista-movimientos__detalle">Folio #{c.folio} · {fechaHora(c.fecha)}</span>
                            </span>
                            <span className="lista-movimientos__monto numeros">{moneda(c.total)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {/* VISTA 4: ACTIVIDAD RECIENTE (CON ZANAHORIA PARTIDA ANIMADA) */}
          {tabEfectiva === 'actividad' && datos.actividad && (
            <div key="inicio-actividad" className="dss-vista-etapa">
              <Panel
                titulo="Actividad reciente en la frutería"
                descripcion="Últimos movimientos registrados por el equipo en caja, inventario y catálogos."
                acciones={
                  <div className="inicio-actividad-header-extra">
                    <IlustracionZanahoria partida grande />
                    <Link to="/auditoria" className="boton boton--secundario boton--chico">
                      <LuActivity className="boton__icono" aria-hidden="true" />
                      Ver bitácora completa
                    </Link>
                  </div>
                }
              >
                {datos.actividad.length ? (
                  <ul className="lista-actividad dss-stagger">
                    {datos.actividad.map((a) => (
                      <li key={a.id}>
                        <span className={`lista-actividad__op lista-actividad__op--${a.operacion.toLowerCase()}`}>{OPERACIONES[a.operacion]}</span>
                        <span className="lista-actividad__texto">
                          {capitalizar(a.descripcion)}
                          <span className="lista-actividad__meta">{nombrePropio(a.usuario)} · {fechaHora(a.fechaHora)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Vacio icono={LuTriangleAlert} titulo="Aún no hay actividad registrada" />
                )}
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
