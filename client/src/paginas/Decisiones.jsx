// Módulo de Apoyo a Decisiones (DSS): Priorización de reabastecimiento y escenarios.
import { useMemo, useState } from 'react';
import {
  LuBookmarkCheck, LuCircleHelp, LuCompass, LuInfo,
  LuPackagePlus, LuPrinter, LuRefreshCw, LuShieldAlert, LuSlidersHorizontal, LuTriangleAlert,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoDashboard } from '../componentes/Efectos.jsx';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, Buscador, CabeceraPagina, Campo, Cifra, Insignia, MensajeError, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { abreviaturaUnidad, cantidad, fecha, fechaHora, moneda, monedaRedonda, numero, porcentaje } from '../formato.js';
import { useApi } from '../hooks.js';
import { Link } from '../router.jsx';

const PRIORIDAD_META = {
  critica: { etiqueta: 'Crítica', tono: 'critico' },
  alta: { etiqueta: 'Alta', tono: 'critico' },
  media: { etiqueta: 'Media', tono: 'aviso' },
  baja: { etiqueta: 'Baja', tono: 'ok' },
  sobreabastecido: { etiqueta: 'Sobreabastecido', tono: 'info' },
  insuficientes: { etiqueta: 'Sin datos', tono: 'neutro' },
};

