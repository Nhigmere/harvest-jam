// Proveedores y lo que surte cada uno: directorio en fichas editoriales, agenda lateral e inspector.
import { useEffect, useMemo, useState } from 'react';
import {
  LuAward, LuBellPlus, LuCopy, LuMapPin, LuMessageCircle, LuPackage, LuPencil, LuPhone, LuPlus, LuShoppingBag,
  LuTrash2, LuTruck, LuUser,
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
  Boton, Buscador, CabeceraPagina, Campo, Cargando, Insignia, MensajeError, Paginacion, Panel, Vacio,
} from '../componentes/ui.jsx';
import { capitalizar, cantidad, fecha, nombrePropio, numero, plural, telefonoWhatsApp } from '../formato.js';
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

function InspectorProveedor({ id, alCerrar, alEditar, alEliminar, avisar }) {
  const { puede } = useSesion();
  const { datos, error, cargando } = useApi(id ? `/proveedores/${id}` : null);
  const wa = telefonoWhatsApp(datos?.telefono);
  const tono = datos ? tonoDeTexto(datos.ciudad || datos.nombre) : 'oro';

  return (
    <Drawer
      abierto={Boolean(id)}
      alCerrar={alCerrar}
      titulo={datos ? nombrePropio(datos.nombre) : 'Proveedor'}
      subtitulo={datos ? `${capitalizar(datos.ciudad)} · Proveedor #${datos.id}` : 'Cargando expediente…'}
      monograma={datos ? <Monograma texto={datos.nombre} tono={tono} talla="grande" /> : null}
      pie={datos && (
        <>
          {puede('ELIMINAR_PROVEEDORES') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(datos)} className="modal__accion-izq">
              Eliminar
            </Boton>
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
          <div className="drawer__stats">
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">Productos</span>
              <span className="drawer__stat-valor drawer__stat-valor--oro">{numero(datos.productos.length)}</span>
            </div>
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">Compras</span>
              <span className="drawer__stat-valor">{numero(datos.numCompras)}</span>
            </div>
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">Última compra</span>
              <span className="drawer__stat-valor" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-sans)' }}>
                {datos.ultimaCompra ? fecha(datos.ultimaCompra) : 'Sin compras'}
              </span>
            </div>
          </div>

          <div className="drawer__seccion">
            <h3 className="drawer__seccion-titulo">Contacto</h3>
            <div className="drawer__datos">
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuUser aria-hidden="true" /> Contacto</span>
                <span className="drawer__dato-valor">{nombrePropio(datos.contacto ?? '') || '—'}</span>
              </div>
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuPhone aria-hidden="true" /> Teléfono</span>
                <span className="drawer__dato-valor numeros">{datos.telefono ?? '—'}</span>
              </div>
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuMapPin aria-hidden="true" /> Ciudad</span>
                <span className="drawer__dato-valor">{capitalizar(datos.ciudad) || '—'}</span>
              </div>
            </div>
            {datos.telefono && (
              <div className="drawer__acciones-rapidas">
                <Boton talla="chico" icono={LuCopy} onClick={() => copiarTexto(datos.telefono, avisar, 'Teléfono')}>
                  Copiar teléfono
                </Boton>
                {wa && (
                  <a className="boton boton--secundario boton--chico" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                    <LuMessageCircle className="boton__icono" aria-hidden="true" />
                    WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="drawer__seccion">
            <h3 className="drawer__seccion-titulo">Productos que surte ({numero(datos.productos.length)})</h3>
            {datos.productos.length ? (
              <ul className="lista-simple">
                {datos.productos.map((p) => (
                  <li key={p.codigo}>
                    <span>{capitalizar(p.descripcion)}</span>
                    {p.existencia <= 0
                      ? <Insignia tono="critico">Agotado</Insignia>
                      : <span className="texto-2 numeros">{cantidad(p.existencia, p.unidadMedida)}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="texto-2" style={{ fontSize: '0.8125rem' }}>
                No tiene productos ligados. Puedes asignarlos desde la ficha de cada producto.
              </p>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

export default function Proveedores() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const [busqueda, setBusqueda] = useState('');
  const [ciudad, setCiudad] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [vista, setVista] = useVistaCatalogo('proveedores');
  const buscar = useRetardo(busqueda);
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const [paraAgendar, setParaAgendar] = useState(null);
  const { datos, error, cargando, recargar } = useApi('/proveedores', { buscar });

  const proveedores = datos?.proveedores ?? [];

  useEffect(() => setPagina(1), [buscar, ciudad, vista]);

  const ciudades = useMemo(() => {
    const mapa = new Map();
    for (const p of proveedores) {
      const c = (p.ciudad || '').trim().toLowerCase();
      if (!c) continue;
      mapa.set(c, (mapa.get(c) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [proveedores]);

  const visibles = useMemo(() => (
    ciudad === 'todas'
      ? proveedores
      : proveedores.filter((p) => (p.ciudad || '').trim().toLowerCase() === ciudad)
  ), [proveedores, ciudad]);

  const POR_PAGINA_FICHAS = 8;
  const paginados = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA_FICHAS;
    return visibles.slice(inicio, inicio + POR_PAGINA_FICHAS);
  }, [visibles, pagina]);

  // Top 5 proveedores clave o con más tiempo sin compra para el panel "A quién marcar"
  const destacados = useMemo(() => (
    [...proveedores]
      .sort((a, b) => Number(b.numProductos || 0) - Number(a.numProductos || 0) || Number(b.numCompras || 0) - Number(a.numCompras || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        subtitulo: p.ciudad,
        telefono: p.telefono,
        meta: `${capitalizar(p.ciudad) || 'Sin ciudad'} · ${plural(p.numProductos, 'prod.', 'prods.')} · ${p.ultimaCompra ? `últ. ${fecha(p.ultimaCompra)}` : 'sin compras'}`,
        raw: p,
      }))
  ), [proveedores]);

  const totalCompras = proveedores.reduce((s, p) => s + Number(p.numCompras || 0), 0);
  const principal = proveedores.reduce((m, p) => (Number(p.numProductos) > Number(m?.numProductos ?? -1) ? p : m), null);

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
        descripcion="Quién surte la mercancía, desde qué ciudad y cuándo se le compró por última vez."
        acciones={puede('EDITAR_PROVEEDORES') && <Boton variante="primario" icono={LuPlus} onClick={() => setEditando('nuevo')}>Nuevo proveedor</Boton>}
      />

      {datos && (
        <ResumenCatalogo
          items={[
            { icono: LuTruck, etiqueta: 'Proveedores', valor: numero(proveedores.length), detalle: 'en directorio activo' },
            { icono: LuMapPin, etiqueta: 'Ciudades', valor: numero(ciudades.length), detalle: ciudades[0] ? `principal: ${capitalizar(ciudades[0][0])}` : 'sin ubicación', tono: 'esmeralda' },
            { icono: LuShoppingBag, etiqueta: 'Compras totales', valor: numero(totalCompras), detalle: 'órdenes registradas' },
            {
              icono: LuAward,
              etiqueta: 'Mayor surtido',
              valor: principal ? nombrePropio(principal.nombre) : '—',
              detalle: principal ? plural(principal.numProductos, 'producto', 'productos') : 'sin datos',
              alClick: principal ? () => setDetalle(principal.id) : undefined,
            },
          ]}
        />
      )}

      <div className="directorio-dividido">
        <div className="directorio-dividido__principal">
          <div className="catalogo-controles">
            <div className="catalogo-barra">
              <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar proveedor" placeholder="Nombre, ciudad, contacto o teléfono" />
              <SwitchVista vista={vista} alCambiar={setVista} />
            </div>
            {ciudades.length > 1 && (
              <ChipsFiltro
                etiqueta="Filtrar por ciudad"
                valor={ciudad}
                alCambiar={setCiudad}
                opciones={[
                  { valor: 'todas', etiqueta: 'Todas las ciudades', conteo: proveedores.length },
                  ...ciudades.map(([c, n]) => ({ valor: c, etiqueta: capitalizar(c), conteo: n, icono: LuMapPin })),
                ]}
              />
            )}
          </div>

          <MensajeError error={error} alReintentar={recargar} />
          {cargando && !datos && (vista === 'tarjetas' ? <EsqueletoFichas cantidad={6} /> : <EsqueletoTabla />)}

          {datos && vista === 'tarjetas' && (
            visibles.length ? (
              <>
                <div className={`fichas-grid fichas-grid--compacto ${cargando ? 'recargando' : ''}`}>
                  {paginados.map((p) => {
                    const tono = tonoDeTexto(p.ciudad || p.nombre);
                    const esDestacado = Number(p.numProductos) >= 3;
                    return (
                      <article
                        key={p.id}
                        className={`ficha ficha--${tono} ${detalle === p.id ? 'ficha--activa' : ''}`}
                        tabIndex={0}
                        role="button"
                        onClick={() => setDetalle(p.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalle(p.id); } }}
                      >
                        <div className="ficha__cabecera">
                          <Monograma texto={p.nombre} tono={tono} />
                          <div className="ficha__titulos">
                            <h3 className="ficha__nombre">{nombrePropio(p.nombre)}</h3>
                            <span className="ficha__sub">
                              <LuMapPin aria-hidden="true" />
                              {capitalizar(p.ciudad) || 'Sin ciudad'}
                            </span>
                          </div>
                          {esDestacado && <Insignia tono="info" icono={false}>Clave</Insignia>}
                        </div>

                        <div className="ficha__detalles">
                          <div className="ficha__linea">
                            <span className="ficha__linea-izq">
                              <LuUser aria-hidden="true" />
                              <span>{nombrePropio(p.contacto ?? '') || 'Sin contacto'}</span>
                            </span>
                            <button
                              type="button"
                              className="ficha__copiar"
                              onClick={(e) => { e.stopPropagation(); setParaAgendar(p); }}
                              aria-label={`Agendar llamada con ${nombrePropio(p.nombre)}`}
                            >
                              <LuBellPlus aria-hidden="true" /> Agendar
                            </button>
                          </div>
                          <div className="ficha__linea">
                            <span className="ficha__linea-izq">
                              <LuPhone aria-hidden="true" />
                              <span className="numeros">{p.telefono ?? 'Sin teléfono'}</span>
                            </span>
                            {p.telefono && (
                              <button
                                type="button"
                                className="ficha__copiar"
                                onClick={(e) => { e.stopPropagation(); copiarTexto(p.telefono, avisar, 'Teléfono'); }}
                                aria-label={`Copiar teléfono de ${nombrePropio(p.nombre)}`}
                              >
                                <LuCopy aria-hidden="true" /> Copiar
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="ficha__pie">
                          <span className="ficha__pie-stats">
                            <span className="ficha__pie-stat"><LuPackage size={12} aria-hidden="true" /> <strong>{numero(p.numProductos)}</strong> prod.</span>
                            <span className="ficha__pie-stat"><strong>{numero(p.numCompras)}</strong> compras</span>
                          </span>
                          <span className="ficha__pie-fecha">{p.ultimaCompra ? fecha(p.ultimaCompra) : 'Sin compras'}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {visibles.length > POR_PAGINA_FICHAS && (
                  <div className="panel panel--paginacion">
                    <Paginacion pagina={pagina} limite={POR_PAGINA_FICHAS} total={visibles.length} alCambiar={setPagina} />
                  </div>
                )}
              </>
            ) : (
              <Panel>
                <Vacio icono={LuTruck} titulo="Ningún proveedor coincide">Prueba con otro nombre, ciudad o teléfono.</Vacio>
              </Panel>
            )
          )}

          {datos && vista === 'tabla' && (
            <Panel>
              <Tabla
                etiqueta="Proveedores"
                cargando={cargando}
                porPagina={12}
                filas={visibles}
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
                  { clave: 'ultimaCompra', titulo: 'Última compra', ordenable: true, render: (p) => <span className="texto-2">{p.ultimaCompra ? fecha(p.ultimaCompra) : 'Nunca'}</span> },
                ]}
                vacio={<Vacio icono={LuTruck} titulo="Ningún proveedor coincide">Prueba con el nombre, la ciudad o el teléfono.</Vacio>}
              />
            </Panel>
          )}
        </div>

        <AgendaContactos
          clave="proveedores"
          etiquetaEntidad="proveedor"
          contactos={proveedores}
          destacados={destacados}
          tituloDestacados="Proveedores clave"
          subtituloDestacados="Marca rápido, abre WhatsApp o agenda una llamada."
          preseleccion={paraAgendar}
          alConsumirPreseleccion={() => setParaAgendar(null)}
          alAbrirContacto={(p) => setDetalle(p.id)}
          avisar={avisar}
        />
      </div>

      <InspectorProveedor
        id={detalle}
        avisar={avisar}
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
