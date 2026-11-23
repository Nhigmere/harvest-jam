// Cartera de clientes: fichas editoriales, agenda de seguimiento e inspector lateral con WhatsApp.
import { useEffect, useMemo, useState } from 'react';
import {
  LuBellPlus, LuBuilding2, LuCopy, LuFileText, LuMapPin, LuMessageCircle, LuPencil, LuPhone, LuStore, LuTrash2,
  LuUser, LuUserPlus, LuUsers,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { AgendaContactos } from '../componentes/AgendaContactos.jsx';
import {
  ChipsFiltro, copiarTexto, Drawer, EsqueletoFichas, Monograma, ResumenCatalogo, SwitchVista, tonoDeTexto,
  useVistaCatalogo,
} from '../componentes/Catalogo.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { useFormulario } from '../componentes/formulario.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, BotonIcono, Buscador, CabeceraPagina, Campo, Insignia, MensajeError, Paginacion, Panel, Vacio,
} from '../componentes/ui.jsx';
import { capitalizar, nombrePropio, numero, telefonoWhatsApp } from '../formato.js';
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

function InspectorCliente({ cliente, alCerrar, alEditar, alEliminar, avisar }) {
  const { puede } = useSesion();
  const wa = telefonoWhatsApp(cliente?.telefono);
  const tono = cliente?.publicoGeneral ? 'oro' : cliente?.tipo === 'moral' ? 'cielo' : tonoDeTexto(cliente?.nombre);

  return (
    <Drawer
      abierto={Boolean(cliente)}
      alCerrar={alCerrar}
      titulo={cliente ? (cliente.publicoGeneral ? 'Público en general' : nombrePropio(cliente.nombre)) : 'Cliente'}
      subtitulo={cliente ? `Cliente #${cliente.id}` : undefined}
      insignia={cliente && (
        cliente.publicoGeneral
          ? <Insignia tono="info" icono={false}>Mostrador</Insignia>
          : <Insignia tono="neutro" icono={false}>{cliente.tipo === 'fisica' ? 'Persona física' : 'Persona moral'}</Insignia>
      )}
      monograma={cliente && (
        <Monograma
          texto={cliente.nombre}
          tono={tono}
          icono={cliente.publicoGeneral ? LuStore : cliente.tipo === 'moral' ? LuBuilding2 : undefined}
          forma={cliente.tipo === 'fisica' && !cliente.publicoGeneral ? 'circulo' : 'suave'}
          talla="grande"
        />
      )}
      pie={cliente && (
        <>
          {!cliente.publicoGeneral && puede('ELIMINAR_CLIENTES') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(cliente)} className="modal__accion-izq">
              Eliminar
            </Boton>
          )}
          {!cliente.publicoGeneral && puede('EDITAR_CLIENTES') && (
            <Boton icono={LuPencil} onClick={() => alEditar(cliente)}>Editar</Boton>
          )}
          <Boton variante="primario" onClick={alCerrar}>Listo</Boton>
        </>
      )}
    >
      {cliente && (
        <>
          <div className="drawer__seccion">
            <h3 className="drawer__seccion-titulo">Datos fiscales y contacto</h3>
            <div className="drawer__datos">
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuFileText aria-hidden="true" /> RFC</span>
                <span className="drawer__dato-valor codigo-mono">{cliente.rfc ?? 'Sin RFC'}</span>
              </div>
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuPhone aria-hidden="true" /> Teléfono</span>
                <span className="drawer__dato-valor numeros">{cliente.telefono ?? 'Sin teléfono'}</span>
              </div>
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuMapPin aria-hidden="true" /> Domicilio</span>
                <span className="drawer__dato-valor">{capitalizar(cliente.domicilio ?? '') || 'Sin domicilio'}</span>
              </div>
            </div>

            <div className="drawer__acciones-rapidas">
              {cliente.telefono && (
                <Boton talla="chico" icono={LuCopy} onClick={() => copiarTexto(cliente.telefono, avisar, 'Teléfono')}>
                  Copiar teléfono
                </Boton>
              )}
              {cliente.rfc && (
                <Boton talla="chico" icono={LuCopy} onClick={() => copiarTexto(cliente.rfc, avisar, 'RFC')}>
                  Copiar RFC
                </Boton>
              )}
              {wa && (
                <a className="boton boton--secundario boton--chico" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                  <LuMessageCircle className="boton__icono" aria-hidden="true" />
                  Enviar WhatsApp
                </a>
              )}
            </div>
          </div>

          {cliente.publicoGeneral && (
            <p className="texto-2" style={{ fontSize: '0.8125rem' }}>
              Este registro concentra las ventas rápidas de mostrador sin cliente nominado y no se edita ni elimina.
            </p>
          )}
        </>
      )}
    </Drawer>
  );
}

