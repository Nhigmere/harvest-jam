// Inicio: tablero ejecutivo personalizado según el rol del usuario.
import { LuArrowUpRight, LuPackagePlus, LuShoppingBasket, LuUserPlus } from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { ContadorAnimado, EsqueletoDashboard } from '../componentes/Efectos.jsx';
import { BarrasRanking, GraficaArea, PanelGrafica } from '../componentes/graficas.jsx';
import { Cifra, Insignia, MensajeError, Panel, Vacio } from '../componentes/ui.jsx';
import {
  capitalizar, cantidad, fechaCorta, fechaHora, hoyLargo, moneda, monedaRedonda, nombrePropio, numero, plural, saludo,
} from '../formato.js';
import { useApi } from '../hooks.js';
import { Link } from '../router.jsx';

const OPERACIONES = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' };

function AccionesPrincipales({ puede }) {
  return (
    <div className="inicio__acciones">
      {puede('CREAR_COMPRAS') && puede('CREAR_VENTAS') && (
        <Link to="/compras/nueva" className="boton boton--secundario boton--grande">
          <LuPackagePlus className="boton__icono" aria-hidden="true" />
          Registrar compra
        </Link>
      )}
      {puede('CREAR_VENTAS') ? (
        <Link to="/vender" className="boton boton--primario boton--grande">
          <LuShoppingBasket className="boton__icono" aria-hidden="true" />
          Abrir caja
        </Link>
      ) : puede('CREAR_COMPRAS') ? (
        <Link to="/compras/nueva" className="boton boton--primario boton--grande">
          <LuPackagePlus className="boton__icono" aria-hidden="true" />
          Registrar compra
        </Link>
      ) : puede('EDITAR_CLIENTES') ? (
        <Link to="/clientes?nuevo=1" className="boton boton--primario boton--grande">
          <LuUserPlus className="boton__icono" aria-hidden="true" />
          Nuevo cliente
        </Link>
      ) : null}
    </div>
  );
}

function StockBajo({ productos, umbral, puedeComprar }) {
  if (!productos.length) {
    return (
      <Vacio titulo="Todo el inventario está por encima del mínimo">
        Ningún producto tiene {numero(umbral)} o menos en existencia.
      </Vacio>
    );
  }
  return (
    <ul className="lista-stock">
      {productos.slice(0, 7).map((p) => (
        <li key={p.codigo} className="lista-stock__fila">
          <span className="lista-stock__nombre">{capitalizar(p.descripcion)}</span>
          {p.existencia === 0
            ? <Insignia tono="critico">Agotado</Insignia>
            : <Insignia tono="aviso">Quedan {cantidad(p.existencia, p.unidadMedida)}</Insignia>}
        </li>
      ))}
      {puedeComprar && (
        <li className="lista-stock__pie">
          <Link to="/compras/nueva">Registrar reposición de inventario</Link>
        </li>
      )}
    </ul>
  );
}

