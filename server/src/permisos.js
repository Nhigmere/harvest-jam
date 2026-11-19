// Roles y permisos de la aplicación.
// Es la misma matriz que ControlAcceso.java del sistema original. La base de
// datos aplica además sus propios permisos (base-de-datos/04_roles.sql): doble capa.

export const PERMISOS = Object.freeze({
  VER_DASHBOARD: 'VER_DASHBOARD',
  VER_PRODUCTOS: 'VER_PRODUCTOS',
  EDITAR_PRODUCTOS: 'EDITAR_PRODUCTOS',
  ELIMINAR_PRODUCTOS: 'ELIMINAR_PRODUCTOS',
  VER_PROVEEDORES: 'VER_PROVEEDORES',
  EDITAR_PROVEEDORES: 'EDITAR_PROVEEDORES',
  ELIMINAR_PROVEEDORES: 'ELIMINAR_PROVEEDORES',
  VER_CLIENTES: 'VER_CLIENTES',
  EDITAR_CLIENTES: 'EDITAR_CLIENTES',
  ELIMINAR_CLIENTES: 'ELIMINAR_CLIENTES',
  VER_EMPLEADOS: 'VER_EMPLEADOS',
  EDITAR_EMPLEADOS: 'EDITAR_EMPLEADOS',
  ELIMINAR_EMPLEADOS: 'ELIMINAR_EMPLEADOS',
  VER_VENTAS: 'VER_VENTAS',
  CREAR_VENTAS: 'CREAR_VENTAS',
  ELIMINAR_VENTAS: 'ELIMINAR_VENTAS',
  VER_COMPRAS: 'VER_COMPRAS',
  CREAR_COMPRAS: 'CREAR_COMPRAS',
  ELIMINAR_COMPRAS: 'ELIMINAR_COMPRAS',
  VER_REPORTES: 'VER_REPORTES',
  VER_AUDITORIA: 'VER_AUDITORIA',
});

const P = PERMISOS;
const SOLO_LECTURA = [
  P.VER_DASHBOARD, P.VER_PRODUCTOS, P.VER_PROVEEDORES, P.VER_CLIENTES, P.VER_EMPLEADOS,
  P.VER_VENTAS, P.VER_COMPRAS, P.VER_REPORTES, P.VER_AUDITORIA,
];

// La llave es el nombre del rol en PostgreSQL.
export const ROLES = Object.freeze({
  administrador: { nombre: 'Administrador', permisos: Object.values(PERMISOS) },
  gerente: { nombre: 'Gerente', permisos: SOLO_LECTURA },
  contador: { nombre: 'Contador', permisos: SOLO_LECTURA },
  comprador: {
    nombre: 'Comprador',
    permisos: [
      P.VER_DASHBOARD, P.VER_PRODUCTOS, P.EDITAR_PRODUCTOS,
      P.VER_PROVEEDORES, P.EDITAR_PROVEEDORES, P.ELIMINAR_PROVEEDORES,
      P.VER_COMPRAS, P.CREAR_COMPRAS, P.ELIMINAR_COMPRAS,
    ],
  },
  admin_clientes: {
    nombre: 'Admin. de clientes',
    permisos: [P.VER_DASHBOARD, P.VER_CLIENTES, P.EDITAR_CLIENTES, P.ELIMINAR_CLIENTES],
  },
  cajero: {
    nombre: 'Cajero',
    permisos: [P.VER_DASHBOARD, P.VER_PRODUCTOS, P.VER_CLIENTES, P.VER_VENTAS, P.CREAR_VENTAS],
  },
});

// Si un usuario tiene varios roles, gana el primero de esta lista.
export const PRIORIDAD_ROLES = ['administrador', 'gerente', 'contador', 'comprador', 'admin_clientes', 'cajero'];

export function permisosDeRol(rol) {
  return ROLES[rol]?.permisos ?? [];
}

export function tienePermiso(sesion, permiso) {
  return Boolean(sesion?.permisos?.includes(permiso));
}