export default function Clientes() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { search } = useUbicacion();
  const navegar = useNavegar();
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [vista, setVista] = useVistaCatalogo('clientes');
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const [paraAgendar, setParaAgendar] = useState(null);
  const buscar = useRetardo(busqueda);

  const { datos, error, cargando, recargar } = useApi('/clientes', { buscar, tipo: tipo === 'todos' ? null : tipo });
  const puedeEditar = puede('EDITAR_CLIENTES');

  useEffect(() => setPagina(1), [buscar, tipo, vista]);

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
      setDetalle(null);
      setEditando(null);
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const conteo = datos?.conteo;
  const clientes = datos?.clientes ?? [];
  const conWhatsApp = clientes.filter((c) => telefonoWhatsApp(c.telefono)).length;
  const POR_PAGINA_FICHAS = 8;

  const paginados = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA_FICHAS;
    return clientes.slice(inicio, inicio + POR_PAGINA_FICHAS);
  }, [clientes, pagina]);

  const destacados = useMemo(() => (
    clientes
      .filter((c) => !c.publicoGeneral && c.telefono)
      .sort((a, b) => Number(b.tipo === 'moral') - Number(a.tipo === 'moral'))
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        subtitulo: c.tipo,
        telefono: c.telefono,
        meta: `${c.tipo === 'moral' ? 'Empresa / Moral' : 'Persona física'} · ${c.telefono}`,
        raw: c,
      }))
  ), [clientes]);

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Clientes"
        descripcion="Personas y negocios a quienes se les vende con nombre. Las ventas de mostrador van a público en general."
        acciones={puedeEditar && <Boton variante="primario" icono={LuUserPlus} onClick={() => setEditando('nuevo')}>Nuevo cliente</Boton>}
      />

      {datos && (
        <ResumenCatalogo
          items={[
            { icono: LuUsers, etiqueta: 'Cartera total', valor: numero(conteo?.total ?? clientes.length), detalle: 'registros activos', alClick: () => setTipo('todos') },
            { icono: LuUser, etiqueta: 'Personas físicas', valor: numero(conteo?.fisica ?? 0), detalle: 'clientes individuales', alClick: () => setTipo('fisica') },
            { icono: LuBuilding2, etiqueta: 'Personas morales', valor: numero(conteo?.moral ?? 0), detalle: 'negocios y empresas', alClick: () => setTipo('moral') },
            { icono: LuMessageCircle, etiqueta: 'Listos p/ WhatsApp', valor: numero(conWhatsApp), detalle: 'en esta vista', tono: 'esmeralda' },
          ]}
        />
      )}

      <div className="directorio-dividido">
        <div className="directorio-dividido__principal">
          <div className="catalogo-controles">
            <div className="catalogo-barra">
              <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar cliente" placeholder="Nombre, RFC, teléfono o domicilio" />
              <SwitchVista vista={vista} alCambiar={setVista} />
            </div>
            <ChipsFiltro
              etiqueta="Tipo de persona"
              valor={tipo}
              alCambiar={setTipo}
              opciones={[
                { valor: 'todos', etiqueta: 'Todos', conteo: conteo?.total },
                { valor: 'fisica', etiqueta: 'Personas físicas', conteo: conteo?.fisica, icono: LuUser },
                { valor: 'moral', etiqueta: 'Personas morales', conteo: conteo?.moral, icono: LuBuilding2 },
              ]}
            />
          </div>

          <MensajeError error={error} alReintentar={recargar} />
          {cargando && !datos && (vista === 'tarjetas' ? <EsqueletoFichas cantidad={6} /> : <EsqueletoTabla />)}

          {datos && vista === 'tarjetas' && (
            clientes.length ? (
              <>
                <div className={`fichas-grid fichas-grid--compacto ${cargando ? 'recargando' : ''}`}>
                  {paginados.map((c) => {
                    const tono = c.publicoGeneral ? 'oro' : c.tipo === 'moral' ? 'cielo' : tonoDeTexto(c.nombre);
                    const wa = telefonoWhatsApp(c.telefono);
                    return (
                      <article
                        key={c.id}
                        className={`ficha ficha--${tono} ${detalle?.id === c.id ? 'ficha--activa' : ''}`}
                        tabIndex={0}
                        role="button"
                        onClick={() => setDetalle(c)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalle(c); } }}
                      >
                        <div className="ficha__cabecera">
                          <Monograma
                            texto={c.nombre}
                            tono={tono}
                            icono={c.publicoGeneral ? LuStore : c.tipo === 'moral' ? LuBuilding2 : undefined}
                            forma={c.tipo === 'fisica' && !c.publicoGeneral ? 'circulo' : 'suave'}
                          />
                          <div className="ficha__titulos">
                            <h3 className="ficha__nombre">{c.publicoGeneral ? 'Público en general' : nombrePropio(c.nombre)}</h3>
                            <span className="ficha__sub">Cliente #{c.id}</span>
                          </div>
                          {c.publicoGeneral
                            ? <Insignia tono="info" icono={false}>Mostrador</Insignia>
                            : <Insignia tono="neutro" icono={false}>{c.tipo === 'fisica' ? 'Física' : 'Moral'}</Insignia>}
                        </div>

                        <div className="ficha__detalles">
                          <div className="ficha__linea">
                            <span className="ficha__linea-izq">
                              <LuPhone aria-hidden="true" />
                              <span className="numeros">{c.telefono ?? 'Sin teléfono'}</span>
                            </span>
                            {c.telefono && (
                              <button
                                type="button"
                                className="ficha__copiar"
                                onClick={(e) => { e.stopPropagation(); copiarTexto(c.telefono, avisar, 'Teléfono'); }}
                                aria-label={`Copiar teléfono de ${nombrePropio(c.nombre)}`}
                              >
                                <LuCopy aria-hidden="true" /> Copiar
                              </button>
                            )}
                          </div>
                          <div className="ficha__linea">
                            <span className="ficha__linea-izq">
                              <LuMapPin aria-hidden="true" />
                              <span>{capitalizar(c.domicilio ?? '') || 'Sin domicilio'}</span>
                            </span>
                            {!c.publicoGeneral && (
                              <button
                                type="button"
                                className="ficha__copiar"
                                onClick={(e) => { e.stopPropagation(); setParaAgendar(c); }}
                                aria-label={`Agendar seguimiento a ${nombrePropio(c.nombre)}`}
                              >
                                <LuBellPlus aria-hidden="true" /> Agendar
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="ficha__pie">
                          <span className="codigo-mono texto-2">{c.rfc ?? 'Sin RFC'}</span>
                          {wa ? (
                            <a
                              className="ficha__copiar"
                              href={`https://wa.me/${wa}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LuMessageCircle aria-hidden="true" /> WhatsApp
                            </a>
                          ) : (
                            <span className="ficha__pie-fecha">{c.publicoGeneral ? 'Venta rápida' : 'Sin WhatsApp'}</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {clientes.length > POR_PAGINA_FICHAS && (
                  <div className="panel panel--paginacion">
                    <Paginacion pagina={pagina} limite={POR_PAGINA_FICHAS} total={clientes.length} alCambiar={setPagina} />
                  </div>
                )}
              </>
            ) : (
              <Panel>
                <Vacio icono={LuUsers} titulo="Ningún cliente coincide">Prueba con otra parte del nombre, el RFC o el teléfono.</Vacio>
              </Panel>
            )
          )}

          {datos && vista === 'tabla' && (
            <Panel>
              <Tabla
                etiqueta="Clientes"
                cargando={cargando}
                porPagina={12}
                filas={clientes}
                alAbrir={(c) => setDetalle(c)}
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
                  { clave: 'rfc', titulo: 'RFC', render: (c) => <span className="numeros codigo-mono">{c.rfc ?? '—'}</span> },
                  { clave: 'telefono', titulo: 'Teléfono', render: (c) => <span className="numeros">{c.telefono ?? '—'}</span> },
                  ...(puedeEditar ? [{
                    clave: 'acciones', titulo: <span className="solo-lectores">Acciones</span>, alinear: 'der',
                    render: (c) => !c.publicoGeneral && <BotonIcono icono={LuPencil} etiqueta={`Editar ${c.nombre}`} onClick={() => setEditando(c)} />,
                  }] : []),
                ]}
                vacio={<Vacio icono={LuUsers} titulo="Ningún cliente coincide">Prueba con otra parte del nombre, el RFC o el teléfono.</Vacio>}
              />
            </Panel>
          )}
        </div>

        <AgendaContactos
          clave="clientes"
          etiquetaEntidad="cliente"
          contactos={clientes.filter((c) => !c.publicoGeneral)}
          destacados={destacados}
          tituloDestacados="Contacto directo"
          subtituloDestacados="Negocios y clientes listos para WhatsApp o llamada."
          preseleccion={paraAgendar}
          alConsumirPreseleccion={() => setParaAgendar(null)}
          alAbrirContacto={(c) => setDetalle(c)}
          avisar={avisar}
        />
      </div>

      <InspectorCliente
        cliente={detalle}
        avisar={avisar}
        alCerrar={() => setDetalle(null)}
        alEliminar={eliminar}
        alEditar={(c) => {
          setDetalle(null);
          setEditando(c);
        }}
      />

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
