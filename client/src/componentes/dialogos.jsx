// Ventanas modales (con <dialog> nativo), confirmaciones y avisos.
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuCircleAlert, LuCircleCheck, LuX } from 'react-icons/lu';
import { Boton, BotonIcono } from './ui.jsx';

const ContextoDialogos = createContext(null);

export function Modal({ abierto, alCerrar, titulo, descripcion, children, pie, ancho = 'mediano', className = '' }) {
  const ref = useRef(null);
  const id = useId();
  const registrarModal = useContext(ContextoDialogos)?.registrarModal;

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    if (abierto) {
      if (!d.open) d.showModal();
      // Mientras esté abierta, los avisos se dibujan dentro de ella; si no,
      // quedarían detrás del fondo oscuro y no se podrían cerrar.
      return registrarModal?.(d);
    }
    if (d.open) d.close();
    return undefined;
  }, [abierto, registrarModal]);

  return (
    <dialog
      ref={ref}
      className={`modal modal--${ancho} ${className}`}
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => {
        e.preventDefault();
        alCerrar?.();
      }}
      onMouseDown={(e) => {
        // Clic fuera del contenido (en el fondo oscuro) cierra.
        if (e.target === ref.current) alCerrar?.();
      }}
    >
      {abierto && (
        <div className="modal__caja">
          <header className="modal__cabecera">
            <div>
              <h2 id={`${id}-titulo`}>{titulo}</h2>
              {descripcion && <p className="modal__descripcion">{descripcion}</p>}
            </div>
            {alCerrar && <BotonIcono icono={LuX} etiqueta="Cerrar" onClick={alCerrar} />}
          </header>
          <div className="modal__cuerpo">{children}</div>
          {pie && <footer className="modal__pie">{pie}</footer>}
        </div>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------------
// Avisos (toasts) y confirmaciones
// ---------------------------------------------------------------------

export function DialogosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [confirmacion, setConfirmacion] = useState(null);
  const [modales, setModales] = useState([]);

  const registrarModal = useCallback((dialogo) => {
    setModales((pila) => [...pila.filter((d) => d !== dialogo), dialogo]);
    return () => setModales((pila) => pila.filter((d) => d !== dialogo));
  }, []);

  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setAvisos((lista) => [...lista.slice(-2), { id, texto, tipo }]);
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), tipo === 'error' ? 6000 : 3500);
  }, []);

  const confirmar = useCallback((opciones) => new Promise((resolver) => {
    setConfirmacion({ ...opciones, resolver });
  }), []);

  const cerrarConfirmacion = (respuesta) => {
    confirmacion?.resolver(respuesta);
    setConfirmacion(null);
  };

  const valor = useMemo(() => ({ avisar, confirmar, registrarModal }), [avisar, confirmar, registrarModal]);

  const listaAvisos = (
    <div className="avisos" aria-live="polite" aria-atomic="false">
      {avisos.map((a) => (
        <div key={a.id} className={`aviso aviso--${a.tipo}`} role={a.tipo === 'error' ? 'alert' : 'status'}>
          {a.tipo === 'error' ? <LuCircleAlert aria-hidden="true" /> : <LuCircleCheck aria-hidden="true" />}
          <span>{a.texto}</span>
          <button
            type="button"
            className="aviso__cerrar"
            aria-label="Cerrar aviso"
            onClick={() => setAvisos((lista) => lista.filter((x) => x.id !== a.id))}
          >
            <LuX aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
  const modalArriba = modales.at(-1);

  return (
    <ContextoDialogos.Provider value={valor}>
      {children}

      <Modal
        abierto={Boolean(confirmacion)}
        alCerrar={() => cerrarConfirmacion(false)}
        titulo={confirmacion?.titulo ?? ''}
        ancho="chico"
        pie={
          <>
            <Boton onClick={() => cerrarConfirmacion(false)}>{confirmacion?.cancelar ?? 'Volver'}</Boton>
            <Boton variante={confirmacion?.peligro ? 'peligro' : 'primario'} onClick={() => cerrarConfirmacion(true)} autoFocus>
              {confirmacion?.accion ?? 'Aceptar'}
            </Boton>
          </>
        }
      >
        <p className="texto-2">{confirmacion?.mensaje}</p>
      </Modal>

      {modalArriba ? createPortal(listaAvisos, modalArriba) : listaAvisos}
    </ContextoDialogos.Provider>
  );
}

export const useDialogos = () => useContext(ContextoDialogos);
