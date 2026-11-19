import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// Pide datos a la API y los vuelve a pedir cuando cambian los parámetros.
// Mientras recarga conserva los datos anteriores (la pantalla no "brinca").
export function useApi(ruta, params = null, { activo = true } = {}) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: activo });
  const [version, setVersion] = useState(0);
  const clave = JSON.stringify(params);

  useEffect(() => {
    if (!activo || !ruta) return undefined;
    const control = new AbortController();
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    api.get(ruta, params, control.signal)
      .then((datos) => setEstado({ datos, error: null, cargando: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setEstado((e) => ({ ...e, error, cargando: false }));
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, clave, version, activo]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, recargar };
}

// Valor que se actualiza después de que el usuario deja de escribir.
export function useRetardo(valor, ms = 300) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}

// Atajo de teclado global (por ejemplo "/" para buscar).
export function useAtajo(tecla, accion) {
  const ref = useRef(accion);
  ref.current = accion;
  useEffect(() => {
    const alPresionar = (e) => {
      const enCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      if (e.key === tecla && !enCampo && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        ref.current(e);
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [tecla]);
}
