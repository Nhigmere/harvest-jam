// Efectos de lujo: contadores animados, esqueletos de carga y brillo especular.
import { useEffect, useRef, useState } from 'react';

const prefiereMenosMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Interpola cifras suavemente al aparecer o cambiar (respeta reduced-motion).
export function ContadorAnimado({ valor, formato, duracion = 480 }) {
  const destino = Number(valor);
  const [mostrado, setMostrado] = useState(Number.isFinite(destino) ? destino : 0);
  const anteriorRef = useRef(Number.isFinite(destino) ? destino : 0);

  useEffect(() => {
    if (!Number.isFinite(destino)) return undefined;
    if (prefiereMenosMovimiento() || anteriorRef.current === destino) {
      setMostrado(destino);
      anteriorRef.current = destino;
      return undefined;
    }

    const inicioValor = anteriorRef.current;
    const diferencia = destino - inicioValor;
    const t0 = performance.now();
    let raf = 0;

    const paso = (ahora) => {
      const p = Math.min((ahora - t0) / duracion, 1);
      const curva = 1 - (1 - p) ** 3;
      setMostrado(inicioValor + diferencia * curva);
      if (p < 1) {
        raf = requestAnimationFrame(paso);
      } else {
        anteriorRef.current = destino;
      }
    };

    raf = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(raf);
      anteriorRef.current = destino;
    };
  }, [destino, duracion]);

  if (!Number.isFinite(destino)) return formato ? formato(valor) : '—';
  return formato ? formato(mostrado) : String(Math.round(mostrado));
}

// Brillo radial sutil que sigue al puntero en tarjetas .lujo-brillo sin re-renderizar React.
export function useSpotlight() {
  useEffect(() => {
    if (prefiereMenosMovimiento()) return undefined;
    let raf = 0;
    let ultimoEvento = null;

    const actualizar = () => {
      raf = 0;
      if (!ultimoEvento) return;
      const objetivo = ultimoEvento.target?.closest?.('.lujo-brillo');
      if (!objetivo) return;
      const rect = objetivo.getBoundingClientRect();
      objetivo.style.setProperty('--mx', `${ultimoEvento.clientX - rect.left}px`);
      objetivo.style.setProperty('--my', `${ultimoEvento.clientY - rect.top}px`);
    };

    const alMover = (e) => {
      if (e.pointerType === 'touch') return;
      ultimoEvento = e;
      if (!raf) raf = requestAnimationFrame(actualizar);
    };

    window.addEventListener('pointermove', alMover, { passive: true });
    return () => {
      window.removeEventListener('pointermove', alMover);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

export function Esqueleto({ ancho = '100%', alto = 16, radio = 8, className = '' }) {
  return (
    <span
      className={`esqueleto ${className}`}
      style={{ width: ancho, height: alto, borderRadius: radio }}
      aria-hidden="true"
    />
  );
}

export function EsqueletoDashboard() {
  return (
    <div className="inicio__contenido" role="status" aria-label="Cargando resumen">
      <div className="hoy glass-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
          <Esqueleto ancho="110px" alto={12} />
          <Esqueleto ancho="220px" alto={44} radio={10} />
          <Esqueleto ancho="260px" alto={14} />
        </div>
      </div>
      <div className="panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 24 }}>
          <Esqueleto ancho="160px" alto={52} />
          <Esqueleto ancho="110px" alto={52} />
          <Esqueleto ancho="130px" alto={52} />
          <Esqueleto ancho="140px" alto={52} />
        </div>
        <Esqueleto ancho="100%" alto={220} radio={12} />
      </div>
      <div className="inicio__rejilla">
        <div className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Esqueleto ancho="160px" alto={18} />
          <Esqueleto ancho="100%" alto={22} />
          <Esqueleto ancho="92%" alto={22} />
          <Esqueleto ancho="84%" alto={22} />
          <Esqueleto ancho="76%" alto={22} />
        </div>
        <div className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Esqueleto ancho="160px" alto={18} />
          <Esqueleto ancho="100%" alto={22} />
          <Esqueleto ancho="90%" alto={22} />
          <Esqueleto ancho="82%" alto={22} />
          <Esqueleto ancho="72%" alto={22} />
        </div>
      </div>
    </div>
  );
}

export function EsqueletoTabla({ filas = 7 }) {
  return (
    <div className="panel" role="status" aria-label="Cargando datos">
      <div className="esqueleto-tabla">
        <Esqueleto ancho="100%" alto={32} radio={8} />
        {Array.from({ length: filas }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Esqueleto key={i} ancho={`${100 - (i % 3) * 4}%`} alto={42} radio={8} />
        ))}
      </div>
    </div>
  );
}

export function EsqueletoPOS() {
  return (
    <div className="pos__rejilla" role="status" aria-label="Cargando catálogo">
      {Array.from({ length: 12 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="producto-pos" style={{ pointerEvents: 'none' }}>
          <Esqueleto ancho="58px" alto={12} />
          <Esqueleto ancho="82%" alto={18} />
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Esqueleto ancho="64px" alto={12} />
            <Esqueleto ancho="72px" alto={28} radio={9} />
          </div>
        </div>
      ))}
    </div>
  );
}
