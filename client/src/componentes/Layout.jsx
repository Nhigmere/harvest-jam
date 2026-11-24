// Marco de la aplicación: menú lateral Obsidian Atelier, paleta ⌘K y área de trabajo.
import { useCallback, useEffect, useState } from 'react';
import {
  LuApple, LuChartColumn, LuChevronDown, LuCompass, LuDatabase, LuIdCard, LuLayoutDashboard, LuLogOut, LuMenu,
  LuPackagePlus, LuPanelLeftClose, LuPanelLeftOpen, LuReceiptText, LuScrollText, LuSearch, LuShoppingBasket,
  LuTruck, LuUsers, LuX,
} from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { iniciales, nombrePropio } from '../formato.js';
import { NavLink, useUbicacion } from '../router.jsx';
import { TiradorZanahoriaDorada, VinetaMenuMermelada } from './ArteFruteria.jsx';
import { PaletaComandos } from './Comandos.jsx';
import { useSpotlight } from './Efectos.jsx';

export const MENU = [
  {
    grupo: 'Operación',
    items: [
      { ruta: '/', etiqueta: 'Inicio', icono: LuLayoutDashboard, permiso: 'VER_DASHBOARD', exacto: true },
      { ruta: '/vender', etiqueta: 'Vender', icono: LuShoppingBasket, permiso: 'CREAR_VENTAS', destacar: true },
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
      { ruta: '/decisiones', etiqueta: 'Decisiones', icono: LuCompass, permiso: 'VER_DSS' },
      { ruta: '/reportes', etiqueta: 'Reportes', icono: LuChartColumn, permiso: 'VER_REPORTES' },
      { ruta: '/etl', etiqueta: 'Bitácora ETL', icono: LuDatabase, permiso: 'VER_ETL' },
      { ruta: '/auditoria', etiqueta: 'Auditoría', icono: LuScrollText, permiso: 'VER_AUDITORIA' },
    ],
  },
];

export function Marca({ compacta = false }) {
  return (
    <span className={`marca ${compacta ? 'marca--compacta' : ''}`}>
      <span className="marca__frasco">
        <img src="/logo.png" alt="" width="26" height="26" />
      </span>
      <span className="marca__texto">
        <span className="marca__nombre">Harvest JAM</span>
        <span className="marca__sub">Atelier POS</span>
      </span>
    </span>
  );
}

