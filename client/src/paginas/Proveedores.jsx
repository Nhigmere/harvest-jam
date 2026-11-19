// Proveedores y lo que surte cada uno.
import { useState } from 'react';
import { LuPencil, LuPlus, LuTrash2, LuTruck } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { useFormulario } from '../componentes/formulario.js';
import { Tabla } from '../componentes/Tabla.jsx';
import { Boton, Buscador, CabeceraPagina, Campo, Cargando, MensajeError, Panel, Vacio } from '../componentes/ui.jsx';
import { capitalizar, cantidad, fecha, nombrePropio, numero } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';

const VACIO = { nombre: '', ciudad: '', contacto: '', telefono: '' };

function FormularioProveedor({ abierto, proveedor, alCerrar, alGuardar }) {
  const f = useFormulario(proveedor
    ? { nombre: nombrePropio(proveedor.nombre), ciudad: capitalizar(proveedor.ciudad), contacto: nombrePropio(proveedor.contacto ?? ''), telefono: proveedor.telefono ?? '' }
    : VACIO);

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const guardado = proveedor ? await api.put(`/proveedores/${proveedor.id}`, v) : await api.post('/proveedores', v);
      alGuardar(guardado, Boolean(proveedor));
    });
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={proveedor ? `Editar ${nombrePropio(proveedor.nombre)}` : 'Nuevo proveedor'}
      pie={
        <>
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" form="form-proveedor" cargando={f.guardando}>
            {proveedor ? 'Guardar cambios' : 'Agregar proveedor'}
          </Boton>
        </>
      }
    >
      <form id="form-proveedor" className="formulario" onSubmit={guardar} noValidate>
        <Campo etiqueta="Nombre del proveedor" error={f.errorDe('nombre')} className="formulario__ancho">
          {(p) => <input {...p} {...f.campo('nombre')} className="entrada" autoFocus autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Ciudad" error={f.errorDe('ciudad')}>
          {(p) => <input {...p} {...f.campo('ciudad')} className="entrada" autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Teléfono" error={f.errorDe('telefono')}>
          {(p) => <input {...p} {...f.campo('telefono')} className="entrada numeros" inputMode="tel" autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Persona de contacto" error={f.errorDe('contacto')} className="formulario__ancho">
          {(p) => <input {...p} {...f.campo('contacto')} className="entrada" placeholder="Por ejemplo: Sra. Pilar Martínez" autoComplete="off" />}
        </Campo>
        <MensajeError error={f.errorGeneral} />
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

function DetalleProveedor({ id, alCerrar, alEditar, alEliminar }) {
  const { puede } = useSesion();
  const { datos, error, cargando } = useApi(id ? `/proveedores/${id}` : null);
  return (
    <Modal
      abierto={Boolean(id)}
      alCerrar={alCerrar}
      titulo={datos ? nombrePropio(datos.nombre) : 'Proveedor'}
      descripcion={datos ? `${capitalizar(datos.ciudad)}, proveedor ${datos.id}` : undefined}
      ancho="grande"
      pie={datos && (
        <>
          {puede('ELIMINAR_PROVEEDORES') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(datos)} className="modal__accion-izq">Eliminar</Boton>
          )}
          {puede('EDITAR_PROVEEDORES') && <Boton icono={LuPencil} onClick={() => alEditar(datos)}>Editar</Boton>}
          <Boton variante="primario" onClick={alCerrar}>Listo</Boton>
        </>
      )}
    >
      <MensajeError error={error} />
      {cargando && <Cargando />}
      {datos && !cargando && (
        <>
          <dl className="datos-en-linea">
            <div><dt>Contacto</dt><dd>{nombrePropio(datos.contacto ?? '') || '—'}</dd></div>
            <div><dt>Teléfono</dt><dd className="numeros">{datos.telefono ?? '—'}</dd></div>
            <div><dt>Compras</dt><dd>{numero(datos.numCompras)}{datos.ultimaCompra ? `, la última el ${fecha(datos.ultimaCompra)}` : ''}</dd></div>
          </dl>
          <h3 className="subtitulo">Productos que surte</h3>
          {datos.productos.length ? (
            <ul className="lista-simple">
              {datos.productos.map((p) => (
                <li key={p.codigo}>
                  <span>{capitalizar(p.descripcion)}</span>
                  <span className="texto-2 numeros">quedan {cantidad(p.existencia, p.unidadMedida)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto-2">No tiene productos ligados. Puedes ligarlos desde la ficha de cada producto.</p>
          )}
        </>
      )}
    </Modal>
  );
}

export default function Proveedores() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const [busqueda, setBusqueda] = useState('');
  const buscar = useRetardo(busqueda);
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const { datos, error, cargando, recargar } = useApi('/proveedores', { buscar });

  const eliminar = async (proveedor) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${nombrePropio(proveedor.nombre)}?`,
      mensaje: 'Solo se pueden eliminar proveedores sin compras registradas.',
      accion: 'Eliminar proveedor',
      cancelar: 'No, conservarlo',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/proveedores/${proveedor.id}`);
      avisar(`${nombrePropio(proveedor.nombre)} eliminado`);
      setDetalle(null);
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Proveedores"
        descripcion="Quién surte la mercancía y cuándo se le compró por última vez."
        acciones={puede('EDITAR_PROVEEDORES') && <Boton variante="primario" icono={LuPlus} onClick={() => setEditando('nuevo')}>Nuevo proveedor</Boton>}
      />

      <div className="filtros">
        <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar proveedor" placeholder="Nombre, ciudad, contacto o teléfono" className="filtros__buscador" />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoTabla />}

      {datos && (
        <Panel>
          <Tabla
            etiqueta="Proveedores"
            cargando={cargando}
            porPagina={25}
            filas={datos.proveedores}
            alAbrir={(p) => setDetalle(p.id)}
            columnas={[
              {
                clave: 'nombre', titulo: 'Proveedor', ordenable: true,
                render: (p) => (
                  <span className="celda-doble">
                    <span>{nombrePropio(p.nombre)}</span>
                    <span className="celda-doble__detalle">{capitalizar(p.ciudad)}</span>
                  </span>
                ),
              },
              { clave: 'contacto', titulo: 'Contacto', ordenable: true, render: (p) => nombrePropio(p.contacto ?? '') || '—' },
              { clave: 'telefono', titulo: 'Teléfono', render: (p) => <span className="numeros">{p.telefono ?? '—'}</span> },
              { clave: 'numProductos', titulo: 'Productos', ordenable: true, alinear: 'der', render: (p) => <span className="numeros">{p.numProductos}</span> },
              { clave: 'numCompras', titulo: 'Compras', ordenable: true, alinear: 'der', render: (p) => <span className="numeros">{p.numCompras}</span> },
              { clave: 'ultimaCompra', titulo: 'Última compra', ordenable: true, render: (p) => <span className="texto-2">{p.ultimaCompra ? fecha(p.ultimaCompra) : 'Nunca'}</span> },
            ]}
            vacio={<Vacio icono={LuTruck} titulo="Ningún proveedor coincide">Prueba con el nombre, la ciudad o el teléfono.</Vacio>}
          />
        </Panel>
      )}

      <DetalleProveedor
        id={detalle}
        alCerrar={() => setDetalle(null)}
        alEliminar={eliminar}
        alEditar={(p) => {
          setDetalle(null);
          setEditando(p);
        }}
      />

      <FormularioProveedor
        key={editando === null ? 'cerrado' : editando === 'nuevo' ? 'nuevo' : editando.id}
        abierto={editando !== null}
        proveedor={editando === 'nuevo' ? null : editando}
        alCerrar={() => setEditando(null)}
        alGuardar={(p, eraEdicion) => {
          avisar(eraEdicion ? `${nombrePropio(p.nombre)} actualizado` : `${nombrePropio(p.nombre)} agregado`);
          setEditando(null);
          recargar();
        }}
      />
    </div>
  );
}
