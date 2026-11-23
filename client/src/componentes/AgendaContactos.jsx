// Piezas reutilizables de agenda lateral para todos los catálogos:
// - PanelRecordatorios (recordatorios con fecha, hora, entidad vinculada y estado)
// - PanelNotas (notas rápidas persistentes con fecha y hora)
// - AgendaContactos (combo completo para Proveedores y Clientes)
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LuBellPlus, LuBellRing, LuCalendarClock, LuCheck, LuCopy, LuMessageCircle,
  LuPhoneCall, LuPlus, LuStickyNote, LuTrash2,
} from 'react-icons/lu';
import { copiarTexto, Monograma, tonoDeTexto } from './Catalogo.jsx';
import { Boton, Insignia } from './ui.jsx';
import { fecha, fechaHora, nombrePropio, telefonoWhatsApp } from '../formato.js';

function hoyIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mananaIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function leerStorage(clave, defecto) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : defecto;
  } catch {
    return defecto;
  }
}

function guardarStorage(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Ignorar si localStorage no está disponible
  }
}

function estadoRecordatorio(item, hoy) {
  if (item.hecho) return { texto: 'Hecho', tono: 'ok' };
  if (!item.fecha) return { texto: 'Pendiente', tono: 'neutro' };
  if (item.fecha < hoy) return { texto: 'Vencido', tono: 'critico' };
  if (item.fecha === hoy) return { texto: 'Hoy', tono: 'aviso' };
  return { texto: fecha(item.fecha), tono: 'info' };
}

