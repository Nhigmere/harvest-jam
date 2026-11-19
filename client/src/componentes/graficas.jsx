// Gráficas en SVG/HTML hechas a mano (sin librerías).
// Reglas: marcas delgadas, rejilla tenue, etiquetas solo donde cuentan,
// tooltip que no esconde datos (cada gráfica tiene su vista de tabla).
import { useEffect, useId, useRef, useState } from 'react';
import { LuChartColumn, LuTable } from 'react-icons/lu';
import { moneda, monedaCompacta, numero } from '../formato.js';
import { BotonIcono, Panel } from './ui.jsx';

function useAncho(ref) {
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const obs = new ResizeObserver(([entrada]) => setAncho(Math.floor(entrada.contentRect.width)));
    obs.observe(el);
    setAncho(Math.floor(el.getBoundingClientRect().width));
    return () => obs.disconnect();
  }, [ref]);
  return ancho;
}

// Marcas "limpias" para el eje: 0, 2,000, 4,000...
function marcasEje(maximo, cuantas = 4) {
  if (!maximo || maximo <= 0) return [0, 1];
  const crudo = maximo / cuantas;
  const magnitud = 10 ** Math.floor(Math.log10(crudo));
  const residuo = crudo / magnitud;
  const paso = (residuo > 5 ? 10 : residuo > 2 ? 5 : residuo > 1 ? 2 : 1) * magnitud;
  const tope = Math.ceil(maximo / paso) * paso;
  const marcas = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) marcas.push(Math.round(v * 100) / 100);
  return marcas;
}

// Barra con la punta redondeada y la base recta.
function rutaBarra(x, y, ancho, alto, radio = 6) {
  if (alto <= 0) return '';
  const r = Math.min(radio, alto, ancho / 2);
  return `M${x},${y + alto} V${y + r} Q${x},${y} ${x + r},${y} H${x + ancho - r} Q${x + ancho},${y} ${x + ancho},${y + r} V${y + alto} Z`;
}

