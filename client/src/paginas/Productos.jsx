// Catálogo de productos e inventario: fichas editoriales, monitor de frescura/merma, recordatorios y notas.
import { useEffect, useMemo, useState } from 'react';
import {
  LuApple, LuBellPlus, LuCircleCheck, LuHourglass, LuPackage, LuPencil, LuPlus, LuSprout, LuTag, LuTrash2,
  LuTriangleAlert, LuTruck, LuWallet,
} from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { PanelNotas, PanelRecordatorios } from '../componentes/AgendaContactos.jsx';
import {
  ChipsFiltro, Drawer, EsqueletoFichas, Monograma, ResumenCatalogo, SwitchVista, tonoDeTexto, useVistaCatalogo,
} from '../componentes/Catalogo.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { useFormulario } from '../componentes/formulario.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, BotonIcono, Buscador, CabeceraPagina, Campo, Cargando, Insignia, MensajeError, Paginacion, Panel, Vacio,
} from '../componentes/ui.jsx';
import {
  abreviaturaUnidad, capitalizar, cantidad, esFraccionable, moneda, monedaRedonda, nombrePropio, numero, porcentaje,
} from '../formato.js';
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

function iconoCategoria(categoria) {
  const c = (categoria || '').toLowerCase();
  if (c.includes('fruta')) return LuApple;
  if (c.includes('verdura') || c.includes('hortaliza')) return LuSprout;
  return LuPackage;
}

function tonoCategoria(categoria) {
  const c = (categoria || '').toLowerCase();
  if (c.includes('fruta')) return 'oro';
  if (c.includes('verdura') || c.includes('hortaliza')) return 'esmeralda';
  return tonoDeTexto(c);
}

