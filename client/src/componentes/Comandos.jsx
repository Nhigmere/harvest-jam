// Paleta de comandos global (⌘K / Ctrl+K) para navegar y ejecutar acciones al instante.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LuLogOut, LuPackagePlus, LuPanelLeft, LuSearch, LuShoppingBasket, LuUserPlus,
} from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { useNavegar } from '../router.jsx';
import { Modal } from './dialogos.jsx';

export function PaletaComandos({ abierto, alCerrar, menu, menuCompacto, alAlternarCompacto }) {
  const { puede, salir } = useSesion();
  const navegar = useNavegar();
  const [busqueda, setBusqueda] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (abierto) {
      setBusqueda('');
      setIndice(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [abierto]);

  const acciones = useMemo(() => {
    const lista = [];

    // Acciones rápidas según permisos
    if (puede('CREAR_VENTAS')) {
      lista.push({
        id: 'rapido-vender',
        grupo: 'Acciones rápidas',
        titulo: 'Abrir punto de venta',
        descripcion: 'Cobrar productos y emitir ticket',
        icono: LuShoppingBasket,
        atajo: 'POS',
        ejecutar: () => navegar('/vender'),
      });
    }
    if (puede('CREAR_COMPRAS')) {
      lista.push({
        id: 'rapido-compra',
        grupo: 'Acciones rápidas',
        titulo: 'Registrar nueva compra',
        descripcion: 'Ingresar mercancía de proveedores al inventario',
        icono: LuPackagePlus,
        ejecutar: () => navegar('/compras/nueva'),
      });
    }
    if (puede('EDITAR_CLIENTES')) {
      lista.push({
        id: 'rapido-cliente',
        grupo: 'Acciones rápidas',
        titulo: 'Alta de nuevo cliente',
        descripcion: 'Registrar persona física o moral',
        icono: LuUserPlus,
        ejecutar: () => navegar('/clientes?nuevo=1'),
      });
    }

    // Navegación del menú según permisos
    for (const seccion of menu) {
      for (const item of seccion.items) {
        if (!puede(item.permiso)) continue;
        lista.push({
          id: `nav-${item.ruta}`,
          grupo: seccion.grupo,
          titulo: item.etiqueta,
          descripcion: `Ir a ${item.etiqueta.toLowerCase()}`,
          icono: item.icono,
          ejecutar: () => navegar(item.ruta),
        });
      }
    }

    // Preferencias y sesión
    lista.push({
      id: 'pref-sidebar',
      grupo: 'Interfaz',
      titulo: menuCompacto ? 'Expandir barra lateral' : 'Contraer barra lateral',
      descripcion: 'Alternar el modo compacto del menú',
      icono: LuPanelLeft,
      ejecutar: () => alAlternarCompacto(),
    });
    lista.push({
      id: 'sesion-salir',
      grupo: 'Sesión',
      titulo: 'Cerrar sesión',
      descripcion: 'Salir de Harvest JAM de forma segura',
      icono: LuLogOut,
      ejecutar: () => salir(),
    });

    return lista;
  }, [menu, menuCompacto, alAlternarCompacto, puede, navegar, salir]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return acciones;
    return acciones.filter(
      (a) => a.titulo.toLowerCase().includes(q)
        || a.descripcion.toLowerCase().includes(q)
        || a.grupo.toLowerCase().includes(q),
    );
  }, [acciones, busqueda]);

  useEffect(() => {
    setIndice(0);
  }, [busqueda]);

  const elegir = (accion) => {
    if (!accion) return;
    alCerrar();
    accion.ejecutar();
  };

  const alTeclado = (e) => {
    if (!filtradas.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndice((i) => (i + 1) % filtradas.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndice((i) => (i - 1 + filtradas.length) % filtradas.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      elegir(filtradas[indice]);
    }
  };

  // Agrupar manteniendo el orden visual
  const grupos = useMemo(() => {
    const mapa = new Map();
    filtradas.forEach((item, idx) => {
      if (!mapa.has(item.grupo)) mapa.set(item.grupo, []);
      mapa.get(item.grupo).push({ ...item, idx });
    });
    return [...mapa.entries()];
  }, [filtradas]);

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Paleta de comandos" className="comandos-modal">
      <div className="comandos__buscador">
        <LuSearch aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          className="comandos__input"
          placeholder="Buscar pantalla o acción rápida…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={alTeclado}
          aria-label="Buscar comando o pantalla"
        />
        <kbd>Esc</kbd>
      </div>

      <div className="comandos__lista" role="listbox" aria-label="Resultados">
        {grupos.length === 0 ? (
          <div className="vacio" style={{ padding: '28px 16px' }}>
            <p className="vacio__titulo">Sin coincidencias</p>
            <p className="vacio__texto">Prueba con "vender", "productos", "reportes" o "compras".</p>
          </div>
        ) : (
          grupos.map(([nombreGrupo, items]) => (
            <div key={nombreGrupo}>
              <p className="comandos__grupo">{nombreGrupo}</p>
              {items.map((item) => {
                const Icono = item.icono;
                const activo = item.idx === indice;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={activo}
                    className={`comandos__item ${activo ? 'comandos__item--activo' : ''}`}
                    onMouseEnter={() => setIndice(item.idx)}
                    onClick={() => elegir(item)}
                  >
                    <Icono aria-hidden="true" />
                    <span className="comandos__item-texto">
                      <span className="comandos__item-titulo">{item.titulo}</span>
                      <span className="comandos__item-desc">{item.descripcion}</span>
                    </span>
                    {item.atajo && <kbd>{item.atajo}</kbd>}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <footer className="comandos__pie">
        <div className="comandos__ayudas">
          <span className="comandos__ayuda"><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span className="comandos__ayuda"><kbd>↵</kbd> abrir</span>
        </div>
        <span>Harvest JAM Atelier</span>
      </footer>
    </Modal>
  );
}
