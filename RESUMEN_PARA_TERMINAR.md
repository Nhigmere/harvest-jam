# Estado Actualizado y Guía Paso a Paso para Terminar Harvest JAM 2.0

**Última actualización:** Revisión completa tras revisar tu **Documento Final del Proyecto Integrador**.  
**Avance global estimado:** **~90 % completado** (código 100 % funcional + documento final excelentemente estructurado; solo faltan las 8 capturas en vivo, llenar 7 resultados en la matriz, corregir 3 detalles menores de texto y hacer commit limpio).

---

## 1. ¿Cómo quedó tu documento? (Diagnóstico honesto)

Tu documento está **excelente**: tiene una presentación visual muy cuidada, explica con claridad el negocio y la parte técnica, y **cubre los 9 entregables obligatorios y el 100 % de la rúbrica**.

### ✅ Lo que YA ESTÁ cubierto (no necesitas rehacerlo)
- **Código ETL + DSS + API + Seguridad RBAC + 8 pruebas unitarias (`npm test`):** 100 % listo.
- **Sección 00 (Resumen ejecutivo) y tabla de entregables:** ✅ Listo.
- **Sección 01 (Planteamiento, problemas, usuarios, frecuencia, alternativas, alcance, justificación y transparencia de datos):** ✅ Completo.
- **Sección 02 (Diccionario de datos: 5 fuentes, 12 variables de entrada, 10 derivadas, 9 tablas de `etl` y criterios de calidad):** ✅ Completo.
- **Sección 03 (Proceso ETL, Regla de Oro, diagrama Fig. 3.1, reglas `L1–L4`, `I1`, `V1–V4`, `LD-01`, transacción e idempotencia):** ✅ Completo.
- **Sección 04 (Modelo DSS en 6 pasos, 5 indicadores, pesos `v1`, 4 escenarios, supuestos y ejemplo manual de Cebolla verificado):** ✅ Completo.
- **Sección 05 (Stack, arquitectura, instalación, `.env`, comandos, usuarios, doble capa RBAC y endpoints):** ✅ Completo.
- **Sección 07.1 (Pruebas automatizadas `P-01` a `P-08`):** ✅ Completo.
- **Sección 08 (Separación Preexistente vs. Nuevo e inventario de archivos):** ✅ Completo.
- **Sección 09 (Reporte final: conclusiones, Antes vs. Después, limitaciones/sesgos y mejoras futuras):** ✅ Completo.
- **Anexo A (Guion de 7 pasos + caso inválido) y Anexo B (Cobertura de rúbrica y condiciones de aceptación):** ✅ Completo.

---

## 2. Lo que FALTA para dejar el proyecto al 100 %

### A. En tu documento Word / PDF
1. **Llenar los campos de la Portada:** nombres de los 5–6 integrantes, nombre del docente y grupo.
2. **Corregir 3 pequeños detalles de referencia interna (toma 1 minuto):**
   - **Resumen ejecutivo → tabla de entregables (fila 4):** dice `(4.8 cálculo manual)` → cambiar a **`(4.7 cálculo manual)`**.
   - **Sección 4.2 → tabla de parámetros (última fila):** dice `(ver 4.5)` → cambiar a **`(ver 4.4)`** (en 4.4 Paso 3 están los pesos; en 4.5 están los escenarios).
   - **Sección 3.3 → tabla de anomalías (fila 1):** dice `Producto 5023 duplicado ... (stock mínimo 15)` → especificar **`(stock mínimo 18 en CSV / 15 en lote de prueba)`** porque en `datos-externos/parametros_producto.csv` el registro más reciente de `5023` (`2026-11-05`) tiene `18,0` (y el `15` es el de `datosPrueba.js`).
3. **Pegar las 8 capturas de evidencia** en la **Sección 06 (`6.1` a `6.8`)**.
4. **Completar la columna `Obtenido` y `Observaciones`** de las 7 pruebas funcionales **`P-09` a `P-15`** en la **Sección 7.2** (cambiar `"Registrar en vivo"` por **`PASS`** conforme las ejecutes).
5. **Anotar el nombre de cada integrante** en la última columna del **Anexo A (Guion de demostración)**.

