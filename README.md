# Harvest JAM 2.0

Sistema para la frutería: punto de venta, compras e inventario, catálogos
(productos, clientes, proveedores y empleados), reportes y auditoría, con
permisos según el rol de cada empleado.

Hecho con Node.js, Express y React sobre PostgreSQL. El detalle del stack está
en [`STACK.md`](STACK.md).

## Requisitos

- Node.js 20.19 o superior
- PostgreSQL 13 o superior, encendido y con acceso como `postgres`

## Instalación

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
npm run db:setup
npm run dev
```

1. Ajusta en `.env` la contraseña de `postgres` (`PGADMIN_PASSWORD`) y, si
   hace falta, el servidor y el puerto de PostgreSQL.
2. `npm run db:setup` crea la base `TBD` y ejecuta los scripts de
   `base-de-datos/`. Si la base ya tiene el esquema, usa
   `npm run db:setup -- --reiniciar` para borrarlo y crearlo de nuevo.
3. Abre http://localhost:5173 e inicia sesión con un usuario de la tabla.

## Usuarios de prueba

Todos usan la contraseña `12345`.

| Usuario | Rol | Qué puede hacer |
|---|---|---|
| `francisco_mendoza` | Administrador | Todo |
| `uviel_mata` | Administrador | Todo |
| `robert_de_niro` | Gerente | Ver todo, sin modificar |
| `laura_perez` | Contador | Ver todo, sin modificar |
| `manuel_gomez` | Cajero | Vender y ver productos, clientes y ventas |
| `ricardo_valencia` | Comprador | Registrar compras, editar productos y proveedores |
| `juan_gonzales` | Admin. de clientes | Dar de alta, editar y borrar clientes |

## Base de datos

Los scripts están en `base-de-datos/`, uno por tema y numerados en el orden en
que se ejecutan:

```
01_tablas.sql            esquema fruteria y tablas
02_funciones.sql         funciones del negocio y de reportes
03_triggers.sql          triggers de stock y de auditoría
04_roles.sql             roles, usuarios y permisos
05_datos.sql             datos del proyecto original
06_datos_simulados.sql   opcional: 90 días de ventas y compras simuladas
99_borrar_todo.sql       borra el esquema
```

Para correrlos a mano (con psql o pgAdmin), conéctate como `postgres` a la base
`TBD` y ejecútalos en ese orden:

```bash
createdb -U postgres TBD
psql -U postgres -d TBD -f base-de-datos/01_tablas.sql
psql -U postgres -d TBD -f base-de-datos/02_funciones.sql
psql -U postgres -d TBD -f base-de-datos/03_triggers.sql
psql -U postgres -d TBD -f base-de-datos/04_roles.sql
psql -U postgres -d TBD -f base-de-datos/05_datos.sql
psql -U postgres -d TBD -f base-de-datos/06_datos_simulados.sql
```

Los datos de `06_datos_simulados.sql` son inventados y quedan marcados en la
auditoría como "datos simulados". Lo que se corrigió respecto a los scripts
originales está en [`docs/CAMBIOS_BD.md`](docs/CAMBIOS_BD.md).

## Para usarlo en la tienda

```bash
npm run build
npm start
```

La API sirve también la interfaz compilada en http://localhost:3001. Desde
otra computadora o celular de la misma red se entra con la IP de la máquina,
por ejemplo `http://192.168.1.20:3001`.

## Carpetas

```
base-de-datos/   scripts SQL
server/          API (Express): rutas, consultas (dao), sesiones y permisos
client/          interfaz (React + Vite): páginas, componentes y estilos
scripts/dev.js   levanta API e interfaz juntas en desarrollo
docs/            cambios hechos a la base de datos
```

## Notas

- **Ticket.** Al cobrar se muestra el ticket; se puede imprimir (o guardar
  como PDF desde el diálogo de impresión) y, si el cliente tiene teléfono,
  mandarlo por WhatsApp con un enlace `wa.me` que abre el chat con el texto
  listo.
- **Datos del ticket.** Nombre, teléfono, dirección y mensaje de la tienda se
  cambian en `.env` (`EMPRESA_*`).
- **Stock bajo.** Un producto se marca "por acabarse" con 10 o menos en
  existencia; se cambia con `UMBRAL_STOCK_BAJO`.
- **HTTPS.** Si arrancas con `NODE_ENV=production`, la cookie de sesión se
  marca `Secure` y el sistema debe servirse por HTTPS; en la red de la tienda
  por HTTP, arráncalo sin esa variable.
