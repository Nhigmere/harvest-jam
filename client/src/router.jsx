// Enrutador mínimo basado en el History API del navegador.
// Cubre lo que la app necesita: rutas con parámetros, enlaces y navegar
// desde código, sin depender de otra librería.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ContextoRuta = createContext(null);

const leerUbicacion = () => ({ pathname: window.location.pathname, search: window.location.search });

export function Router({ children }) {
  const [ubicacion, setUbicacion] = useState(leerUbicacion);

  useEffect(() => {
    const alRegresar = () => setUbicacion(leerUbicacion());
    window.addEventListener('popstate', alRegresar);
    return () => window.removeEventListener('popstate', alRegresar);
  }, []);

  const navegar = useCallback((destino, { reemplazar = false } = {}) => {
    if (destino === window.location.pathname + window.location.search) return;
    window.history[reemplazar ? 'replaceState' : 'pushState'](null, '', destino);
    setUbicacion(leerUbicacion());
    if (!reemplazar) window.scrollTo(0, 0);
  }, []);

  const valor = useMemo(() => ({ ...ubicacion, navegar }), [ubicacion, navegar]);
  return <ContextoRuta.Provider value={valor}>{children}</ContextoRuta.Provider>;
}

export const useUbicacion = () => useContext(ContextoRuta);
export const useNavegar = () => useContext(ContextoRuta).navegar;

// "/ventas/:folio" contra "/ventas/2504" → { folio: "2504" }; null si no coincide.
export function coincide(patron, ruta) {
  const partesPatron = patron.split('/').filter(Boolean);
  const partesRuta = ruta.split('/').filter(Boolean);
  if (partesPatron.length !== partesRuta.length) return null;
  const params = {};
  for (let i = 0; i < partesPatron.length; i += 1) {
    const p = partesPatron[i];
    if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(partesRuta[i]);
    else if (p !== partesRuta[i]) return null;
  }
  return params;
}

function esClicNormal(evento) {
  return evento.button === 0 && !evento.metaKey && !evento.ctrlKey && !evento.shiftKey && !evento.altKey;
}

export function Link({ to, onClick, children, ...resto }) {
  const navegar = useNavegar();
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && esClicNormal(e)) {
          e.preventDefault();
          navegar(to);
        }
      }}
      {...resto}
    >
      {children}
    </a>
  );
}

// Enlace que marca aria-current="page" cuando su ruta está activa.
export function NavLink({ to, exacto = false, className = '', children, ...resto }) {
  const { pathname } = useUbicacion();
  const activo = exacto ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link to={to} className={className} aria-current={activo ? 'page' : undefined} {...resto}>
      {children}
    </Link>
  );
}
