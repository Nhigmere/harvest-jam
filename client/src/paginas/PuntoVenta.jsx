// Punto de venta: catálogo con etiquetas de precio a la izquierda y el
// ticket en curso a la derecha.
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuMinus, LuPlus, LuShoppingBasket, LuTrash2, LuTriangleAlert, LuUser, LuX } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal } from '../componentes/dialogos.jsx';
import { AccionesTicket, Ticket } from '../componentes/Ticket.jsx';
import { Boton, BotonIcono, Buscador, Campo, Cargando, MensajeError, Segmentado, Vacio } from '../componentes/ui.jsx';
import { abreviaturaUnidad, capitalizar, cantidad as fmtCantidad, esFraccionable, moneda, nombrePropio } from '../formato.js';
import { useApi, useAtajo, useRetardo } from '../hooks.js';

const redondear = (n, dec = 3) => Math.round(n * 10 ** dec) / 10 ** dec;
const pluralCategoria = (c) => capitalizar(/[aeiou]$/.test(c) ? `${c}s` : `${c}es`);

function EtiquetaPrecio({ precio, unidad }) {
  const [pesos, centavos] = precio.toFixed(2).split('.');
  return (
    <span className="etiqueta-precio" aria-label={`${moneda(precio)} por ${unidad}`}>
      <span className="etiqueta-precio__pesos">${Number(pesos).toLocaleString('es-MX')}</span>
      {centavos !== '00' && <span className="etiqueta-precio__centavos">.{centavos}</span>}
      <span className="etiqueta-precio__unidad">{abreviaturaUnidad(unidad)}</span>
    </span>
  );
}

function TarjetaProducto({ producto, enTicket, umbral, alAgregar }) {
  const agotado = producto.existencia <= 0;
  const bajo = !agotado && producto.existencia <= umbral;
  return (
    <button
      type="button"
      className={`producto-pos ${enTicket ? 'producto-pos--en-ticket' : ''}`}
      onClick={() => alAgregar(producto)}
      disabled={agotado}
    >
      <span className="producto-pos__nombre">{capitalizar(producto.descripcion)}</span>
      <span className={`producto-pos__stock ${bajo ? 'producto-pos__stock--bajo' : ''}`}>
        {agotado ? 'Agotado' : (
          <>
            {bajo && <LuTriangleAlert aria-hidden="true" />}
            Quedan {fmtCantidad(producto.existencia, producto.unidadMedida)}
          </>
        )}
      </span>
      <EtiquetaPrecio precio={producto.precioVenta} unidad={producto.unidadMedida} />
    </button>
  );
}

function RenglonTicket({ renglon, alCambiar, alQuitar, entradaRef, alTerminar }) {
  const fraccion = esFraccionable(renglon.unidadMedida);
  const paso = fraccion ? 0.25 : 1;
  const excede = renglon.cantidad > renglon.existencia;
  const [texto, setTexto] = useState(String(renglon.cantidad));

  useEffect(() => {
    if (Number(texto.replace(',', '.')) !== renglon.cantidad) setTexto(String(renglon.cantidad));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renglon.cantidad]);

  const fijar = (valor) => {
    const n = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    alCambiar(fraccion ? redondear(n) : Math.round(n));
  };

  return (
    <li className={`renglon ${excede ? 'renglon--excede' : ''}`}>
      <div className="renglon__info">
        <span className="renglon__nombre">{capitalizar(renglon.descripcion)}</span>
        <span className="renglon__precio">{moneda(renglon.precioVenta)} / {abreviaturaUnidad(renglon.unidadMedida)}</span>
        {excede && (
          <span className="renglon__aviso" role="alert">
            <LuTriangleAlert aria-hidden="true" /> Solo hay {fmtCantidad(renglon.existencia, renglon.unidadMedida)}
          </span>
        )}
      </div>
      <div className="renglon__cantidad">
        <BotonIcono
          icono={LuMinus}
          etiqueta={`Quitar ${fraccion ? '¼' : 'uno'} de ${renglon.descripcion}`}
          variante="borde"
          onClick={() => (renglon.cantidad - paso > 0 ? alCambiar(redondear(renglon.cantidad - paso)) : alQuitar())}
        />
        <input
          ref={entradaRef}
          className="entrada renglon__entrada numeros"
          inputMode={fraccion ? 'decimal' : 'numeric'}
          aria-label={`Cantidad de ${renglon.descripcion} en ${renglon.unidadMedida}`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            fijar(e.target.value);
          }}
          onFocus={(e) => e.target.select()}
          onBlur={() => setTexto(String(renglon.cantidad))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              alTerminar();
            }
          }}
        />
        <BotonIcono
          icono={LuPlus}
          etiqueta={`Agregar ${fraccion ? '¼' : 'uno'} de ${renglon.descripcion}`}
          variante="borde"
          onClick={() => alCambiar(redondear(renglon.cantidad + paso))}
        />
      </div>
      <span className="renglon__importe numeros">{moneda(renglon.cantidad * renglon.precioVenta)}</span>
      <BotonIcono icono={LuX} etiqueta={`Quitar ${renglon.descripcion} del ticket`} onClick={alQuitar} className="renglon__quitar" />
    </li>
  );
}