export function Layout({ children, completa = false }) {
  const { usuario, puede, salir } = useSesion();
  const { pathname } = useUbicacion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [comandosAbiertos, setComandosAbiertos] = useState(false);
  const [jalandoZanahoria, setJalandoZanahoria] = useState(false);
  const [menuCompacto, setMenuCompacto] = useState(() => {
    try {
      return localStorage.getItem('harvest-jam:menu-compacto') === '1';
    } catch {
      return false;
    }
  });
  const [gruposCerrados, setGruposCerrados] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('harvest-jam:menu-grupos') || '{}');
    } catch {
      return {};
    }
  });

  useSpotlight();

  useEffect(() => setMenuAbierto(false), [pathname]);

  // Atajo global ⌘K / Ctrl+K para la paleta de comandos
  useEffect(() => {
    const alTeclado = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setComandosAbiertos((v) => !v);
      }
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, []);

  const alternarCompacto = useCallback(() => {
    setJalandoZanahoria(true);
    window.setTimeout(() => setJalandoZanahoria(false), 460);
    setMenuCompacto((prev) => {
      const siguiente = !prev;
      try {
        localStorage.setItem('harvest-jam:menu-compacto', siguiente ? '1' : '0');
      } catch {
        // Ignorar si localStorage no está disponible
      }
      return siguiente;
    });
  }, []);

  const alternarGrupo = useCallback((grupo) => {
    setGruposCerrados((prev) => {
      const siguiente = { ...prev, [grupo]: !prev[grupo] };
      try {
        localStorage.setItem('harvest-jam:menu-grupos', JSON.stringify(siguiente));
      } catch {
        // Ignorar si localStorage no está disponible
      }
      return siguiente;
    });
  }, []);

  const rutaCoincide = (item) => (
    item.exacto ? pathname === item.ruta : pathname === item.ruta || pathname.startsWith(`${item.ruta}/`)
  );

  const nombre = nombrePropio(usuario.empleado?.nombre ?? usuario.usuario);
  const esMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform ?? '');

  return (
    <div className={`app ${menuAbierto ? 'app--menu-abierto' : ''} ${menuCompacto ? 'app--menu-compacto' : ''}`}>
      <a className="saltar" href="#contenido">Saltar al contenido</a>

      <header className="barra-movil">
        <button type="button" className="barra-movil__menu" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
          <LuMenu aria-hidden="true" />
        </button>
        <Marca />
        <button
          type="button"
          className="barra-movil__buscar"
          onClick={() => setComandosAbiertos(true)}
          aria-label="Abrir paleta de comandos"
          title="Buscar acciones (⌘K)"
        >
          <LuSearch aria-hidden="true" />
        </button>
      </header>

      <aside className="menu" aria-label="Menú principal">
        <TiradorZanahoriaDorada
          compacto={menuCompacto}
          jalando={jalandoZanahoria}
          onClick={alternarCompacto}
        />

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

        <button
          type="button"
          className="menu__comando"
          onClick={() => setComandosAbiertos(true)}
          title="Paleta de comandos (⌘K)"
          aria-label="Abrir paleta de comandos"
        >
          <LuSearch aria-hidden="true" />
          <span className="menu__comando-texto">Ir rápido…</span>
          <kbd>{esMac ? '⌘K' : 'Ctrl+K'}</kbd>
        </button>

        <nav className="menu__nav">
          {MENU.map((seccion) => {
            const visibles = seccion.items.filter((i) => puede(i.permiso));
            if (!visibles.length) return null;
            const cerrado = !menuCompacto && Boolean(gruposCerrados[seccion.grupo]);
            const tieneActivo = visibles.some(rutaCoincide);
            return (
              <div key={seccion.grupo} className={`menu__grupo ${cerrado ? 'menu__grupo--cerrado' : ''}`}>
                <button
                  type="button"
                  className="menu__grupo-titulo"
                  onClick={() => alternarGrupo(seccion.grupo)}
                  aria-expanded={!cerrado}
                >
                  <span>{seccion.grupo}</span>
                  <span className="menu__grupo-controles" aria-hidden="true">
                    {cerrado && tieneActivo && <span className="menu__grupo-punto" />}
                    <LuChevronDown className="menu__grupo-flecha" />
                  </span>
                </button>
                <ul>
                  {visibles.map(({ ruta, etiqueta, icono: Icono, exacto, destacar }) => (
                    <li key={ruta}>
                      <NavLink
                        to={ruta}
                        exacto={exacto}
                        className={`menu__enlace ${destacar ? 'menu__enlace--destacado' : ''}`}
                        title={etiqueta}
                        aria-label={etiqueta}
                      >
                        <Icono aria-hidden="true" />
                        <span className="menu__enlace-texto">{etiqueta}</span>
                        {destacar && !menuCompacto && (
                          <span className="menu__enlace-etiqueta" aria-hidden="true">POS</span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {!menuCompacto && <VinetaMenuMermelada />}

        <div className="menu__usuario">
          <span className="menu__avatar" title={`${nombre} (${usuario.rolNombre})`} aria-hidden="true">
            <span className="avatar">
              {iniciales(usuario.empleado?.nombre ?? usuario.usuario.replace('_', ' '))}
            </span>
            <span className="menu__avatar-estado" />
          </span>
          <span className="menu__usuario-texto">
            <span className="menu__usuario-nombre" title={nombre}>{nombre}</span>
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

      <PaletaComandos
        abierto={comandosAbiertos}
        alCerrar={() => setComandosAbiertos(false)}
        menu={MENU}
        menuCompacto={menuCompacto}
        alAlternarCompacto={alternarCompacto}
      />
    </div>
  );
}