function ModalPorQue({ item, parametros, fechaCorte, puedeComprar, alCerrar }) {
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
      {item && (
        <div className="dss-porque">
          <div className="dss-porque__resumen">
            <Insignia tono={PRIORIDAD_META[item.prioridad]?.tono ?? 'neutro'}>
              {item.etiquetaPrioridad}
            </Insignia>
            {item.puntaje !== null && (
              <span className="dss-porque__puntaje numeros">Puntaje: <strong>{item.puntaje}</strong> / 100</span>
            )}
            {item.entregaImputada && (
              <Insignia tono="aviso">Entrega imputada (I1)</Insignia>
            )}
            {item.limitadaPorVidaUtil && (
              <Insignia tono="info">Topada por vida útil ({item.vidaUtilDias} d)</Insignia>
            )}
          </div>

          <p className="dss-porque__texto">{item.explicacion}</p>

          <dl className="datos-en-linea">
            <div><dt>Existencia</dt><dd>{cantidad(item.existencia, item.unidadMedida)}</dd></div>
            <div><dt>Stock mínimo</dt><dd>{cantidad(item.stockMinimo, item.unidadMedida)}</dd></div>
            <div><dt>Demanda diaria</dt><dd>{item.demandaDiaria.toFixed(2)} {abreviaturaUnidad(item.unidadMedida)}/día</dd></div>
            <div><dt>Cobertura</dt><dd>{item.diasCobertura !== null ? `${item.diasCobertura.toFixed(1)} días` : 'Sin demanda'}</dd></div>
            <div><dt>Plazo entrega</dt><dd>{item.diasEntregaEfectivos} días</dd></div>
            <div><dt>Margen entrega</dt><dd>{item.margenEntrega !== null ? `${item.margenEntrega >= 0 ? '+' : ''}${item.margenEntrega.toFixed(1)} días` : '—'}</dd></div>
            <div><dt>Vida útil</dt><dd>{item.vidaUtilDias} días</dd></div>
            <div><dt>Margen ganancia</dt><dd>{porcentaje(item.margenPct, 1)}</dd></div>
          </dl>

          {item.desglose && parametros && (
            <div className="dss-desglose">
              <h3 className="subtitulo">Desglose de puntuación (versión {parametros.version})</h3>
              <ul className="dss-desglose__lista">
                {[
                  { nombre: 'Urgencia de cobertura', peso: parametros.pesos.urgencia, val: item.desglose.urgencia },
                  { nombre: 'Demanda relativa', peso: parametros.pesos.demanda, val: item.desglose.demanda },
                  { nombre: 'Margen de ganancia', peso: parametros.pesos.margen, val: item.desglose.margen },
                  { nombre: 'Brecha contra mínimo', peso: parametros.pesos.brecha, val: item.desglose.brecha },
                ].map((f) => (
                  <li key={f.nombre} className="dss-desglose__fila">
                    <span>{f.nombre} <span className="texto-3">({Math.round(f.peso * 100)} %)</span></span>
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

export default function Decisiones() {
  const { puede } = useSesion();
  const { avisar } = useDialogos();

  // Parámetros del escenario activo
  const [escenarioActivo, setEscenarioActivo] = useState('base');
  const [factorDemanda, setFactorDemanda] = useState(1.0);
  const [extraEntrega, setExtraEntrega] = useState(0);
  const [coberturaObjetivo, setCoberturaObjetivo] = useState(7);
  const [presupuesto, setPresupuesto] = useState('');

  // Filtros de tabla
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [guardando, setGuardando] = useState(false);

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
          {/* 5 KPIs principales */}
          <div className="cifras cifras--fila lujo-brillo">
            <Cifra
              principal
              etiqueta="Inversión sugerida"
              numeroAnimado={res.montoSugerido}
              formato={monedaRedonda}
              detalle={res.presupuesto !== null
                ? `Cubierto: ${monedaRedonda(res.montoCubierto)} (${res.fueraPresupuesto} fuera de presupuesto)`
                : 'Sin tope de presupuesto'}
            />
            <Cifra
              etiqueta="Urgentes (Crítica + Alta)"
              numeroAnimado={res.urgentes}
              formato={numero}
              detalle={`${res.critica} en emergencia · ${res.alta} alta`}
            />
            <Cifra
              etiqueta="Cobertura promedio"
              valor={res.coberturaPromedio !== null ? `${res.coberturaPromedio} días` : '—'}
              detalle={`Ventana ${ev.parametros.ventanaDias} días`}
            />
            <Cifra
              etiqueta="Sobreabastecidos (Merma)"
              numeroAnimado={res.sobreabastecido}
              formato={numero}
              detalle="Cobertura > vida útil"
            />
            <Cifra
              etiqueta="Datos insuficientes"
              numeroAnimado={res.insuficientes}
              formato={numero}
              detalle={`Menos de ${ev.parametros.minDiasVentas} días con venta`}
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
                  { valor: 'critica', etiqueta: 'Crítica', conteo: res.critica },
                  { valor: 'alta', etiqueta: 'Alta', conteo: res.alta },
                  { valor: 'media', etiqueta: 'Media', conteo: res.media },
                  { valor: 'baja', etiqueta: 'Baja', conteo: res.baja },
                  { valor: 'sobreabastecido', etiqueta: 'Merma', conteo: res.sobreabastecido },
                  { valor: 'insuficientes', etiqueta: 'Sin datos', conteo: res.insuficientes },
                ]}
              />
            </div>
          </div>

          {/* Tabla de recomendaciones explicables */}
          <Panel titulo="Priorización de compra por producto" descripcion={`Ordenado por prioridad y puntaje (${ev.parametros.version}). Haz clic en "¿Por qué?" para ver el desglose completo.`}>
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
                      <span>{r.descripcion}</span>
                      <span className="celda-doble__detalle">
                        #{r.codigo} · {r.proveedorPrincipal}
                        {r.entregaImputada ? ' · entrega imputada' : ''}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'prioridad', titulo: 'Prioridad',
                  render: (r) => (
                    <Insignia tono={PRIORIDAD_META[r.prioridad]?.tono ?? 'neutro'}>
                      {r.esEmergencia ? 'Emergencia' : PRIORIDAD_META[r.prioridad]?.etiqueta ?? r.prioridad}
                    </Insignia>
                  ),
                },
                {
                  clave: 'existencia', titulo: 'Stock / Mín.', ordenable: true, alinear: 'der',
                  render: (r) => (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <span className="numeros">{cantidad(r.existencia, r.unidadMedida)}</span>
                      <span className="celda-doble__detalle numeros">mín {r.stockMinimo}</span>
                    </span>
                  ),
                },
                {
                  clave: 'demandaDiaria', titulo: 'Demanda/día', ordenable: true, alinear: 'der',
                  render: (r) => <span className="numeros">{r.demandaDiaria.toFixed(2)} {abreviaturaUnidad(r.unidadMedida)}</span>,
                },
                {
                  clave: 'diasCobertura', titulo: 'Cobertura', ordenable: true, alinear: 'der',
                  render: (r) => (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <span className="numeros">{r.diasCobertura !== null ? `${r.diasCobertura.toFixed(1)} d` : 'Sin demanda'}</span>
                      <span className="celda-doble__detalle numeros">
                        {r.margenEntrega !== null ? `margen ${r.margenEntrega >= 0 ? '+' : ''}${r.margenEntrega.toFixed(1)} d` : `vida ${r.vidaUtilDias} d`}
                      </span>
                    </span>
                  ),
                },
                {
                  clave: 'puntaje', titulo: 'Puntaje', ordenable: true, alinear: 'der',
                  render: (r) => (r.puntaje !== null ? <strong className="numeros">{r.puntaje.toFixed(1)}</strong> : <span className="texto-3">—</span>),
                },
                {
                  clave: 'cantidadSugerida', titulo: 'Sugerido', ordenable: true, alinear: 'der',
                  render: (r) => (r.cantidadSugerida > 0 ? (
                    <span className="celda-doble" style={{ alignItems: 'flex-end' }}>
                      <strong className="numeros">{cantidad(r.cantidadSugerida, r.unidadMedida)}</strong>
                      <span className="celda-doble__detalle numeros">
                        {moneda(r.costoEstimado)}
                        {!r.enPresupuesto && <span style={{ color: 'var(--danger-text)', marginLeft: 6 }}>· Fuera de presup.</span>}
                      </span>
                    </span>
                  ) : <span className="texto-3">No comprar</span>),
                },
                {
                  clave: 'porque', titulo: 'Explicación', alinear: 'der',
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

            <Panel titulo="Fotos de decisión guardadas" descripcion="Historial reproducible de corridas DSS">
              {datos.corridasGuardadas.length ? (
                <ul className="lista-movimientos">
                  {datos.corridasGuardadas.map((c) => (
                    <li key={c.id}>
                      <div className="lista-movimientos__fila">
                        <span>
                          <span className="lista-movimientos__titulo">#{c.id} · {c.escenario} ({c.versionParametros})</span>
                          <span className="lista-movimientos__detalle">
                            {fechaHora(c.fechaHora)} · {c.ejecutadoPor} · {c.totalCritica + c.totalAlta} urgentes
                          </span>
                        </span>
                        <span className="lista-movimientos__monto numeros">{monedaRedonda(c.montoSugerido)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vacio titulo="Aún no hay fotos guardadas">
                  Pulsa «Guardar foto DSS» arriba para registrar el escenario actual con sus resultados.
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
    </div>
  );
}
