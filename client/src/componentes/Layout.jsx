// Marco de la aplicación: menú lateral según el rol y área de trabajo.
import { useEffect, useState } from 'react';
import {
  LuApple, LuChartColumn, LuIdCard, LuLayoutDashboard, LuLogOut, LuMenu, LuPackagePlus,
  LuPanelLeftClose, LuPanelLeftOpen, LuReceiptText, LuScrollText, LuShoppingBasket, LuTruck, LuUsers, LuX,
} from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { iniciales, nombrePropio } from '../formato.js';
import { NavLink, useUbicacion } from '../router.jsx';

export const MENU = [
  {
    grupo: 'Operación',
    items: [
      { ruta: '/', etiqueta: 'Inicio', icono: LuLayoutDashboard, permiso: 'VER_DASHBOARD', exacto: true },
      { ruta: '/vender', etiqueta: 'Vender', icono: LuShoppingBasket, permiso: 'CREAR_VENTAS' },
      { ruta: '/ventas', etiqueta: 'Ventas', icono: LuReceiptText, permiso: 'VER_VENTAS' },
      { ruta: '/compras', etiqueta: 'Compras', icono: LuPackagePlus, permiso: 'VER_COMPRAS' },
    ],
  },
  {
    grupo: 'Catálogos',
    items: [
      { ruta: '/productos', etiqueta: 'Productos', icono: LuApple, permiso: 'VER_PRODUCTOS' },
      { ruta: '/clientes', etiqueta: 'Clientes', icono: LuUsers, permiso: 'VER_CLIENTES' },
      { ruta: '/proveedores', etiqueta: 'Proveedores', icono: LuTruck, permiso: 'VER_PROVEEDORES' },
      { ruta: '/empleados', etiqueta: 'Empleados', icono: LuIdCard, permiso: 'VER_EMPLEADOS' },
    ],
  },
  {
    grupo: 'Análisis',
    items: [
      { ruta: '/reportes', etiqueta: 'Reportes', icono: LuChartColumn, permiso: 'VER_REPORTES' },
      { ruta: '/auditoria', etiqueta: 'Auditoría', icono: LuScrollText, permiso: 'VER_AUDITORIA' },
    ],
  },
];

export function Marca({ compacta = false }) {
  return (
    <span className={`marca ${compacta ? 'marca--compacta' : ''}`}>
      <span className="marca__frasco">
        <img src="/logo.png" alt="" width="28" height="28" />
      </span>
      <span className="marca__nombre">Harvest JAM</span>
    </span>
  );
}

export function Layout({ children, completa = false }) {
  const { usuario, puede, salir } = useSesion();
  const { pathname } = useUbicacion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuCompacto, setMenuCompacto] = useState(() => {
    try {
      return localStorage.getItem('harvest-jam:menu-compacto') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => setMenuAbierto(false), [pathname]);

  const alternarCompacto = () => {
    setMenuCompacto((prev) => {
      const siguiente = !prev;
      try {
        localStorage.setItem('harvest-jam:menu-compacto', siguiente ? '1' : '0');
      } catch {
        // Ignorar si localStorage no está disponible
      }
      return siguiente;
    });
  };

  const nombre = nombrePropio(usuario.empleado?.nombre ?? usuario.usuario);

  return (
    <div className={`app ${menuAbierto ? 'app--menu-abierto' : ''} ${menuCompacto ? 'app--menu-compacto' : ''}`}>
      <a className="saltar" href="#contenido">Saltar al contenido</a>

      <header className="barra-movil">
        <button type="button" className="barra-movil__menu" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
          <LuMenu aria-hidden="true" />
        </button>
        <Marca />
      </header>

      <aside className="menu" aria-label="Menú principal">
        <div className="menu__marca">
          <Marca compacta={menuCompacto} />
          <button
            type="button"
            className="menu__colapsar"
            onClick={alternarCompacto}
            aria-label={menuCompacto ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            title={menuCompacto ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          >
            {menuCompacto ? <LuPanelLeftOpen aria-hidden="true" /> : <LuPanelLeftClose aria-hidden="true" />}
          </button>
          <button type="button" className="menu__cerrar" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">
            <LuX aria-hidden="true" />
          </button>
        </div>

        <nav className="menu__nav">
          {MENU.map((seccion) => {
            const visibles = seccion.items.filter((i) => puede(i.permiso));
            if (!visibles.length) return null;
            return (
              <div key={seccion.grupo} className="menu__grupo">
                <p className="menu__grupo-titulo">{seccion.grupo}</p>
                <ul>
                  {visibles.map(({ ruta, etiqueta, icono: Icono, exacto }) => (
                    <li key={ruta}>
                      <NavLink
                        to={ruta}
                        exacto={exacto}
                        className="menu__enlace"
                        title={etiqueta}
                        aria-label={etiqueta}
                      >
                        <Icono aria-hidden="true" />
                        <span>{etiqueta}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="menu__usuario">
          <span className="avatar" title={`${nombre} (${usuario.rolNombre})`} aria-hidden="true">
            {iniciales(usuario.empleado?.nombre ?? usuario.usuario.replace('_', ' '))}
          </span>
          <span className="menu__usuario-texto">
            <span className="menu__usuario-nombre">{nombre}</span>
            <span className="menu__usuario-rol">{usuario.rolNombre}</span>
          </span>
          <button type="button" className="menu__salir" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LuLogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="menu-fondo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />

      <main id="contenido" className={`contenido ${completa ? 'contenido--completo' : ''}`} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
