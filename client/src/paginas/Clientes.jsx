// Cartera de clientes (personas físicas y morales).
import { useEffect, useState } from 'react';
import { LuPencil, LuTrash2, LuUserPlus, LuUsers } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { useFormulario } from '../componentes/formulario.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, BotonIcono, Buscador, CabeceraPagina, Campo, Cargando, Insignia, MensajeError, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { capitalizar, nombrePropio } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';
import { useNavegar, useUbicacion } from '../router.jsx';

const VACIO = { tipo: 'fisica', nombre: '', telefono: '', rfc: '', domicilio: '' };

function FormularioCliente({ abierto, cliente, alCerrar, alGuardar, alEliminar }) {
  const { puede } = useSesion();
  const f = useFormulario(cliente
    ? { tipo: cliente.tipo, nombre: nombrePropio(cliente.nombre), telefono: cliente.telefono ?? '', rfc: cliente.rfc ?? '', domicilio: capitalizar(cliente.domicilio ?? '') }
    : VACIO);
  const esFisica = f.valores.tipo === 'fisica';

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const cuerpo = { ...v, rfc: v.rfc.trim() || null };
      const guardado = cliente ? await api.put(`/clientes/${cliente.id}`, cuerpo) : await api.post('/clientes', cuerpo);
      alGuardar(guardado, Boolean(cliente));
    });
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={cliente ? `Editar ${nombrePropio(cliente.nombre)}` : 'Nuevo cliente'}
      descripcion={cliente ? `Cliente ${cliente.id}` : undefined}
      pie={
        <>
          {cliente && puede('ELIMINAR_CLIENTES') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(cliente)} className="modal__accion-izq">Eliminar</Boton>
          )}
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" form="form-cliente" cargando={f.guardando}>
            {cliente ? 'Guardar cambios' : 'Agregar cliente'}
          </Boton>
        </>
      }
    >
      <form id="form-cliente" className="formulario" onSubmit={guardar} noValidate>
        <fieldset className="formulario__ancho opciones-radio">
          <legend>Tipo de persona</legend>
          <label className="opcion-radio">
            <input type="radio" name="tipo" value="fisica" checked={esFisica} onChange={() => f.fijar('tipo', 'fisica')} />
            <span>Persona física<span className="opcion-radio__detalle">Una persona con nombre y apellidos</span></span>
          </label>
          <label className="opcion-radio">
            <input type="radio" name="tipo" value="moral" checked={!esFisica} onChange={() => f.fijar('tipo', 'moral')} />
            <span>Persona moral<span className="opcion-radio__detalle">Un negocio o empresa</span></span>
          </label>
        </fieldset>

        <Campo etiqueta={esFisica ? 'Nombre completo' : 'Razón social'} error={f.errorDe('nombre')} className="formulario__ancho">
          {(p) => <input {...p} {...f.campo('nombre')} className="entrada" autoFocus autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Teléfono" error={f.errorDe('telefono')} ayuda="10 dígitos; sirve para mandar el ticket por WhatsApp.">
          {(p) => <input {...p} {...f.campo('telefono')} className="entrada numeros" inputMode="tel" autoComplete="off" />}
        </Campo>
        <Campo etiqueta="RFC" opcional error={f.errorDe('rfc')} ayuda={esFisica ? '13 caracteres.' : '12 caracteres.'}>
          {(p) => (
            <input
              {...p}
              name="rfc"
              value={f.valores.rfc}
              onChange={(e) => f.fijar('rfc', e.target.value.toUpperCase())}
              className="entrada numeros"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Campo>
        <Campo etiqueta="Domicilio" error={f.errorDe('domicilio')} className="formulario__ancho">
          {(p) => <input {...p} {...f.campo('domicilio')} className="entrada" autoComplete="off" />}
        </Campo>

        <MensajeError error={f.errorGeneral} />
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

export default function Clientes() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { search } = useUbicacion();
  const navegar = useNavegar();
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [editando, setEditando] = useState(null);
  const buscar = useRetardo(busqueda);

  const { datos, error, cargando, recargar } = useApi('/clientes', { buscar, tipo: tipo === 'todos' ? null : tipo });
  const puedeEditar = puede('EDITAR_CLIENTES');

  useEffect(() => {
    if (new URLSearchParams(search).get('nuevo') && puedeEditar) {
      setEditando('nuevo');
      navegar('/clientes', { reemplazar: true });
    }
  }, [search, puedeEditar, navegar]);

  const eliminar = async (cliente) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${nombrePropio(cliente.nombre)}?`,
      mensaje: 'Solo se pueden eliminar clientes sin ventas registradas.',
      accion: 'Eliminar cliente',
      cancelar: 'No, conservarlo',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/clientes/${cliente.id}`);
      avisar(`${nombrePropio(cliente.nombre)} eliminado`);
      setEditando(null);
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const conteo = datos?.conteo;

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Clientes"
        descripcion="Personas y negocios a quienes se les vende con nombre. Las ventas de mostrador van a público en general."
        acciones={puedeEditar && <Boton variante="primario" icono={LuUserPlus} onClick={() => setEditando('nuevo')}>Nuevo cliente</Boton>}
      />

      <div className="filtros">
        <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar cliente" placeholder="Nombre, RFC, teléfono o domicilio" className="filtros__buscador" />
        <Segmentado
          etiqueta="Tipo de persona"
          valor={tipo}
          alCambiar={setTipo}
          opciones={[
            { valor: 'todos', etiqueta: 'Todos', conteo: conteo?.total },
            { valor: 'fisica', etiqueta: 'Personas físicas', conteo: conteo?.fisica },
            { valor: 'moral', etiqueta: 'Personas morales', conteo: conteo?.moral },
          ]}
        />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <Cargando />}

      {datos && (
        <Panel>
          <Tabla
            etiqueta="Clientes"
            cargando={cargando}
            porPagina={25}
            filas={datos.clientes}
            alAbrir={puedeEditar ? (c) => !c.publicoGeneral && setEditando(c) : undefined}
            columnas={[
              {
                clave: 'nombre', titulo: 'Nombre o razón social', ordenable: true,
                valorOrden: (c) => (c.publicoGeneral ? '' : c.nombre),
                render: (c) => (
                  <span className="celda-doble">
                    <span>{c.publicoGeneral ? 'Público en general' : nombrePropio(c.nombre)}</span>
                    <span className="celda-doble__detalle">Cliente {c.id}</span>
                  </span>
                ),
              },
              {
                clave: 'tipo', titulo: 'Tipo', ordenable: true,
                render: (c) => (c.publicoGeneral
                  ? <Insignia tono="info" icono={false}>Mostrador</Insignia>
                  : <Insignia tono="neutro" icono={false}>{c.tipo === 'fisica' ? 'Física' : 'Moral'}</Insignia>),
              },
              { clave: 'rfc', titulo: 'RFC', render: (c) => <span className="numeros">{c.rfc ?? '—'}</span> },
              { clave: 'telefono', titulo: 'Teléfono', render: (c) => <span className="numeros">{c.telefono ?? '—'}</span> },
              { clave: 'domicilio', titulo: 'Domicilio', render: (c) => <span className="texto-2">{capitalizar(c.domicilio ?? '') || '—'}</span> },
              ...(puedeEditar ? [{
                clave: 'acciones', titulo: <span className="solo-lectores">Acciones</span>, alinear: 'der',
                render: (c) => !c.publicoGeneral && <BotonIcono icono={LuPencil} etiqueta={`Editar ${c.nombre}`} onClick={() => setEditando(c)} />,
              }] : []),
            ]}
            vacio={<Vacio icono={LuUsers} titulo="Ningún cliente coincide">Prueba con otra parte del nombre, el RFC o el teléfono.</Vacio>}
          />
        </Panel>
      )}

      <FormularioCliente
        key={editando === null ? 'cerrado' : editando === 'nuevo' ? 'nuevo' : editando.id}
        abierto={editando !== null}
        cliente={editando === 'nuevo' ? null : editando}
        alCerrar={() => setEditando(null)}
        alEliminar={eliminar}
        alGuardar={(c, eraEdicion) => {
          avisar(eraEdicion ? `${nombrePropio(c.nombre)} actualizado` : `${nombrePropio(c.nombre)} agregado`);
          setEditando(null);
          recargar();
        }}
      />
    </div>
  );
}
