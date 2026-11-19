// Historial de compras a proveedores.
import { useEffect, useState } from 'react';
import { LuPackagePlus, LuTrash2, LuTruck } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { PERIODOS, paramsPeriodo, textoPeriodo } from '../componentes/periodo.js';
import { Tabla } from '../componentes/Tabla.jsx';
import {
  Boton, Buscador, CabeceraPagina, Cargando, Cifra, MensajeError, Paginacion, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { capitalizar, cantidad, fechaHora, moneda, monedaRedonda, nombrePropio, numero } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';
import { Link, useNavegar, useUbicacion } from '../router.jsx';

function DetalleCompra({ folio, alCerrar, alEliminar }) {
  const { puede } = useSesion();
  const { datos, error, cargando } = useApi(folio ? `/compras/${folio}` : null);
  return (
    <Modal
      abierto={Boolean(folio)}
      alCerrar={alCerrar}
      titulo={`Compra ${folio ?? ''}`}
      descripcion={datos ? `${nombrePropio(datos.proveedor.nombre)}, ${fechaHora(datos.fecha)}` : undefined}
      ancho="grande"
      pie={datos && (
        <>
          {puede('ELIMINAR_COMPRAS') && (
            <Boton variante="peligro-suave" icono={LuTrash2} onClick={() => alEliminar(datos)}>Eliminar compra</Boton>
          )}
          <Boton variante="primario" onClick={alCerrar}>Listo</Boton>
        </>
      )}
    >
      <MensajeError error={error} />
      {cargando && <Cargando />}
      {datos && !cargando && (
        <>
          <dl className="datos-en-linea">
            <div><dt>Proveedor</dt><dd>{nombrePropio(datos.proveedor.nombre)} ({capitalizar(datos.proveedor.ciudad)})</dd></div>
            <div><dt>Lote</dt><dd>{datos.lote ?? 'Sin número'}</dd></div>
            <div><dt>Recibió</dt><dd>{nombrePropio(datos.empleado.nombre) || '—'}</dd></div>
          </dl>
          <div className="tabla-contenedor tabla-contenedor--compacta">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col" className="tabla__th">Producto</th>
                  <th scope="col" className="tabla__th tabla__th--der">Cantidad</th>
                  <th scope="col" className="tabla__th tabla__th--der">Costo unitario</th>
                  <th scope="col" className="tabla__th tabla__th--der">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {datos.renglones.map((r) => (
                  <tr key={r.codigo}>
                    <td className="tabla__td">{capitalizar(r.descripcion)}</td>
                    <td className="tabla__td tabla__td--der numeros">{cantidad(r.cantidad, r.unidadMedida)}</td>
                    <td className="tabla__td tabla__td--der numeros">{moneda(r.precioUnitario)}</td>
                    <td className="tabla__td tabla__td--der numeros">{moneda(r.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="tabla__td" colSpan={3}><strong>Total</strong></td>
                  <td className="tabla__td tabla__td--der numeros"><strong>{moneda(datos.total)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function Compras() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { search } = useUbicacion();
  const navegar = useNavegar();

  const [periodo, setPeriodo] = useState('90');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const buscar = useRetardo(busqueda);
  const folioUrl = new URLSearchParams(search).get('folio');
  const [abierta, setAbierta] = useState(folioUrl ? Number(folioUrl) : null);

  useEffect(() => setPagina(1), [periodo, buscar]);
  useEffect(() => {
    if (folioUrl) setAbierta(Number(folioUrl));
  }, [folioUrl]);

  const { datos, error, cargando, recargar } = useApi('/compras', { ...paramsPeriodo(periodo), buscar, pagina, limite: 25 });

  const cerrarDetalle = () => {
    setAbierta(null);
    if (folioUrl) navegar('/compras', { reemplazar: true });
  };

  const eliminar = async (compra) => {
    const ok = await confirmar({
      titulo: `¿Eliminar la compra ${compra.folio}?`,
      mensaje: `Se resta del inventario lo que entró con esta compra (${moneda(compra.total)}). Si parte ya se vendió, no se podrá eliminar.`,
      accion: 'Eliminar compra',
      cancelar: 'No, conservarla',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/compras/${compra.folio}`);
      avisar(`Compra ${compra.folio} eliminada`);
      cerrarDetalle();
      recargar();
    } catch (err) {
      avisar(err.message, 'error');
    }
  };

  const resumen = datos?.resumen;

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Compras"
        descripcion="Mercancía recibida de los proveedores. Cada compra suma al inventario."
        acciones={puede('CREAR_COMPRAS') && (
          <Link to="/compras/nueva" className="boton boton--primario boton--normal">
            <LuPackagePlus className="boton__icono" aria-hidden="true" /> Registrar compra
          </Link>
        )}
      />

      <div className="filtros">
        <Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={periodo} alCambiar={setPeriodo} />
        <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar compra" placeholder="Folio, lote, proveedor o empleado" className="filtros__buscador" />
      </div>

      <MensajeError error={error} alReintentar={recargar} />

      {resumen && (
        <div className={`cifras cifras--fila lujo-brillo ${cargando ? 'recargando' : ''}`}>
          <Cifra principal etiqueta={`Gasto de ${textoPeriodo(periodo)}`} numeroAnimado={resumen.gasto} formato={monedaRedonda} />
          <Cifra etiqueta="Compras" numeroAnimado={resumen.compras} formato={numero} />
          <Cifra etiqueta="Promedio por compra" numeroAnimado={resumen.promedio} formato={moneda} />
          <Cifra etiqueta="Proveedores" numeroAnimado={resumen.proveedores} formato={numero} />
        </div>
      )}

      {cargando && !datos && <EsqueletoTabla />}
      {datos && (
        <section className="panel lujo-brillo" aria-label="Lista de compras">
          <Tabla
            etiqueta="Compras"
            clave="folio"
            cargando={cargando}
            filas={datos.compras}
            alAbrir={(c) => setAbierta(c.folio)}
            columnas={[
              { clave: 'folio', titulo: 'Folio', render: (c) => <span className="numeros codigo-mono">#{c.folio}</span>, ancho: '96px' },
              { clave: 'lote', titulo: 'Lote', render: (c) => <span className="numeros texto-2">{c.lote ?? '—'}</span> },
              { clave: 'fecha', titulo: 'Fecha', render: (c) => fechaHora(c.fecha) },
              { clave: 'proveedor', titulo: 'Proveedor', render: (c) => nombrePropio(c.proveedor) },
              { clave: 'empleado', titulo: 'Recibió', render: (c) => nombrePropio(c.empleado) || '—' },
              { clave: 'renglones', titulo: 'Productos', alinear: 'der', render: (c) => <span className="numeros">{c.renglones}</span> },
              { clave: 'total', titulo: 'Total', alinear: 'der', render: (c) => <strong className="numeros">{moneda(c.total)}</strong> },
            ]}
            vacio={
              <Vacio icono={LuTruck} titulo={buscar ? 'Ninguna compra coincide con la búsqueda' : `No hay compras en ${textoPeriodo(periodo)}`}>
                {buscar ? 'Prueba con el folio, el lote o el nombre del proveedor.' : 'Elige un periodo más amplio para ver compras anteriores.'}
              </Vacio>
            }
          />
          <Paginacion pagina={datos.pagina} limite={datos.limite} total={datos.total} alCambiar={setPagina} />
        </section>
      )}

      <DetalleCompra folio={abierta} alCerrar={cerrarDetalle} alEliminar={eliminar} />
    </div>
  );
}