// Curva suave cúbica acotada para que la línea fluya con elegancia sin pasarse del eje.
function curvaSuave(coords, yMin, yMax) {
  if (!coords.length) return '';
  if (coords.length === 1) return `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
  const acotar = (v) => Math.min(Math.max(v, yMin), yMax);
  let d = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[Math.max(i - 1, 0)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(i + 2, coords.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = acotar(p1[1] + (p2[1] - p0[1]) / 6);
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = acotar(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function Tooltip({ visible, x, y, anchoContenedor, children }) {
  if (!visible) return null;
  const izquierda = x > anchoContenedor - 170;
  return (
    <div
      className="grafica__tooltip"
      style={{ left: x, top: y, transform: `translate(${izquierda ? 'calc(-100% - 12px)' : '12px'}, -50%)` }}
      role="presentation"
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// Área: una serie en el tiempo, con cruz que sigue al puntero
// ---------------------------------------------------------------------
export function GraficaArea({
  puntos,
  campoX = 'periodo',
  campoY = 'ingresos',
  formatoX,
  formatoY = monedaCompacta,
  formatoValor = moneda,
  detalleTooltip,
  etiqueta,
  alto = 232,
}) {
  const ref = useRef(null);
  const ancho = useAncho(ref);
  const [activo, setActivo] = useState(null);
  const idDesc = useId();
  const uid = useId().replace(/:/g, '');
  const idGradArea = `area-${uid}`;
  const idGradLinea = `linea-${uid}`;

  const m = { arriba: 18, derecha: 20, abajo: 32, izquierda: 56 };
  const w = Math.max(ancho - m.izquierda - m.derecha, 10);
  const h = alto - m.arriba - m.abajo;
  const n = puntos.length;
  const maximo = Math.max(0, ...puntos.map((p) => p[campoY]));
  const marcas = marcasEje(maximo);
  const tope = marcas.at(-1) || 1;
  const sx = (i) => (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const sy = (v) => h - (v / tope) * h;

  const coords = puntos.map((p, i) => [sx(i), sy(p[campoY])]);
  const linea = curvaSuave(coords, 0, h);
  const area = n ? `${linea} L${sx(n - 1).toFixed(1)},${h} L${sx(0).toFixed(1)},${h} Z` : '';

  // Etiquetas del eje X: tantas como quepan (una cada ~76px).
  const cabenX = Math.max(Math.floor(w / 76), 2);
  const pasoX = Math.max(Math.ceil(n / cabenX), 1);
  const indicesX = puntos.map((_, i) => i).filter((i) => i % pasoX === 0);

  const moverA = (clientX) => {
    const caja = ref.current.getBoundingClientRect();
    const px = clientX - caja.left - m.izquierda;
    const i = Math.round((px / w) * (n - 1));
    setActivo(Math.min(Math.max(i, 0), n - 1));
  };

  const alTeclado = (e) => {
    if (!n) return;
    const actual = activo ?? n - 1;
    const destino = { ArrowLeft: actual - 1, ArrowRight: actual + 1, Home: 0, End: n - 1 }[e.key];
    if (destino !== undefined) {
      e.preventDefault();
      setActivo(Math.min(Math.max(destino, 0), n - 1));
    }
  };

  const ultimo = n ? puntos[n - 1] : null;
  const pActivo = activo !== null ? puntos[activo] : null;

  return (
    <div
      ref={ref}
      className="grafica"
      tabIndex={0}
      role="group"
      aria-label={etiqueta}
      aria-describedby={idDesc}
      onKeyDown={alTeclado}
      onBlur={() => setActivo(null)}
    >
      <p id={idDesc} className="solo-lectores">Usa las flechas izquierda y derecha para recorrer los puntos.</p>
      {ancho > 0 && (
        <svg width={ancho} height={alto} aria-hidden="true">
          <defs>
            <linearGradient id={idGradArea} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6D5DF6" stopOpacity="0.22" />
              <stop offset="58%" stopColor="#E8B98A" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#0B0B10" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={idGradLinea} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6D5DF6" />
              <stop offset="100%" stopColor="#E8B98A" />
            </linearGradient>
          </defs>
          <g transform={`translate(${m.izquierda},${m.arriba})`}>
            {marcas.map((v) => (
              <g key={v}>
                <line x1={0} x2={w} y1={sy(v)} y2={sy(v)} className="grafica__rejilla" />
                <text x={-10} y={sy(v)} dy="0.32em" textAnchor="end" className="grafica__eje">{formatoY(v)}</text>
              </g>
            ))}
            {indicesX.map((i) => (
              <text key={i} x={sx(i)} y={h + 20} textAnchor={i === 0 ? 'start' : 'middle'} className="grafica__eje">
                {formatoX ? formatoX(puntos[i][campoX]) : puntos[i][campoX]}
              </text>
            ))}
            <path d={area} fill={`url(#${idGradArea})`} className="grafica__area" />
            <path d={linea} stroke={`url(#${idGradLinea})`} className="grafica__linea" />
            {ultimo && (
              <>
                <circle cx={sx(n - 1)} cy={sy(ultimo[campoY])} r={8} className="grafica__halo" />
                <circle cx={sx(n - 1)} cy={sy(ultimo[campoY])} r={3.5} className="grafica__punto" />
                {activo === null && (
                  <text x={sx(n - 1) - 10} y={sy(ultimo[campoY]) - 11} textAnchor="end" className="grafica__valor">
                    {formatoValor(ultimo[campoY])}
                  </text>
                )}
              </>
            )}
            {pActivo && (
              <>
                <line x1={sx(activo)} x2={sx(activo)} y1={0} y2={h} className="grafica__cruz" />
                <circle cx={sx(activo)} cy={sy(pActivo[campoY])} r={9} className="grafica__halo" />
                <circle cx={sx(activo)} cy={sy(pActivo[campoY])} r={4} className="grafica__punto" />
              </>
            )}
            <rect
              x={0}
              y={0}
              width={w}
              height={h}
              fill="transparent"
              onPointerMove={(e) => moverA(e.clientX)}
              onPointerDown={(e) => moverA(e.clientX)}
              onPointerLeave={() => setActivo(null)}
            />
          </g>
        </svg>
      )}
      <Tooltip visible={Boolean(pActivo)} x={pActivo ? sx(activo) + m.izquierda : 0} y={m.arriba + h / 2} anchoContenedor={ancho}>
        {pActivo && (
          <>
            <strong className="grafica__tooltip-valor">{formatoValor(pActivo[campoY])}</strong>
            <span className="grafica__tooltip-etiqueta">{formatoX ? formatoX(pActivo[campoX]) : pActivo[campoX]}</span>
            {detalleTooltip && <span className="grafica__tooltip-etiqueta">{detalleTooltip(pActivo)}</span>}
          </>
        )}
      </Tooltip>
      <p className="solo-lectores" aria-live="polite">
        {pActivo ? `${formatoX ? formatoX(pActivo[campoX]) : pActivo[campoX]}: ${formatoValor(pActivo[campoY])}` : ''}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