### B. En el repositorio Git
1. ✅ `README.md` actualizado con instrucciones de ejecución, tabla Preexistente vs. Nuevo y usuarios de prueba *(solo falta llenar los nombres de integrantes 2–6)*.
2. ✅ `STACK.md` actualizado con `07_dss.sql`, módulos `etl`/`dss` y comandos `dss:init`, `etl`, `etl:prueba` y `test`.
3. ✅ `docs/MANUAL_FUNCIONAMIENTO_ETL.md` corregido (`07_dss.sql`, 9 tablas, `/api/etl/corridas` y regla `I1`).
4. ⬜ Hacer un commit limpio final con todos los archivos ordenados (ver `PASO_A_PASO_FINAL.md`).

---

## 3. Guía Paso a Paso: cómo ejecutar todo, sacar las 8 capturas y validar `P-09` a `P-15`

> 💡 **Truco en Windows para capturas limpias:** usa **`Win + Shift + S`** (Herramienta Recortes) para recortar solo la ventana de la terminal o del navegador (sin pestañas personales ni barra de tareas).

### Preparación previa (solo 1 vez, si aún no has inicializado la BD)
Abre una terminal (PowerShell) dentro de `c:\Users\Nhigmere\Desktop\harvest-jam-1`:

1. Verifica que exista `.env` con tu contraseña real de PostgreSQL (`PGADMIN_PASSWORD`). Si no existe, cópialo de `.env.example`:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edita `.env` y pon tu contraseña real de `postgres` en `PGADMIN_PASSWORD=...`.
2. Si ya tenías la base `TBD` creada y solo falta el esquema `etl`, ejecuta:
   ```powershell
   npm run dss:init
   ```
   *(Si prefieres crear toda la base desde cero con datos simulados: `npm run db:setup -- --reiniciar`)*
3. Asegúrate de que el programa esté corriendo (`http://localhost:5173`):
   ```powershell
   npm run dev
   ```
   *(Si ya lo dejaste corriendo desde esta sesión, no hace falta lanzarlo de nuevo.)*

---

### 📸 Evidencia 6.1 · Pruebas automáticas y ETL por terminal
- **Dónde ir:** Abre una terminal nueva en `c:\Users\Nhigmere\Desktop\harvest-jam-1`.
- **Qué ejecutar (en ese orden, para que ambos salgan juntos en pantalla):**
  ```powershell
  cls
  npm test
  npm run etl
  ```
- **Qué debes revisar antes de capturar:**
  - Arriba debe verse `pass 8`, `fail 0` (las 8 pruebas en verde ✔).
  - Abajo debe verse `✓ Corrida #... terminada (con_rechazos) en ... ms` con las cifras `Leídas · Limpiadas · Imputadas · Cargadas · Rechazadas` y `Fecha de corte de ventas`.
- **Qué capturar (`Win + Shift + S`):** Toda la salida de la terminal con ambos comandos visibles.
- **Prueba que aprovechas para verificar aquí (`P-09` · Idempotencia):**
  - Vuelve a correr `npm run etl` una segunda vez justo después y comprueba que `Cargadas` entrega exactamente el **mismo número** (cero duplicados) → ya puedes marcar **`P-09` = `PASS`** en tu Sección 7.2.

---

### 📸 Evidencia 6.2 · Bitácora ETL tras una corrida completa (`/etl`)
- **Dónde ir:** Abre el navegador en **`http://localhost:5173`**.
- **Con qué usuario entrar:**
  - Usuario: **`francisco_mendoza`** (Administrador)
  - Contraseña: **`12345`**
- **Qué hacer clic:**
  1. En el menú lateral izquierdo, entra a **Bitácora ETL** (`/etl`).
  2. Pulsa el botón rosa/primario **“Ejecutar ETL”** (arriba a la derecha) y espera 1 segundo a que salga el aviso de confirmación.
  3. En los botones de filtro de abajo (*Tipo de cambio*), haz clic en **“Limpiados”** (o **“Imputados”** si quieres que se vea `I1`, o déjalo en **“Todos”** donde salen los de `parametros_producto.csv` primero).
  4. Verifica que en la tabla se vean ejemplos claros como `"  manzana   ROJA "` → `"Manzana roja"`, `"12,5"` → `"12.5"` o `"kg"` → `"kilogramo"`.
