// Piezas base de la interfaz Harvest JAM Atelier.
import { useId } from 'react';
import { LuChevronLeft, LuChevronRight, LuCircleAlert, LuCircleCheck, LuSearch, LuTriangleAlert, LuX } from 'react-icons/lu';
import { numero } from '../formato.js';
import { ContadorAnimado } from './Efectos.jsx';

export function Boton({ variante = 'secundario', talla = 'normal', icono: Icono, cargando = false, children, className = '', ...resto }) {
  return (
    <button
      type="button"
      className={`boton boton--${variante} boton--${talla} ${className}`}
      disabled={cargando || resto.disabled}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {Icono && <Icono aria-hidden="true" className="boton__icono" />}
      {children}
    </button>
  );
}

// Botón de solo ícono: siempre lleva etiqueta para lectores de pantalla.
export function BotonIcono({ icono: Icono, etiqueta, variante = 'fantasma', className = '', ...resto }) {
  return (
    <button type="button" className={`boton-icono boton-icono--${variante} ${className}`} aria-label={etiqueta} title={etiqueta} {...resto}>
      <Icono aria-hidden="true" />
    </button>
  );
}

// Campo con etiqueta, ayuda y error.
export function Campo({ etiqueta, ayuda, error, opcional = false, children, className = '' }) {
  const id = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const control = typeof children === 'function'
    ? children({ id, 'aria-describedby': [idAyuda, idError].filter(Boolean).join(' ') || undefined, 'aria-invalid': error ? true : undefined })
    : children;
  return (
    <div className={`campo ${error ? 'campo--error' : ''} ${className}`}>
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
        {opcional && <span className="campo__opcional"> (opcional)</span>}
      </label>
      {control}
      {ayuda && !error && <p className="campo__ayuda" id={idAyuda}>{ayuda}</p>}
      {error && (
        <p className="campo__error" id={idError}>
          <LuCircleAlert aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

export function Buscador({ valor, alCambiar, etiqueta = 'Buscar', placeholder, inputRef, atajo, className = '', ...resto }) {
  return (
    <div className={`buscador ${className}`}>
      <LuSearch className="buscador__icono" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="entrada buscador__entrada"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
        aria-label={etiqueta}
        {...resto}
      />
      {!valor && atajo && <kbd className="buscador__atajo" aria-hidden="true">{atajo}</kbd>}
      {valor && (
        <button type="button" className="buscador__limpiar" onClick={() => alCambiar('')} aria-label="Borrar búsqueda">
          <LuX aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// Grupo de opciones excluyentes (filtros).
export function Segmentado({ opciones, valor, alCambiar, etiqueta, className = '' }) {
  return (
    <div className={`segmentado ${className}`} role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          className="segmentado__opcion"
          onClick={() => alCambiar(o.valor)}
        >
          {o.etiqueta}
          {o.conteo !== undefined && <span className="segmentado__conteo numeros">{numero(o.conteo)}</span>}
        </button>
      ))}
    </div>
  );
}

const ICONOS_ESTADO = { ok: LuCircleCheck, aviso: LuTriangleAlert, critico: LuCircleAlert };

// Etiqueta de estado: color + ícono + palabra.
export function Insignia({ tono = 'neutro', icono, children, className = '' }) {
  const Icono = icono === false ? null : icono ?? ICONOS_ESTADO[tono];
  return (
    <span className={`insignia insignia--${tono} ${className}`}>
      {Icono && <Icono aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Panel({ titulo, descripcion, acciones, children, className = '', cuerpoClassName = '', id }) {
  return (
    <section className={`panel glass-card lujo-brillo ${className}`} aria-labelledby={titulo ? `${id ?? titulo}-titulo` : undefined}>
      {(titulo || acciones) && (
        <header className="panel__cabecera">
          <div>
            {titulo && <h2 id={`${id ?? titulo}-titulo`}>{titulo}</h2>}
            {descripcion && <p className="panel__descripcion">{descripcion}</p>}
          </div>
          {acciones && <div className="panel__acciones">{acciones}</div>}
        </header>
      )}
      <div className={`panel__cuerpo ${cuerpoClassName}`}>{children}</div>
    </section>
  );
}

export function Vacio({ icono: Icono, titulo, children, accion }) {
  return (
    <div className="vacio">
      {Icono && (
        <span className="vacio__icono-caja" aria-hidden="true">
          <Icono className="vacio__icono" />
        </span>
      )}
      <p className="vacio__titulo">{titulo}</p>
      {children && <p className="vacio__texto">{children}</p>}
      {accion}
    </div>
  );
}

export function MensajeError({ error, alReintentar }) {
  if (!error) return null;
  return (
    <div className="aviso-error" role="alert">
      <LuCircleAlert aria-hidden="true" />
      <span>{error.message}</span>
      {alReintentar && <Boton variante="fantasma" talla="chico" onClick={alReintentar}>Reintentar</Boton>}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status">
      <span className="cargando__punto" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function Paginacion({ pagina, limite, total, alCambiar }) {
  if (!total) return null;
  const paginas = Math.max(Math.ceil(total / limite), 1);
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);
  return (
    <nav className="paginacion" aria-label="Paginación">
      <span className="paginacion__resumen numeros">
        {numero(desde)}–{numero(hasta)} de {numero(total)}
      </span>
      <div className="paginacion__botones">
        <BotonIcono icono={LuChevronLeft} etiqueta="Página anterior" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)} />
        <span className="paginacion__pagina numeros" aria-current="page">{pagina} / {paginas}</span>
        <BotonIcono icono={LuChevronRight} etiqueta="Página siguiente" disabled={pagina >= paginas} onClick={() => alCambiar(pagina + 1)} />
      </div>
    </nav>
  );
}

export function CabeceraPagina({ titulo, descripcion, acciones, children }) {
  return (
    <header className="cabecera-pagina">
      <div className="cabecera-pagina__texto">
        <h1>{titulo}</h1>
        {descripcion && <p className="cabecera-pagina__descripcion">{descripcion}</p>}
      </div>
      {acciones && <div className="cabecera-pagina__acciones">{acciones}</div>}
      {children}
    </header>
  );
}

// Cifra con etiqueta, animación numérica opcional y variación contra periodo anterior.
export function Cifra({ etiqueta, valor, numeroAnimado, formato, detalle, variacion, principal = false }) {
  const tono = variacion === null || variacion === undefined ? null : variacion >= 0 ? 'sube' : 'baja';
  const contenidoValor = numeroAnimado !== undefined
    ? <ContadorAnimado valor={numeroAnimado} formato={formato} />
    : valor;
  return (
    <div className={`cifra ${principal ? 'cifra--principal' : ''}`}>
      <p className="cifra__etiqueta">{etiqueta}</p>
      <p className="cifra__valor">{contenidoValor}</p>
      {(detalle || tono) && (
        <p className="cifra__detalle">
          {tono && (
            <span className={`cifra__variacion cifra__variacion--${tono}`}>
              {variacion >= 0 ? '+' : '−'}{Math.abs(variacion).toLocaleString('es-MX', { maximumFractionDigits: 1 })} %
            </span>
          )}
          {detalle}
        </p>
      )}
    </div>
  );
}
