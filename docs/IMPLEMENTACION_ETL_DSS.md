# Resumen de Implementación · ETL + Bitácora + Módulo DSS en Harvest JAM

> **Modalidad:** A — Integración sobre proyecto existente (**Harvest JAM 2.0**)  
> **Estado:** Código completo, compilado (`npm run build`) y probado con **8/8 pruebas unitarias** (`npm test`).

---

## 1. Qué se implementó (separado claramente de lo preexistente)

Todo el trabajo nuevo vive en **su propio esquema de PostgreSQL (`etl`)**, sus propias carpetas en servidor (`server/src/etl/`, `server/src/dss/`, `server/test/`) y sus dos nuevas pantallas en React (`BitacoraEtl.jsx` y `Decisiones.jsx`), **sin modificar ni alterar las 13 tablas del POS (`fruteria.*`)**.

### Base de datos y fuentes simuladas
| Archivo | Propósito |
|---|---|
| `base-de-datos/07_dss.sql` | Crea el esquema `etl` con 3 tablas de control (`etl.corridas`, `etl.cambios`, `etl.rechazos`), 3 tablas limpias (`etl.parametros_producto`, `etl.venta_limpia`, `etl.resumen_producto`), 3 tablas de trazabilidad del DSS (`etl.dss_parametros`, `etl.dss_corridas`, `etl.dss_recomendaciones`) y permisos por rol (`administrador`, `gerente`, `comprador`, `contador`; bloqueado para `cajero` y `admin_clientes`). |
| `datos-externos/parametros_producto.csv` | Fuente CSV simulada para los 54 productos (`5000`–`5054`) con `stock_minimo` y `vida_util_dias`, incluyendo **anomalías sembradas** (códigos con espacios/ceros, comas decimales, unidades abreviadas, duplicado `5023`, vida útil `0`, stock mínimo `-5` y código inexistente `9999`). |
| `datos-externos/tiempos_entrega_proveedor.csv` | Fuente CSV simulada con `dias_entrega` por proveedor/producto y **anomalías sembradas** (fechas mixtas `DD/MM/YYYY` y `YYYY-MM-DD`, valores faltantes imputados con regla `I1`, entrega `400` días fuera de rango y fecha ilegible `fecha-mala`). |
| `server/scripts/init-dss.js` | Script `npm run dss:init` que aplica `07_dss.sql` sobre la base existente sin borrar datos y corre la primera carga completa del ETL. |
| `server/scripts/setup-db.js` | Actualizado para incluir `07_dss.sql` en instalaciones nuevas (`npm run db:setup`). |

### Backend: Motor ETL + Capa pura del DSS + API REST
| Archivo | Propósito |
|---|---|
| `server/src/etl/reglas.js` | Parser CSV y funciones puras de **limpieza (`L1`–`L4`)**, **imputación (`I1`)** y **validación/cuarentena (`V1`–`V4`)**. |
| `server/src/etl/datosPrueba.js` | Lote controlado con anomalías (duplicados, cantidad `-4`, precio `0`, fecha `2099-05-01`, código `9999`) para el botón **Probar datos inválidos**. |
| `server/src/etl/ejecutar.js` | Orquestador del ETL con 2 modos (`completo` idempotente en transacción y `prueba` aislado). Calcula la ventana de demanda sobre `fecha_corte = MAX(venta.fecha)` para trabajar con el historial real o simulado disponible. |
| `server/src/etl/cli.js` | Ejecución por consola: `npm run etl` y `npm run etl:prueba`. |
| `server/src/dss/indicadores.js` | Capa pura de los **5 indicadores** de `PLAN_DSS.md`: cobertura (días), rotación, brecha contra mínimo, margen de entrega y riesgo de merma (sin divisiones entre cero). |
| `server/src/dss/modelo.js` | Modelo explicable de **6 pasos**: suficiencia de datos (`< 5 días` → `Sin datos`), regla de emergencia (`existencia = 0` o `margen_entrega < 0` → `Crítica`), clasificación por umbrales (`Alta`, `Media`, `Baja`, `Sobreabastecido`), puntuación ponderada `0–100` (`40/25/20/15`), cantidad sugerida topada por vida útil (evita merma) y asignación de presupuesto semanal con explicación en español. |
| `server/src/dss/escenarios.js` | Comparador de los **4 escenarios** lado a lado: `Base`, `Demanda +20 %`, `Demanda −20 %` y `Proveedor +2 días`. |
| `server/src/dao/dss.js` | Consultas SQL sobre `etl.*` para bitácora, resúmenes y fotos guardadas del DSS. |
| `server/src/rutas/etl.js` | Endpoints `/api/etl/corridas`, `/api/etl/cambios` y `POST /api/etl/ejecutar`. |
| `server/src/rutas/dss.js` | Endpoints `GET /api/dss/analisis` y `POST /api/dss/guardar-corrida`. |
| `server/src/permisos.js` y `server/src/app.js` | Nuevos permisos (`VER_DSS`, `EJECUTAR_DSS`, `VER_ETL`, `EJECUTAR_ETL`) y montaje de `/api/etl` y `/api/dss`. |