export default function Inicio() {
  const { usuario, puede } = useSesion();
  const { datos, error, cargando, recargar } = useApi('/dashboard', { dias: 30 });
  const nombre = nombrePropio((usuario.empleado?.nombre ?? usuario.usuario).split(' ')[0]);

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
        <AccionesPrincipales puede={puede} />
      </header>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoDashboard />}

      {datos && (
        <div className={`inicio__contenido ${cargando ? 'recargando' : ''}`}>
          {datos.ventasHoy && (
            <section className="hoy glass-card lujo-brillo" aria-label="Ventas de hoy">
              <div className="hoy__principal">
                <p className="hoy__etiqueta">Vendido hoy</p>
                <p className="hoy__monto">
                  <ContadorAnimado valor={datos.ventasHoy.ingresos} formato={moneda} />
                </p>
                <p className="hoy__detalle">
                  {plural(datos.ventasHoy.ventas, 'venta registrada', 'ventas registradas')}
                  {datos.ventasHoy.ventas > 0 && <> · ticket promedio {moneda(datos.ventasHoy.ticketPromedio)}</>}
                </p>
              </div>

              {(datos.ventas || datos.stockBajo) && (
                <div className="hoy__secundarios">
                  {datos.ventas && (
                    <div>
                      <p className="hoy__stat-etiqueta">Últimos 30 días</p>
                      <p className="hoy__stat-valor">
                        <ContadorAnimado valor={datos.ventas.ingresos} formato={monedaRedonda} />
                      </p>
                    </div>
                  )}
                  {datos.ventas && (
                    <div>
                      <p className="hoy__stat-etiqueta">Margen estimado</p>
                      <p className="hoy__stat-valor">
                        <ContadorAnimado valor={datos.ventas.margenEstimado} formato={monedaRedonda} />
                      </p>
                    </div>
                  )}
                  {datos.stockBajo && (
                    <div>
                      <p className="hoy__stat-etiqueta">Alertas de stock</p>
                      <p className="hoy__stat-valor">{numero(datos.stockBajo.length)}</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {!datos.ventasHoy && datos.inventario && (
            <section className="hoy glass-card lujo-brillo" aria-label="Inventario">
              <div className="hoy__principal">
                <p className="hoy__etiqueta">Valor del inventario a costo</p>
                <p className="hoy__monto">
                  <ContadorAnimado valor={datos.inventario.valorCosto} formato={moneda} />
                </p>
                <p className="hoy__detalle">
                  {plural(datos.inventario.productos, 'producto', 'productos')}, {datos.inventario.bajos} por acabarse y {datos.inventario.agotados} {datos.inventario.agotados === 1 ? 'agotado' : 'agotados'}
                </p>
              </div>
            </section>
          )}

          {datos.clientesPorTipo && (
            <section className="hoy glass-card lujo-brillo" aria-label="Clientes">
              <div className="hoy__principal">
                <p className="hoy__etiqueta">Clientes registrados</p>
                <p className="hoy__monto">
                  <ContadorAnimado valor={datos.clientesPorTipo.total} formato={numero} />
                </p>
                <p className="hoy__detalle">{numero(datos.clientesPorTipo.fisica)} personas físicas y {numero(datos.clientesPorTipo.moral)} morales</p>
              </div>
            </section>
          )}

          {datos.ventas && datos.serie && (
            <PanelGrafica
              className="inicio__ingresos"
              titulo="Ingresos de los últimos 30 días"
              descripcion={`Del ${fechaCorta(datos.desde)} al ${fechaCorta(datos.hasta)}`}
              columnas={[
                { clave: 'periodo', titulo: 'Día', render: (f) => fechaCorta(f.periodo) },
                { clave: 'ventas', titulo: 'Ventas', alinear: 'der', render: (f) => numero(f.ventas) },
                { clave: 'ingresos', titulo: 'Ingresos', alinear: 'der', render: (f) => moneda(f.ingresos) },
              ]}
              filas={datos.serie.puntos}
            >
              <div className="cifras">
                <Cifra
                  principal
                  etiqueta="Ingresos"
                  numeroAnimado={datos.ventas.ingresos}
                  formato={monedaRedonda}
                  variacion={datos.ventas.variacionIngresos}
                  detalle="contra los 30 días anteriores"
                />
                <Cifra etiqueta="Ventas" numeroAnimado={datos.ventas.ventas} formato={numero} />
                <Cifra etiqueta="Ticket promedio" numeroAnimado={datos.ventas.ticketPromedio} formato={moneda} />
                <Cifra etiqueta="Margen estimado" numeroAnimado={datos.ventas.margenEstimado} formato={monedaRedonda} detalle="con el costo actual" />
              </div>
              <GraficaArea
                puntos={datos.serie.puntos}
                formatoX={fechaCorta}
                detalleTooltip={(p) => plural(p.ventas, 'venta', 'ventas')}
                etiqueta="Ingresos por día de los últimos 30 días"
              />
            </PanelGrafica>
          )}

          <div className="inicio__rejilla">
            {datos.masVendidos && (
              <Panel titulo="Lo más vendido" descripcion="Importe de los últimos 30 días">
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
              <Panel
                titulo="Se está acabando"
                descripcion={`Productos con ${numero(datos.umbralStockBajo)} o menos en existencia`}
                acciones={datos.stockBajo.length > 0 && <Insignia tono="aviso">{datos.stockBajo.length}</Insignia>}
              >
                <StockBajo productos={datos.stockBajo} umbral={datos.umbralStockBajo} puedeComprar={puede('CREAR_COMPRAS')} />
              </Panel>
            )}

            {datos.ultimasVentas && (
              <Panel titulo="Últimas ventas" acciones={<Link to="/ventas">Ver todas <LuArrowUpRight aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /></Link>}>
                <ul className="lista-movimientos">
                  {datos.ultimasVentas.map((v) => (
                    <li key={v.folio}>
                      <Link to={`/ventas?folio=${v.folio}`} className="lista-movimientos__fila">
                        <span>
                          <span className="lista-movimientos__titulo">Folio <span className="codigo-mono">#{v.folio}</span></span>
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
              <Panel titulo="Compras de los últimos 30 días" acciones={<Link to="/compras">Ver todas <LuArrowUpRight aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /></Link>}>
                <div className="cifras cifras--compactas">
                  <Cifra etiqueta="Gasto" numeroAnimado={datos.compras.gasto} formato={monedaRedonda} />
                  <Cifra etiqueta="Compras" numeroAnimado={datos.compras.compras} formato={numero} />
                  <Cifra etiqueta="Proveedores" numeroAnimado={datos.compras.proveedores} formato={numero} />
                </div>
                <ul className="lista-movimientos">
                  {datos.ultimasCompras.map((c) => (
                    <li key={c.folio}>
                      <Link to={`/compras?folio=${c.folio}`} className="lista-movimientos__fila">
                        <span>
                          <span className="lista-movimientos__titulo">{nombrePropio(c.proveedor)}</span>
                          <span className="lista-movimientos__detalle">Folio #{c.folio} · {fechaHora(c.fecha)}</span>
                        </span>
                        <span className="lista-movimientos__monto numeros">{moneda(c.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {datos.clientesRecientes && (
              <Panel titulo="Clientes registrados recientemente" acciones={<Link to="/clientes">Ver todos</Link>}>
                <ul className="lista-movimientos">
                  {datos.clientesRecientes.map((c) => (
                    <li key={c.id}>
                      <div className="lista-movimientos__fila">
                        <span>
                          <span className="lista-movimientos__titulo">{nombrePropio(c.nombre)}</span>
                          <span className="lista-movimientos__detalle">{c.tipo === 'fisica' ? 'Persona física' : 'Persona moral'} · RFC {c.rfc}</span>
                        </span>
                        <span className="numeros texto-2">{c.telefono ?? 'Sin teléfono'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {datos.actividad && (
              <Panel titulo="Actividad reciente" acciones={<Link to="/auditoria">Ver bitácora <LuArrowUpRight aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /></Link>}>
                <ul className="lista-actividad">
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
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
