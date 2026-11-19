// Inicio: lo que cada rol necesita ver al llegar.
import { LuPackagePlus, LuShoppingBasket, LuUserPlus } from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { BarrasRanking, GraficaArea, PanelGrafica } from '../componentes/graficas.jsx';
import { Cargando, Cifra, Insignia, MensajeError, Panel, Vacio } from '../componentes/ui.jsx';
import {
  capitalizar, cantidad, fechaCorta, fechaHora, hoyLargo, moneda, monedaRedonda, nombrePropio, numero, plural, saludo,
} from '../formato.js';
import { useApi } from '../hooks.js';
import { Link } from '../router.jsx';

const OPERACIONES = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' };

function AccionPrincipal({ puede }) {
  if (puede('CREAR_VENTAS')) {
    return <Link to="/vender" className="boton boton--primario boton--grande"><LuShoppingBasket className="boton__icono" aria-hidden="true" />Vender</Link>;
  }
  if (puede('CREAR_COMPRAS')) {
    return <Link to="/compras/nueva" className="boton boton--primario boton--grande"><LuPackagePlus className="boton__icono" aria-hidden="true" />Registrar compra</Link>;
  }
  if (puede('EDITAR_CLIENTES')) {
    return <Link to="/clientes?nuevo=1" className="boton boton--primario boton--grande"><LuUserPlus className="boton__icono" aria-hidden="true" />Nuevo cliente</Link>;
  }
  return null;
}

function StockBajo({ productos, umbral, puedeComprar }) {
  if (!productos.length) {
    return <Vacio titulo="Todo el inventario está por encima del mínimo">Ningún producto tiene {numero(umbral)} o menos en existencia.</Vacio>;
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
          <Link to="/compras/nueva">Registrar una compra</Link>
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
          <p className="texto-2">{hoyLargo()}</p>
        </div>
        <AccionPrincipal puede={puede} />
      </header>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <Cargando />}

      {datos && (
        <div className={`inicio__contenido ${cargando ? 'recargando' : ''}`}>
          {datos.ventasHoy && (
            <section className="hoy glass-card" aria-label="Ventas de hoy">
              <p className="hoy__etiqueta">Vendido hoy</p>
              <p className="hoy__monto">{moneda(datos.ventasHoy.ingresos)}</p>
              <p className="hoy__detalle">
                {plural(datos.ventasHoy.ventas, 'venta', 'ventas')}
                {datos.ventasHoy.ventas > 0 && <>, ticket promedio {moneda(datos.ventasHoy.ticketPromedio)}</>}
              </p>
            </section>
          )}

          {!datos.ventasHoy && datos.inventario && (
            <section className="hoy glass-card" aria-label="Inventario">
              <p className="hoy__etiqueta">Valor del inventario a costo</p>
              <p className="hoy__monto">{moneda(datos.inventario.valorCosto)}</p>
              <p className="hoy__detalle">
                {plural(datos.inventario.productos, 'producto', 'productos')}, {datos.inventario.bajos} por acabarse y {datos.inventario.agotados} {datos.inventario.agotados === 1 ? 'agotado' : 'agotados'}
              </p>
            </section>
          )}

          {datos.clientesPorTipo && (
            <section className="hoy glass-card" aria-label="Clientes">
              <p className="hoy__etiqueta">Clientes registrados</p>
              <p className="hoy__monto">{numero(datos.clientesPorTipo.total)}</p>
              <p className="hoy__detalle">{numero(datos.clientesPorTipo.fisica)} personas físicas y {numero(datos.clientesPorTipo.moral)} morales</p>
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
                <Cifra principal etiqueta="Ingresos" valor={monedaRedonda(datos.ventas.ingresos)} variacion={datos.ventas.variacionIngresos} detalle=" contra los 30 días anteriores" />
                <Cifra etiqueta="Ventas" valor={numero(datos.ventas.ventas)} />
                <Cifra etiqueta="Ticket promedio" valor={moneda(datos.ventas.ticketPromedio)} />
                <Cifra etiqueta="Margen estimado" valor={monedaRedonda(datos.ventas.margenEstimado)} detalle="con el costo actual" />
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
              <Panel titulo="Últimas ventas" acciones={<Link to="/ventas">Ver todas</Link>}>
                <ul className="lista-movimientos">
                  {datos.ultimasVentas.map((v) => (
                    <li key={v.folio}>
                      <Link to={`/ventas?folio=${v.folio}`} className="lista-movimientos__fila">
                        <span>
                          <span className="lista-movimientos__titulo">Folio {v.folio}</span>
                          <span className="lista-movimientos__detalle">{fechaHora(v.fecha)}, {nombrePropio(v.cliente)}</span>
                        </span>
                        <span className="lista-movimientos__monto numeros">{moneda(v.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {datos.compras && (
              <Panel titulo="Compras de los últimos 30 días" acciones={<Link to="/compras">Ver todas</Link>}>
                <div className="cifras cifras--compactas">
                  <Cifra etiqueta="Gasto" valor={monedaRedonda(datos.compras.gasto)} />
                  <Cifra etiqueta="Compras" valor={numero(datos.compras.compras)} />
                  <Cifra etiqueta="Proveedores" valor={numero(datos.compras.proveedores)} />
                </div>
                <ul className="lista-movimientos">
                  {datos.ultimasCompras.map((c) => (
                    <li key={c.folio}>
                      <Link to={`/compras?folio=${c.folio}`} className="lista-movimientos__fila">
                        <span>
                          <span className="lista-movimientos__titulo">{nombrePropio(c.proveedor)}</span>
                          <span className="lista-movimientos__detalle">Folio {c.folio}, {fechaHora(c.fecha)}</span>
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
                          <span className="lista-movimientos__detalle">{c.tipo === 'fisica' ? 'Persona física' : 'Persona moral'}, RFC {c.rfc}</span>
                        </span>
                        <span className="numeros texto-2">{c.telefono ?? 'Sin teléfono'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {datos.actividad && (
              <Panel titulo="Actividad reciente" acciones={<Link to="/auditoria">Ver bitácora</Link>}>
                <ul className="lista-actividad">
                  {datos.actividad.map((a) => (
                    <li key={a.id}>
                      <span className={`lista-actividad__op lista-actividad__op--${a.operacion.toLowerCase()}`}>{OPERACIONES[a.operacion]}</span>
                      <span className="lista-actividad__texto">
                        {capitalizar(a.descripcion)}
                        <span className="lista-actividad__meta">{nombrePropio(a.usuario)}, {fechaHora(a.fechaHora)}</span>
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