### Frontend: Dos pantallas nuevas en Obsidian Atelier & Champagne Gold
| Archivo | Ruta | Qué incluye |
|---|---|---|
| `client/src/paginas/BitacoraEtl.jsx` | `/etl` | **Vista estilo Auditoría** para el ETL: botones **Ejecutar ETL** y **Probar datos inválidos**, KPIs de la corrida, filtros por corrida, entidad y tipo (`Limpiados`, `Imputados`, `Rechazados`, `Cargados`), buscador, tabla paginada con *Antes → Después* y modal con JSON crudo vs. transformado. |
| `client/src/paginas/Decisiones.jsx` | `/decisiones` | **Tablero DSS de Reabastecimiento**: aviso de revisión humana y fecha de corte, 5 KPIs principales, comparador interactivo de **4 escenarios**, simulador de supuestos (`Demanda %`, `Retraso proveedor`, `Cobertura objetivo`, `Presupuesto semanal`), alerta de déficit presupuestal, tabla priorizada con botón **«¿Por qué?»** (modal con desglose de puntaje `0–100`, indicadores y enlace a `/compras/nueva`), botón **Guardar foto DSS**, impresión y catálogo de fórmulas. |
| `client/src/App.jsx` y `client/src/componentes/Layout.jsx` | Menú **Análisis** | Entradas **Decisiones** y **Bitácora ETL** protegidas por permiso y accesibles también desde la paleta `⌘K`. |

---

## 2. Permisos por rol (doble capa: Express + PostgreSQL)

| Rol | `/decisiones` (ver y simular) | Guardar foto DSS | `/etl` (ver bitácora) | Ejecutar ETL / Prueba |
|---|---|---|---|---|
| `administrador` (`francisco_mendoza`) | Sí | Sí | Sí | Sí |
| `gerente` (`robert_de_niro`) | Sí | Sí | Sí | No |
| `comprador` (`ricardo_valencia`) | Sí | Sí | No | No |
| `contador` (`laura_perez`) | Sí | No | Sí | No |
| `cajero` (`manuel_gomez`) | No (`403`) | No | No (`403`) | No |
| `admin_clientes` (`juan_gonzales`) | No (`403`) | No | No (`403`) | No |

---

## 3. Verificación y pruebas ejecutadas

### Pruebas automatizadas (`npm test` — `node:test`)
- **`server/test/etl.test.js` (4/4 aprobadas):**
  - `L1–L3`: códigos con espacios/ceros, limpieza de texto, coma decimal y fechas mixtas/futuras.
  - `parametros_producto.csv`: limpieza, deduplicación `L4` por fecha más reciente y rechazos `V1`/`V3`.
  - `tiempos_entrega_proveedor.csv`: imputación `I1` (2 días marcados como imputados) y rechazos `V3`/`V4`.
  - Lote de ventas de prueba: deduplicación `L4` y rechazos `V2` (cantidad `-4`), `V3` (precio `0`) y `V4` (fecha `2099`).
- **`server/test/dss.test.js` (4/4 aprobadas):**
  - Ejemplo oficial de la guía (`12 u`, `4/día`, entrega `5 días` → cobertura `3.0`, margen `-2`, `Crítica` por emergencia).
  - Casos límite: demanda `0` (sin `Infinity`, estado `Datos insuficientes`), menos de 5 días con ventas (`Sin datos`), existencia `0` (emergencia + tope por `vida_util_dias`).
  - Presupuesto insuficiente (productos marcados `Fuera de presupuesto`) y sobreabastecimiento (`cobertura > vida_util_dias` → `0` compra).
  - Comparación de los 4 escenarios y ordenamiento 100 % reproducible.

### Compilación frontend (`npm run build`)
- Compilación limpia con Vite (`67` módulos, `13.71 kB` CSS gzip / `115.34 kB` JS gzip).

---

## 4. Cómo inicializarlo y correrlo en tu equipo

Solo falta aplicar `07_dss.sql` con tu contraseña real del superusuario `postgres`:

1. Abre `.env` y coloca tu contraseña real de PostgreSQL en `PGADMIN_PASSWORD`:
   ```env
   PGADMIN_USER=postgres
   PGADMIN_PASSWORD=TU_CONTRASEÑA_REAL_DE_POSTGRES
   ```
2. Inicializa el esquema `etl` y ejecuta la primera carga completa (sin borrar tus ventas ni productos):
   ```bash
   npm run dss:init
   ```
3. Reinicia el servidor de desarrollo para que cargue las nuevas rutas `/api/etl` y `/api/dss`:
   ```bash
   npm run dev
   ```
4. Comandos útiles adicionales:
   - `npm run etl` — vuelve a correr el ETL completo (idempotente).
   - `npm run etl:prueba` — ejecuta el lote de datos inválidos desde consola.
   - `npm test` — corre las 8 pruebas unitarias del ETL y el DSS.

---

## 5. Guion rápido para la demostración final (7 pasos)

1. **Decisión:** Entra a **`/decisiones`** como `francisco_mendoza` o `ricardo_valencia` y presenta la pregunta de reabastecimiento de perecederos.
2. **Datos de entrada:** Muestra `/productos` y los CSV simulados en `datos-externos/`.
3. **Transformación y dato inválido:** Entra a **`/etl`**, pulsa **Ejecutar ETL** y **Probar datos inválidos**, filtra por **Limpiados** (`L1`–`L4`), **Imputados** (`I1`) y **Rechazados** (`V1`–`V4`), y haz clic en una fila para ver el *Antes → Después* y el JSON original en cuarentena.
4. **Indicadores:** En **`/decisiones`**, muestra los 5 KPIs y el panel inferior **Fórmulas de indicadores**.
5. **Modelo:** Muestra las prioridades (`Emergencia`, `Alta`, `Media`, `Baja`, `Sobreabastecido` por merma y `Sin datos`).
6. **Escenarios:** Haz clic en **Demanda +20 %** y **Proveedor +2 días**, y escribe un presupuesto semanal (ej. `$10,000`) para ver los productos marcados *Fuera de presupuesto* y el aviso de déficit.
7. **Explicabilidad y trazabilidad:** Abre **«¿Por qué?»** en un producto prioritario para mostrar su desglose `0–100`, y pulsa **Guardar foto DSS** para registrar la corrida.
