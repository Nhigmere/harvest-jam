// Bitácora ETL y Calidad de Datos: vista estilo Auditoría con cambios Antes → Después.
import { useEffect, useState } from 'react';
import { LuDatabase, LuFlaskConical, LuPlay, LuShieldAlert } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, Buscador, CabeceraPagina, Cifra, Insignia, MensajeError, Paginacion, Panel, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { fecha, fechaHora, nombrePropio, numero } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';

const ENTIDADES = [
  { valor: 'todas', etiqueta: 'Todo' },
  { valor: 'parametros', etiqueta: 'Parámetros' },
  { valor: 'entregas', etiqueta: 'Entregas' },
  { valor: 'ventas', etiqueta: 'Ventas' },
  { valor: 'resumen', etiqueta: 'Resumen' },
];

const ETIQUETA_ENTIDAD = {
  parametros: 'Parámetros',
  entregas: 'Entregas',
  ventas: 'Ventas',
  resumen: 'Resumen',
};

const ETIQUETA_TIPO = {
  LIMPIADO: { texto: 'Limpiado', tono: 'info' },
  IMPUTADO: { texto: 'Imputado', tono: 'aviso' },
  RECHAZADO: { texto: 'Rechazado', tono: 'critico' },
  CARGADO: { texto: 'Cargado', tono: 'ok' },
};

