// Reportes: ventas, productos, empleados, clientes e inventario.
import { useEffect, useState } from 'react';
import { LuDownload } from 'react-icons/lu';
import { api } from '../api.js';
import { useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoDashboard } from '../componentes/Efectos.jsx';
import { BarraSegmentada, BarrasRanking, GraficaArea, GraficaColumnas, PanelGrafica } from '../componentes/graficas.jsx';
import { PERIODOS, paramsPeriodo, textoPeriodo } from '../componentes/periodo.js';
import { Tabla } from '../componentes/Tabla.jsx';
import { Boton, CabeceraPagina, Cargando, Cifra, Insignia, MensajeError, Paginacion, Panel, Segmentado, Vacio } from '../componentes/ui.jsx';
import {
  capitalizar, cantidad, fecha, fechaCorta, fechaHora, moneda, monedaRedonda, nombrePropio, numero, plural,
} from '../formato.js';
import { useApi } from '../hooks.js';

const ETIQUETA_SERIE = { dia: 'por día', semana: 'por semana', mes: 'por mes' };

function etiquetaPeriodoSerie(granularidad) {
  if (granularidad === 'mes') return (p) => new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' }).format(new Date(`${p}T12:00:00`)).replace('.', '');
  if (granularidad === 'semana') return (p) => `Sem. del ${fechaCorta(p)}`;
  return fechaCorta;
}

