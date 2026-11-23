# Harvest JAM 2.0

Sistema web de gestión para frutería (Node.js + Express + React + PostgreSQL) que integra punto de venta, compras e inventario, catálogos de productos, clientes, proveedores y empleados, reportes y auditoría con permisos por rol, **extendido con un motor ETL trazable y un módulo de Apoyo a Decisiones (DSS) para el reabastecimiento inteligente de productos perecederos**.

> **Asignatura:** Desarrollo de Software para la Toma de Decisiones  
> **Modalidad:** A. Integración en proyecto existente  
> **Decisión apoyada:** *¿Qué productos perecederos conviene reabastecer esta semana, en qué cantidad sugerida, con qué prioridad y bajo qué escenario de demanda o presupuesto?*

---

## Integrantes

1. Mendoza Duran Juan Francisco
2. *[Completar nombre]*
3. *[Completar nombre]*
4. *[Completar nombre]*
5. *[Completar nombre]*
6. *[Completar nombre]*

---

## Separación: sistema preexistente vs. módulo nuevo (ETL + DSS)

| Capa | Preexistente en Harvest JAM 2.0 | Desarrollado para Toma de Decisiones |
|---|---|---|
| **Base de datos** | Esquema operativo `fruteria` (13 tablas, 18 funciones, 15 triggers y roles base). | Esquema analítico aislado `etl` en [`base-de-datos/07_dss.sql`](base-de-datos/07_dss.sql) (9 tablas, 6 índices y permisos `GRANT`/`REVOKE`). |
| **Fuentes externas** | No existían. | 2 archivos CSV simulados en `datos-externos/` (`parametros_producto.csv` y `tiempos_entrega_proveedor.csv`) con anomalías controladas. |
| **Servidor (`server/`)** | Rutas CRUD, sesiones, reportes descriptivos y auditoría. | Motor ETL (`src/etl/`), motor DSS (`src/dss/`), DAO analítico (`src/dao/dss.js`), endpoints `/api/etl` y `/api/dss`, permisos `VER_ETL`/`EJECUTAR_ETL`/`VER_DSS`/`EJECUTAR_DSS` y 8 pruebas unitarias (`server/test/`). |
| **Interfaz (`client/`)** | Punto de venta (`/vender`), ventas, compras, catálogos, reportes y auditoría. | Pantallas **Bitácora ETL** (`/etl`) y **Decisiones** (`/decisiones`) con 5 indicadores, 4 escenarios, simulación de presupuesto, modal *«¿Por qué?»* y guardado de fotos DSS. |

---

## Requisitos previos

- **Node.js** `20.19` o superior (con `npm`)
- **PostgreSQL** `13` o superior en ejecución (probado con 16)

---

## Instalación y ejecución paso a paso

1. **Instalar dependencias** (servidor y cliente vía `npm workspaces`):
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:** copia `.env.example` como `.env` en la raíz del proyecto y ajusta `PGADMIN_PASSWORD` (y puerto/host si aplica):
   ```bash
   cp .env.example .env
   ```

3. **Preparar la base de datos (`TBD`):**
   - **Instalación completa desde cero** (crea `TBD` y ejecuta de `01_tablas.sql` a `07_dss.sql` con datos de demostración):
     ```bash
     npm run db:setup
     ```
     *(Usa `npm run db:setup -- --reiniciar` para borrar y recrear el esquema `fruteria`, o `-- --sin-simulados` para omitir `06_datos_simulados.sql`.)*
   - **Si la base `TBD` ya existe** y solo deseas agregar el esquema `etl` sin borrar datos operativos:
     ```bash
     npm run dss:init
     ```

4. **Ejecutar el proceso ETL** (si usaste `db:setup`):
   ```bash
   npm run etl
   ```
   *(Para probar limpieza y cuarentena con datos inválidos sin afectar las tablas limpias: `npm run etl:prueba`.)*

5. **Levantar la aplicación en modo desarrollo:**
   ```bash
   npm run dev
   ```
   - **Interfaz web:** http://localhost:5173
   - **API REST:** http://localhost:3001

6. **Ejecutar las pruebas unitarias automatizadas (8 pruebas de ETL y DSS, sin BD):**
   ```bash
   npm test
   ```

7. **Modo producción (opcional):**
   ```bash
   npm run build
   npm start
   ```
   Express sirve tanto `/api/*` como la interfaz compilada (`client/dist`) en http://localhost:3001.

---

## Usuarios de prueba (datos ficticios)

La contraseña de todas las cuentas de demostración locales es **`12345`**:

| Usuario | Rol PostgreSQL | Acceso al módulo ETL / DSS |
|---|---|---|
| `francisco_mendoza` | `administrador` | Acceso total (`/etl`, ejecutar ETL y modo prueba, `/decisiones` y guardar fotos DSS). |
| `robert_de_niro` | `gerente` | Lectura de `/etl`, acceso completo a `/decisiones` y guardar fotos DSS. |
| `ricardo_valencia` | `comprador` | Acceso a `/decisiones` y guardar fotos DSS (sin acceso a `/etl`). |
| `laura_perez` | `contador` | Solo lectura en `/etl` y `/decisiones`. |
| `manuel_gomez` | `cajero` | **Sin acceso** a `/etl` ni a `/decisiones` (útil para comprobar el bloqueo por rol). |
| `juan_gonzales` | `admin_clientes` | **Sin acceso** a `/etl` ni a `/decisiones`. |

> **Transparencia de datos:** Los registros del punto de venta (`05_datos.sql`, `06_datos_simulados.sql`) son ficticios de demostración y los archivos de `datos-externos/` son datos simulados identificados así en la interfaz. El módulo DSS apoya al decisor con evidencia pero **nunca registra compras automáticamente**.
