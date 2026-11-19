// /api/reportes y /api/dashboard
import { Router } from 'express';
import { config } from '../config.js';
import * as auditoria from '../dao/auditoria.js';
import * as clientes from '../dao/clientes.js';
import * as compras from '../dao/compras.js';
import * as reportes from '../dao/reportes.js';
import * as ventas from '../dao/ventas.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P, tienePermiso } from '../permisos.js';
import { numero, paginacion, rangoFechas } from '../validacion.js';

export const reportesRouter = Router();
export const dashboardRouter = Router();

const variacion = (actual, anterior) => (anterior ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : null);

// Todo el reporte en una llamada (pantalla de Reportes).
reportesRouter.get('/', requiere(P.VER_REPORTES), ruta(async (req, res) => {
  const rango = rangoFechas(req.query, 30);
  const anterior = reportes.periodoAnterior(rango);
  const umbral = numero(req.query.umbral ?? config.umbralStockBajo, { campo: 'umbral', etiqueta: 'El umbral', min: 0, max: 100_000 });
  const q = req.consultar;

  const [resumen, resumenAnterior, compraResumen, serie, masVendidos, empleados, frecuentes, stockBajo, categorias, horas] =
    await Promise.all([
      reportes.resumenVentas(q, rango),
      reportes.resumenVentas(q, anterior),
      reportes.resumenCompras(q, rango),
      reportes.serieVentas(q, rango),
      reportes.masVendidos(q, { ...rango, limite: 10 }),
      reportes.porEmpleado(q, rango),
      reportes.clientesFrecuentes(q, { ...rango, limite: 5 }),
      reportes.stockBajo(q, umbral),
      reportes.porCategoria(q, rango),
      reportes.porHora(q, rango),
    ]);

  res.json({
    ...rango,
    anterior,
    resumen: {
      ...resumen,
      variacionIngresos: variacion(resumen.ingresos, resumenAnterior.ingresos),
      variacionVentas: variacion(resumen.ventas, resumenAnterior.ventas),
      compras: compraResumen,
    },
    serie,
    masVendidos,
    empleados,
    clientesFrecuentes: frecuentes,
    stockBajo: { umbral, productos: stockBajo },
    categorias,
    horas,
  });
}));

// Reporte completo de ventas, paginado (y para exportar a CSV).
reportesRouter.get('/ventas', requiere(P.VER_REPORTES), ruta(async (req, res) => {
  const rango = rangoFechas(req.query, 30);
  const pag = paginacion(req.query, { limitePorDefecto: 50, limiteMaximo: 5000 });
  res.json({ ...rango, ...(await reportes.ventasDetalladas(req.consultar, { ...rango, ...pag })), pagina: pag.pagina, limite: pag.limite });
}));

// Tablero: cada bloque aparece solo si el rol puede ver esos datos.
dashboardRouter.get('/', requiere(P.VER_DASHBOARD), ruta(async (req, res) => {
  const s = req.sesion;
  const q = req.consultar;
  const rango = rangoFechas(req.query, 30);
  const anterior = reportes.periodoAnterior(rango);
  const hoy = rangoFechas({ dias: 1 });
  const puede = (p) => tienePermiso(s, p);
  const tareas = {};

  tareas.conteos = reportes.conteos(q, {
    productos: puede(P.VER_PRODUCTOS),
    clientes: puede(P.VER_CLIENTES),
    empleados: puede(P.VER_EMPLEADOS),
    proveedores: puede(P.VER_PROVEEDORES),
  });

  if (puede(P.VER_VENTAS)) {
    tareas.ventas = reportes.resumenVentas(q, rango);
    tareas.ventasAnterior = reportes.resumenVentas(q, anterior);
    tareas.ventasHoy = reportes.resumenVentas(q, hoy);
    tareas.serie = reportes.serieVentas(q, rango);
    tareas.ultimasVentas = ventas.listar(q, { ...rangoFechas({ dias: 3660 }), limite: 6, offset: 0 }).then((r) => r.ventas);
    if (puede(P.VER_PRODUCTOS)) tareas.masVendidos = reportes.masVendidos(q, { ...rango, limite: 5 });
  }
  if (puede(P.VER_PRODUCTOS)) {
    tareas.inventario = reportes.inventario(q, config.umbralStockBajo);
    tareas.stockBajo = reportes.stockBajo(q, config.umbralStockBajo);
  }
  if (puede(P.VER_COMPRAS)) {
    tareas.compras = reportes.resumenCompras(q, rango);
    tareas.ultimasCompras = compras.listar(q, { ...rangoFechas({ dias: 3660 }), limite: 5, offset: 0 }).then((r) => r.compras);
  }
  if (puede(P.VER_CLIENTES) && !puede(P.VER_VENTAS)) {
    tareas.clientesPorTipo = clientes.conteoPorTipo(q);
    tareas.clientesRecientes = q(
      `select c.id_c as id, coalesce(pf.nombre, pm.razon_social) as nombre,
              case when pf.id_c is not null then 'fisica' else 'moral' end as tipo, c.telefono, c.rfc
       from cliente c
       left join p_fisica pf on pf.id_c = c.id_c
       left join p_moral pm on pm.id_c = c.id_c
       where c.rfc is distinct from $1
       order by c.id_c desc limit 6`,
      [clientes.RFC_PUBLICO_GENERAL],
    );
  }
  if (puede(P.VER_AUDITORIA)) tareas.actividad = auditoria.recientes(q, 6);

  const claves = Object.keys(tareas);
  const valores = await Promise.all(Object.values(tareas));
  const datos = Object.fromEntries(claves.map((k, i) => [k, valores[i]]));

  if (datos.ventas && datos.ventasAnterior) {
    datos.ventas.variacionIngresos = variacion(datos.ventas.ingresos, datos.ventasAnterior.ingresos);
    datos.ventas.variacionVentas = variacion(datos.ventas.ventas, datos.ventasAnterior.ventas);
    delete datos.ventasAnterior;
  }

  res.json({ ...rango, umbralStockBajo: config.umbralStockBajo, ...datos });
}));