// Columnas: una barra por categoría ordenada (por ejemplo, horas del día)
// ---------------------------------------------------------------------
export function GraficaColumnas({ datos, campoX, campoY, formatoX = (v) => v, formatoValor = numero, detalleTooltip, etiqueta, alto = 220 }) {
  const ref = useRef(null);
  const ancho = useAncho(ref);
  const [activo, setActivo] = useState(null);
  const uid = useId().replace(/:/g, '');
  const idGradBarra = `barra-${uid}`;
  const idGradActiva = `barra-act-${uid}`;

  const m = { arriba: 24, derecha: 8, abajo: 30, izquierda: 40 };
  const w = Math.max(ancho - m.izquierda - m.derecha, 10);
  const h = alto - m.arriba - m.abajo;
  const n = datos.length;
  const banda = n ? w / n : w;
  const anchoBarra = Math.min(28, Math.max(banda - 2, 2) * 0.72);
  const maximo = Math.max(0, ...datos.map((d) => d[campoY]));
  const marcas = marcasEje(maximo, 3);
  const tope = marcas.at(-1) || 1;
  const sy = (v) => h - (v / tope) * h;
  const iMax = datos.findIndex((d) => d[campoY] === maximo);
  const cabenX = Math.max(Math.floor(w / 34), 1);
  const pasoX = Math.max(Math.ceil(n / cabenX), 1);
  const dActivo = activo !== null ? datos[activo] : null;

  return (
    <div ref={ref} className="grafica" role="group" aria-label={etiqueta}>
      {ancho > 0 && (
        <svg width={ancho} height={alto}>
          <defs>
            <linearGradient id={idGradBarra} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6D5DF6" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#6D5DF6" stopOpacity="0.22" />
            </linearGradient>
            <linearGradient id={idGradActiva} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8B98A" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#6D5DF6" stopOpacity="0.48" />
            </linearGradient>
          </defs>
          <g transform={`translate(${m.izquierda},${m.arriba})`}>
            {marcas.map((v) => (
              <g key={v} aria-hidden="true">
                <line x1={0} x2={w} y1={sy(v)} y2={sy(v)} className="grafica__rejilla" />
                <text x={-8} y={sy(v)} dy="0.32em" textAnchor="end" className="grafica__eje">{numero(v)}</text>
              </g>
            ))}
            {datos.map((d, i) => {
              const x = i * banda + (banda - anchoBarra) / 2;
              const y = sy(d[campoY]);
              const destacada = activo === i || (activo === null && i === iMax && maximo > 0);
              return (
                <g key={d[campoX]}>
                  <path d={rutaBarra(x, 0, anchoBarra, h, 6)} className="grafica__pista" aria-hidden="true" />
                  <path
                    d={rutaBarra(x, y, anchoBarra, h - y, 6)}
                    fill={`url(#${destacada ? idGradActiva : idGradBarra})`}
                    className={`grafica__barra ${destacada ? 'grafica__barra--activa' : ''}`}
                  />
                  {i % pasoX === 0 && (
                    <text x={x + anchoBarra / 2} y={h + 20} textAnchor="middle" className="grafica__eje" aria-hidden="true">
                      {formatoX(d[campoX])}
                    </text>
                  )}
                  {i === iMax && maximo > 0 && (
                    <text x={x + anchoBarra / 2} y={y - 7} textAnchor="middle" className="grafica__valor" aria-hidden="true">
                      {formatoValor(d[campoY])}
                    </text>
                  )}
                  <rect
                    x={i * banda}
                    y={0}
                    width={banda}
                    height={h}
                    fill="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={`${formatoX(d[campoX])}: ${formatoValor(d[campoY])}`}
                    onPointerEnter={() => setActivo(i)}
                    onPointerLeave={() => setActivo(null)}
                    onFocus={() => setActivo(i)}
                    onBlur={() => setActivo(null)}
                    className="grafica__zona"
                  />
                </g>
              );
            })}
          </g>
        </svg>
      )}
      <Tooltip
        visible={Boolean(dActivo)}
        x={dActivo ? m.izquierda + activo * banda + banda / 2 : 0}
        y={dActivo ? m.arriba + Math.max(sy(dActivo[campoY]), 24) : 0}
        anchoContenedor={ancho}
      >
        {dActivo && (
          <>
            <strong className="grafica__tooltip-valor">{formatoValor(dActivo[campoY])}</strong>
            <span className="grafica__tooltip-etiqueta">{formatoX(dActivo[campoX])}</span>
            {detalleTooltip && <span className="grafica__tooltip-etiqueta">{detalleTooltip(dActivo)}</span>}
          </>
        )}
      </Tooltip>
    </div>
  );
}

