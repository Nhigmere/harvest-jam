// Sesión del usuario: quién es, su rol y sus permisos.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { alTerminarSesion, api } from './api.js';

const ContextoSesion = createContext(null);

export function SesionProvider({ children }) {
  const [estado, setEstado] = useState({ cargando: true, usuario: null, aviso: null });

  useEffect(() => {
    api.get('/auth/me')
      .then((usuario) => setEstado({ cargando: false, usuario, aviso: null }))
      .catch(() => setEstado({ cargando: false, usuario: null, aviso: null }));
  }, []);

  useEffect(() => alTerminarSesion(() => {
    setEstado((e) => (e.usuario ? { cargando: false, usuario: null, aviso: 'Tu sesión terminó. Inicia sesión de nuevo.' } : e));
  }), []);

  const entrar = useCallback(async (usuario, password) => {
    const datos = await api.post('/auth/login', { usuario, password });
    setEstado({ cargando: false, usuario: datos, aviso: null });
    return datos;
  }, []);

  const salir = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setEstado({ cargando: false, usuario: null, aviso: null });
  }, []);

  const valor = useMemo(() => ({
    ...estado,
    entrar,
    salir,
    puede: (...permisos) => permisos.some((p) => estado.usuario?.permisos?.includes(p)),
  }), [estado, entrar, salir]);

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export const useSesion = () => useContext(ContextoSesion);
