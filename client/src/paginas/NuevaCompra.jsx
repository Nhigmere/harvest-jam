// Registrar una compra: proveedor, productos, cantidades y costos.
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuArrowLeft, LuPackagePlus, LuPlus, LuX } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { useDialogos } from '../componentes/dialogos.jsx';
import { Boton, BotonIcono, Buscador, CabeceraPagina, Campo, MensajeError, Panel, Vacio } from '../componentes/ui.jsx';
import { abreviaturaUnidad, capitalizar, cantidad as fmtCantidad, esFraccionable, moneda, nombrePropio } from '../formato.js';
import { useApi } from '../hooks.js';
import { Link, useNavegar } from '../router.jsx';

const aNumero = (t) => Number(String(t).replace(',', '.'));

export default function NuevaCompra() {
  const { usuario, puede } = useSesion();
  const { avisar } = useDialogos();
  const navegar = useNavegar();

  const proveedoresApi = useApi('/proveedores', { opciones: 1 });
  const productosApi = useApi('/productos');
  const empleadosApi = useApi('/empleados', null, { activo: !usuario.empleado && puede('VER_EMPLEADOS') });

  const [idProveedor, setIdProveedor] = useState('');
  const [lote, setLote] = useState('');
  const [idEmpleado, setIdEmpleado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [renglones, setRenglones] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [enfocar, setEnfocar] = useState(null);
  const entradas = useRef(new Map());

  // Después de agregar un producto, el cursor va a su cantidad.
  useEffect(() => {
    if (enfocar === null) return;
    entradas.current.get(enfocar)?.focus();
    setEnfocar(null);
  }, [enfocar, renglones]);

  const proveedorApi = useApi(idProveedor ? `/proveedores/${idProveedor}` : null, null, { activo: Boolean(idProveedor) && puede('VER_PROVEEDORES') });
  const surtidos = proveedorApi.datos?.productos ?? [];

  const productos = productosApi.datos?.productos ?? [];
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return productos.filter((p) => p.descripcion.includes(q) || String(p.codigo) === q).slice(0, 8);
  }, [productos, busqueda]);

  const agregar = (codigo) => {
    const p = productos.find((x) => x.codigo === codigo);
    if (!p) return;
    setRenglones((lista) => (lista.some((r) => r.codigo === codigo) ? lista : [...lista, {
      codigo: p.codigo,
      descripcion: p.descripcion,
      unidadMedida: p.unidadMedida,
      existencia: p.existencia,
      cantidad: '',
      costo: String(p.precioCompra),
    }]));
    setBusqueda('');
    setEnfocar(codigo);
  };

  const cambiar = (codigo, campo, valor) => setRenglones((lista) => lista.map((r) => (r.codigo === codigo ? { ...r, [campo]: valor } : r)));

  const errores = renglones.map((r) => {
    const c = aNumero(r.cantidad);
    if (!r.cantidad || !(c > 0)) return 'Escribe la cantidad';
    if (!esFraccionable(r.unidadMedida) && !Number.isInteger(c)) return `Debe ser entera (${abreviaturaUnidad(r.unidadMedida, 2)})`;
    if (r.costo !== '' && !(aNumero(r.costo) >= 0)) return 'Costo no válido';
    return null;
  });
  const total = renglones.reduce((s, r) => s + (aNumero(r.cantidad) || 0) * (aNumero(r.costo) || 0), 0);
  const puedeGuardar = idProveedor && renglones.length > 0 && errores.every((e) => !e) && (usuario.empleado || idEmpleado);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const compra = await api.post('/compras', {
        idProveedor: Number(idProveedor),
        lote: lote ? Number(lote) : null,
        idEmpleado: usuario.empleado ? undefined : Number(idEmpleado),
        renglones: renglones.map((r) => ({ codigo: r.codigo, cantidad: aNumero(r.cantidad), precioUnitario: r.costo === '' ? null : aNumero(r.costo) })),
      });
      avisar(`Compra ${compra.folio} registrada; el inventario ya se actualizó`);
      navegar(`/compras?folio=${compra.folio}`);
    } catch (err) {
      setError(err);
      setGuardando(false);
    }
  };

  return (
    <div className="pagina pagina--estrecha">
      <Link to="/compras" className="volver"><LuArrowLeft aria-hidden="true" /> Compras</Link>
      <CabeceraPagina titulo="Registrar compra" descripcion="Lo que registres aquí entra al inventario en cuanto guardes." />

      <MensajeError error={proveedoresApi.error || productosApi.error} />

      <Panel titulo="Proveedor">
        <div className="formulario-fila">
          <Campo etiqueta="Proveedor">
            {(props) => (
              <select {...props} className="entrada" value={idProveedor} onChange={(e) => setIdProveedor(e.target.value)}>
                <option value="">Elige un proveedor</option>
                {(proveedoresApi.datos?.proveedores ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{nombrePropio(p.nombre)} ({capitalizar(p.ciudad)})</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo etiqueta="Número de lote" opcional>
            {(props) => <input {...props} className="entrada numeros" inputMode="numeric" value={lote} onChange={(e) => setLote(e.target.value.replace(/\D/g, ''))} />}
          </Campo>
          {!usuario.empleado && (
            <Campo etiqueta="Recibe" ayuda="Tu usuario no está ligado a un empleado.">
              {(props) => (
                <select {...props} className="entrada" value={idEmpleado} onChange={(e) => setIdEmpleado(e.target.value)}>
                  <option value="">Elige un empleado</option>
                  {(empleadosApi.datos?.empleados ?? []).map((e) => <option key={e.id} value={e.id}>{nombrePropio(e.nombre)}</option>)}
                </select>
              )}
            </Campo>
          )}
        </div>
        {surtidos.length > 0 && (
          <div className="sugeridos">
            <p className="sugeridos__titulo">Productos que surte este proveedor</p>
            <div className="sugeridos__lista">
              {surtidos.map((p) => (
                <button
                  key={p.codigo}
                  type="button"
                  className="chip"
                  onClick={() => agregar(p.codigo)}
                  disabled={renglones.some((r) => r.codigo === p.codigo)}
                >
                  <LuPlus aria-hidden="true" /> {capitalizar(p.descripcion)}
                  <span className="chip__detalle">quedan {fmtCantidad(p.existencia, p.unidadMedida)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Panel titulo="Productos" descripcion="El costo unitario sale del catálogo; cámbialo si el proveedor cobró otro precio.">
        <div className="agregar-producto">
          <Buscador
            valor={busqueda}
            alCambiar={setBusqueda}
            etiqueta="Agregar producto"
            placeholder="Escribe el nombre o código del producto"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && coincidencias[0]) {
                e.preventDefault();
                agregar(coincidencias[0].codigo);
              }
            }}
          />
          {coincidencias.length > 0 && (
            <ul className="lista-opciones lista-opciones--flotante">
              {coincidencias.map((p) => (
                <li key={p.codigo}>
                  <button type="button" className="lista-opciones__opcion" onClick={() => agregar(p.codigo)}>
                    <span>
                      <span className="lista-opciones__titulo">{capitalizar(p.descripcion)}</span>
                      <span className="lista-opciones__detalle">Código {p.codigo}, quedan {fmtCantidad(p.existencia, p.unidadMedida)}</span>
                    </span>
                    <span className="texto-2 numeros">{moneda(p.precioCompra)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {renglones.length === 0 ? (
          <Vacio icono={LuPackagePlus} titulo="Todavía no hay productos en esta compra">
            Búscalos arriba{idProveedor && surtidos.length ? ' o toca uno de los que surte el proveedor' : ''}.
          </Vacio>
        ) : (
          <div className="tabla-contenedor tabla-contenedor--compacta">
            <table className="tabla tabla--formulario">
              <thead>
                <tr>
                  <th scope="col" className="tabla__th">Producto</th>
                  <th scope="col" className="tabla__th tabla__th--der">Cantidad</th>
                  <th scope="col" className="tabla__th tabla__th--der">Costo unitario</th>
                  <th scope="col" className="tabla__th tabla__th--der">Subtotal</th>
                  <th scope="col" className="tabla__th"><span className="solo-lectores">Quitar</span></th>
                </tr>
              </thead>
              <tbody>
                {renglones.map((r, i) => (
                  <tr key={r.codigo}>
                    <td className="tabla__td">
                      {capitalizar(r.descripcion)}
                      <span className="tabla__detalle">Hay {fmtCantidad(r.existencia, r.unidadMedida)}</span>
                    </td>
                    <td className="tabla__td tabla__td--der">
                      <span className="entrada-unidad">
                        <input
                          ref={(el) => (el ? entradas.current.set(r.codigo, el) : entradas.current.delete(r.codigo))}
                          className={`entrada entrada--corta numeros ${errores[i] && r.cantidad ? 'entrada--error' : ''}`}
                          inputMode={esFraccionable(r.unidadMedida) ? 'decimal' : 'numeric'}
                          aria-label={`Cantidad de ${r.descripcion}`}
                          value={r.cantidad}
                          onChange={(e) => cambiar(r.codigo, 'cantidad', e.target.value)}
                        />
                        <span className="entrada-unidad__texto">{abreviaturaUnidad(r.unidadMedida, 2)}</span>
                      </span>
                      {errores[i] && r.cantidad && <span className="tabla__error">{errores[i]}</span>}
                    </td>
                    <td className="tabla__td tabla__td--der">
                      <span className="entrada-unidad">
                        <span className="entrada-unidad__texto">$</span>
                        <input
                          className="entrada entrada--corta numeros"
                          inputMode="decimal"
                          aria-label={`Costo unitario de ${r.descripcion}`}
                          value={r.costo}
                          onChange={(e) => cambiar(r.codigo, 'costo', e.target.value)}
                        />
                      </span>
                    </td>
                    <td className="tabla__td tabla__td--der numeros">{moneda((aNumero(r.cantidad) || 0) * (aNumero(r.costo) || 0))}</td>
                    <td className="tabla__td">
                      <BotonIcono icono={LuX} etiqueta={`Quitar ${r.descripcion}`} onClick={() => setRenglones((l) => l.filter((x) => x.codigo !== r.codigo))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <MensajeError error={error} />

      <div className="barra-guardar">
        <p className="barra-guardar__total">
          <span className="texto-2">Total de la compra</span>
          <strong className="numeros">{moneda(total)}</strong>
        </p>
        <Link to="/compras" className="boton boton--secundario boton--normal">Cancelar</Link>
        <Boton variante="primario" onClick={guardar} cargando={guardando} disabled={!puedeGuardar}>
          {guardando ? 'Registrando…' : 'Registrar compra'}
        </Boton>
      </div>
    </div>
  );
}