// ---------------------------------------------------------------------
// Barras horizontales ordenadas (ranking), un solo color
// ---------------------------------------------------------------------
export function BarrasRanking({ datos, campoEtiqueta, campoValor, formatoValor = moneda, detalle, etiqueta }) {
  const maximo = Math.max(0, ...datos.map((d) => d[campoValor]));
  return (
    <ol className="ranking" aria-label={etiqueta}>
      {datos.map((d, i) => (
        <li key={`${d[campoEtiqueta]}-${i}`} className="ranking__fila">
          <span className="ranking__nombre">
            {d[campoEtiqueta]}
            {detalle && <span className="ranking__detalle">{detalle(d)}</span>}
          </span>
          <span className="ranking__pista" aria-hidden="true">
            <span className="ranking__barra" style={{ width: `${maximo ? Math.max((d[campoValor] / maximo) * 100, 1.5) : 0}%` }} />
          </span>
          <span className="ranking__valor numeros">{formatoValor(d[campoValor])}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------
// Barra segmentada alta: un total partido en pocas partes
// ---------------------------------------------------------------------
const SERIES = [
  'var(--accent)',
  'var(--gold)',
  'var(--success-text)',
];

export function BarraSegmentada({ partes, formatoValor = moneda, etiqueta }) {
  const total = partes.reduce((s, p) => s + p.valor, 0);
  if (!total) return null;
  const descripcion = partes
    .map((p) => `${p.nombre}: ${formatoValor(p.valor)} (${Math.round((p.valor / total) * 100)} %)`)
    .join('; ');
  return (
    <figure className="segmentos" aria-label={`${etiqueta}. ${descripcion}`}>
      <div className="segmentos__barra" role="img" aria-label={descripcion}>
        {partes.filter((p) => p.valor > 0).map((p, i) => {
          const pct = (p.valor / total) * 100;
          return (
            <div
              key={p.nombre}
              className={`segmentos__parte ${i === 1 ? 'segmentos__parte--clara' : ''}`}
              style={{ flexGrow: p.valor, background: SERIES[i % SERIES.length] }}
              title={`${p.nombre}: ${formatoValor(p.valor)}`}
            >
              {pct >= 12 && <span className="segmentos__texto numeros">{Math.round(pct)} %</span>}
            </div>
          );
        })}
      </div>
      <figcaption className="segmentos__leyenda">
        {partes.map((p, i) => (
          <span key={p.nombre} className="segmentos__clave">
            <span className="segmentos__muestra" style={{ background: SERIES[i % SERIES.length] }} aria-hidden="true" />
            {p.nombre} <span className="texto-2 numeros">{formatoValor(p.valor)}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------
// Panel con gráfica y su vista de tabla
// ---------------------------------------------------------------------
export function PanelGrafica({ titulo, descripcion, columnas, filas, children, acciones, className = '' }) {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <Panel
      titulo={titulo}
      descripcion={descripcion}
      className={className}
      acciones={
        <>
          {acciones}
          {columnas && (
            <BotonIcono
              icono={verTabla ? LuChartColumn : LuTable}
              etiqueta={verTabla ? 'Ver gráfica' : 'Ver como tabla'}
              aria-pressed={verTabla}
              onClick={() => setVerTabla((v) => !v)}
            />
          )}
        </>
      }
    >
      {verTabla ? (
        <div className="tabla-contenedor tabla-contenedor--compacta">
          <table className="tabla">
            <thead>
              <tr>
                {columnas.map((c) => (
                  <th key={c.clave} scope="col" className={`tabla__th tabla__th--${c.alinear ?? 'izq'}`}>{c.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  {columnas.map((c) => (
                    <td key={c.clave} className={`tabla__td tabla__td--${c.alinear ?? 'izq'}`}>{c.render ? c.render(f) : f[c.clave]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Panel>
  );
}
