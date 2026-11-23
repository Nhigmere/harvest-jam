// Personal, turnos, salarios y supervisores: fichas editoriales, cobertura de turnos, recordatorios y notas.
import { useEffect, useMemo, useState } from 'react';
import {
  LuBellPlus, LuClock, LuIdCard, LuKeyRound, LuMoon, LuPencil, LuPlus, LuShieldCheck, LuSun, LuSunset, LuTrash2,
  LuUsers, LuWallet,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { PanelNotas, PanelRecordatorios } from '../componentes/AgendaContactos.jsx';
import {
  ChipsFiltro, Drawer, EsqueletoFichas, Monograma, ResumenCatalogo, SwitchVista, useVistaCatalogo,
} from '../componentes/Catalogo.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { useFormulario } from '../componentes/formulario.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, BotonIcono, Buscador, CabeceraPagina, Campo, Insignia, MensajeError, Paginacion, Panel, Vacio,
} from '../componentes/ui.jsx';
import { capitalizar, moneda, monedaRedonda, nombrePropio, numero, plural } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';

const VACIO = { nombre: '', turno: 'matutino', salario: '', supervisorId: '' };

const TURNO_INFO = {
  matutino: { tono: 'oro', icono: LuSun, etiqueta: 'Matutino' },
  vespertino: { tono: 'terracota', icono: LuSunset, etiqueta: 'Vespertino' },
  nocturno: { tono: 'cielo', icono: LuMoon, etiqueta: 'Nocturno' },
};

