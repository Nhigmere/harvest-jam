import { LuLock, LuMapPinOff } from 'react-icons/lu';
import { useSesion } from './auth.jsx';
import { Layout } from './componentes/Layout.jsx';
import { Cargando, Vacio } from './componentes/ui.jsx';
import Auditoria from './paginas/Auditoria.jsx';
import Clientes from './paginas/Clientes.jsx';
import Compras from './paginas/Compras.jsx';
import Empleados from './paginas/Empleados.jsx';
import Inicio from './paginas/Inicio.jsx';
import Login from './paginas/Login.jsx';
import NuevaCompra from './paginas/NuevaCompra.jsx';
import Productos from './paginas/Productos.jsx';
import Proveedores from './paginas/Proveedores.jsx';
import PuntoVenta from './paginas/PuntoVenta.jsx';
import Reportes from './paginas/Reportes.jsx';
import Ventas from './paginas/Ventas.jsx';
import { Link, coincide, useUbicacion } from './router.jsx';

// Ruta, pantalla y permiso que exige (igual que el menú).
const RUTAS = [
  { ruta: '/', Pantalla: Inicio, permiso: 'VER_DASHBOARD' },
  { ruta: '/vender', Pantalla: PuntoVenta, permiso: 'CREAR_VENTAS', completa: true },
  { ruta: '/ventas', Pantalla: Ventas, permiso: 'VER_VENTAS' },
  { ruta: '/compras', Pantalla: Compras, permiso: 'VER_COMPRAS' },
  { ruta: '/compras/nueva', Pantalla: NuevaCompra, permiso: 'CREAR_COMPRAS' },
  { ruta: '/productos', Pantalla: Productos, permiso: 'VER_PRODUCTOS' },
  { ruta: '/clientes', Pantalla: Clientes, permiso: 'VER_CLIENTES' },
  { ruta: '/proveedores', Pantalla: Proveedores, permiso: 'VER_PROVEEDORES' },
  { ruta: '/empleados', Pantalla: Empleados, permiso: 'VER_EMPLEADOS' },
  { ruta: '/reportes', Pantalla: Reportes, permiso: 'VER_REPORTES' },
  { ruta: '/auditoria', Pantalla: Auditoria, permiso: 'VER_AUDITORIA' },
];

export default function App() {
  const { cargando, usuario, puede } = useSesion();
  const { pathname } = useUbicacion();

  if (cargando) {
    return <div className="pantalla-carga"><Cargando texto="Abriendo Harvest JAM…" /></div>;
  }
  if (!usuario) return <Login />;

  const encontrada = RUTAS.find((r) => coincide(r.ruta, pathname));
  let contenido;
  if (!encontrada) {
    contenido = (
      <div className="pagina">
        <Vacio icono={LuMapPinOff} titulo="Esta página no existe" accion={<Link to="/">Ir al inicio</Link>}>
          Revisa la dirección o usa el menú.
        </Vacio>
      </div>
    );
  } else if (!puede(encontrada.permiso)) {
    contenido = (
      <div className="pagina">
        <Vacio icono={LuLock} titulo="Tu rol no tiene acceso a esta sección" accion={<Link to="/">Ir al inicio</Link>}>
          Si lo necesitas para tu trabajo, pide al administrador que cambie tu rol.
        </Vacio>
      </div>
    );
  } else {
    const { Pantalla } = encontrada;
    contenido = <Pantalla key={encontrada.ruta} />;
  }

  return <Layout completa={encontrada?.completa}>{contenido}</Layout>;
}
