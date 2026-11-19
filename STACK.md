# Stack tecnológico de Harvest JAM 2.0

Harvest JAM es el sistema de punto de venta e inventario de la frutería. La
versión 1 era una aplicación de escritorio en Java con JavaFX; la versión 2 es
una aplicación web con **Node.js** en el servidor y **React** en la interfaz,
sobre la misma base de datos **PostgreSQL** (con sus errores corregidos).

## Resumen

| Capa | Tecnología | Versión | Para qué se usa |
|---|---|---|---|
| Base de datos | PostgreSQL | 13 o superior (probado con 16) | Tablas, funciones, triggers, usuarios y permisos |
| Servidor | Node.js | 20.19 o superior | Ejecuta la API |
| Servidor | Express | 5.1 | Rutas HTTP en `/api` |
| Servidor | node-postgres (`pg`) | 8.13 | Conexión y consultas a PostgreSQL |
| Interfaz | React | 19.1 | Pantallas y componentes |
| Interfaz | Vite + `@vitejs/plugin-react` | 7 y 5 | Servidor de desarrollo y compilación |
| Interfaz | react-icons (íconos Lucide) | 5.7 | Íconos |
| Proyecto | npm workspaces | El npm que viene con Node | Un solo `npm install` para `server` y `client` |

En total son 2 dependencias en el servidor y 3 en la interfaz (más 2 de
desarrollo). No hay ORM, ni librería de rutas, ni librería de gráficas, ni
framework de CSS: todo eso se resolvió con código propio y pequeño.

## Antes y ahora

| | Versión 1 | Versión 2 |
|---|---|---|
| Lenguaje | Java 21 | JavaScript (Node.js y React) |
| Interfaz | Ventanas de escritorio con JavaFX | Página web; funciona en computadora, tableta y celular |
| Acceso a datos | JDBC | `pg` con consultas parametrizadas |
| Permisos | `ControlAcceso.java` | `permisos.js` y, además, los permisos de PostgreSQL |
| Ticket | PDF con OpenPDF | Ticket que se imprime desde el navegador (o se guarda como PDF) |
| WhatsApp | Twilio, con credenciales de ejemplo | Enlace `wa.me` con el ticket en texto, sin cuenta de pago |
| Construcción | Maven | npm y Vite |
| Base de datos | PostgreSQL, base `TBD`, esquema `fruteria` | Igual, con los mismos nombres de tablas y funciones |

## Cómo se conectan las piezas

```
Navegador (React)
   │  peticiones a /api/... con una cookie de sesión HttpOnly
   ▼
Servidor (Node.js + Express)
   │  cada sesión abre su conexión con el usuario y la contraseña
   │  de PostgreSQL de quien inició sesión
   ▼
PostgreSQL · base "TBD" · esquema fruteria
   los triggers mueven el stock y escriben la auditoría
```

## Servidor (`server/`)

- **Express 5.** Una ruta por módulo: `auth`, `productos`, `clientes`,
  `proveedores`, `empleados`, `ventas`, `compras`, `reportes`, `dashboard` y
  `auditoria`. Las consultas SQL viven en `src/dao/`.
- **Inicio de sesión con PostgreSQL.** El usuario y la contraseña son los de
  PostgreSQL. La sesión se guarda en memoria y se identifica con una cookie
  `HttpOnly` y `SameSite=Strict`. Tras 5 intentos fallidos en 10 minutos se
  bloquea el acceso un rato.
- **Permisos en dos capas.** La API revisa el rol (`permisos.js`, la misma
  matriz que tenía `ControlAcceso.java`) y PostgreSQL vuelve a revisar con sus
  propios `GRANT`, porque cada quien se conecta con su usuario.
- **Auditoría con nombre.** En cada transacción la API manda el nombre del
  empleado con `set_config('app.usuario', ...)`, y los triggers lo guardan.
- **Validación y errores en español.** `validacion.js` revisa lo que llega y
  `errores.js` traduce los errores de PostgreSQL (llaves foráneas, datos
  repetidos, stock insuficiente) a mensajes claros.
- **Configuración** en un archivo `.env`, leído con `process.loadEnvFile` de
  Node (no hace falta `dotenv`).

## Interfaz (`client/`)

- **React 19** con componentes de función y hooks.
- **Enrutador propio** (`router.jsx`), basado en el History API del
  navegador.
- **Gráficas en SVG hechas a mano**: línea con área para ingresos y barras
  para lo más vendido, con tooltip y un botón para verlas como tabla.
- **CSS propio con variables** (colores, tipografía y espacios en
  `estilos/base.css`).
- **Fuentes incluidas**: Fira Sans para el texto y Anton para precios y
  totales, con su licencia OFL. No se descargan de internet, así que la
  interfaz se ve igual sin conexión.
- **Colores**: añil `#1b2b4b` (menú y texto), frambuesa `#c21d5a` (botones
  principales) y cempasúchil `#ffcf4d` (etiquetas de precio del punto de venta).
- **Ventanas modales** con el elemento nativo `<dialog>`.
- **Responsive**: menú completo en pantallas grandes, solo íconos entre 821 y
  1180 px, y menú desplegable en celular.

## Base de datos (`base-de-datos/`)

Los scripts van numerados en el orden en que se ejecutan:

| Script | Contenido |
|---|---|
| `01_tablas.sql` | Esquema `fruteria` y sus 13 tablas |
| `02_funciones.sql` | 18 funciones: totales, ganancia, stock, reportes y registro de ventas, compras y clientes |
| `03_triggers.sql` | 12 funciones de trigger y 15 triggers de stock y auditoría |
| `04_roles.sql` | Roles (administrador, gerente, contador, comprador, admin. de clientes, cajero), usuarios y permisos |
| `05_datos.sql` | Datos del proyecto original, corregidos |
| `06_datos_simulados.sql` | Opcional: 90 días de ventas y compras simuladas para que los reportes tengan qué mostrar |
| `99_borrar_todo.sql` | Borra el esquema para empezar de cero |

El detalle de lo que se corrigió está en `docs/CAMBIOS_BD.md`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala todo (servidor e interfaz) |
| `npm run db:setup` | Crea la base `TBD` y ejecuta los scripts (`-- --reiniciar` para empezar de cero, `-- --sin-simulados` para omitir el 06) |
| `npm run dev` | Levanta la API en el puerto 3001 y la interfaz en http://localhost:5173 |
| `npm run build` | Compila la interfaz en `client/dist` |
| `npm start` | Levanta la API, que también sirve la interfaz compilada, en http://localhost:3001 |

## Por qué este stack

- **La misma base de datos.** Se conservaron los nombres de tablas, columnas
  y funciones, así que el trabajo hecho en PostgreSQL sigue valiendo.
- **Un solo lenguaje.** JavaScript en el servidor y en la interfaz.
- **Pocas dependencias.** Cinco paquetes en total: menos cosas que actualizar y
  menos cosas que se pueden romper.
- **Sin instalar nada en las cajas.** Basta un navegador; la misma interfaz
  sirve en la computadora de la caja, en una tableta o en el celular.
