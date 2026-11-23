# Paso a Paso Final para Dejar el Proyecto al 100 %

> **Ya quedaron actualizados en el repositorio:** `README.md`, `STACK.md`, `docs/MANUAL_FUNCIONAMIENTO_ETL.md`, `docs/explicacion.html` y el código completo (ETL + DSS + 8/8 pruebas unitarias).
>
> Aquí tienes **únicamente lo que falta hacer manualmente** (en orden exacto) para entregar el proyecto completo y sin cabos sueltos.

---

## Paso 1 · Preparar PostgreSQL y verificar el servidor (2 min)

1. Abre PowerShell en `c:\Users\Nhigmere\Desktop\harvest-jam-1`.
2. Si aún no existe tu archivo `.env`, créalo y pon tu contraseña real de `postgres` en `PGADMIN_PASSWORD`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Inicializa el esquema `etl` (si ya tenías `TBD` creada):
   ```powershell
   npm run dss:init
   ```
   *(Si prefieres crear toda la base desde cero con datos simulados: `npm run db:setup -- --reiniciar`.)*
4. Asegúrate de que el servidor esté arriba (`http://localhost:5173`). Si lo cerraste, levántalo con:
   ```powershell
   npm run dev
   ```

---

## Paso 2 · Sacar las 8 capturas (`6.1`–`6.8`) y validar `P-09`–`P-15` en una sola pasada (10 min)

> Usa **`Win + Shift + S`** para recortar limpio (sin pestañas personales). Verifica que solo salgan usuarios y datos ficticios.

- [ ] **Evidencia 6.1 (Terminal — pruebas y ETL) + Prueba `P-09`:**
  1. En PowerShell (en la carpeta del proyecto), corre:
     ```powershell
     cls
     npm test
     npm run etl
     ```
  2. **Captura:** la salida completa donde se vea `pass 8`, `fail 0` arriba y `✓ Corrida #...` con `Leídas · Limpiadas · Imputadas · Cargadas · Rechazadas` abajo.
  3. **Para `P-09`:** corre `npm run etl` una segunda vez y confirma que `Cargadas` dé exactamente el mismo número (cero duplicados) → anota **`PASS`** en `P-09`.

- [ ] **Evidencia 6.2 (`http://localhost:5173/etl` — corrida completa):**
  1. Inicia sesión con **`francisco_mendoza`** / contraseña **`12345`**.
  2. Entra a **Bitácora ETL** (`/etl`) → pulsa **«Ejecutar ETL»** → filtra por **«Limpiados»** (o **«Imputados»**).
  3. **Captura:** tarjetas superiores + tabla *Antes → Después* (ej. `"  manzana   ROJA "` → `"Manzana roja"`, `"12,5"` → `"12.5"`).

- [ ] **Evidencia 6.3 (`http://localhost:5173/etl` — modo prueba y cuarentena) + Prueba `P-10`:**
  1. Ahí mismo en `/etl`, pulsa **«Probar datos inválidos»** → filtra por **«Rechazados»**.
  2. Haz clic en la fila del folio **`#99002`** (cantidad `-4`, regla `V2`) o **`#99004`** (fecha `2099-05-01`, regla `V4`) para abrir el modal.
  3. **Captura:** el modal **Detalle del cambio** abierto mostrando *Antes → Después* (`Cuarentena`), motivo y el JSON original.
  4. **Para `P-10`:** al pasar al siguiente paso (`/decisiones`), confirma que las cifras del negocio no cambiaron → anota **`PASS`** en `P-10`.

- [ ] **Evidencia 6.4 (`http://localhost:5173/decisiones` — escenario Base) + Prueba `P-11`:**
  1. Entra a **Decisiones** (`/decisiones`) con **Escenario base** y presupuesto vacío.
  2. **Captura:** el aviso de revisión humana y datos simulados, los 5 KPIs superiores y las primeras filas de la tabla priorizada.
  3. **Para `P-11`:** escribe **`5017`** en el buscador de la tabla y comprueba que debajo de *Ejote* dice **`· entrega imputada`** → anota **`PASS`** en `P-11` y borra el texto del buscador.

- [ ] **Evidencia 6.5 (`http://localhost:5173/decisiones` — escenarios y presupuesto) + Pruebas `P-12` y `P-13`:**
  1. Haz clic en **«Demanda +20 %»** (o **«Proveedor +2 días»**, la que muestre el contador `X cambios` más claro).
  2. En **Presupuesto semanal ($ MXN)** escribe **`15000`** (o un monto menor a la inversión sugerida para que queden productos sin cubrir).
  3. Filtra la tabla por **«Crítica»** o **«Alta»**.
  4. **Captura:** las 4 tarjetas de escenarios con cambios, la alerta roja de presupuesto y la tabla filtrada con etiquetas `· Fuera de presup.` → anota **`PASS`** en `P-12` y `P-13`.