- **Qué capturar:** La pantalla completa de `/etl` mostrando las **tarjetas de resumen arriba** (Última corrida, Leídas, Limpiadas/Imputadas, Cargadas, Rechazadas) **+ la tabla Antes → Después**.

---

### 📸 Evidencia 6.3 · Modo prueba y registro en cuarentena
- **Dónde ir:** Quédate en **`http://localhost:5173/etl`** (como `francisco_mendoza`).
- **Qué hacer clic:**
  1. Pulsa el botón **“Probar datos inválidos”** (arriba a la derecha, junto a *Ejecutar ETL*).
  2. La pantalla seleccionará automáticamente la nueva corrida de prueba (`Modo prueba`).
  3. En el filtro de *Tipo de cambio*, haz clic en **“Rechazados”**.
  4. **Haz clic sobre una fila de rechazo** —por ejemplo la del folio **`#99002`** (cantidad `-4`, regla **`V2`**) o **`#99004`** (fecha `2099-05-01`, regla **`V4`**)— para que se abra la ventana modal **“Detalle del cambio”**.
- **Qué capturar:** La pantalla con el **modal abierto** donde se vea:
  - El título `Detalle del cambio · Regla V2` (o `V4`),
  - La caja **Antes → Después** (`-4 → Cuarentena` o `2099-05-01 → Cuarentena`),
  - El motivo claro y los dos recuadros JSON (*Dato original crudo* y *Enviado a cuarentena (no cargado)*).
- **Prueba que aprovechas para verificar (`P-10`):** Al ir al siguiente paso (`/decisiones`), confirma que los números del negocio no cambiaron tras correr el modo prueba → marca **`P-10` = `PASS`**.

---

### 📸 Evidencia 6.4 · Decisiones en el escenario Base (`/decisiones`)
- **Dónde ir:** En el menú lateral, haz clic en **Decisiones** (`http://localhost:5173/decisiones`).
- **Qué revisar antes de capturar:**
  - Asegúrate de que el escenario activo sea **“Escenario base”** y el campo *Presupuesto semanal* esté vacío.
  - Que se vea arriba el **aviso de revisión humana y datos simulados**, los **5 KPIs** (*Inversión sugerida*, *Urgentes*, *Cobertura promedio*, *Sobreabastecidos*, *Datos insuficientes*) y las primeras filas de la **tabla de priorización**.
- **Qué capturar:** La parte superior y media de `/decisiones` (puedes reducir un poquito el zoom del navegador al 80–90 % con `Ctrl + -` si quieres que quepan el aviso, los 5 KPIs y el inicio de la tabla en una sola foto nítida).
- **Prueba que aprovechas para verificar (`P-11`):** Escribe **`5017`** en el buscador de la tabla y verifica que debajo de *Ejote* aparezca la leyenda **`· entrega imputada`** → marca **`P-11` = `PASS`** (luego borra `5017` del buscador).

---

### 📸 Evidencia 6.5 · Comparación de escenarios y presupuesto
- **Dónde ir:** Quédate en **`http://localhost:5173/decisiones`**.
- **Qué hacer clic:**
  1. Haz clic en la tarjeta **“Demanda +20 %”** (o **“Proveedor +2 días”** — elige la que muestre la insignia amarilla de `X cambios` más clara).
  2. En el campo **“Presupuesto semanal ($ MXN)”**, escribe **`15000`** (o un monto menor a la *Inversión sugerida* para que varios productos queden fuera de presupuesto).
  3. En los filtros de prioridad encima de la tabla, haz clic en **“Crítica”** o **“Alta”** para demostrar también el uso de filtros.
- **Qué debe verse en la captura:**
  - Las 4 tarjetas de escenarios con el contador de cambios,
  - El campo de presupuesto con `15000` y el **banner rojo de alerta** indicando cuántos productos quedaron sin cubrir,
  - La tabla filtrada con etiquetas en rojo **`· Fuera de presup.`**
- **Pruebas que aprovechas para verificar (`P-12` y `P-13`):** Ya comprobaste cambio de escenario y presupuesto restringido → marca **`P-12` = `PASS`** y **`P-13` = `PASS`**.