const csvCelda = (v) => {
  const t = String(v ?? '');
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

function descargarCsv(nombre, encabezados, filas) {
  const contenido = [encabezados, ...filas].map((f) => f.map(csvCelda).join(',')).join('\r\n');
  const blob = new Blob([`﻿${contenido}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function VentasDetalladas({ periodo }) {
  const [pagina, setPagina] = useState(1);
  useEffect(() => setPagina(1), [periodo]);
  const { datos, error, cargando } = useApi('/reportes/ventas', { ...paramsPeriodo(periodo), pagina, limite: 20 });
  return (
    <Panel titulo="Reporte completo de ventas" descripcion="Un renglón por ticket, con todos sus productos.">
      <MensajeError error={error} />
      {cargando && !datos && <Cargando />}
      {datos && (
        <>
          <Tabla
            etiqueta="Reporte completo de ventas"
            clave="folio"
            cargando={cargando}
            filas={datos.ventas}
            columnas={[
              { clave: 'folio', titulo: 'Folio', render: (v) => <span className="numeros">{v.folio}</span> },
              { clave: 'fecha', titulo: 'Fecha', render: (v) => fechaHora(v.fecha) },
              { clave: 'cliente', titulo: 'Cliente', render: (v) => nombrePropio(v.cliente) },
              { clave: 'empleado', titulo: 'Atendió', render: (v) => nombrePropio(v.empleado) },
              { clave: 'productos', titulo: 'Productos', className: 'tabla__td--texto-largo', render: (v) => capitalizar(v.productos) },
              { clave: 'total', titulo: 'Total', alinear: 'der', render: (v) => <strong className="numeros">{moneda(v.total)}</strong> },
            ]}
            vacio={<Vacio titulo={`No hay ventas en ${textoPeriodo(periodo)}`} />}
          />
          <Paginacion pagina={datos.pagina} limite={datos.limite} total={datos.total} alCambiar={setPagina} />
        </>
      )}
    </Panel>
  );
}

export default function Reportes() {
  const { avisar } = useDialogos();
  const [periodo, setPeriodo] = useState('30');
  const [exportando, setExportando] = useState(false);
  const { datos, error, cargando, recargar } = useApi('/reportes', paramsPeriodo(periodo));

  const exportar = async () => {
    setExportando(true);
    try {
      const r = await api.get('/reportes/ventas', { ...paramsPeriodo(periodo), limite: 5000 });
      descargarCsv(
        `ventas_${r.desde}_a_${r.hasta}.csv`,
        ['Folio', 'Fecha', 'Cliente', 'Tipo de cliente', 'Atendió', 'Productos', 'Total'],
        r.ventas.map((v) => [v.folio, v.fecha.replace('T', ' '), nombrePropio(v.cliente), v.tipoCliente === 'fisica' ? 'Física' : 'Moral', nombrePropio(v.empleado), v.productos, v.total.toFixed(2)]),
      );
      avisar(r.total > r.ventas.length ? `Se exportaron las ${numero(r.ventas.length)} ventas más recientes de ${numero(r.total)}` : `Se exportaron ${plural(r.ventas.length, 'venta', 'ventas')}`);
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setExportando(false);
    }
  };

  const r = datos?.resumen;
  const formatoSerie = etiquetaPeriodoSerie(datos?.serie.granularidad);
  // Horas con ventas (y una de margen a cada lado), para no dibujar la madrugada vacía.
  const horas = (() => {
    if (!datos) return [];
    const conVentas = datos.horas.filter((h) => h.ventas > 0).map((h) => h.hora);
    if (!conVentas.length) return [];
    const ini = Math.max(Math.min(...conVentas) - 1, 0);
    const fin = Math.min(Math.max(...conVentas) + 1, 23);
    return datos.horas.filter((h) => h.hora >= ini && h.hora <= fin);
  })();
  const horaPico = horas.reduce((m, h) => (h.ventas > (m?.ventas ?? -1) ? h : m), null);

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Reportes"
        descripcion={datos ? `Del ${fecha(datos.desde)} al ${fecha(datos.hasta)}.` : 'Cómo va el negocio en el periodo que elijas.'}
        acciones={<Boton icono={LuDownload} onClick={exportar} cargando={exportando}>Exportar ventas (CSV)</Boton>}
      />

      <div className="filtros">
        <Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={periodo} alCambiar={setPeriodo} />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <EsqueletoDashboard />}

      {datos && (
        <div className={`reportes ${cargando ? 'recargando' : ''}`}>
          <div className="cifras cifras--fila lujo-brillo">
            <Cifra principal etiqueta="Ingresos" numeroAnimado={r.ingresos} formato={monedaRedonda} variacion={r.variacionIngresos} detalle="contra el periodo anterior" />
            <Cifra etiqueta="Ventas" numeroAnimado={r.ventas} formato={numero} variacion={r.variacionVentas} />
            <Cifra etiqueta="Ticket promedio" numeroAnimado={r.ticketPromedio} formato={moneda} />
            <Cifra etiqueta="Margen estimado" numeroAnimado={r.margenEstimado} formato={monedaRedonda} detalle="con el costo actual" />
            <Cifra etiqueta="Gasto en compras" numeroAnimado={r.compras.gasto} formato={monedaRedonda} detalle={plural(r.compras.compras, 'compra', 'compras')} />
          </div>

          <PanelGrafica
            titulo={`Ingresos ${ETIQUETA_SERIE[datos.serie.granularidad]}`}
            descripcion={`${plural(r.ventas, 'venta', 'ventas')} en ${textoPeriodo(periodo)}`}
            columnas={[
              { clave: 'periodo', titulo: 'Periodo', render: (f) => formatoSerie(f.periodo) },
              { clave: 'ventas', titulo: 'Ventas', alinear: 'der', render: (f) => numero(f.ventas) },
              { clave: 'ingresos', titulo: 'Ingresos', alinear: 'der', render: (f) => moneda(f.ingresos) },
            ]}
            filas={datos.serie.puntos}
          >
            {r.ventas > 0 ? (
              <GraficaArea
                puntos={datos.serie.puntos}
                formatoX={formatoSerie}
                detalleTooltip={(p) => plural(p.ventas, 'venta', 'ventas')}
                etiqueta={`Ingresos ${ETIQUETA_SERIE[datos.serie.granularidad]}`}
                alto={260}
              />
            ) : <Vacio titulo={`No hay ventas en ${textoPeriodo(periodo)}`} />}
          </PanelGrafica>

          <div className="reportes__rejilla">
            <div className="reportes__columna">
              <PanelGrafica
                titulo="Ventas por hora del día"
                descripcion={horaPico && horaPico.ventas > 0 ? `La hora con más tickets es de ${horaPico.hora}:00 a ${horaPico.hora + 1}:00.` : 'Número de tickets según la hora.'}
                columnas={[
                  { clave: 'hora', titulo: 'Hora', render: (f) => `${f.hora}:00 a ${f.hora + 1}:00` },
                  { clave: 'ventas', titulo: 'Ventas', alinear: 'der', render: (f) => numero(f.ventas) },
                ]}
                filas={horas}
              >
                {horas.length ? (
                  <GraficaColumnas
                    datos={horas}
                    campoX="hora"
                    campoY="ventas"
                    formatoX={(h) => `${h}h`}
                    formatoValor={(v) => plural(v, 'venta', 'ventas')}
                    etiqueta="Ventas por hora del día"
                  />
                ) : <Vacio titulo="Sin ventas en este periodo" />}
              </PanelGrafica>

              <Panel titulo="Productos más vendidos" descripcion="Por importe vendido">
                {datos.masVendidos.length ? (
                  <BarrasRanking
                    datos={datos.masVendidos.map((p) => ({ ...p, nombre: capitalizar(p.descripcion) }))}
                    campoEtiqueta="nombre"
                    campoValor="importe"
                    formatoValor={monedaRedonda}
                    detalle={(p) => cantidad(p.cantidad, p.unidadMedida)}
                    etiqueta="Productos más vendidos"
                  />
                ) : <Vacio titulo="Sin ventas en este periodo" />}
              </Panel>
            </div>

            <div className="reportes__columna">
              <PanelGrafica
                titulo="Ingresos por categoría"
                descripcion="Qué parte de lo vendido es fruta y qué parte verdura."
                columnas={[
                  { clave: 'categoria', titulo: 'Categoría', render: (f) => capitalizar(f.categoria) },
                  { clave: 'ingresos', titulo: 'Ingresos', alinear: 'der', render: (f) => moneda(f.ingresos) },
                ]}
                filas={datos.categorias}
              >
                {datos.categorias.length ? (
                  <BarraSegmentada
                    partes={datos.categorias.map((c) => ({ nombre: capitalizar(c.categoria), valor: c.ingresos }))}
                    formatoValor={monedaRedonda}
                    etiqueta="Ingresos por categoría"
                  />
                ) : <Vacio titulo="Sin ventas en este periodo" />}
              </PanelGrafica>

              <Panel titulo="Ventas por empleado" descripcion="Tickets cobrados y su importe">
                {datos.empleados.length ? (
                  <BarrasRanking
                    datos={datos.empleados.map((e) => ({ ...e, nombre: nombrePropio(e.nombre) }))}
                    campoEtiqueta="nombre"
                    campoValor="monto"
                    formatoValor={monedaRedonda}
                    detalle={(e) => plural(e.ventas, 'venta', 'ventas')}
                    etiqueta="Ventas por empleado"
                  />
                ) : <Vacio titulo="Sin ventas en este periodo" />}
              </Panel>

              <Panel titulo="Mejores clientes" descripcion="Clientes registrados con más compras (sin público en general)">
                {datos.clientesFrecuentes.length ? (
                  <Tabla
                    etiqueta="Mejores clientes"
                    filas={datos.clientesFrecuentes}
                    columnas={[
                      { clave: 'nombre', titulo: 'Cliente', render: (c) => nombrePropio(c.nombre) },
                      { clave: 'tipo', titulo: 'Tipo', render: (c) => <Insignia tono="neutro" icono={false}>{c.tipo === 'fisica' ? 'Física' : 'Moral'}</Insignia> },
                      { clave: 'compras', titulo: 'Compras', alinear: 'der', render: (c) => <span className="numeros">{numero(c.compras)}</span> },
                      { clave: 'monto', titulo: 'Importe', alinear: 'der', render: (c) => <span className="numeros">{moneda(c.monto)}</span> },
                    ]}
                  />
                ) : <Vacio titulo="Ningún cliente registrado compró en este periodo" />}
              </Panel>

              <Panel titulo="Inventario bajo" descripcion={`Productos con ${numero(datos.stockBajo.umbral)} o menos en existencia, hoy`}>
                {datos.stockBajo.productos.length ? (
                  <Tabla
                    etiqueta="Inventario bajo"
                    clave="codigo"
                    filas={datos.stockBajo.productos}
                    columnas={[
                      { clave: 'descripcion', titulo: 'Producto', render: (p) => capitalizar(p.descripcion) },
                      {
                        clave: 'existencia', titulo: 'Existencia', alinear: 'der',
                        render: (p) => (p.existencia === 0
                          ? <Insignia tono="critico">Agotado</Insignia>
                          : <span className="numeros">{cantidad(p.existencia, p.unidadMedida)}</span>),
                      },
                      { clave: 'precioCompra', titulo: 'Costo', alinear: 'der', render: (p) => <span className="numeros">{moneda(p.precioCompra)}</span> },
                    ]}
                  />
                ) : <Vacio titulo="Todo el inventario está por encima del mínimo" />}
              </Panel>
            </div>
          </div>

          <VentasDetalladas periodo={periodo} />
        </div>
      )}
    </div>
  );
}
