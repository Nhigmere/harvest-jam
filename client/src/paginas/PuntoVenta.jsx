// Punto de venta Flagship: catálogo interactivo, ventas en espera, pasos rápidos y cobro ágil.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LuCircleCheck, LuClock, LuLayoutGrid, LuList, LuMinus, LuPause, LuPlay,
  LuPlus, LuShoppingBasket, LuTrash2, LuTriangleAlert, LuUser, LuX,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { ContadorAnimado, EsqueletoPOS } from '../componentes/Efectos.jsx';
import { AccionesTicket, Ticket } from '../componentes/Ticket.jsx';
import { Boton, BotonIcono, Buscador, Campo, MensajeError, Segmentado, Vacio } from '../componentes/ui.jsx';
import { abreviaturaUnidad, capitalizar, cantidad as fmtCantidad, esFraccionable, moneda, nombrePropio, plural } from '../formato.js';
import { useApi, useAtajo, useRetardo } from '../hooks.js';

const redondear = (n, dec = 3) => Math.round(n * 10 ** dec) / 10 ** dec;
const pluralCategoria = (c) => capitalizar(/[aeiou]$/.test(c) ? `${c}s` : `${c}es`);
const CLAVE_ESPERA = 'harvest-jam:ventas-en-espera';

function cargarEspera() {
  try {
    const crudo = localStorage.getItem(CLAVE_ESPERA);
    const parsed = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function guardarEspera(lista) {
  try {
    localStorage.setItem(CLAVE_ESPERA, JSON.stringify(lista));
  } catch {
    // Ignorar si el almacenamiento no está disponible
  }
}

function EtiquetaPrecio({ precio, unidad }) {
  const [pesos, centavos] = precio.toFixed(2).split('.');
  return (
    <span className="etiqueta-precio" aria-label={`${moneda(precio)} por ${unidad}`}>
      <span className="etiqueta-precio__pesos">${Number(pesos).toLocaleString('es-MX')}</span>
      {centavos !== '00' && <span className="etiqueta-precio__centavos">.{centavos}</span>}
      <span className="etiqueta-precio__unidad">/{abreviaturaUnidad(unidad)}</span>
    </span>
  );
}

function TarjetaProducto({ producto, cantidadEnTicket, umbral, alAgregar }) {
  const agotado = producto.existencia <= 0;
  const bajo = !agotado && producto.existencia <= umbral;
  const pctStock = agotado ? 0 : Math.min(100, Math.max(8, (producto.existencia / Math.max(umbral * 4, 20)) * 100));
  const esVerdura = producto.categoria?.toLowerCase().includes('verdura');

  return (
    <button
      type="button"
      className={`producto-pos lujo-brillo ${cantidadEnTicket > 0 ? 'producto-pos--en-ticket' : ''}`}
      onClick={() => alAgregar(producto)}
      disabled={agotado}
    >
      <div className="producto-pos__top">
        <span className="producto-pos__cat">
          <span className={`producto-pos__cat-punto ${esVerdura ? 'producto-pos__cat-punto--verdura' : ''}`} aria-hidden="true" />
          {producto.categoria}
        </span>
        {cantidadEnTicket > 0 && (
          <span className="producto-pos__en-bolsa" aria-label={`En ticket: ${fmtCantidad(cantidadEnTicket, producto.unidadMedida)}`}>
            {fmtCantidad(cantidadEnTicket, producto.unidadMedida)}
          </span>
        )}
      </div>

      <span className="producto-pos__nombre">{capitalizar(producto.descripcion)}</span>

      <div className="producto-pos__pie">
        <span className="producto-pos__stock-bloque">
          <span className={`producto-pos__stock ${agotado ? 'producto-pos__stock--agotado' : bajo ? 'producto-pos__stock--bajo' : ''}`}>
            {agotado ? 'Agotado' : (
              <>
                {bajo && <LuTriangleAlert aria-hidden="true" />}
                {fmtCantidad(producto.existencia, producto.unidadMedida)}
              </>
            )}
          </span>
          <span
            className={`producto-pos__barra-stock ${agotado ? 'producto-pos__barra-stock--agotado' : bajo ? 'producto-pos__barra-stock--bajo' : ''}`}
            aria-hidden="true"
          >
            <span style={{ width: `${pctStock}%` }} />
          </span>
        </span>
        <EtiquetaPrecio precio={producto.precioVenta} unidad={producto.unidadMedida} />
      </div>
    </button>
  );
}

function RenglonTicket({ renglon, alCambiar, alQuitar, entradaRef, alTerminar }) {
  const fraccion = esFraccionable(renglon.unidadMedida);
  const paso = fraccion ? 0.25 : 1;
  const pasosRapidos = fraccion ? [0.25, 0.5, 1] : [1, 2, 5];
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

      <span className="renglon__importe numeros">{moneda(renglon.cantidad * renglon.precioVenta)}</span>

      <div className="renglon__controles">
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

        <div className="renglon__pasos">
          {pasosRapidos.map((p) => (
            <button
              key={p}
              type="button"
              className="renglon__paso"
              onClick={() => alCambiar(redondear(renglon.cantidad + p))}
              title={`Sumar ${p} ${abreviaturaUnidad(renglon.unidadMedida, p)}`}
            >
              +{p === 0.25 ? '¼' : p === 0.5 ? '½' : p}
            </button>
          ))}
        </div>
      </div>

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
                  {c.publicoGeneral ? 'Venta de mostrador' : [c.tipo === 'fisica' ? 'Persona física' : 'Persona moral', c.telefono].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {datos && datos.clientes.length === 0 && <p className="texto-2" style={{ marginTop: 12 }}>No hay clientes que coincidan con "{busqueda}".</p>}
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

  // Sugerencias inteligentes de billetes en MXN
  const billetes = useMemo(() => {
    const base = [50, 100, 200, 500, 1000];
    const relevantes = base.filter((b) => b >= Math.ceil(total));
    return relevantes.length ? relevantes.slice(0, 5) : [Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500];
  }, [total]);

  return (
    <Modal
      abierto={abierto}
      alCerrar={enviando ? undefined : alCerrar}
      titulo="Finalizar cobro"
      ancho="chico"
      pie={
        <>
          <Boton onClick={alCerrar} disabled={enviando}>Seguir editando</Boton>
          <Boton
            variante="primario"
            onClick={alConfirmar}
            cargando={enviando}
            disabled={(cambio !== null && cambio < 0) || (empleados && !idEmpleado)}
          >
            {enviando ? 'Registrando…' : 'Confirmar venta'}
          </Boton>
        </>
      }
    >
      <form
        className="cobro"
        onSubmit={(e) => {
          e.preventDefault();
          if (!enviando && !(cambio !== null && cambio < 0) && !(empleados && !idEmpleado)) alConfirmar();
        }}
      >
        <p className="cobro__total">
          <span className="cobro__etiqueta">Total a cobrar</span>
          <span className="cobro__monto">{moneda(total)}</span>
          <span className="texto-2">{plural(renglones, 'producto', 'productos')} · {cliente}</span>
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

        <Campo etiqueta="Efectivo recibido" opcional ayuda="Selecciona un billete rápido o escribe el monto para calcular cambio.">
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

        <div className="cobro__billetes" role="group" aria-label="Billetes rápidos">
          <button
            type="button"
            className="billete-btn billete-btn--exacto"
            onClick={() => setPago(total.toFixed(2))}
          >
            Exacto
          </button>
          {billetes.map((b) => (
            <button key={b} type="button" className="billete-btn" onClick={() => setPago(String(b))}>
              ${b.toLocaleString('es-MX')}
            </button>
          ))}
        </div>

        {cambio !== null && (
          <p className={`cobro__cambio ${cambio < 0 ? 'cobro__cambio--falta' : ''}`} aria-live="polite">
            <span>{cambio < 0 ? 'Falta cubrir' : 'Cambio a entregar'}</span>
            <strong>{moneda(Math.abs(cambio))}</strong>
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
  const { avisar } = useDialogos();
  const { datos, error, cargando, recargar } = useApi('/productos');
  const empleadosApi = useApi('/empleados', null, { activo: !usuario.empleado && puede('VER_EMPLEADOS') });

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [orden, setOrden] = useState('nombre');
  const [vista, setVista] = useState('rejilla');
  const [renglones, setRenglones] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [enEspera, setEnEspera] = useState(cargarEspera);
  const [verEspera, setVerEspera] = useState(false);
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

  const total = Math.round(renglones.reduce((s, r) => s + r.cantidad * r.precioVenta, 0) * 100) / 100;
  const hayExcesos = renglones.some((r) => r.cantidad > r.existencia);
  const nombreCliente = cliente && !cliente.publicoGeneral ? nombrePropio(cliente.nombre) : 'Público en general';

  // Atajo F2 para abrir cobro desde cualquier punto del POS
  useEffect(() => {
    const alTeclado = (e) => {
      if (e.key === 'F2' && renglones.length > 0 && !hayExcesos && !cobrando && !ventaHecha) {
        e.preventDefault();
        setErrorCobro(null);
        setCobrando(true);
      }
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [renglones.length, hayExcesos, cobrando, ventaHecha]);

  const productos = datos?.productos ?? [];
  const umbral = datos?.umbralStockBajo ?? usuario.umbralStockBajo;
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos]);

  const conteosCategoria = useMemo(() => {
    const mapa = { todas: productos.length };
    for (const p of productos) mapa[p.categoria] = (mapa[p.categoria] ?? 0) + 1;
    return mapa;
  }, [productos]);

  const cantidadesEnTicket = useMemo(() => {
    const m = new Map();
    for (const r of renglones) m.set(r.codigo, r.cantidad);
    return m;
  }, [renglones]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = productos.filter(
      (p) => (categoria === 'todas' || p.categoria === categoria)
        && (!q || p.descripcion.toLowerCase().includes(q) || String(p.codigo) === q),
    );
    const copia = [...filtrados];
    if (orden === 'precio-asc') copia.sort((a, b) => a.precioVenta - b.precioVenta);
    else if (orden === 'precio-desc') copia.sort((a, b) => b.precioVenta - a.precioVenta);
    else if (orden === 'stock-desc') copia.sort((a, b) => b.existencia - a.existencia);
    else if (orden === 'en-ticket') {
      copia.sort((a, b) => (cantidadesEnTicket.has(b.codigo) ? 1 : 0) - (cantidadesEnTicket.has(a.codigo) ? 1 : 0) || a.descripcion.localeCompare(b.descripcion, 'es'));
    } else {
      copia.sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es'));
    }
    return copia;
  }, [productos, busqueda, categoria, orden, cantidadesEnTicket]);

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

  // Pausar y retomar ventas en espera (persistidas localmente)
  const pausarVenta = () => {
    if (!renglones.length) return;
    const nueva = {
      id: Date.now().toString(36),
      hora: new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
      cliente,
      renglones,
      total,
    };
    const siguiente = [nueva, ...enEspera].slice(0, 8);
    setEnEspera(siguiente);
    guardarEspera(siguiente);
    setRenglones([]);
    setCliente(null);
    avisar('Venta puesta en espera');
    buscadorRef.current?.focus();
  };

  const retomarVenta = (item) => {
    // Si hay algo en curso, lo estacionamos primero para no perder nada
    let siguiente = enEspera.filter((x) => x.id !== item.id);
    if (renglones.length > 0) {
      siguiente = [{
        id: Date.now().toString(36),
        hora: new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
        cliente,
        renglones,
        total,
      }, ...siguiente].slice(0, 8);
    }
    setEnEspera(siguiente);
    guardarEspera(siguiente);
    setRenglones(item.renglones);
    setCliente(item.cliente ?? null);
    setVerEspera(false);
    avisar('Venta retomada en caja');
  };

  const eliminarEspera = (id) => {
    const siguiente = enEspera.filter((x) => x.id !== id);
    setEnEspera(siguiente);
    guardarEspera(siguiente);
  };

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
          <div className="pos__filtros-fila">
            <Buscador
              inputRef={buscadorRef}
              valor={busqueda}
              alCambiar={setBusqueda}
              etiqueta="Buscar producto"
              placeholder="Buscar producto por nombre o código…"
              atajo="/"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && visibles[0] && visibles[0].existencia > 0) {
                  e.preventDefault();
                  agregar(visibles[0]);
                  setBusqueda('');
                } else if (e.key === 'Escape' && busqueda) {
                  setBusqueda('');
                }
              }}
            />

            <div className="pos__herramientas">
              {enEspera.length > 0 && (
                <Boton
                  variante="secundario"
                  talla="chico"
                  icono={LuClock}
                  className="pos__en-espera-btn"
                  onClick={() => setVerEspera(true)}
                >
                  En espera
                  <span className="pos__badge-espera">{enEspera.length}</span>
                </Boton>
              )}

              <select
                className="entrada pos__ordenar"
                aria-label="Ordenar catálogo"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
              >
                <option value="nombre">Orden: A–Z</option>
                <option value="precio-asc">Menor precio</option>
                <option value="precio-desc">Mayor precio</option>
                <option value="stock-desc">Mayor existencia</option>
                <option value="en-ticket">En ticket primero</option>
              </select>

              <BotonIcono
                icono={LuLayoutGrid}
                etiqueta="Vista de tarjetas"
                variante="borde"
                aria-pressed={vista === 'rejilla'}
                onClick={() => setVista('rejilla')}
              />
              <BotonIcono
                icono={LuList}
                etiqueta="Vista de lista compacta"
                variante="borde"
                aria-pressed={vista === 'lista'}
                onClick={() => setVista('lista')}
              />
            </div>
          </div>

          <div className="pos__filtros-fila">
            <Segmentado
              etiqueta="Categoría"
              valor={categoria}
              alCambiar={setCategoria}
              opciones={[
                { valor: 'todas', etiqueta: 'Todo', conteo: conteosCategoria.todas },
                ...categorias.map((c) => ({ valor: c, etiqueta: pluralCategoria(c), conteo: conteosCategoria[c] })),
              ]}
            />
          </div>
        </div>

        <MensajeError error={error} alReintentar={recargar} />
        {cargando && !datos && <EsqueletoPOS />}

        {datos && (
          <div className={`pos__rejilla ${vista === 'lista' ? 'pos__rejilla--lista' : ''} ${cargando ? 'recargando' : ''}`}>
            {visibles.map((p) => (
              <TarjetaProducto
                key={p.codigo}
                producto={p}
                umbral={umbral}
                cantidadEnTicket={cantidadesEnTicket.get(p.codigo) ?? 0}
                alAgregar={agregar}
              />
            ))}
          </div>
        )}

        {datos && visibles.length === 0 && (
          <Vacio icono={LuShoppingBasket} titulo="No hay productos con esa búsqueda">
            Revisa el nombre o prueba con el código del producto.
          </Vacio>
        )}
      </section>

      <aside id="ticket-pos" className="pos__ticket" aria-label="Ticket en curso">
        <header className="pos__ticket-cabecera">
          <div className="pos__ticket-titulo-fila">
            <h1>Venta nueva</h1>
            {renglones.length > 0 && (
              <span className="pos__ticket-contador">
                {plural(renglones.length, 'artículo', 'artículos')}
              </span>
            )}
          </div>
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
            <span className="pos__vacio-icono" aria-hidden="true">
              <LuShoppingBasket />
            </span>
            <p>Selecciona un producto del catálogo o escribe su nombre y presiona Enter.</p>
            <div className="pos__vacio-atajos">
              <span><kbd>/</kbd> Buscar</span>
              <span><kbd>F2</kbd> Cobrar</span>
              <span><kbd>⌘K</kbd> Comandos</span>
            </div>
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
          {renglones.length > 0 && (
            <div className="pos__resumen-linea">
              <span>Subtotal ({plural(renglones.length, 'producto', 'productos')})</span>
              <span className="numeros">{moneda(total)}</span>
            </div>
          )}
          <div className="pos__total" aria-live="polite">
            <span className="pos__total-etiqueta">Total</span>
            <span className="pos__total-monto">
              <ContadorAnimado valor={total} formato={moneda} duracion={240} />
            </span>
          </div>
          <div className="pos__acciones">
            {renglones.length > 0 && (
              <>
                <BotonIcono
                  icono={LuPause}
                  etiqueta="Poner venta en espera"
                  variante="borde"
                  onClick={pausarVenta}
                />
                <BotonIcono
                  icono={LuTrash2}
                  etiqueta="Vaciar ticket"
                  variante="borde"
                  onClick={() => {
                    setRenglones([]);
                    buscadorRef.current?.focus();
                  }}
                />
              </>
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
              {renglones.length > 0 && <kbd>F2</kbd>}
            </Boton>
          </div>
          {hayExcesos && <p className="pos__nota-error">Ajusta las cantidades que superan la existencia disponible.</p>}
        </footer>
      </aside>

      {renglones.length > 0 && (
        <div className="pos__barra-movil" role="region" aria-label="Resumen rápido del ticket">
          <div className="pos__barra-movil-info">
            <span className="pos__barra-movil-cuenta">{plural(renglones.length, 'artículo', 'artículos')} en ticket</span>
            <span className="pos__barra-movil-total">{moneda(total)}</span>
          </div>
          <div className="pos__barra-movil-acciones">
            <Boton
              variante="secundario"
              talla="chico"
              onClick={() => document.getElementById('ticket-pos')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver ticket
            </Boton>
            <Boton
              variante="primario"
              talla="chico"
              disabled={hayExcesos}
              onClick={() => {
                setErrorCobro(null);
                setCobrando(true);
              }}
            >
              Cobrar
            </Boton>
          </div>
        </div>
      )}

      <ElegirCliente
        abierto={eligiendoCliente}
        alCerrar={() => setEligiendoCliente(false)}
        alElegir={(c) => {
          setCliente(c.publicoGeneral ? null : c);
          setEligiendoCliente(false);
        }}
      />

      <Modal
        abierto={verEspera}
        alCerrar={() => setVerEspera(false)}
        titulo="Ventas en espera"
        descripcion="Retoma cualquier cesta pausada sin perder tu orden actual."
        ancho="mediano"
      >
        {enEspera.length === 0 ? (
          <Vacio icono={LuClock} titulo="No hay ventas en espera" />
        ) : (
          <ul className="espera-lista">
            {enEspera.map((item) => (
              <li key={item.id} className="espera-item">
                <div className="espera-item__info">
                  <p className="espera-item__titulo">
                    {item.cliente ? nombrePropio(item.cliente.nombre) : 'Público en general'} · {moneda(item.total)}
                  </p>
                  <p className="espera-item__meta">
                    {plural(item.renglones.length, 'producto', 'productos')} · Pausada a las {item.hora}
                  </p>
                </div>
                <div className="espera-item__acciones">
                  <Boton variante="primario" talla="chico" icono={LuPlay} onClick={() => retomarVenta(item)}>
                    Retomar
                  </Boton>
                  <BotonIcono icono={LuTrash2} etiqueta="Descartar venta en espera" onClick={() => eliminarEspera(item.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

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
        titulo={ventaHecha ? `Venta #${ventaHecha.folio} registrada` : ''}
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
        {ventaHecha && (
          <>
            <div className="ticket-exito" role="status">
              <LuCircleCheck aria-hidden="true" />
              <span className="ticket-exito__texto">
                Cobro completado · Inventario actualizado automáticamente
              </span>
            </div>
            <Ticket venta={ventaHecha} />
          </>
        )}
      </Modal>
    </div>
  );
}