export function PanelRecordatorios({
  clave,
  titulo = 'Recordatorios',
  subtituloSingular = 'pendiente',
  subtituloPlural = 'pendientes',
  textoVacio,
  etiquetaEntidad = 'contacto',
  placeholderMotivo = 'Ej. Confirmar pedido o dar seguimiento',
  opciones = [], // [{ id, nombre, telefono? }]
  preseleccion = null,
  alConsumirPreseleccion,
  avisar,
}) {
  const claveRec = `harvest-jam:recordatorios:${clave}`;
  const [recordatorios, setRecordatorios] = useState(() => leerStorage(claveRec, []));
  const [filtroRec, setFiltroRec] = useState('pendientes');
  const [mostrandoForm, setMostrandoForm] = useState(false);

  const [itemId, setItemId] = useState('');
  const [itemNombre, setItemNombre] = useState('');
  const [fechaRec, setFechaRec] = useState(() => hoyIso());
  const [horaRec, setHoraRec] = useState('10:00');
  const [motivoRec, setMotivoRec] = useState('');

  const inputMotivoRef = useRef(null);
  const hoy = hoyIso();

  useEffect(() => guardarStorage(claveRec, recordatorios), [claveRec, recordatorios]);

  useEffect(() => {
    if (!preseleccion) return;
    setItemId(String(preseleccion.id ?? ''));
    setItemNombre(preseleccion.nombre ?? '');
    setFechaRec(hoyIso());
    setMotivoRec(preseleccion.motivoSugerido ?? '');
    setMostrandoForm(true);
    alConsumirPreseleccion?.();
    setTimeout(() => inputMotivoRef.current?.focus(), 60);
  }, [preseleccion, alConsumirPreseleccion]);

  const mapaOpciones = useMemo(() => {
    const m = new Map();
    for (const o of opciones) m.set(String(o.id), o);
    return m;
  }, [opciones]);

  const pendientes = recordatorios.filter((r) => !r.hecho).length;

  const visibles = useMemo(() => {
    const lista = recordatorios.filter((r) => (
      filtroRec === 'todos' ? true : filtroRec === 'hechos' ? r.hecho : !r.hecho
    ));
    return [...lista].sort((a, b) => (
      Number(a.hecho) - Number(b.hecho)
      || `${a.fecha || '9999-12-31'} ${a.hora || '23:59'}`.localeCompare(`${b.fecha || '9999-12-31'} ${b.hora || '23:59'}`)
    ));
  }, [recordatorios, filtroRec]);

  const elegirOpcion = (id) => {
    setItemId(id);
    const encontrada = mapaOpciones.get(id);
    if (encontrada) setItemNombre(encontrada.nombre);
  };

  const agregar = (e) => {
    e.preventDefault();
    const motivo = motivoRec.trim();
    const nombre = itemNombre.trim() || (mapaOpciones.get(itemId)?.nombre ?? '');
    if (!nombre && !motivo) {
      avisar?.(`Elige un ${etiquetaEntidad} o escribe el motivo del recordatorio`, 'error');
      return;
    }
    const sel = mapaOpciones.get(itemId);
    const nuevo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      contactoId: sel ? sel.id : null,
      contactoNombre: nombre || `Pendiente de ${etiquetaEntidad}`,
      telefono: sel?.telefono ?? null,
      fecha: fechaRec || hoyIso(),
      hora: horaRec || '',
      motivo: motivo || 'Revisar pendiente',
      hecho: false,
      creadoEn: new Date().toISOString().slice(0, 19),
    };
    setRecordatorios((prev) => [nuevo, ...prev]);
    setMotivoRec('');
    setItemId('');
    setItemNombre('');
    setMostrandoForm(false);
    setFiltroRec('pendientes');
    avisar?.(`Recordatorio guardado: ${nuevo.contactoNombre}`);
  };

  const alternarHecho = (id) => {
    setRecordatorios((prev) => prev.map((r) => (r.id === id ? { ...r, hecho: !r.hecho } : r)));
  };

  const borrar = (id) => {
    setRecordatorios((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <section className="panel glass-card lujo-brillo agenda-card">
      <header className="agenda-card__cabecera">
        <div className="agenda-card__titulo-bloque">
          <span className="agenda-card__icono" aria-hidden="true"><LuBellRing /></span>
          <div>
            <h2>{titulo}</h2>
            <p className="agenda-card__sub">
              {pendientes > 0
                ? `${pendientes} ${pendientes === 1 ? subtituloSingular : subtituloPlural}`
                : `Sin ${subtituloPlural}`}
            </p>
          </div>
        </div>
        <Boton
          variante={mostrandoForm ? 'secundario' : 'primario'}
          talla="chico"
          icono={LuPlus}
          onClick={() => setMostrandoForm((v) => !v)}
        >
          {mostrandoForm ? 'Cerrar' : 'Agendar'}
        </Boton>
      </header>

      {mostrandoForm && (
        <form className="agenda-form" onSubmit={agregar}>
          <div className="agenda-form__fila">
            <select
              className="entrada"
              aria-label={`Elegir ${etiquetaEntidad}`}
              value={itemId}
              onChange={(e) => elegirOpcion(e.target.value)}
            >
              <option value="">Elegir {etiquetaEntidad}…</option>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>

          {!itemId && (
            <input
              type="text"
              className="entrada"
              placeholder={`O escribe el título / ${etiquetaEntidad}`}
              value={itemNombre}
              onChange={(e) => setItemNombre(e.target.value)}
            />
          )}

          <div className="agenda-form__fechas">
            <input
              type="date"
              className="entrada numeros"
              aria-label="Fecha del recordatorio"
              value={fechaRec}
              onChange={(e) => setFechaRec(e.target.value)}
            />
            <input
              type="time"
              className="entrada numeros"
              aria-label="Hora del recordatorio"
              value={horaRec}
              onChange={(e) => setHoraRec(e.target.value)}
            />
            <div className="agenda-form__atajos">
              <button type="button" className="agenda-chip" onClick={() => setFechaRec(hoyIso())}>Hoy</button>
              <button type="button" className="agenda-chip" onClick={() => setFechaRec(mananaIso())}>Mañana</button>
            </div>
          </div>

          <input
            ref={inputMotivoRef}
            type="text"
            className="entrada"
            placeholder={placeholderMotivo}
            value={motivoRec}
            onChange={(e) => setMotivoRec(e.target.value)}
          />

          <div className="agenda-form__pie">
            <Boton talla="chico" onClick={() => setMostrandoForm(false)}>Cancelar</Boton>
            <Boton variante="primario" talla="chico" type="submit">Guardar recordatorio</Boton>
          </div>
        </form>
      )}

      <div className="agenda-filtros" role="tablist" aria-label="Filtrar recordatorios">
        {[
          { id: 'pendientes', etiqueta: `Pendientes (${pendientes})` },
          { id: 'hechos', etiqueta: `Hechos (${recordatorios.length - pendientes})` },
          { id: 'todos', etiqueta: 'Todos' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filtroRec === tab.id}
            className={`agenda-tab ${filtroRec === tab.id ? 'agenda-tab--activo' : ''}`}
            onClick={() => setFiltroRec(tab.id)}
          >
            {tab.etiqueta}
          </button>
        ))}
      </div>

      {visibles.length ? (
        <ul className="agenda-lista">
          {visibles.map((r) => {
            const est = estadoRecordatorio(r, hoy);
            const wa = telefonoWhatsApp(r.telefono);
            return (
              <li key={r.id} className={`agenda-item ${r.hecho ? 'agenda-item--hecho' : ''}`}>
                <button
                  type="button"
                  className={`agenda-check ${r.hecho ? 'agenda-check--activo' : ''}`}
                  onClick={() => alternarHecho(r.id)}
                  aria-label={r.hecho ? 'Marcar como pendiente' : 'Marcar como hecho'}
                >
                  {r.hecho && <LuCheck aria-hidden="true" />}
                </button>

                <div className="agenda-item__cuerpo">
                  <div className="agenda-item__top">
                    <strong className="agenda-item__nombre">{r.contactoNombre}</strong>
                    <Insignia tono={est.tono} icono={false}>
                      {est.texto}{r.hora && !r.hecho ? ` · ${r.hora}` : ''}
                    </Insignia>
                  </div>
                  <p className="agenda-item__motivo">{r.motivo}</p>
                  <div className="agenda-item__acciones">
                    {r.telefono && (
                      <button
                        type="button"
                        className="agenda-mini-btn"
                        onClick={() => copiarTexto(r.telefono, avisar, 'Teléfono')}
                      >
                        <LuCopy aria-hidden="true" /> {r.telefono}
                      </button>
                    )}
                    {wa && (
                      <a className="agenda-mini-btn" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                        <LuMessageCircle aria-hidden="true" /> WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      className="agenda-mini-btn agenda-mini-btn--peligro"
                      onClick={() => borrar(r.id)}
                      aria-label="Eliminar recordatorio"
                    >
                      <LuTrash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="agenda-vacio">
          <LuCalendarClock aria-hidden="true" />
          <p>
            {filtroRec === 'hechos'
              ? 'Aún no marcas recordatorios como hechos.'
              : textoVacio ?? `Agenda un recordatorio o pulsa el botón Agendar en cualquier ficha.`}
          </p>
        </div>
      )}
    </section>
  );
}

export function PanelNotas({
  clave,
  titulo = 'Notas rápidas',
  subtitulo = 'Acuerdos, precios o recados guardados en este equipo.',
  placeholder = 'Anota un recado, precio o acuerdo y presiona Enter…',
}) {
  const claveNotas = `harvest-jam:notas:${clave}`;
  const [notas, setNotas] = useState(() => leerStorage(claveNotas, []));
  const [textoNota, setTextoNota] = useState('');

  useEffect(() => guardarStorage(claveNotas, notas), [claveNotas, notas]);

  const agregar = (e) => {
    e.preventDefault();
    const limpio = textoNota.trim();
    if (!limpio) return;
    const ahora = new Date();
    const isoLocal = `${hoyIso()}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:00`;
    setNotas((prev) => [{ id: `${Date.now()}`, texto: limpio, fecha: isoLocal }, ...prev]);
    setTextoNota('');
  };

  const borrar = (id) => {
    setNotas((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <section className="panel glass-card lujo-brillo agenda-card">
      <header className="agenda-card__cabecera">
        <div className="agenda-card__titulo-bloque">
          <span className="agenda-card__icono agenda-card__icono--cielo" aria-hidden="true"><LuStickyNote /></span>
          <div>
            <h2>{titulo}</h2>
            <p className="agenda-card__sub">{subtitulo}</p>
          </div>
        </div>
      </header>

      <form className="agenda-nota-form" onSubmit={agregar}>
        <input
          type="text"
          className="entrada"
          placeholder={placeholder}
          value={textoNota}
          onChange={(e) => setTextoNota(e.target.value)}
        />
        <Boton variante="secundario" talla="chico" type="submit" icono={LuPlus} disabled={!textoNota.trim()}>
          Agregar
        </Boton>
      </form>

      {notas.length ? (
        <ul className="agenda-notas">
          {notas.map((n) => (
            <li key={n.id} className="agenda-nota">
              <div className="agenda-nota__cuerpo">
                <p>{n.texto}</p>
                <span className="agenda-nota__fecha">{fechaHora(n.fecha)}</span>
              </div>
              <button
                type="button"
                className="agenda-mini-btn agenda-mini-btn--peligro"
                onClick={() => borrar(n.id)}
                aria-label="Borrar nota"
              >
                <LuTrash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="agenda-vacio__texto">Aún no hay notas guardadas aquí.</p>
      )}
    </section>
  );
}

export function AgendaContactos({
  clave,
  etiquetaEntidad = 'contacto',
  contactos = [],
  destacados = [],
  tituloDestacados = 'A quién marcar pronto',
  subtituloDestacados = 'Acceso directo a teléfono, WhatsApp o agenda.',
  preseleccion = null,
  alConsumirPreseleccion,
  alAbrirContacto,
  avisar,
}) {
  const [preInterna, setPreInterna] = useState(null);

  const opciones = useMemo(
    () => contactos.map((c) => ({ id: c.id, nombre: nombrePropio(c.nombre), telefono: c.telefono })),
    [contactos],
  );

  const preActiva = preInterna ?? (preseleccion ? { id: preseleccion.id, nombre: nombrePropio(preseleccion.nombre) } : null);

  return (
    <aside className="agenda-lateral" aria-label="Agenda y seguimiento">
      <PanelRecordatorios
        clave={clave}
        titulo="Recordatorios de llamadas"
        subtituloSingular="llamada pendiente"
        subtituloPlural="llamadas pendientes"
        etiquetaEntidad={etiquetaEntidad}
        placeholderMotivo="Ej. Confirmar pedido de tomate y preguntar precio"
        textoVacio={`Agenda a qué ${etiquetaEntidad} marcarle hoy o pulsa el botón Agendar en cualquier ficha.`}
        opciones={opciones}
        preseleccion={preActiva}
        alConsumirPreseleccion={() => {
          setPreInterna(null);
          alConsumirPreseleccion?.();
        }}
        avisar={avisar}
      />

      <section className="panel glass-card lujo-brillo agenda-card">
        <header className="agenda-card__cabecera">
          <div className="agenda-card__titulo-bloque">
            <span className="agenda-card__icono agenda-card__icono--esmeralda" aria-hidden="true"><LuPhoneCall /></span>
            <div>
              <h2>{tituloDestacados}</h2>
              <p className="agenda-card__sub">{subtituloDestacados}</p>
            </div>
          </div>
        </header>

        {destacados.length ? (
          <ul className="agenda-rapidos">
            {destacados.map((c) => {
              const wa = telefonoWhatsApp(c.telefono);
              const tono = tonoDeTexto(c.subtitulo || c.nombre);
              return (
                <li key={c.id} className="agenda-rapido">
                  <button
                    type="button"
                    className="agenda-rapido__info"
                    onClick={() => alAbrirContacto?.(c.raw)}
                  >
                    <Monograma texto={c.nombre} tono={tono} />
                    <span className="agenda-rapido__texto">
                      <span className="agenda-rapido__nombre">{nombrePropio(c.nombre)}</span>
                      <span className="agenda-rapido__meta">{c.meta}</span>
                    </span>
                  </button>
                  <div className="agenda-rapido__btns">
                    {c.telefono && (
                      <button
                        type="button"
                        className="agenda-icon-btn"
                        title={`Copiar ${c.telefono}`}
                        aria-label={`Copiar teléfono de ${nombrePropio(c.nombre)}`}
                        onClick={() => copiarTexto(c.telefono, avisar, 'Teléfono')}
                      >
                        <LuCopy aria-hidden="true" />
                      </button>
                    )}
                    {wa && (
                      <a
                        className="agenda-icon-btn agenda-icon-btn--wa"
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir WhatsApp"
                        aria-label={`WhatsApp a ${nombrePropio(c.nombre)}`}
                      >
                        <LuMessageCircle aria-hidden="true" />
                      </a>
                    )}
                    <button
                      type="button"
                      className="agenda-icon-btn agenda-icon-btn--oro"
                      title="Agendar llamada"
                      aria-label={`Agendar llamada con ${nombrePropio(c.nombre)}`}
                      onClick={() => setPreInterna({ id: c.id, nombre: nombrePropio(c.nombre) })}
                    >
                      <LuBellPlus aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="agenda-vacio__texto">No hay contactos destacados disponibles en esta vista.</p>
        )}
      </section>

      <PanelNotas clave={clave} />
    </aside>
  );
}
