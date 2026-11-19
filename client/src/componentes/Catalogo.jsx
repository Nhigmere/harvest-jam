// Piezas editoriales compartidas para los catálogos: fichas, filtros en pastilla,
// resumen ejecutivo, cambio de vista (tarjetas/tabla) e inspector lateral deslizante.
import { useEffect, useId, useState } from 'react';
import { LuLayoutGrid, LuList, LuX } from 'react-icons/lu';
import { iniciales, numero } from '../formato.js';

const TONOS = ['oro', 'esmeralda', 'terracota', 'cielo', 'ciruela'];

// Elige un tono cálido/botánico estable a partir de cualquier texto (ciudad, categoría, nombre).
export function tonoDeTexto(texto = '') {
  const s = String(texto).toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 997;
  return TONOS[Math.abs(h) % TONOS.length];
}

// Persiste la vista preferida (tarjetas | tabla) por catálogo.
export function useVistaCatalogo(clave, defecto = 'tarjetas') {
  const [vista, setVista] = useState(() => {
    try {
      const guardada = localStorage.getItem(`harvest-jam:vista:${clave}`);
      return guardada === 'tabla' || guardada === 'tarjetas' ? guardada : defecto;
    } catch {
      return defecto;
    }
  });

  const cambiar = (siguiente) => {
    setVista(siguiente);
    try {
      localStorage.setItem(`harvest-jam:vista:${clave}`, siguiente);
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  return [vista, cambiar];
}

// Copia al portapapeles con aviso discreto.
export async function copiarTexto(texto, avisar, etiqueta = 'Dato') {
  if (!texto) return;
  try {
    await navigator.clipboard.writeText(String(texto));
    avisar?.(`${etiqueta} copiado`);
  } catch {
    avisar?.('No se pudo copiar al portapapeles', 'error');
  }
}

export function SwitchVista({ vista, alCambiar }) {
  return (
    <div className="vista-switch" role="radiogroup" aria-label="Modo de visualización">
      <button
        type="button"
        role="radio"
        aria-checked={vista === 'tarjetas'}
        className="vista-switch__btn"
        onClick={() => alCambiar('tarjetas')}
        title="Vista en fichas"
      >
        <LuLayoutGrid aria-hidden="true" />
        <span>Fichas</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={vista === 'tabla'}
        className="vista-switch__btn"
        onClick={() => alCambiar('tabla')}
        title="Vista en tabla"
      >
        <LuList aria-hidden="true" />
        <span>Tabla</span>
      </button>
    </div>
  );
}

export function ChipsFiltro({ etiqueta, opciones, valor, alCambiar }) {
  if (!opciones.length) return null;
  return (
    <div className="chips-filtro" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((op) => {
        const Icono = op.icono;
        return (
          <button
            key={op.valor}
            type="button"
            role="radio"
            aria-checked={valor === op.valor}
            className="chip-filtro"
            onClick={() => alCambiar(op.valor)}
          >
            {Icono && <Icono className="chip-filtro__icono" aria-hidden="true" />}
            <span>{op.etiqueta}</span>
            {op.conteo !== undefined && <span className="chip-filtro__conteo numeros">{numero(op.conteo)}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ResumenCatalogo({ items }) {
  return (
    <section className="catalogo-resumen lujo-brillo" aria-label="Resumen">
      {items.map((item) => {
        const Icono = item.icono;
        const Tag = item.alClick ? 'button' : 'div';
        return (
          <Tag
            key={item.etiqueta}
            type={item.alClick ? 'button' : undefined}
            onClick={item.alClick}
            className={`catalogo-resumen__item ${item.alClick ? 'catalogo-resumen__item--activo' : ''} ${item.tono ? `catalogo-resumen__item--${item.tono}` : ''}`}
          >
            {Icono && (
              <span className="catalogo-resumen__icono" aria-hidden="true">
                <Icono />
              </span>
            )}
            <span className="catalogo-resumen__texto">
              <span className="catalogo-resumen__etiqueta">{item.etiqueta}</span>
              <span className="catalogo-resumen__valor numeros">{item.valor}</span>
              {item.detalle && <span className="catalogo-resumen__detalle">{item.detalle}</span>}
            </span>
          </Tag>
        );
      })}
    </section>
  );
}

export function Monograma({ texto, tono, icono: Icono, forma = 'suave', talla = 'normal' }) {
  const t = tono ?? tonoDeTexto(texto);
  return (
    <span className={`monograma monograma--${t} monograma--${forma} monograma--${talla}`} aria-hidden="true">
      {Icono ? <Icono /> : iniciales(texto)}
    </span>
  );
}

export function EsqueletoFichas({ cantidad = 6 }) {
  return (
    <div className="fichas-grid" aria-busy="true" aria-label="Cargando catálogo">
      {Array.from({ length: cantidad }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="ficha ficha--esqueleto">
          <div className="ficha__cabecera">
            <span className="esqueleto" style={{ width: 42, height: 42, borderRadius: 14 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="esqueleto" style={{ width: '68%', height: 15 }} />
              <span className="esqueleto" style={{ width: '42%', height: 11 }} />
            </div>
          </div>
          <span className="esqueleto" style={{ width: '85%', height: 12 }} />
          <span className="esqueleto" style={{ width: '100%', height: 34, borderRadius: 12 }} />
        </div>
      ))}
    </div>
  );
}

// Inspector lateral flotante deslizante desde la derecha.
export function Drawer({ abierto, alCerrar, titulo, subtitulo, insignia, monograma, pie, children }) {
  const idTitulo = useId();

  useEffect(() => {
    if (!abierto) return undefined;
    const alTecla = (e) => {
      if (e.key === 'Escape') alCerrar();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alTecla);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', alTecla);
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  return (
    <div className="drawer-capa" role="presentation">
      <div className="drawer-fondo" onClick={alCerrar} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <header className="drawer__cabecera">
          <div className="drawer__identidad">
            {monograma}
            <div className="drawer__titulos">
              <div className="drawer__fila-titulo">
                <h2 id={idTitulo}>{titulo}</h2>
                {insignia}
              </div>
              {subtitulo && <p className="drawer__subtitulo">{subtitulo}</p>}
            </div>
          </div>
          <button type="button" className="drawer__cerrar" onClick={alCerrar} aria-label="Cerrar panel">
            <LuX aria-hidden="true" />
          </button>
        </header>

        <div className="drawer__cuerpo">{children}</div>

        {pie && <footer className="drawer__pie">{pie}</footer>}
      </aside>
    </div>
  );
}