- [ ] **Evidencia 6.6 (`http://localhost:5173/decisiones` — modal «¿Por qué?»):**
  1. Regresa el filtro de prioridad a **«Todos»** y pulsa **«¿Por qué?»** en un producto **Emergencia / Crítica** o **Sobreabastecido**.
  2. **Captura:** el modal completo con la explicación en texto, los 8 datos clave, la fecha de corte y las 4 barras de puntaje `v1` (`40/25/20/15 %`).

- [ ] **Evidencia 6.7 (`http://localhost:5173/decisiones` — foto guardada) + Prueba `P-14`:**
  1. Cierra sesión e inicia como comprador: **`ricardo_valencia`** / contraseña **`12345`**.
  2. Entra a `/decisiones`, elige **Demanda +20 %**, pon presupuesto **`15000`** y pulsa **«Guardar foto DSS»** (arriba a la derecha).
  3. Baja al final de la pantalla y **captura** los paneles **«Fórmulas de indicadores (trazabilidad)»** y **«Fotos de decisión guardadas»** mostrando la foto recién guardada → anota **`PASS`** en `P-14`.

- [ ] **Evidencia 6.8 (`http://localhost:5173/decisiones` — acceso denegado) + Prueba `P-15`:**
  1. Cierra sesión e inicia como cajero: **`manuel_gomez`** / contraseña **`12345`**.
  2. Escribe en la barra de direcciones **`http://localhost:5173/decisiones`** y presiona Enter.
  3. **Captura:** la URL `/decisiones`, el menú lateral sin *ETL* ni *Decisiones*, y el mensaje **«Tu rol no tiene acceso a esta sección»** → anota **`PASS`** en `P-15`.

---

## Paso 3 · Ajustes finales en tu Documento Word y exportación a PDF (5 min)

- [ ] **Portada:** llenar nombres de los 5–6 integrantes, nombre del docente y grupo.
- [ ] **3 correcciones pequeñas de referencia:**
  1. *Resumen ejecutivo → tabla de entregables (fila 4):* cambiar `(4.8 cálculo manual)` → **`(4.7 cálculo manual)`**.
  2. *Sección 4.2 → tabla de parámetros (última fila):* cambiar `(ver 4.5)` → **`(ver 4.4)`**.
  3. *Sección 3.3 → tabla de anomalías (fila 1):* cambiar `(stock mínimo 15)` → **`(stock mínimo 18 en CSV / 15 en lote de prueba)`**.
- [ ] **Sección 06:** pegar las 8 capturas (`6.1` a `6.8`) reemplazando `[ Pega aquí la captura de pantalla ]`.
- [ ] **Sección 7.2:** cambiar `"Registrar en vivo"` por **`PASS`** en `P-09` a `P-15` y agregar una observación corta (ej. *"Verificado en corrida #2 y #3"*, *"Bloqueado por rol cajero"*).
- [ ] **Anexo A (Guion de demostración):** escribir el nombre del integrante encargado de cada uno de los 7 pasos + el caso inválido.
- [ ] **Exportar a PDF** y revisar que ninguna tabla o captura quede cortada feo entre páginas.

---

## Paso 4 · Completar `README.md` y cerrar Git limpio (3 min)

- [ ] Abrir [`README.md`](README.md) y llenar los nombres de los integrantes `2` al `6`.
- [ ] Revisar qué archivos vas a dejar en el repositorio final (si no quieres subir los archivos guía personales `RESUMEN_PARA_TERMINAR.md` o `PASO_A_PASO_FINAL.md`, bórralos o no los agregues al `git add`).
- [ ] Hacer un commit final limpio:
  ```powershell
  git status
  git add README.md STACK.md base-de-datos/07_dss.sql docs/MANUAL_FUNCIONAMIENTO_ETL.md docs/explicacion.html
  git add -u docs/
  git commit -m "Actualiza documentación final del módulo ETL y DSS"
  git push
  ```
  *(Si prefieres también guardar tu PDF final dentro de `docs/`, agrégalo antes del commit.)*

---

## Paso 5 · Ensayo rápido antes de exponer (5 min)

- [ ] Confirmar que cada integrante sabe explicar su paso del **Anexo A** y abrir [`docs/explicacion.html`](docs/explicacion.html) como acordeón de repaso (Vista 1 para exponer sencillo, Vista 2 para preguntas técnicas).
- [ ] Tener lista la respuesta de oro por si el profesor pregunta *"¿cómo sabes que el ETL no se equivoca al rellenar o descartar?"* (ya está en la Sección 3 de la Vista 1 y Sección 11 de la Vista 2 de `docs/explicacion.html`).
- [ ] Tener corriendo `npm run dev` y la sesión de `francisco_mendoza` lista antes de pasar al frente.