function FormularioProducto({ abierto, producto, unidades, categorias, alCerrar, alGuardar, alEliminar }) {
  const { puede } = useSesion();
  const f = useFormulario(producto
    ? { ...VACIO, ...producto, precioCompra: String(producto.precioCompra), precioVenta: String(producto.precioVenta), existencia: String(producto.existencia), proveedores: [] }
    : VACIO);
  const proveedoresApi = useApi('/proveedores', { opciones: 1 }, { activo: abierto && puede('VER_PROVEEDORES') });
  const [filtroProv, setFiltroProv] = useState('');
  const { fijar } = f;

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

function InspectorProducto({ producto, umbral, alCerrar, alEditar, alEliminar }) {
  const { puede } = useSesion();
  const detalleApi = useApi(
    producto && puede('VER_PROVEEDORES') ? `/productos/${producto.codigo}` : null,
  );
  const estado = producto ? estadoDe(producto, umbral) : 'disponible';
  const tono = producto ? tonoCategoria(producto.categoria) : 'oro';
  const pctStock = producto ? Math.min((producto.existencia / Math.max(umbral * 3, 1)) * 100, 100) : 0;

  return (
    <Drawer
      abierto={Boolean(producto)}
      alCerrar={alCerrar}
      titulo={producto ? capitalizar(producto.descripcion) : 'Producto'}
      subtitulo={producto ? `Código #${producto.codigo} · ${capitalizar(producto.categoria)} · por ${producto.unidadMedida}` : undefined}
      insignia={producto && <InsigniaStock producto={producto} umbral={umbral} />}
      monograma={producto && <Monograma texto={producto.descripcion} tono={tono} icono={iconoCategoria(producto.categoria)} talla="grande" />}
      pie={producto && (
        <>
          {puede('ELIMINAR_PRODUCTOS') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(producto)} className="modal__accion-izq">
              Eliminar
            </Boton>
          )}
          {puede('EDITAR_PRODUCTOS') && <Boton icono={LuPencil} onClick={() => alEditar(producto)}>Editar</Boton>}
          <Boton variante="primario" onClick={alCerrar}>Listo</Boton>
        </>
      )}
    >
      {producto && (
        <>
          <div className="drawer__stats">
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">Precio venta</span>
              <span className="drawer__stat-valor drawer__stat-valor--oro">{moneda(producto.precioVenta)}</span>
            </div>
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">Costo</span>
              <span className="drawer__stat-valor">{moneda(producto.precioCompra)}</span>
            </div>
            <div className="drawer__stat">
              <span className="drawer__stat-etiqueta">Margen</span>
              <span className="drawer__stat-valor">{porcentaje(margen(producto), 0)}</span>
            </div>
          </div>

          <div className="drawer__seccion">
            <h3 className="drawer__seccion-titulo">Nivel de inventario</h3>
            <div className="drawer__datos">
              <div className="drawer__dato" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <div className="ficha__stock-fila">
                  <span>Existencia actual</span>
                  <strong className="numeros" style={{ color: 'var(--text-primary)' }}>{cantidad(producto.existencia, producto.unidadMedida)}</strong>
                </div>
                <span className="ficha__stock-pista">
                  <span
                    className={`ficha__stock-barra ${estado === 'bajo' ? 'ficha__stock-barra--bajo' : estado === 'agotado' ? 'ficha__stock-barra--agotado' : ''}`}
                    style={{ width: `${estado === 'agotado' ? 6 : Math.max(pctStock, 10)}%` }}
                  />
                </span>
                <div className="ficha__stock-fila texto-3">
                  <span>Umbral de alerta: {numero(umbral)}</span>
                  <span className="numeros">Valor a costo: {moneda(producto.existencia * producto.precioCompra)}</span>
                </div>
              </div>
              <div className="drawer__dato">
                <span className="drawer__dato-clave"><LuTag aria-hidden="true" /> Utilidad por {abreviaturaUnidad(producto.unidadMedida, 1)}</span>
                <span className="drawer__dato-valor numeros">{moneda(producto.precioVenta - producto.precioCompra)}</span>
              </div>
            </div>
          </div>

          {puede('VER_PROVEEDORES') && (
            <div className="drawer__seccion">
              <h3 className="drawer__seccion-titulo">Proveedores que lo surten</h3>
              {detalleApi.cargando && <Cargando texto="Cargando proveedores…" />}
              {!detalleApi.cargando && detalleApi.datos?.proveedores?.length ? (
                <ul className="lista-simple">
                  {detalleApi.datos.proveedores.map((prov) => (
                    <li key={prov.id}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <LuTruck size={14} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                        {nombrePropio(prov.nombre)}
                      </span>
                      <span className="texto-2">{capitalizar(prov.ciudad)}</span>
                    </li>
                  ))}
                </ul>
              ) : !detalleApi.cargando && (
                <p className="texto-2" style={{ fontSize: '0.8125rem' }}>
                  Sin proveedores ligados todavía. Puedes asignarlos al editar el producto.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

export default function Productos() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { datos, error, cargando, recargar } = useApi('/productos');
  const dssApi = useApi('/dss/analisis', null, { activo: puede('VER_DSS') });
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [tabMonitor, setTabMonitor] = useState('caducar');
  const [vista, setVista] = useVistaCatalogo('productos');
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const [paraAgendar, setParaAgendar] = useState(null);

  const productos = datos?.productos ?? [];
  const umbral = datos?.umbralStockBajo ?? 10;
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos]);

  useEffect(() => setPagina(1), [busqueda, categoria, estado, vista]);

  const porCategoria = productos.filter((p) => categoria === 'todas' || p.categoria === categoria);
  const conteo = (e) => porCategoria.filter((p) => e === 'todos' || estadoDe(p, umbral) === e).length;
  const q = busqueda.trim().toLowerCase();
  const visibles = porCategoria.filter((p) => (estado === 'todos' || estadoDe(p, umbral) === estado)
    && (!q || p.descripcion.includes(q) || String(p.codigo) === q));

  const POR_PAGINA_FICHAS = 8;
  const paginados = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA_FICHAS;
    return visibles.slice(inicio, inicio + POR_PAGINA_FICHAS);
  }, [visibles, pagina]);

  const mapaProductos = useMemo(() => new Map(productos.map((p) => [p.codigo, p])), [productos]);

  // Productos cerca de caducar / con riesgo de merma (vía vida útil del ETL/DSS)
  const porCaducar = useMemo(() => {
    const recs = dssApi.datos?.evaluacion?.recomendaciones ?? [];
    if (!recs.length) return [];
    return [...recs]
      .filter((r) => r.existencia > 0)
      .sort((a, b) => Number(b.riesgoMerma) - Number(a.riesgoMerma) || a.vidaUtilDias - b.vidaUtilDias)
      .slice(0, 5)
      .map((r) => ({
        codigo: r.codigo,
        nombre: capitalizar(r.descripcion),
        sub: r.riesgoMerma
          ? `Cobertura ${r.diasCobertura?.toFixed(1) ?? '—'} d > vida útil ${r.vidaUtilDias} d`
          : `Vida útil ${r.vidaUtilDias} días · stock ${cantidad(r.existencia, r.unidadMedida)}`,
        badge: r.riesgoMerma ? { texto: 'Merma', tono: 'aviso' } : { texto: `${r.vidaUtilDias} d`, tono: 'info' },
        raw: mapaProductos.get(r.codigo),
        motivo: r.riesgoMerma ? 'Promover salida antes de merma' : 'Revisar frescura en anaquel',
      }));
  }, [dssApi.datos, mapaProductos]);

  const stockCritico = useMemo(() => (
    [...productos]
      .filter((p) => p.existencia <= umbral)
      .sort((a, b) => a.existencia - b.existencia)
      .slice(0, 5)
      .map((p) => ({
        codigo: p.codigo,
        nombre: capitalizar(p.descripcion),
        sub: `Existencia ${cantidad(p.existencia, p.unidadMedida)} · umbral ${umbral}`,
        badge: p.existencia <= 0 ? { texto: 'Agotado', tono: 'critico' } : { texto: 'Bajo', tono: 'aviso' },
        raw: p,
        motivo: 'Verificar pedido de reabastecimiento',
      }))
  ), [productos, umbral]);

  const mejorMargen = useMemo(() => (
    [...productos]
      .filter((p) => p.precioVenta > 0)
      .sort((a, b) => margen(b) - margen(a))
      .slice(0, 5)
      .map((p) => ({
        codigo: p.codigo,
        nombre: capitalizar(p.descripcion),
        sub: `Venta ${moneda(p.precioVenta)} · costo ${moneda(p.precioCompra)}`,
        badge: { texto: porcentaje(margen(p), 0), tono: 'ok' },
        raw: p,
        motivo: 'Revisar exhibición y disponibilidad',
      }))
  ), [productos]);

  const listaMonitor = tabMonitor === 'caducar'
    ? (porCaducar.length ? porCaducar : stockCritico)
    : tabMonitor === 'stock'
      ? stockCritico
      : mejorMargen;

  const opcionesRecordatorio = useMemo(
    () => productos.map((p) => ({ id: p.codigo, nombre: `${capitalizar(p.descripcion)} (#${p.codigo})` })),
    [productos],
  );

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
      setDetalle(null);
      setEditando(null);
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const valorInventario = productos.reduce((s, p) => s + p.existencia * p.precioCompra, 0);
  const totalDisponibles = productos.filter((p) => estadoDe(p, umbral) === 'disponible').length;
  const totalBajos = productos.filter((p) => estadoDe(p, umbral) === 'bajo').length;
  const totalAgotados = productos.filter((p) => estadoDe(p, umbral) === 'agotado').length;

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Productos"
        descripcion={datos ? `${numero(productos.length)} productos en el catálogo; el inventario vale ${moneda(valorInventario)} a costo.` : 'Catálogo e inventario.'}
        acciones={puedeEditar && <Boton variante="primario" icono={LuPlus} onClick={() => setEditando('nuevo')}>Nuevo producto</Boton>}
      />

      {datos && (
        <ResumenCatalogo
          items={[
            { icono: LuPackage, etiqueta: 'Catálogo', valor: numero(productos.length), detalle: `${numero(categorias.length)} categorías`, alClick: () => { setCategoria('todas'); setEstado('todos'); } },
            { icono: LuWallet, etiqueta: 'Valor a costo', valor: monedaRedonda(valorInventario), detalle: 'existencia actual' },
            { icono: LuCircleCheck, etiqueta: 'Disponibles', valor: numero(totalDisponibles), detalle: 'stock saludable', tono: 'esmeralda', alClick: () => setEstado(estado === 'disponible' ? 'todos' : 'disponible') },
            {
              icono: LuTriangleAlert,
              etiqueta: totalAgotados > 0 ? 'Alertas stock' : 'Por acabarse',
              valor: numero(totalBajos + totalAgotados),
              detalle: totalAgotados > 0 ? `${numero(totalAgotados)} agotados · ${numero(totalBajos)} bajos` : `umbral ≤ ${numero(umbral)}`,
              tono: totalAgotados > 0 ? 'critico' : 'aviso',
              alClick: () => setEstado(totalAgotados > 0 ? (estado === 'agotado' ? 'bajo' : 'agotado') : (estado === 'bajo' ? 'todos' : 'bajo')),
            },
          ]}
        />
      )}

      <div className="directorio-dividido">
        <div className="directorio-dividido__principal">
          <div className="catalogo-controles">
            <div className="catalogo-barra">
              <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar producto" placeholder="Nombre o código" />
              <SwitchVista vista={vista} alCambiar={setVista} />
            </div>
            <div className="filtros">
              <ChipsFiltro
                etiqueta="Categoría"
                valor={categoria}
                alCambiar={setCategoria}
                opciones={[
                  { valor: 'todas', etiqueta: 'Todas', conteo: productos.length },
                  ...categorias.map((c) => ({
                    valor: c,
                    etiqueta: capitalizar(c),
                    icono: iconoCategoria(c),
                    conteo: productos.filter((p) => p.categoria === c).length,
                  })),
                ]}
              />
              <ChipsFiltro
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
          </div>

          <MensajeError error={error} alReintentar={recargar} />
          {cargando && !datos && (vista === 'tarjetas' ? <EsqueletoFichas cantidad={6} /> : <EsqueletoTabla />)}

          {datos && vista === 'tarjetas' && (
            visibles.length ? (
              <>
                <div className={`fichas-grid fichas-grid--compacto ${cargando ? 'recargando' : ''}`}>
                  {paginados.map((p) => {
                    const est = estadoDe(p, umbral);
                    const tono = tonoCategoria(p.categoria);
                    const pctStock = Math.min((p.existencia / Math.max(umbral * 3, 1)) * 100, 100);
                    return (
                      <article
                        key={p.codigo}
                        className={`ficha ficha--${tono} ${detalle?.codigo === p.codigo ? 'ficha--activa' : ''}`}
                        tabIndex={0}
                        role="button"
                        onClick={() => setDetalle(p)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalle(p); } }}
                      >
                        <div className="ficha__cabecera">
                          <Monograma texto={p.descripcion} tono={tono} icono={iconoCategoria(p.categoria)} />
                          <div className="ficha__titulos">
                            <h3 className="ficha__nombre">{capitalizar(p.descripcion)}</h3>
                            <span className="ficha__sub">#{p.codigo} · {capitalizar(p.categoria)}</span>
                          </div>
                          <InsigniaStock producto={p} umbral={umbral} />
                        </div>

                        <div className="ficha__precios">
                          <span className="ficha__precio-venta">
                            {moneda(p.precioVenta)}
                            <span className="ficha__precio-unidad">/ {abreviaturaUnidad(p.unidadMedida, 1)}</span>
                          </span>
                          <span className="ficha__precio-meta">
                            <span className="numeros">Costo {moneda(p.precioCompra)}</span>
                            <span className="ficha__margen">{porcentaje(margen(p), 0)}</span>
                          </span>
                        </div>

                        <div className="ficha__pie" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                          <div className="ficha__stock-fila">
                            <span>Existencia: <strong className="numeros" style={{ color: 'var(--text-primary)' }}>{cantidad(p.existencia, p.unidadMedida)}</strong></span>
                            <button
                              type="button"
                              className="ficha__copiar"
                              onClick={(e) => {
                                e.stopPropagation();
                                setParaAgendar({ id: p.codigo, nombre: `${capitalizar(p.descripcion)} (#${p.codigo})`, motivoSugerido: 'Revisar frescura y stock' });
                              }}
                              aria-label={`Agendar revisión de ${capitalizar(p.descripcion)}`}
                            >
                              <LuBellPlus aria-hidden="true" /> Agendar
                            </button>
                          </div>
                          <span className="ficha__stock-pista">
                            <span
                              className={`ficha__stock-barra ${est === 'bajo' ? 'ficha__stock-barra--bajo' : est === 'agotado' ? 'ficha__stock-barra--agotado' : ''}`}
                              style={{ width: `${est === 'agotado' ? 5 : Math.max(pctStock, 8)}%` }}
                            />
                          </span>
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
                <Vacio icono={LuApple} titulo="No hay productos con estos filtros">Cambia la búsqueda o los filtros de arriba.</Vacio>
              </Panel>
            )
          )}

          {datos && vista === 'tabla' && (
            <Panel>
              <Tabla
                etiqueta="Productos"
                clave="codigo"
                cargando={cargando}
                filas={visibles}
                alAbrir={(p) => setDetalle(p)}
                ordenInicial={{ clave: 'descripcion', asc: true }}
                porPagina={12}
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
        </div>

        <aside className="agenda-lateral" aria-label="Control de frescura, recordatorios y notas">
          {/* 1. MONITOR DE FRESCURA / MERMA Y STOCK */}
          <section className="panel glass-card lujo-brillo agenda-card">
            <header className="agenda-card__cabecera">
              <div className="agenda-card__titulo-bloque">
                <span className="agenda-card__icono agenda-card__icono--aviso" aria-hidden="true"><LuHourglass /></span>
                <div>
                  <h2>Frescura y alertas</h2>
                  <p className="agenda-card__sub">Perecederos con menor vida útil, riesgo de merma y stock bajo.</p>
                </div>
              </div>
            </header>

            <div className="agenda-filtros" role="tablist" aria-label="Vista de alertas de productos">
              {[
                { id: 'caducar', etiqueta: porCaducar.length ? `Por caducar (${porCaducar.length})` : 'Prioritarios' },
                { id: 'stock', etiqueta: `Stock bajo (${stockCritico.length})` },
                { id: 'margen', etiqueta: 'Mejor margen' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tabMonitor === t.id}
                  className={`agenda-tab ${tabMonitor === t.id ? 'agenda-tab--activo' : ''}`}
                  onClick={() => setTabMonitor(t.id)}
                >
                  {t.etiqueta}
                </button>
              ))}
            </div>

            {listaMonitor.length ? (
              <ul className="agenda-rapidos">
                {listaMonitor.map((item) => (
                  <li key={item.codigo} className="agenda-rapido">
                    <button
                      type="button"
                      className="agenda-rapido__info"
                      onClick={() => item.raw && setDetalle(item.raw)}
                    >
                      <Monograma
                        texto={item.nombre}
                        tono={item.raw ? tonoCategoria(item.raw.categoria) : 'oro'}
                        icono={item.raw ? iconoCategoria(item.raw.categoria) : LuApple}
                      />
                      <span className="agenda-rapido__texto">
                        <span className="agenda-rapido__nombre">{item.nombre}</span>
                        <span className="agenda-rapido__meta">{item.sub}</span>
                      </span>
                    </button>
                    <div className="agenda-rapido__btns">
                      <Insignia tono={item.badge.tono} icono={false}>{item.badge.texto}</Insignia>
                      <button
                        type="button"
                        className="agenda-icon-btn agenda-icon-btn--oro"
                        title="Agendar revisión"
                        aria-label={`Agendar revisión de ${item.nombre}`}
                        onClick={() => setParaAgendar({ id: item.codigo, nombre: `${item.nombre} (#${item.codigo})`, motivoSugerido: item.motivo })}
                      >
                        <LuBellPlus aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="agenda-vacio__texto">No hay alertas pendientes en esta categoría.</p>
            )}
          </section>

          {/* 2. RECORDATORIOS DE INVENTARIO */}
          <PanelRecordatorios
            clave="productos"
            titulo="Recordatorios de inventario"
            subtituloSingular="revisión pendiente"
            subtituloPlural="revisiones pendientes"
            etiquetaEntidad="producto"
            placeholderMotivo="Ej. Revisar frescura, ajustar precio o hacer conteo físico"
            textoVacio="Agenda revisiones de frescura, conteos o cambios de precio desde aquí o desde cualquier ficha."
            opciones={opcionesRecordatorio}
            preseleccion={paraAgendar}
            alConsumirPreseleccion={() => setParaAgendar(null)}
            avisar={avisar}
          />

          {/* 3. NOTAS RÁPIDAS DE BODEGA */}
          <PanelNotas
            clave="productos"
            titulo="Notas de bodega y precios"
            subtitulo="Mermas detectadas, precios de central o pendientes de anaquel."
            placeholder="Ej. Llegó fresa muy madura, promover salida hoy…"
          />
        </aside>
      </div>

      <InspectorProducto
        producto={detalle}
        umbral={umbral}
        alCerrar={() => setDetalle(null)}
        alEliminar={eliminar}
        alEditar={(p) => {
          setDetalle(null);
          setEditando(p);
        }}
      />

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
