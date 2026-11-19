// Estado de un formulario y sus errores (incluidos los que manda la API).
import { useCallback, useState } from 'react';

export function useFormulario(inicial) {
  const [valores, setValores] = useState(inicial);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const campo = (nombre) => ({
    name: nombre,
    value: valores[nombre] ?? '',
    onChange: (e) => setValores((v) => ({ ...v, [nombre]: e.target.value })),
  });

  const fijar = (nombre, valor) => setValores((v) => ({ ...v, [nombre]: valor }));

  // El error va junto al campo cuando la API dice cuál fue.
  const errorDe = (nombre) => (error?.campo === nombre ? error.message : null);
  const errorGeneral = error && !error.campo ? error : null;

  const enviar = async (accion) => {
    setGuardando(true);
    setError(null);
    try {
      return await accion(valores);
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setGuardando(false);
    }
  };

  const reiniciar = useCallback((nuevos) => {
    setValores(nuevos);
    setError(null);
    setGuardando(false);
  }, []);

  return { valores, campo, fijar, errorDe, errorGeneral, error, setError, guardando, enviar, reiniciar };
}