function ElegirCliente({ abierto, alCerrar, alElegir }) {
  const [busqueda, setBusqueda] = useState('');
  const buscar = useRetardo(busqueda, 250);
  const { datos, cargando, error } = useApi('/clientes', { buscar }, { activo: abierto });

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Elegir cliente" descripcion="Busca por nombre, RFC o teléfono." ancho="mediano">
      <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar cliente" placeholder="Nombre, RFC o teléfono" autoFocus />
      <MensajeError error={error} />
      <ul className="lista-opciones" aria-busy={cargando || undefined}>
        {(datos?.clientes ?? []).slice(0, 40).map((c) => (
          <li key={c.id}>
            <button type="button" className="lista-opciones__opcion" onClick={() => alElegir(c)}>
              <span>
                <span className="lista-opciones__titulo">{c.publicoGeneral ? 'Público en general' : nombrePropio(c.nombre)}</span>
                <span className="lista-opciones__detalle">
                  {c.publicoGeneral ? 'Venta de mostrador' : [c.tipo === 'fisica' ? 'Persona física' : 'Persona moral', c.telefono].filter(Boolean).join(', ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {datos && datos.clientes.length === 0 && <p className="texto-2">No hay clientes que coincidan con "{busqueda}".</p>}
    </Modal>
  );
}

function Cobrar({ abierto, alCerrar, total, renglones, cliente, alConfirmar, enviando, error, empleados, idEmpleado, setIdEmpleado }) {
  const [pago, setPago] = useState('');
  useEffect(() => {
    if (abierto) setPago('');
  }, [abierto]);
  const pagoNum = Number(String(pago).replace(',', '.'));
  const cambio = pago && Number.isFinite(pagoNum) ? pagoNum - total : null;

  return (
    <Modal
      abierto={abierto}
      alCerrar={enviando ? undefined : alCerrar}
      titulo="Cobrar"
      ancho="chico"
      pie={
        <>
          <Boton onClick={alCerrar} disabled={enviando}>Seguir agregando</Boton>
          <Boton
            variante="primario"
            onClick={alConfirmar}
            cargando={enviando}
            disabled={(cambio !== null && cambio < 0) || (empleados && !idEmpleado)}
          >
            {enviando ? 'Registrando…' : 'Registrar venta'}
          </Boton>
        </>
      }
    >
      <form
        className="cobro"
        onSubmit={(e) => {
          e.preventDefault();
          if (!enviando && !(cambio !== null && cambio < 0)) alConfirmar();
        }}
      >
        <p className="cobro__total">
          <span className="cobro__etiqueta">Total a cobrar</span>
          <span className="cobro__monto">{moneda(total)}</span>
          <span className="texto-2">{renglones} {renglones === 1 ? 'producto' : 'productos'}, cliente {cliente}</span>
        </p>

        {empleados && (
          <Campo etiqueta="Atiende" ayuda="Tu usuario no está ligado a un empleado.">
            {(props) => (
              <select {...props} className="entrada" value={idEmpleado ?? ''} onChange={(e) => setIdEmpleado(Number(e.target.value) || null)}>
                <option value="">Elige un empleado</option>
                {empleados.map((e) => <option key={e.id} value={e.id}>{nombrePropio(e.nombre)}</option>)}
              </select>
            )}
          </Campo>
        )}

        <Campo etiqueta="Paga con" opcional ayuda="Para calcular el cambio. No se guarda.">
          {(props) => (
            <input
              {...props}
              className="entrada entrada--grande numeros"
              inputMode="decimal"
              placeholder="0.00"
              value={pago}
              onChange={(e) => setPago(e.target.value)}
              autoFocus
            />
          )}
        </Campo>
        {cambio !== null && (
          <p className={`cobro__cambio ${cambio < 0 ? 'cobro__cambio--falta' : ''}`} aria-live="polite">
            {cambio < 0 ? `Faltan ${moneda(-cambio)}` : `Cambio: ${moneda(cambio)}`}
          </p>
        )}
        <MensajeError error={error} />
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

export default function PuntoVenta() {
  const { usuario, puede } = useSesion();
  const { datos, error, cargando, recargar } = useApi('/productos');
  const empleadosApi = useApi('/empleados', null, { activo: !usuario.empleado && puede('VER_EMPLEADOS') });

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [renglones, setRenglones] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorCobro, setErrorCobro] = useState(null);
  const [ventaHecha, setVentaHecha] = useState(null);
  const [idEmpleado, setIdEmpleado] = useState(null);
  const [enfocar, setEnfocar] = useState(null);

  const buscadorRef = useRef(null);
  const entradasRef = useRef(new Map());

  useAtajo('/', () => buscadorRef.current?.focus());

  const productos = datos?.productos ?? [];
  const umbral = datos?.umbralStockBajo ?? usuario.umbralStockBajo;
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => (categoria === 'todas' || p.categoria === categoria)
      && (!q || p.descripcion.includes(q) || String(p.codigo) === q));
  }, [productos, busqueda, categoria]);

  // Después de agregar, el cursor va a la cantidad de ese renglón.
  useEffect(() => {
    if (enfocar === null) return;
    const entrada = entradasRef.current.get(enfocar);
    if (entrada) {
      entrada.focus();
      entrada.select();
    }
    setEnfocar(null);
  }, [enfocar, renglones]);

  const agregar = (producto) => {
    setRenglones((lista) => {
      const existente = lista.find((r) => r.codigo === producto.codigo);
      if (existente) {
        const paso = esFraccionable(producto.unidadMedida) ? 0.5 : 1;
        return lista.map((r) => (r.codigo === producto.codigo ? { ...r, cantidad: redondear(r.cantidad + paso) } : r));
      }
      return [...lista, {
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        unidadMedida: producto.unidadMedida,
        precioVenta: producto.precioVenta,
        existencia: producto.existencia,
        cantidad: 1,
      }];
    });
    setEnfocar(producto.codigo);
  };

  const cambiarCantidad = (codigo, cantidad) => setRenglones((lista) => lista.map((r) => (r.codigo === codigo ? { ...r, cantidad } : r)));
  const quitar = (codigo) => {
    setRenglones((lista) => lista.filter((r) => r.codigo !== codigo));
    buscadorRef.current?.focus();
  };

  const total = Math.round(renglones.reduce((s, r) => s + r.cantidad * r.precioVenta, 0) * 100) / 100;
  const hayExcesos = renglones.some((r) => r.cantidad > r.existencia);
  const nombreCliente = cliente && !cliente.publicoGeneral ? nombrePropio(cliente.nombre) : 'Público en general';

  const registrar = async () => {
    setEnviando(true);
    setErrorCobro(null);
    try {
      const venta = await api.post('/ventas', {
        idCliente: cliente?.id ?? null,
        idEmpleado: usuario.empleado ? undefined : idEmpleado,
        renglones: renglones.map((r) => ({ codigo: r.codigo, cantidad: r.cantidad })),
      });
      setCobrando(false);
      setVentaHecha(venta);
      setRenglones([]);
      setCliente(null);
      recargar();
    } catch (err) {
      setErrorCobro(err);
      if (err.status === 409) recargar();
    } finally {
      setEnviando(false);
    }
  };

  // Las existencias del ticket se actualizan cuando llegan datos nuevos.
  useEffect(() => {
    if (!datos) return;
    setRenglones((lista) => lista.map((r) => {
      const p = datos.productos.find((x) => x.codigo === r.codigo);
      return p ? { ...r, existencia: p.existencia, precioVenta: p.precioVenta } : r;
    }));
  }, [datos]);

  return (
    <div className="pos">
      <section className="pos__catalogo" aria-label="Productos">
        <div className="pos__filtros">
          <Buscador
            inputRef={buscadorRef}
            valor={busqueda}
            alCambiar={setBusqueda}
            etiqueta="Buscar producto"
            placeholder="Buscar por nombre o código  ( / )"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && visibles[0] && visibles[0].existencia > 0) {
                e.preventDefault();
                agregar(visibles[0]);
                setBusqueda('');
              }
            }}
          />
          <Segmentado
            etiqueta="Categoría"
            valor={categoria}
            alCambiar={setCategoria}
            opciones={[{ valor: 'todas', etiqueta: 'Todo' }, ...categorias.map((c) => ({ valor: c, etiqueta: pluralCategoria(c) }))]}
          />
        </div>

        <MensajeError error={error} alReintentar={recargar} />
        {cargando && !datos && <Cargando texto="Cargando productos…" />}

        <div className={`pos__rejilla ${cargando && datos ? 'recargando' : ''}`}>
          {visibles.map((p) => (
            <TarjetaProducto
              key={p.codigo}
              producto={p}
              umbral={umbral}
              enTicket={renglones.some((r) => r.codigo === p.codigo)}
              alAgregar={agregar}
            />
          ))}
        </div>
        {datos && visibles.length === 0 && (
          <Vacio icono={LuShoppingBasket} titulo="No hay productos con esa búsqueda">
            Revisa el nombre o prueba con el código del producto.
          </Vacio>
        )}
      </section>

      <aside className="pos__ticket" aria-label="Ticket en curso">
        <header className="pos__ticket-cabecera">
          <h1>Venta nueva</h1>
          <button type="button" className="pos__cliente" onClick={() => setEligiendoCliente(true)}>
            <LuUser aria-hidden="true" />
            <span>
              <span className="pos__cliente-etiqueta">Cliente</span>
              <span className="pos__cliente-nombre">{nombreCliente}</span>
            </span>
            <span className="pos__cliente-cambiar">Cambiar</span>
          </button>
        </header>

        {renglones.length === 0 ? (
          <div className="pos__vacio">
            <LuShoppingBasket aria-hidden="true" />
            <p>Toca un producto o escribe su nombre y presiona Enter para agregarlo.</p>
          </div>
        ) : (
          <ul className="pos__renglones">
            {renglones.map((r) => (
              <RenglonTicket
                key={r.codigo}
                renglon={r}
                alCambiar={(c) => cambiarCantidad(r.codigo, c)}
                alQuitar={() => quitar(r.codigo)}
                alTerminar={() => buscadorRef.current?.focus()}
                entradaRef={(el) => {
                  if (el) entradasRef.current.set(r.codigo, el);
                  else entradasRef.current.delete(r.codigo);
                }}
              />
            ))}
          </ul>
        )}

        <footer className="pos__pie">
          <div className="pos__total" aria-live="polite">
            <span className="pos__total-etiqueta">Total</span>
            <span className="pos__total-monto">{moneda(total)}</span>
          </div>
          <div className="pos__acciones">
            {renglones.length > 0 && (
              <BotonIcono
                icono={LuTrash2}
                etiqueta="Vaciar ticket"
                variante="borde"
                onClick={() => {
                  setRenglones([]);
                  buscadorRef.current?.focus();
                }}
              />
            )}
            <Boton
              variante="primario"
              talla="grande"
              className="pos__cobrar"
              disabled={renglones.length === 0 || hayExcesos}
              onClick={() => {
                setErrorCobro(null);
                setCobrando(true);
              }}
            >
              Cobrar {renglones.length > 0 && moneda(total)}
            </Boton>
          </div>
          {hayExcesos && <p className="pos__nota-error">Ajusta las cantidades que pasan de la existencia.</p>}
        </footer>
      </aside>

      <ElegirCliente
        abierto={eligiendoCliente}
        alCerrar={() => setEligiendoCliente(false)}
        alElegir={(c) => {
          setCliente(c.publicoGeneral ? null : c);
          setEligiendoCliente(false);
        }}
      />

      <Cobrar
        abierto={cobrando}
        alCerrar={() => setCobrando(false)}
        total={total}
        renglones={renglones.length}
        cliente={nombreCliente}
        alConfirmar={registrar}
        enviando={enviando}
        error={errorCobro}
        empleados={!usuario.empleado ? empleadosApi.datos?.empleados ?? [] : null}
        idEmpleado={idEmpleado}
        setIdEmpleado={setIdEmpleado}
      />

      <Modal
        abierto={Boolean(ventaHecha)}
        alCerrar={() => {
          setVentaHecha(null);
          buscadorRef.current?.focus();
        }}
        titulo={ventaHecha ? `Venta ${ventaHecha.folio} registrada` : ''}
        ancho="ticket"
        pie={ventaHecha && (
          <>
            <AccionesTicket venta={ventaHecha} />
            <Boton
              variante="primario"
              onClick={() => {
                setVentaHecha(null);
                buscadorRef.current?.focus();
              }}
            >
              Nueva venta
            </Boton>
          </>
        )}
      >
        {ventaHecha && <Ticket venta={ventaHecha} />}
      </Modal>
    </div>
  );
}
