// Personal, turnos, salarios y supervisores.
import { useState } from 'react';
import { LuIdCard, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { useFormulario } from '../componentes/formulario.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, BotonIcono, Buscador, CabeceraPagina, Campo, Cargando, Insignia, MensajeError, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { capitalizar, moneda, nombrePropio, numero } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';

const VACIO = { nombre: '', turno: 'matutino', salario: '', usuario: '', supervisorId: '' };

function FormularioEmpleado({ abierto, empleado, todos, alCerrar, alGuardar, alEliminar }) {
  const { puede, usuario } = useSesion();
  const f = useFormulario(empleado
    ? { nombre: nombrePropio(empleado.nombre), turno: empleado.turno, salario: String(empleado.salario), usuario: empleado.usuario ?? '', supervisorId: empleado.supervisorId ? String(empleado.supervisorId) : '' }
    : VACIO);

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const cuerpo = { ...v, salario: v.salario === '' ? null : Number(v.salario), supervisorId: v.supervisorId ? Number(v.supervisorId) : null, usuario: v.usuario.trim() || null };
      const guardado = empleado ? await api.put(`/empleados/${empleado.id}`, cuerpo) : await api.post('/empleados', cuerpo);
      alGuardar(guardado, Boolean(empleado));
    });
  };

  const esYo = empleado && empleado.id === usuario.empleado?.id;

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={empleado ? `Editar a ${nombrePropio(empleado.nombre)}` : 'Nuevo empleado'}
      descripcion={empleado ? `Empleado ${empleado.id}` : undefined}
      pie={
        <>
          {empleado && puede('ELIMINAR_EMPLEADOS') && !esYo && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(empleado)} className="modal__accion-izq">Eliminar</Boton>
          )}
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" form="form-empleado" cargando={f.guardando}>
            {empleado ? 'Guardar cambios' : 'Agregar empleado'}
          </Boton>
        </>
      }
    >
      <form id="form-empleado" className="formulario" onSubmit={guardar} noValidate>
        <Campo etiqueta="Nombre completo" error={f.errorDe('nombre')} className="formulario__ancho">
          {(p) => <input {...p} {...f.campo('nombre')} className="entrada" autoFocus autoComplete="off" />}
        </Campo>
        <Campo etiqueta="Turno" error={f.errorDe('turno')}>
          {(p) => (
            <select {...p} {...f.campo('turno')} className="entrada">
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
              <option value="nocturno">Nocturno</option>
            </select>
          )}
        </Campo>
        <Campo etiqueta="Salario" error={f.errorDe('salario')}>
          {(p) => <input {...p} {...f.campo('salario')} className="entrada numeros" inputMode="decimal" placeholder="0.00" />}
        </Campo>
        <Campo etiqueta="Supervisor" opcional error={f.errorDe('supervisorId')}>
          {(p) => (
            <select {...p} {...f.campo('supervisorId')} className="entrada">
              <option value="">Sin supervisor</option>
              {todos.filter((e) => e.id !== empleado?.id).map((e) => (
                <option key={e.id} value={e.id}>{nombrePropio(e.nombre)}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo
          etiqueta="Usuario para entrar al sistema"
          opcional
          error={f.errorDe('usuario')}
          ayuda="Su usuario de PostgreSQL (por ejemplo maria_lopez). El administrador de la base lo crea con su rol."
        >
          {(p) => <input {...p} {...f.campo('usuario')} className="entrada numeros" autoComplete="off" spellCheck={false} autoCapitalize="none" />}
        </Campo>
        <MensajeError error={f.errorGeneral} />
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

export default function Empleados() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const [busqueda, setBusqueda] = useState('');
  const [turno, setTurno] = useState('todos');
  const [editando, setEditando] = useState(null);
  const buscar = useRetardo(busqueda);
  const { datos, error, cargando, recargar } = useApi('/empleados', { buscar, turno: turno === 'todos' ? null : turno });
  const todos = useApi('/empleados');
  const puedeEditar = puede('EDITAR_EMPLEADOS');

  const eliminar = async (empleado) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${nombrePropio(empleado.nombre)}?`,
      mensaje: 'Solo se pueden eliminar empleados que no tengan ventas ni compras registradas.',
      accion: 'Eliminar empleado',
      cancelar: 'No, conservarlo',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/empleados/${empleado.id}`);
      avisar(`${nombrePropio(empleado.nombre)} eliminado`);
      setEditando(null);
      recargar();
      todos.recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const nomina = (datos?.empleados ?? []).reduce((s, e) => s + e.salario, 0);

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Empleados"
        descripcion="Personal de la frutería, sus turnos y a quién reportan."
        acciones={puedeEditar && <Boton variante="primario" icono={LuPlus} onClick={() => setEditando('nuevo')}>Nuevo empleado</Boton>}
      />

      <div className="filtros">
        <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar empleado" placeholder="Nombre, turno o usuario" className="filtros__buscador" />
        <Segmentado
          etiqueta="Turno"
          valor={turno}
          alCambiar={setTurno}
          opciones={[
            { valor: 'todos', etiqueta: 'Todos' },
            { valor: 'matutino', etiqueta: 'Matutino' },
            { valor: 'vespertino', etiqueta: 'Vespertino' },
            { valor: 'nocturno', etiqueta: 'Nocturno' },
          ]}
        />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <Cargando />}

      {datos && (
        <Panel>
          <Tabla
            etiqueta="Empleados"
            cargando={cargando}
            porPagina={25}
            filas={datos.empleados}
            alAbrir={puedeEditar ? (e) => setEditando(e) : undefined}
            columnas={[
              {
                clave: 'nombre', titulo: 'Nombre', ordenable: true,
                render: (e) => (
                  <span className="celda-doble">
                    <span>{nombrePropio(e.nombre)}</span>
                    <span className="celda-doble__detalle">{e.usuario ? `Entra como ${e.usuario}` : `Empleado ${e.id}`}</span>
                  </span>
                ),
              },
              { clave: 'turno', titulo: 'Turno', ordenable: true, render: (e) => <Insignia tono="neutro" icono={false}>{capitalizar(e.turno)}</Insignia> },
              { clave: 'salario', titulo: 'Salario', ordenable: true, alinear: 'der', render: (e) => <span className="numeros">{moneda(e.salario)}</span> },
              { clave: 'supervisorNombre', titulo: 'Supervisor', ordenable: true, render: (e) => (e.supervisorNombre ? nombrePropio(e.supervisorNombre) : <span className="texto-3">—</span>) },
              ...(puedeEditar ? [{
                clave: 'acciones', titulo: <span className="solo-lectores">Acciones</span>, alinear: 'der',
                render: (e) => <BotonIcono icono={LuPencil} etiqueta={`Editar a ${e.nombre}`} onClick={() => setEditando(e)} />,
              }] : []),
            ]}
            vacio={<Vacio icono={LuIdCard} titulo="Ningún empleado coincide">Prueba con otro nombre o turno.</Vacio>}
          />
          <p className="panel__pie texto-2">
            Suma de salarios de {datos.empleados.length === 1 ? 'este empleado' : `estos ${numero(datos.empleados.length)} empleados`}: {moneda(nomina)}
          </p>
        </Panel>
      )}

      <FormularioEmpleado
        key={editando === null ? 'cerrado' : editando === 'nuevo' ? 'nuevo' : editando.id}
        abierto={editando !== null}
        empleado={editando === 'nuevo' ? null : editando}
        todos={todos.datos?.empleados ?? []}
        alCerrar={() => setEditando(null)}
        alEliminar={eliminar}
        alGuardar={(e, eraEdicion) => {
          avisar(eraEdicion ? `${nombrePropio(e.nombre)} actualizado` : `${nombrePropio(e.nombre)} agregado`);
          setEditando(null);
          recargar();
          todos.recargar();
        }}
      />
    </div>
  );
}
