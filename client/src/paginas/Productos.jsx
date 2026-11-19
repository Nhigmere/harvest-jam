// Catálogo de productos e inventario.
import { useEffect, useMemo, useState } from 'react';
import { LuApple, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { useFormulario } from '../componentes/formulario.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, BotonIcono, Buscador, CabeceraPagina, Campo, Cargando, Insignia, MensajeError, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { capitalizar, cantidad, esFraccionable, moneda, nombrePropio, numero, porcentaje } from '../formato.js';
import { useApi } from '../hooks.js';

const VACIO = { descripcion: '', categoria: 'fruta', unidadMedida: 'kilogramo', precioCompra: '', precioVenta: '', existencia: '0', proveedores: [] };

function estadoDe(p, umbral) {
  if (p.existencia <= 0) return 'agotado';
  if (p.existencia <= umbral) return 'bajo';
  return 'disponible';
}

function InsigniaStock({ producto, umbral }) {
  const estado = estadoDe(producto, umbral);
  if (estado === 'agotado') return <Insignia tono="critico">Agotado</Insignia>;
  if (estado === 'bajo') return <Insignia tono="aviso">Por acabarse</Insignia>;
  return <Insignia tono="ok" className="insignia--tenue">Disponible</Insignia>;
}

const margen = (p) => (p.precioVenta > 0 ? ((p.precioVenta - p.precioCompra) / p.precioVenta) * 100 : 0);

function FormularioProducto({ abierto, producto, unidades, categorias, alCerrar, alGuardar, alEliminar }) {
  const { puede } = useSesion();
  // El componente se vuelve a montar cada vez que se abre (ver "key" abajo),
  // así el formulario empieza con los datos del producto elegido.
  const f = useFormulario(producto
    ? { ...VACIO, ...producto, precioCompra: String(producto.precioCompra), precioVenta: String(producto.precioVenta), existencia: String(producto.existencia), proveedores: [] }
    : VACIO);
  const proveedoresApi = useApi('/proveedores', { opciones: 1 }, { activo: abierto && puede('VER_PROVEEDORES') });
  const [filtroProv, setFiltroProv] = useState('');
  const { fijar } = f;

  // Proveedores que ya surten el producto.
  useEffect(() => {
    if (!producto || !puede('VER_PROVEEDORES')) return;
    api.get(`/productos/${producto.codigo}`)
      .then((p) => fijar('proveedores', (p.proveedores ?? []).map((x) => x.id)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto?.codigo]);

  const v = f.valores;
  const pv = Number(v.precioVenta);
  const pc = Number(v.precioCompra);
  const margenTexto = pv > 0 && pc >= 0 ? `Margen: ${porcentaje(((pv - pc) / pv) * 100)} (${moneda(pv - pc)} por ${v.unidadMedida})` : null;
  const proveedores = (proveedoresApi.datos?.proveedores ?? []).filter((p) => !filtroProv || p.nombre.includes(filtroProv.toLowerCase()));

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (valores) => {
      const cuerpo = {
        ...valores,
        precioCompra: valores.precioCompra === '' ? 0 : Number(valores.precioCompra),
        precioVenta: valores.precioVenta === '' ? null : Number(valores.precioVenta),
        existencia: valores.existencia === '' ? 0 : Number(valores.existencia),
        proveedores: puede('VER_PROVEEDORES') ? valores.proveedores : undefined,
      };
      const guardado = producto ? await api.put(`/productos/${producto.codigo}`, cuerpo) : await api.post('/productos', cuerpo);
      alGuardar(guardado, Boolean(producto));
    });
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={producto ? `Editar ${capitalizar(producto.descripcion)}` : 'Nuevo producto'}
      descripcion={producto ? `Código ${producto.codigo}` : 'El código se asigna solo al guardar.'}
      ancho="grande"
      pie={
        <>
          {producto && puede('ELIMINAR_PRODUCTOS') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(producto)} className="modal__accion-izq">Eliminar</Boton>
          )}
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" form="form-producto" cargando={f.guardando}>
            {producto ? 'Guardar cambios' : 'Agregar producto'}
          </Boton>
        </>
      }
    >
      <form id="form-producto" className="formulario" onSubmit={guardar} noValidate>
        <Campo etiqueta="Descripción" error={f.errorDe('descripcion')} className="formulario__ancho">
          {(p) => <input {...p} {...f.campo('descripcion')} className="entrada" placeholder="Por ejemplo: manzana roja" autoFocus />}
        </Campo>
        <Campo etiqueta="Categoría" error={f.errorDe('categoria')}>
          {(p) => (
            <>
              <input {...p} {...f.campo('categoria')} className="entrada" list="lista-categorias" />
              <datalist id="lista-categorias">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
            </>
          )}
        </Campo>
        <Campo etiqueta="Se vende por" error={f.errorDe('unidadMedida')}>
          {(p) => (
            <select {...p} {...f.campo('unidadMedida')} className="entrada">
              {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          )}
        </Campo>
        <Campo etiqueta="Precio de compra" error={f.errorDe('precioCompra')} ayuda="Lo que te cuesta a ti.">
          {(p) => <input {...p} {...f.campo('precioCompra')} className="entrada numeros" inputMode="decimal" placeholder="0.00" />}
        </Campo>
        <Campo etiqueta="Precio de venta" error={f.errorDe('precioVenta')} ayuda={margenTexto ?? 'Lo que paga el cliente.'}>
          {(p) => <input {...p} {...f.campo('precioVenta')} className="entrada numeros" inputMode="decimal" placeholder="0.00" />}
        </Campo>
        <Campo
          etiqueta={`Existencia (${v.unidadMedida})`}
          error={f.errorDe('existencia')}
          ayuda={producto ? 'Las ventas y compras la actualizan solas. Cámbiala solo para ajustar el inventario (merma o conteo físico).' : 'Lo que tienes ahora en bodega y anaquel.'}
          className="formulario__ancho"
        >
          {(p) => (
            <input
              {...p}
              {...f.campo('existencia')}
              className="entrada numeros entrada--media"
              inputMode={esFraccionable(v.unidadMedida) ? 'decimal' : 'numeric'}
            />
          )}
        </Campo>

        {puede('VER_PROVEEDORES') && (
          <fieldset className="formulario__ancho casillas">
            <legend>Proveedores que lo surten <span className="campo__opcional">(opcional)</span></legend>
            <Buscador valor={filtroProv} alCambiar={setFiltroProv} etiqueta="Filtrar proveedores" placeholder="Filtrar proveedores" />
            <div className="casillas__lista">
              {proveedores.map((p) => (
                <label key={p.id} className="casilla">
                  <input
                    type="checkbox"
                    checked={v.proveedores.includes(p.id)}
                    onChange={(e) => f.fijar('proveedores', e.target.checked ? [...v.proveedores, p.id] : v.proveedores.filter((x) => x !== p.id))}
                  />
                  <span>{nombrePropio(p.nombre)} <span className="texto-3">({capitalizar(p.ciudad)})</span></span>
                </label>
              ))}
            </div>
            <p className="campo__ayuda">{v.proveedores.length ? `${v.proveedores.length} seleccionados` : 'Ninguno seleccionado'}</p>
          </fieldset>
        )}

        <MensajeError error={f.errorGeneral} />
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

export default function Productos() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { datos, error, cargando, recargar } = useApi('/productos');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [editando, setEditando] = useState(null); // null | 'nuevo' | producto

  const productos = datos?.productos ?? [];
  const umbral = datos?.umbralStockBajo ?? 10;
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos]);

  const porCategoria = productos.filter((p) => categoria === 'todas' || p.categoria === categoria);
  const conteo = (e) => porCategoria.filter((p) => e === 'todos' || estadoDe(p, umbral) === e).length;
  const q = busqueda.trim().toLowerCase();
  const visibles = porCategoria.filter((p) => (estado === 'todos' || estadoDe(p, umbral) === estado)
    && (!q || p.descripcion.includes(q) || String(p.codigo) === q));

  const puedeEditar = puede('EDITAR_PRODUCTOS');

  const eliminar = async (producto) => {
    const ok = await confirmar({
      titulo: `¿Eliminar ${capitalizar(producto.descripcion)}?`,
      mensaje: 'Solo se pueden eliminar productos que nunca se han vendido ni comprado. Si ya no lo vendes, mejor deja su existencia en 0.',
      accion: 'Eliminar producto',
      cancelar: 'No, conservarlo',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/productos/${producto.codigo}`);
      avisar(`${capitalizar(producto.descripcion)} eliminado`);
      setEditando(null);
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const valorInventario = productos.reduce((s, p) => s + p.existencia * p.precioCompra, 0);

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Productos"
        descripcion={datos ? `${numero(productos.length)} productos en el catálogo; el inventario vale ${moneda(valorInventario)} a costo.` : 'Catálogo e inventario.'}
        acciones={puedeEditar && <Boton variante="primario" icono={LuPlus} onClick={() => setEditando('nuevo')}>Nuevo producto</Boton>}
      />

      <div className="filtros">
        <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar producto" placeholder="Nombre o código" className="filtros__buscador" />
        <Segmentado
          etiqueta="Categoría"
          valor={categoria}
          alCambiar={setCategoria}
          opciones={[{ valor: 'todas', etiqueta: 'Todas' }, ...categorias.map((c) => ({ valor: c, etiqueta: capitalizar(c) }))]}
        />
        <Segmentado
          etiqueta="Existencia"
          valor={estado}
          alCambiar={setEstado}
          opciones={[
            { valor: 'todos', etiqueta: 'Todos', conteo: conteo('todos') },
            { valor: 'disponible', etiqueta: 'Disponibles', conteo: conteo('disponible') },
            { valor: 'bajo', etiqueta: 'Por acabarse', conteo: conteo('bajo') },
            { valor: 'agotado', etiqueta: 'Agotados', conteo: conteo('agotado') },
          ]}
        />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoTabla />}

      {datos && (
        <Panel>
          <Tabla
            etiqueta="Productos"
            clave="codigo"
            cargando={cargando}
            filas={visibles}
            alAbrir={puedeEditar ? (p) => setEditando(p) : undefined}
            ordenInicial={{ clave: 'descripcion', asc: true }}
            porPagina={50}
            columnas={[
              {
                clave: 'descripcion', titulo: 'Producto', ordenable: true,
                render: (p) => (
                  <span className="celda-doble">
                    <span>{capitalizar(p.descripcion)}</span>
                    <span className="celda-doble__detalle">Código {p.codigo}, {p.categoria}</span>
                  </span>
                ),
              },
              {
                clave: 'existencia', titulo: 'Existencia', ordenable: true, alinear: 'der',
                render: (p) => <span className="numeros">{cantidad(p.existencia, p.unidadMedida)}</span>,
              },
              { clave: 'estado', titulo: 'Estado', render: (p) => <InsigniaStock producto={p} umbral={umbral} /> },
              { clave: 'precioCompra', titulo: 'Costo', ordenable: true, alinear: 'der', render: (p) => <span className="numeros">{moneda(p.precioCompra)}</span> },
              { clave: 'precioVenta', titulo: 'Precio', ordenable: true, alinear: 'der', render: (p) => <strong className="numeros">{moneda(p.precioVenta)}</strong> },
              {
                clave: 'margen', titulo: 'Margen', ordenable: true, alinear: 'der', valorOrden: margen,
                render: (p) => <span className="numeros texto-2">{porcentaje(margen(p), 0)}</span>,
              },
              ...(puedeEditar ? [{
                clave: 'acciones', titulo: <span className="solo-lectores">Acciones</span>, alinear: 'der',
                render: (p) => <BotonIcono icono={LuPencil} etiqueta={`Editar ${p.descripcion}`} onClick={() => setEditando(p)} />,
              }] : []),
            ]}
            vacio={<Vacio icono={LuApple} titulo="No hay productos con estos filtros">Cambia la búsqueda o los filtros de arriba.</Vacio>}
          />
        </Panel>
      )}

      <FormularioProducto
        key={editando === null ? 'cerrado' : editando === 'nuevo' ? 'nuevo' : editando.codigo}
        abierto={editando !== null}
        producto={editando === 'nuevo' ? null : editando}
        unidades={datos?.unidades ?? ['kilogramo', 'pieza']}
        categorias={categorias}
        alCerrar={() => setEditando(null)}
        alEliminar={eliminar}
        alGuardar={(p, eraEdicion) => {
          avisar(eraEdicion ? `${capitalizar(p.descripcion)} actualizado` : `${capitalizar(p.descripcion)} agregado con el código ${p.codigo}`);
          setEditando(null);
          recargar();
        }}
      />
    </div>
  );
}
