// Selector de fecha con calendario desplegable en estilo Obsidian Atelier.
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuCalendar, LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu';
import { fecha } from '../formato.js';
import { useApi } from '../hooks.js';

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function aIsoLocal(d) {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function parsearMes(valorIso) {
  if (valorIso && /^\d{4}-\d{2}-\d{2}$/.test(valorIso)) {
    const [a, m] = valorIso.split('-').map(Number);
    return { anio: a, mes: m - 1 };
  }
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
}

function construirCeldas(anio, mes) {
  const primero = new Date(anio, mes, 1);
  // Lunes = 0 ... Domingo = 6
  const desplazamiento = (primero.getDay() + 6) % 7;
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const diasMesAnterior = new Date(anio, mes, 0).getDate();
  const celdas = [];

  for (let i = desplazamiento - 1; i >= 0; i -= 1) {
    const d = new Date(anio, mes - 1, diasMesAnterior - i);
    celdas.push({ iso: aIsoLocal(d), numero: d.getDate(), fuera: true });
  }
  for (let dia = 1; dia <= diasMes; dia += 1) {
    const d = new Date(anio, mes, dia);
    celdas.push({ iso: aIsoLocal(d), numero: dia, fuera: false });
  }
  while (celdas.length % 7 !== 0) {
    const siguiente = celdas.length - (desplazamiento + diasMes) + 1;
    const d = new Date(anio, mes + 1, siguiente);
    celdas.push({ iso: aIsoLocal(d), numero: d.getDate(), fuera: true });
  }
  return celdas;
}

export function CalendarioFecha({
  valor,
  alCambiar,
  rutaDias = null,
  etiqueta = 'Buscar por fecha',
  placeholder = 'Elegir fecha',
  singular = 'venta',
  plural = 'ventas',
}) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState(() => parsearMes(valor));
  const raizRef = useRef(null);

  const hoyIso = aIsoLocal(new Date());
  const mesParam = `${vista.anio}-${String(vista.mes + 1).padStart(2, '0')}`;

  // Si se indica un endpoint (ej. /ventas/dias), marca con punto dorado los días con actividad.
  const { datos: actividad } = useApi(abierto && rutaDias ? rutaDias : null, { mes: mesParam });
  const conteosPorDia = actividad?.dias ?? {};

  useEffect(() => {
    if (valor) setVista(parsearMes(valor));
  }, [valor]);

  useEffect(() => {
    if (!abierto) return undefined;
    const alClicAfuera = (e) => {
      if (raizRef.current && !raizRef.current.contains(e.target)) setAbierto(false);
    };
    const alTecla = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClicAfuera);
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('mousedown', alClicAfuera);
      document.removeEventListener('keydown', alTecla);
    };
  }, [abierto]);

  const celdas = useMemo(() => construirCeldas(vista.anio, vista.mes), [vista.anio, vista.mes]);

  const moverMes = (delta) => {
    setVista(({ anio, mes }) => {
      const d = new Date(anio, mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });
  };

  const seleccionar = (iso) => {
    alCambiar(iso);
    setAbierto(false);
  };

  return (
    <div className="cal-fecha" ref={raizRef}>
      <div className={`cal-fecha__control ${valor ? 'cal-fecha__control--activo' : ''}`}>
        <button
          type="button"
          className="cal-fecha__disparador"
          aria-label={etiqueta}
          aria-expanded={abierto}
          aria-haspopup="dialog"
          onClick={() => setAbierto((v) => !v)}
        >
          <LuCalendar className="cal-fecha__icono" aria-hidden="true" />
          <span className="cal-fecha__texto">{valor ? fecha(valor) : placeholder}</span>
        </button>
        {valor && (
          <button
            type="button"
            className="cal-fecha__limpiar"
            aria-label="Quitar filtro de fecha"
            title="Quitar fecha"
            onClick={() => {
              alCambiar('');
              setAbierto(false);
            }}
          >
            <LuX aria-hidden="true" />
          </button>
        )}
      </div>

      {abierto && (
        <div className="cal-fecha__popover" role="dialog" aria-label={etiqueta}>
          <div className="cal-fecha__cabecera">
            <button
              type="button"
              className="cal-fecha__nav"
              aria-label="Mes anterior"
              onClick={() => moverMes(-1)}
            >
              <LuChevronLeft aria-hidden="true" />
            </button>
            <span className="cal-fecha__mes">
              {MESES[vista.mes]} <span className="numeros">{vista.anio}</span>
            </span>
            <button
              type="button"
              className="cal-fecha__nav"
              aria-label="Mes siguiente"
              onClick={() => moverMes(1)}
            >
              <LuChevronRight aria-hidden="true" />
            </button>
          </div>

          <div className="cal-fecha__semana" aria-hidden="true">
            {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="cal-fecha__rejilla">
            {celdas.map((c) => {
              const seleccionado = valor === c.iso;
              const esHoy = c.iso === hoyIso;
              const conteo = !c.fuera ? conteosPorDia[c.iso] ?? 0 : 0;
              const clases = [
                'cal-fecha__dia',
                c.fuera && 'cal-fecha__dia--fuera',
                esHoy && 'cal-fecha__dia--hoy',
                conteo > 0 && 'cal-fecha__dia--con-ventas',
                seleccionado && 'cal-fecha__dia--seleccionado',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={c.iso}
                  type="button"
                  className={clases}
                  aria-pressed={seleccionado}
                  title={conteo > 0 ? `${fecha(c.iso)} · ${conteo} ${conteo === 1 ? singular : plural}` : fecha(c.iso)}
                  onClick={() => seleccionar(c.iso)}
                >
                  <span className="numeros">{c.numero}</span>
                  {conteo > 0 && <span className="cal-fecha__punto" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="cal-fecha__pie">
            <span className="cal-fecha__leyenda">
              <span className="cal-fecha__punto cal-fecha__punto--muestra" aria-hidden="true" />
              Días con {plural}
            </span>
            <div className="cal-fecha__acciones">
              <button type="button" className="cal-fecha__accion" onClick={() => seleccionar(hoyIso)}>
                Hoy
              </button>
              {valor && (
                <button
                  type="button"
                  className="cal-fecha__accion cal-fecha__accion--suave"
                  onClick={() => seleccionar('')}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