function ModalDetalleCambio({ cambio, alCerrar }) {
  return (
    <Modal
      abierto={Boolean(cambio)}
      alCerrar={alCerrar}
      titulo={cambio ? `Detalle del cambio · Regla ${cambio.regla}` : ''}
      descripcion={cambio ? `Corrida #${cambio.corridaId} · ${fechaHora(cambio.fechaHora)} · Fuente: ${cambio.fuente}` : undefined}
      ancho="grande"
      pie={<Boton variante="primario" onClick={alCerrar}>Cerrar</Boton>}
    >
      {cambio && (
        <div className="etl-detalle">
          <dl className="datos-en-linea">
            <div><dt>Entidad</dt><dd>{ETIQUETA_ENTIDAD[cambio.entidad] ?? cambio.entidad}</dd></div>
            <div><dt>Clave</dt><dd className="codigo-mono">{cambio.clave}</dd></div>
            <div><dt>Campo</dt><dd className="codigo-mono">{cambio.campo}</dd></div>
            <div>
              <dt>Resultado</dt>
              <dd>
                <Insignia tono={ETIQUETA_TIPO[cambio.tipo]?.tono ?? 'neutro'}>
                  {ETIQUETA_TIPO[cambio.tipo]?.texto ?? cambio.tipo}
                </Insignia>
              </dd>
            </div>
          </dl>

          <div className="etl-diff-caja">
            <div className="etl-diff-lado">
              <span className="etl-diff-etiqueta">Antes</span>
              <p className="etl-diff-valor">{cambio.valorAntes ?? '—'}</p>
            </div>
            <span className="etl-diff-flecha" aria-hidden="true">→</span>
            <div className="etl-diff-lado">
              <span className="etl-diff-etiqueta">Después</span>
              <p className="etl-diff-valor etl-diff-valor--despues">{cambio.valorDespues ?? '—'}</p>
            </div>
          </div>

          <p className="etl-motivo"><strong>Motivo:</strong> {cambio.motivo}</p>

          <div className="etl-json-grid">
            <div>
              <h3 className="subtitulo">Dato original (crudo)</h3>
              <pre className="etl-json">{cambio.datoAntes ? JSON.stringify(cambio.datoAntes, null, 2) : 'Sin registro crudo'}</pre>
            </div>
            <div>
              <h3 className="subtitulo">Dato resultante</h3>
              <pre className="etl-json">{cambio.datoDespues ? JSON.stringify(cambio.datoDespues, null, 2) : 'Enviado a cuarentena (no cargado)'}</pre>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function BitacoraEtl() {
  const { puede } = useSesion();
  const { avisar } = useDialogos();

  const [corridaId, setCorridaId] = useState('');
  const [entidad, setEntidad] = useState('todas');
  const [tipo, setTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ejecutando, setEjecutando] = useState(null); // null | 'completo' | 'prueba'
  const [seleccionado, setSeleccionado] = useState(null);

  const buscar = useRetardo(busqueda);

  useEffect(() => setPagina(1), [corridaId, entidad, tipo, buscar]);

  const { datos, error, cargando, recargar } = useApi('/etl/cambios', {
    corridaId: corridaId || null,
    entidad: entidad === 'todas' ? null : entidad,
    tipo: tipo === 'todos' ? null : tipo,
    buscar,
    pagina,
    limite: 40,
  });

  const correr = async (modo) => {
    setEjecutando(modo);
    try {
      const r = await api.post('/etl/ejecutar', { modo });
      if (modo === 'prueba') {
        avisar(`Prueba #${r.corridaId} lista: ${r.filasLimpiadas} limpios y ${r.filasRechazadas} enviados a cuarentena`);
      } else {
        avisar(`ETL #${r.corridaId} completado en ${r.duracionMs} ms (${r.filasCargadas} cargados, ${r.filasRechazadas} rechazados)`);
      }
      setCorridaId(String(r.corridaId));
      setTipo('todos');
      setEntidad('todas');
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setEjecutando(null);
    }
  };

  const r = datos?.resumen;
  const corridas = datos?.corridas ?? [];
  const corridaActiva = corridaId
    ? corridas.find((c) => String(c.id) === String(corridaId)) ?? datos?.ultimaCorrida
    : datos?.ultimaCorrida;

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Bitácora ETL"
        descripcion="Registro paso a paso de limpieza (L1–L4), imputación (I1), validación y cuarentena (V1–V4). El ETL solo lee del POS y nunca lo modifica."
        acciones={puede('EJECUTAR_ETL') && (
          <>
            <Boton
              variante="secundario"
              icono={LuFlaskConical}
              cargando={ejecutando === 'prueba'}
              disabled={Boolean(ejecutando)}
              onClick={() => correr('prueba')}
            >
              {ejecutando === 'prueba' ? 'Probando…' : 'Probar datos inválidos'}
            </Boton>
            <Boton
              variante="primario"
              icono={LuPlay}
              cargando={ejecutando === 'completo'}
              disabled={Boolean(ejecutando)}
              onClick={() => correr('completo')}
            >
              {ejecutando === 'completo' ? 'Ejecutando ETL…' : 'Ejecutar ETL'}
            </Boton>
          </>
        )}
      />

      {corridaActiva && (
        <div className="cifras cifras--fila lujo-brillo">
          <Cifra
            principal
            etiqueta={corridaId ? `Corrida #${corridaActiva.id}` : `Última corrida (#${corridaActiva.id})`}
            valor={corridaActiva.modo === 'prueba' ? 'Modo prueba' : 'Completo'}
            detalle={`${fechaHora(corridaActiva.iniciadoEn)} · ${nombrePropio(corridaActiva.ejecutadoPor)} · ${corridaActiva.duracionMs} ms`}
          />
          <Cifra etiqueta="Leídas" numeroAnimado={corridaActiva.filasLeidas} formato={numero} detalle={corridaActiva.fechaCorte ? `Corte ${fecha(corridaActiva.fechaCorte)}` : undefined} />
          <Cifra etiqueta="Limpiadas / Imputadas" numeroAnimado={corridaActiva.filasLimpiadas + corridaActiva.filasImputadas} formato={numero} detalle={`${corridaActiva.filasLimpiadas} L · ${corridaActiva.filasImputadas} I`} />
          <Cifra etiqueta="Cargadas" numeroAnimado={corridaActiva.filasCargadas} formato={numero} />
          <Cifra etiqueta="Rechazadas (Cuarentena)" numeroAnimado={corridaActiva.filasRechazadas} formato={numero} />
        </div>
      )}

      <div className="filtros filtros--columna">
        <div className="filtros__fila">
          <select
            className="entrada"
            style={{ width: 'auto', minWidth: 230 }}
            aria-label="Filtrar por corrida"
            value={corridaId}
            onChange={(e) => setCorridaId(e.target.value)}
          >
            <option value="">Todas las corridas</option>
            {corridas.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} · {c.modo === 'prueba' ? 'Prueba' : 'Completo'} · {fechaHora(c.iniciadoEn)}
              </option>
            ))}
          </select>
          <Segmentado etiqueta="Entidad" opciones={ENTIDADES} valor={entidad} alCambiar={setEntidad} />
          <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar cambio ETL" placeholder="Código, regla (L1, V2) o motivo" className="filtros__buscador" />
        </div>

        <Segmentado
          etiqueta="Tipo de cambio"
          valor={tipo}
          alCambiar={setTipo}
          opciones={[
            { valor: 'todos', etiqueta: 'Todos', conteo: r?.total },
            { valor: 'LIMPIADO', etiqueta: 'Limpiados', conteo: r?.limpiados },
            { valor: 'IMPUTADO', etiqueta: 'Imputados', conteo: r?.imputados },
            { valor: 'RECHAZADO', etiqueta: 'Rechazados', conteo: r?.rechazados },
            { valor: 'CARGADO', etiqueta: 'Cargados', conteo: r?.cargados },
          ]}
        />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoTabla filas={8} />}

      {datos && (
        <Panel>
          <Tabla
            etiqueta="Cambios del ETL"
            cargando={cargando}
            filas={datos.registros}
            alAbrir={(c) => setSeleccionado(c)}
            columnas={[
              { clave: 'fechaHora', titulo: 'Cuándo', render: (c) => <span className="sin-salto">{fechaHora(c.fechaHora)}</span>, ancho: '150px' },
              { clave: 'corridaId', titulo: 'Corrida', render: (c) => <span className="codigo-mono">#{c.corridaId}</span>, ancho: '82px' },
              {
                clave: 'entidad', titulo: 'Entidad / Clave',
                render: (c) => (
                  <span className="celda-doble">
                    <span>{ETIQUETA_ENTIDAD[c.entidad] ?? c.entidad}</span>
                    <span className="celda-doble__detalle codigo-mono">{c.clave} · {c.campo}</span>
                  </span>
                ),
              },
              {
                clave: 'tipo', titulo: 'Resultado',
                render: (c) => (
                  <Insignia tono={ETIQUETA_TIPO[c.tipo]?.tono ?? 'neutro'}>
                    {ETIQUETA_TIPO[c.tipo]?.texto ?? c.tipo}
                  </Insignia>
                ),
              },
              { clave: 'regla', titulo: 'Regla', render: (c) => <span className="etl-regla-tag">{c.regla}</span>, ancho: '76px' },
              {
                clave: 'cambio', titulo: 'Antes → Después', className: 'tabla__td--texto-largo',
                render: (c) => (
                  <span className="etl-diff-inline">
                    <span className="etl-diff-antes">{c.valorAntes ?? '—'}</span>
                    <span className="etl-diff-sep" aria-hidden="true">→</span>
                    <span className={c.tipo === 'RECHAZADO' ? 'etl-diff-rechazo' : 'etl-diff-despues'}>
                      {c.valorDespues ?? '—'}
                    </span>
                  </span>
                ),
              },
              { clave: 'motivo', titulo: 'Motivo', className: 'tabla__td--texto-largo', render: (c) => <span className="texto-2">{c.motivo}</span> },
            ]}
            vacio={
              <Vacio
                icono={datos.ultimaCorrida ? LuShieldAlert : LuDatabase}
                titulo={datos.ultimaCorrida ? 'No hay cambios con estos filtros' : 'El ETL aún no se ha ejecutado'}
                accion={!datos.ultimaCorrida && puede('EJECUTAR_ETL') && (
                  <Boton variante="primario" icono={LuPlay} onClick={() => correr('completo')}>Ejecutar primera carga</Boton>
                )}
              >
                {datos.ultimaCorrida
                  ? 'Cambia la corrida o los filtros de arriba para ver otros registros.'
                  : 'Ejecuta el ETL para limpiar los datos del POS y de los CSV externos.'}
              </Vacio>
            }
          />
          <Paginacion pagina={datos.pagina} limite={datos.limite} total={datos.total} alCambiar={setPagina} />
        </Panel>
      )}

      <ModalDetalleCambio cambio={seleccionado} alCerrar={() => setSeleccionado(null)} />
    </div>
  );
}