---

### 📸 Evidencia 6.6 · Recomendación explicada (“¿Por qué?”)
- **Dónde ir:** Quédate en **`http://localhost:5173/decisiones`** (puedes regresar el filtro de prioridad a **“Todos”**).
- **Qué hacer clic:**
  1. Busca un producto en **Emergencia / Crítica** (o en **Sobreabastecido**) y haz clic en su botón **“¿Por qué?”** a la derecha de la fila.
  2. Se abrirá el modal **`¿Por qué? · [Nombre del producto]`**.
- **Qué capturar:** El modal abierto completo mostrando:
  - Insignia de prioridad y **Puntaje: XX / 100**,
  - El párrafo completo de explicación con la fecha de corte,
  - Los 8 datos clave (Existencia, Stock mínimo, Demanda diaria, Cobertura, Plazo entrega, Margen entrega, Vida útil, Margen ganancia),
  - Las **4 barras de desglose de puntuación (versión v1)**: Urgencia (40 %), Demanda (25 %), Margen (20 %) y Brecha (15 %).

---

### 📸 Evidencia 6.7 · Fotos de decisión guardadas (trazabilidad)
- **Dónde ir:** Cierra el modal anterior. (Opcional pero recomendado para validar `P-14` exacto: cierra sesión arriba/abajo e inicia sesión como el comprador **`ricardo_valencia`**, contraseña **`12345`**, y entra a **`/decisiones`**.)
- **Qué hacer clic:**
  1. Selecciona un escenario (ej. **Demanda +20 %**) y pon un presupuesto (ej. **`15000`**).
  2. Pulsa el botón **“Guardar foto DSS”** (arriba a la derecha).
  3. Baja hasta la parte inferior de la página, al panel **“Fotos de decisión guardadas”**.
- **Qué capturar:** La parte inferior de `/decisiones` donde se vean juntos el panel **“Fórmulas de indicadores (trazabilidad)”** y **“Fotos de decisión guardadas”** con tu foto recién creada (`#1 · Demanda +20 % (v1)`, fecha/hora, usuario, urgentes y monto sugerido).
- **Prueba que aprovechas para verificar (`P-14`):** Confirma que apareció la foto guardada por el comprador → marca **`P-14` = `PASS`**.

---

### 📸 Evidencia 6.8 · Acceso denegado por rol
- **Dónde ir:** Cierra sesión en Harvest JAM e inicia sesión como el cajero:
  - Usuario: **`manuel_gomez`**
  - Contraseña: **`12345`**
- **Qué hacer:**
  1. Observa primero el menú lateral: verás que **no aparecen** *Decisiones* ni *Bitácora ETL*.
  2. Ahora escribe manualmente en la barra de direcciones del navegador: **`http://localhost:5173/decisiones`** (o **`http://localhost:5173/etl`**) y presiona Enter.
  3. Aparecerá la pantalla con el candado y el mensaje **“Tu rol no tiene acceso a esta sección”**.
- **Qué capturar:** La ventana completa donde se vea la URL `/decisiones` (o `/etl`), el usuario cajero en el menú lateral (sin los enlaces de ETL/DSS) y el mensaje de acceso denegado.
- **Prueba que aprovechas para verificar (`P-15`):** Marca **`P-15` = `PASS`**.

---

## 4. Checklist final antes de entregar (5 minutos)

- [ ] Pegar las 8 capturas (`6.1` a `6.8`) en el documento Word y exportarlo a PDF.
- [ ] Llenar portada (integrantes, docente, grupo), columna `Obtenido` (`PASS`) de `P-09` a `P-15` y columna `Integrante` en el Anexo A.
- [ ] Corregir las 3 referencias menores (`4.8 → 4.7`, `ver 4.5 → ver 4.4`, `5023 min 18 en CSV / 15 en prueba`).
- [ ] Actualizar `README.md`, `STACK.md` y `docs/MANUAL_FUNCIONAMIENTO_ETL.md` (si quieres, pídemelo y te los actualizo en un momento).
- [ ] Hacer `git status` y un commit limpio final en el repositorio.