function FormularioEmpleado({ abierto, empleado, todos, alCerrar, alGuardar, alEliminar }) {
  const { puede, usuario } = useSesion();
  const f = useFormulario(empleado
    ? { nombre: nombrePropio(empleado.nombre), turno: empleado.turno, salario: String(empleado.salario), supervisorId: empleado.supervisorId ? String(empleado.supervisorId) : '' }
    : VACIO);

  const guardar = (e) => {
    e.preventDefault();
    f.enviar(async (v) => {
      const cuerpo = { ...v, salario: v.salario === '' ? null : Number(v.salario), supervisorId: v.supervisorId ? Number(v.supervisorId) : null };
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
        <Campo etiqueta="Supervisor" opcional error={f.errorDe('supervisorId')} className="formulario__ancho">
          {(p) => (
            <select {...p} {...f.campo('supervisorId')} className="entrada">
              <option value="">Sin supervisor</option>
              {todos.filter((e) => e.id !== empleado?.id).map((e) => (
                <option key={e.id} value={e.id}>{nombrePropio(e.nombre)}</option>
              ))}
            </select>
          )}
        </Campo>
        <MensajeError error={f.errorGeneral} />
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

function InspectorEmpleado({ empleado, todos, alCerrar, alEditar, alEliminar, alSeleccionar }) {
  const { puede, usuario } = useSesion();
  const info = empleado ? (TURNO_INFO[empleado.turno] ?? TURNO_INFO.matutino) : TURNO_INFO.matutino;
  const esYo = empleado && empleado.id === usuario.empleado?.id;
  const equipo = empleado ? todos.filter((e) => e.supervisorId === empleado.id) : [];

  return (
    <Drawer
      abierto={Boolean(empleado)}
      alCerrar={alCerrar}
      titulo={empleado ? nombrePropio(empleado.nombre) : 'Empleado'}
      subtitulo={empleado ? `Empleado #${empleado.id}${esYo ? ' · Tu perfil' : ''}` : undefined}
      insignia={empleado && <Insignia tono="info" icono={info.icono}>{info.etiqueta}</Insignia>}
      monograma={empleado && <Monograma texto={empleado.nombre} tono={info.tono} forma="circulo" talla="grande" />}
      pie={empleado && (
        <>
          {puede('ELIMINAR_EMPLEADOS') && !esYo && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(empleado)} className="modal__accion-izq">
              Eliminar
            </Boton>
          )}
          {puede('EDITAR_EMPLEADOS') && <Boton icono={LuPencil} onClick={() => alEditar(empleado)}>Editar</Boton>}
          <Boton variante="primario" onClick={alCerrar}>Listo</Boton>
        </>
      )}
    >
      {empleado && (
        <>
          <div className="drawer__stats">
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">Salario</span>
              <span className="drawer__stat-valor drawer__stat-valor--oro">{moneda(empleado.salario)}</span>
            </div>
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">A su cargo</span>
              <span className="drawer__stat-valor">{numero(equipo.length)}</span>
            </div>
          </div>

          <div className="drawer__seccion">
            <h3 className="drawer__seccion-titulo">Información laboral</h3>
            <div className="drawer__datos">
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><info.icono aria-hidden="true" /> Turno</span>
                <span className="drawer__dato-valor">{info.etiqueta}</span>
              </div>
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuShieldCheck aria-hidden="true" /> Supervisor</span>
                <span className="drawer__dato-valor">{empleado.supervisorNombre ? nombrePropio(empleado.supervisorNombre) : 'Sin supervisor'}</span>
              </div>
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuKeyRound aria-hidden="true" /> Acceso al sistema</span>
                <span className="drawer__dato-valor">{empleado.usuario ? 'Cuenta habilitada' : 'Sin acceso'}</span>
              </div>
            </div>
          </div>

          {equipo.length > 0 && (
            <div className="drawer__seccion">
              <h3 className="drawer__seccion-titulo">Equipo a su cargo ({numero(equipo.length)})</h3>
              <ul className="lista-opciones" style={{ marginTop: 0 }}>
                {equipo.map((sub) => (
                  <li key={sub.id}>
                    <button type="button" className="lista-opciones__opcion" onClick={() => alSeleccionar(sub)}>
                      <span>
                        <span className="lista-opciones__titulo">{nombrePropio(sub.nombre)}</span>
                        <span className="lista-opciones__detalle">{capitalizar(sub.turno)}</span>
                      </span>
                      <span className="texto-2 numeros">{moneda(sub.salario)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

export default function Empleados() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const [busqueda, setBusqueda] = useState('');
  const [turno, setTurno] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [vista, setVista] = useVistaCatalogo('empleados');
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const [paraAgendar, setParaAgendar] = useState(null);
  const buscar = useRetardo(busqueda);
  const { datos, error, cargando, recargar } = useApi('/empleados', { buscar, turno: turno === 'todos' ? null : turno });
  const todos = useApi('/empleados');
  const puedeEditar = puede('EDITAR_EMPLEADOS');

  useEffect(() => setPagina(1), [buscar, turno, vista]);

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
      setDetalle(null);
      setEditando(null);
      recargar();
      todos.recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const listaCompleta = todos.datos?.empleados ?? [];
  const empleados = datos?.empleados ?? [];
  const nomina = empleados.reduce((s, e) => s + e.salario, 0);
  const conAcceso = empleados.filter((e) => Boolean(e.usuario)).length;
  const contarTurno = (t) => listaCompleta.filter((e) => e.turno === t).length;
  const POR_PAGINA_FICHAS = 8;

  const paginados = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA_FICHAS;
    return empleados.slice(inicio, inicio + POR_PAGINA_FICHAS);
  }, [empleados, pagina]);

  const resumenTurnos = useMemo(() => {
    const total = Math.max(listaCompleta.length, 1);
    return ['matutino', 'vespertino', 'nocturno'].map((t) => {
      const grupo = listaCompleta.filter((e) => e.turno === t);
      const monto = grupo.reduce((s, e) => s + Number(e.salario || 0), 0);
      return {
        clave: t,
        ...TURNO_INFO[t],
        cantidad: grupo.length,
        pct: Math.round((grupo.length / total) * 100),
        nomina: monto,
      };
    });
  }, [listaCompleta]);

  const supervisores = useMemo(() => {
    const conteoCargo = new Map();
    for (const e of listaCompleta) {
      if (e.supervisorId) conteoCargo.set(e.supervisorId, (conteoCargo.get(e.supervisorId) ?? 0) + 1);
    }
    return listaCompleta
      .filter((e) => conteoCargo.has(e.id) || Boolean(e.usuario))
      .sort((a, b) => (conteoCargo.get(b.id) ?? 0) - (conteoCargo.get(a.id) ?? 0))
      .slice(0, 4)
      .map((e) => ({
        ...e,
        aCargo: conteoCargo.get(e.id) ?? 0,
      }));
  }, [listaCompleta]);

  const opcionesRecordatorio = useMemo(
    () => listaCompleta.map((e) => ({ id: e.id, nombre: nombrePropio(e.nombre) })),
    [listaCompleta],
  );

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Empleados"
        descripcion="Personal de la frutería, sus turnos, salarios y estructura de supervisión."
        acciones={puedeEditar && <Boton variante="primario" icono={LuPlus} onClick={() => setEditando('nuevo')}>Nuevo empleado</Boton>}
      />

      {datos && (
        <ResumenCatalogo
          items={[
            { icono: LuUsers, etiqueta: 'Personal', valor: numero(empleados.length), detalle: turno === 'todos' ? 'en nómina activa' : `turno ${turno}` },
            { icono: LuWallet, etiqueta: 'Nómina visible', valor: monedaRedonda(nomina), detalle: plural(empleados.length, 'empleado', 'empleados') },
            { icono: LuKeyRound, etiqueta: 'Con acceso', valor: numero(conAcceso), detalle: 'usuarios de sistema', tono: 'esmeralda' },
            { icono: LuSun, etiqueta: 'Matutino', valor: numero(contarTurno('matutino')), detalle: `${numero(contarTurno('vespertino'))} vesp. · ${numero(contarTurno('nocturno'))} noct.`, alClick: () => setTurno(turno === 'matutino' ? 'todos' : 'matutino') },
          ]}
        />
      )}

      <div className="directorio-dividido">
        <div className="directorio-dividido__principal">
          <div className="catalogo-controles">
            <div className="catalogo-barra">
              <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar empleado" placeholder="Nombre o turno" />
              <SwitchVista vista={vista} alCambiar={setVista} />
            </div>
            <ChipsFiltro
              etiqueta="Turno"
              valor={turno}
              alCambiar={setTurno}
              opciones={[
                { valor: 'todos', etiqueta: 'Todos', conteo: listaCompleta.length || undefined },
                { valor: 'matutino', etiqueta: 'Matutino', icono: LuSun, conteo: listaCompleta.length ? contarTurno('matutino') : undefined },
                { valor: 'vespertino', etiqueta: 'Vespertino', icono: LuSunset, conteo: listaCompleta.length ? contarTurno('vespertino') : undefined },
                { valor: 'nocturno', etiqueta: 'Nocturno', icono: LuMoon, conteo: listaCompleta.length ? contarTurno('nocturno') : undefined },
              ]}
            />
          </div>

          <MensajeError error={error} alReintentar={recargar} />
          {cargando && !datos && (vista === 'tarjetas' ? <EsqueletoFichas cantidad={6} /> : <EsqueletoTabla />)}

          {datos && vista === 'tarjetas' && (
            empleados.length ? (
              <>
                <div className={`fichas-grid fichas-grid--compacto ${cargando ? 'recargando' : ''}`}>
                  {paginados.map((e) => {
                    const info = TURNO_INFO[e.turno] ?? TURNO_INFO.matutino;
                    const IconoTurno = info.icono;
                    return (
                      <article
                        key={e.id}
                        className={`ficha ficha--${info.tono} ${detalle?.id === e.id ? 'ficha--activa' : ''}`}
                        tabIndex={0}
                        role="button"
                        onClick={() => setDetalle(e)}
                        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setDetalle(e); } }}
                      >
                        <div className="ficha__cabecera">
                          <Monograma texto={e.nombre} tono={info.tono} forma="circulo" />
                          <div className="ficha__titulos">
                            <h3 className="ficha__nombre">{nombrePropio(e.nombre)}</h3>
                            <span className="ficha__sub">Empleado #{e.id}</span>
                          </div>
                          <Insignia tono="neutro" icono={IconoTurno}>{info.etiqueta}</Insignia>
                        </div>

                        <div className="ficha__detalles">
                          <div className="ficha__linea">
                            <span className="ficha__linea-izq">
                              <LuShieldCheck aria-hidden="true" />
                              <span>{e.supervisorNombre ? `Reporta a ${nombrePropio(e.supervisorNombre)}` : 'Sin supervisor asignado'}</span>
                            </span>
                          </div>
                          <div className="ficha__linea">
                            <span className="ficha__linea-izq">
                              <LuKeyRound aria-hidden="true" />
                              <span>{e.usuario ? 'Acceso habilitado' : 'Sin usuario de sistema'}</span>
                            </span>
                            <button
                              type="button"
                              className="ficha__copiar"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setParaAgendar({ id: e.id, nombre: nombrePropio(e.nombre), motivoSugerido: 'Seguimiento de turno o nómina' });
                              }}
                              aria-label={`Agendar pendiente con ${nombrePropio(e.nombre)}`}
                            >
                              <LuBellPlus aria-hidden="true" /> Agendar
                            </button>
                          </div>
                        </div>

                        <div className="ficha__pie">
                          <span className="texto-3">Salario</span>
                          <span className="ficha__pie-monto">{moneda(e.salario)}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {empleados.length > POR_PAGINA_FICHAS && (
                  <div className="panel panel--paginacion">
                    <Paginacion pagina={pagina} limite={POR_PAGINA_FICHAS} total={empleados.length} alCambiar={setPagina} />
                  </div>
                )}
              </>
            ) : (
              <Panel>
                <Vacio icono={LuIdCard} titulo="Ningún empleado coincide">Prueba con otro nombre o turno.</Vacio>
              </Panel>
            )
          )}

          {datos && vista === 'tabla' && (
            <Panel>
              <Tabla
                etiqueta="Empleados"
                cargando={cargando}
                porPagina={12}
                filas={empleados}
                alAbrir={(e) => setDetalle(e)}
                columnas={[
                  {
                    clave: 'nombre', titulo: 'Nombre', ordenable: true,
                    render: (e) => (
                      <span className="celda-doble">
                        <span>{nombrePropio(e.nombre)}</span>
                        <span className="celda-doble__detalle">Empleado #{e.id}{e.usuario ? ' · Cuenta activa' : ''}</span>
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
                Suma de salarios de {empleados.length === 1 ? 'este empleado' : `estos ${numero(empleados.length)} empleados`}: {moneda(nomina)}
              </p>
            </Panel>
          )}
        </div>

        <aside className="agenda-lateral" aria-label="Turnos, recordatorios y notas del personal">
          {/* 1. COBERTURA DE TURNOS Y SUPERVISORES */}
          <section className="panel glass-card lujo-brillo agenda-card">
            <header className="agenda-card__cabecera">
              <div className="agenda-card__titulo-bloque">
                <span className="agenda-card__icono agenda-card__icono--esmeralda" aria-hidden="true"><LuClock /></span>
                <div>
                  <h2>Cobertura de turnos</h2>
                  <p className="agenda-card__sub">Pulsa un turno para filtrar al personal y ver su nómina.</p>
                </div>
              </div>
            </header>

            <div className="turno-barras">
              {resumenTurnos.map((t) => {
                const Icono = t.icono;
                const activo = turno === t.clave;
                return (
                  <button
                    key={t.clave}
                    type="button"
                    className={`turno-barra ${activo ? 'turno-barra--activa' : ''}`}
                    onClick={() => setTurno(activo ? 'todos' : t.clave)}
                  >
                    <div className="turno-barra__top">
                      <span className="turno-barra__etiqueta">
                        <Icono aria-hidden="true" />
                        {t.etiqueta}
                      </span>
                      <span className="turno-barra__cifras numeros">
                        <strong>{numero(t.cantidad)}</strong> · {monedaRedonda(t.nomina)}
                      </span>
                    </div>
                    <span className="turno-barra__pista" aria-hidden="true">
                      <span className="turno-barra__relleno" style={{ width: `${Math.max(t.pct, t.cantidad ? 10 : 0)}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>

            {supervisores.length > 0 && (
              <div className="turno-lideres">
                <span className="turno-lideres__titulo">Supervisores y cuentas activas</span>
                <ul className="agenda-rapidos">
                  {supervisores.map((s) => {
                    const info = TURNO_INFO[s.turno] ?? TURNO_INFO.matutino;
                    return (
                      <li key={s.id} className="agenda-rapido">
                        <button type="button" className="agenda-rapido__info" onClick={() => setDetalle(s)}>
                          <Monograma texto={s.nombre} tono={info.tono} forma="circulo" />
                          <span className="agenda-rapido__texto">
                            <span className="agenda-rapido__nombre">{nombrePropio(s.nombre)}</span>
                            <span className="agenda-rapido__meta">
                              {info.etiqueta} · {s.aCargo > 0 ? plural(s.aCargo, 'persona a cargo', 'personas a cargo') : 'Cuenta activa'}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="agenda-icon-btn agenda-icon-btn--oro"
                          title="Agendar pendiente"
                          aria-label={`Agendar pendiente con ${nombrePropio(s.nombre)}`}
                          onClick={() => setParaAgendar({ id: s.id, nombre: nombrePropio(s.nombre), motivoSugerido: 'Revisión de turno' })}
                        >
                          <LuBellPlus aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* 2. RECORDATORIOS DE PERSONAL */}
          <PanelRecordatorios
            clave="empleados"
            titulo="Recordatorios de personal"
            subtituloSingular="pendiente"
            subtituloPlural="pendientes"
            etiquetaEntidad="empleado"
            placeholderMotivo="Ej. Cambio de turno, capacitación o pago de nómina"
            textoVacio="Agenda cambios de turno, pagos o capacitaciones desde aquí o desde cualquier ficha."
            opciones={opcionesRecordatorio}
            preseleccion={paraAgendar}
            alConsumirPreseleccion={() => setParaAgendar(null)}
            avisar={avisar}
          />

          {/* 3. NOTAS DE EQUIPO */}
          <PanelNotas
            clave="empleados"
            titulo="Notas de personal"
            subtitulo="Incidencias, descansos o avisos internos guardados en este equipo."
            placeholder="Ej. El sábado abre turno matutino a las 7:00…"
          />
        </aside>
      </div>

      <InspectorEmpleado
        empleado={detalle}
        todos={listaCompleta}
        alCerrar={() => setDetalle(null)}
        alSeleccionar={(sub) => setDetalle(sub)}
        alEliminar={eliminar}
        alEditar={(e) => {
          setDetalle(null);
          setEditando(e);
        }}
      />

      <FormularioEmpleado
        key={editando === null ? 'cerrado' : editando === 'nuevo' ? 'nuevo' : editando.id}
        abierto={editando !== null}
        empleado={editando === 'nuevo' ? null : editando}
        todos={listaCompleta}
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
