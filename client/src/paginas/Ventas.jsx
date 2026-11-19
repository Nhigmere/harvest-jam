// Historial de ventas con su ticket.
import { useEffect, useState } from 'react';
import { LuBan, LuReceiptText, LuShoppingBasket } from 'react-icons/lu';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Modal, useDialogos } from '../componentes/dialogos.jsx';
import { EsqueletoTabla } from '../componentes/Efectos.jsx';
import { PERIODOS, paramsPeriodo, textoPeriodo } from '../componentes/periodo.js';
import { Tabla } from '../componentes/Tabla.jsx';
import { AccionesTicket, Ticket } from '../componentes/Ticket.jsx';
import {
  Boton, Buscador, CabeceraPagina, Cargando, Cifra, MensajeError, Paginacion, Segmentado, Vacio,
} from '../componentes/ui.jsx';
import { fechaHora, moneda, monedaRedonda, nombrePropio, numero } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';
import { Link, useNavegar, useUbicacion } from '../router.jsx';

function DetalleVenta({ folio, alCerrar, alCancelar }) {
  const { puede } = useSesion();
  const { datos, error, cargando } = useApi(folio ? `/ventas/${folio}` : null);
  return (
    <Modal
      abierto={Boolean(folio)}
      alCerrar={alCerrar}
      titulo={`Venta ${folio ?? ''}`}
      ancho="ticket"
      pie={datos && (
        <>
          {puede('ELIMINAR_VENTAS') && (
            <Boton variante="peligro-suave" icono={LuBan} onClick={() => alCancelar(datos)}>Cancelar venta</Boton>
          )}
          <AccionesTicket venta={datos} />
        </>
      )}
    >
      <MensajeError error={error} />
      {cargando && <Cargando />}
      {datos && !cargando && <Ticket venta={datos} />}
    </Modal>
  );
}

export default function Ventas() {
  const { puede } = useSesion();
  const { avisar, confirmar } = useDialogos();
  const { search } = useUbicacion();
  const navegar = useNavegar();

  const [periodo, setPeriodo] = useState('30');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const buscar = useRetardo(busqueda);
  const folioUrl = new URLSearchParams(search).get('folio');
  const [abierta, setAbierta] = useState(folioUrl ? Number(folioUrl) : null);

  useEffect(() => setPagina(1), [periodo, buscar]);
  useEffect(() => {
    if (folioUrl) setAbierta(Number(folioUrl));
  }, [folioUrl]);

  const { datos, error, cargando, recargar } = useApi('/ventas', { ...paramsPeriodo(periodo), buscar, pagina, limite: 25 });

  const cerrarDetalle = () => {
    setAbierta(null);
    if (folioUrl) navegar('/ventas', { reemplazar: true });
  };

  const cancelar = async (venta) => {
    const ok = await confirmar({
      titulo: `¿Cancelar la venta ${venta.folio}?`,
      mensaje: `Se borra el ticket de ${moneda(venta.total)} y los productos regresan al inventario. Queda registrado en la auditoría.`,
      accion: 'Cancelar venta',
      cancelar: 'No, conservarla',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.borrar(`/ventas/${venta.folio}`);
      avisar(`Venta ${venta.folio} cancelada; el stock se devolvió`);
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
        titulo="Ventas"
        descripcion="Tickets registrados, con su detalle para imprimir o enviar."
        acciones={puede('CREAR_VENTAS') && (
          <Link to="/vender" className="boton boton--primario boton--normal">
            <LuShoppingBasket className="boton__icono" aria-hidden="true" /> Vender
          </Link>
        )}
      />

      <div className="filtros">
        <Segmentado etiqueta="Periodo" opciones={PERIODOS} valor={periodo} alCambiar={setPeriodo} />
        <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar venta" placeholder="Folio, cliente o empleado" className="filtros__buscador" />
      </div>

      <MensajeError error={error} alReintentar={recargar} />

      {resumen && (
        <div className={`cifras cifras--fila lujo-brillo ${cargando ? 'recargando' : ''}`}>
          <Cifra principal etiqueta={`Ingresos de ${textoPeriodo(periodo)}`} numeroAnimado={resumen.ingresos} formato={monedaRedonda} />
          <Cifra etiqueta="Ventas" numeroAnimado={resumen.ventas} formato={numero} />
          <Cifra etiqueta="Ticket promedio" numeroAnimado={resumen.ticketPromedio} formato={moneda} />
          <Cifra etiqueta="Clientes distintos" numeroAnimado={resumen.clientes} formato={numero} />
        </div>
      )}

      {cargando && !datos && <EsqueletoTabla />}
      {datos && (
        <section className="panel lujo-brillo" aria-label="Lista de ventas">
          <Tabla
            etiqueta="Ventas"
            clave="folio"
            cargando={cargando}
            filas={datos.ventas}
            alAbrir={(v) => setAbierta(v.folio)}
            columnas={[
              { clave: 'folio', titulo: 'Folio', render: (v) => <span className="numeros codigo-mono">#{v.folio}</span>, ancho: '96px' },
              { clave: 'fecha', titulo: 'Fecha', render: (v) => fechaHora(v.fecha) },
              { clave: 'cliente', titulo: 'Cliente', render: (v) => nombrePropio(v.cliente) },
              { clave: 'empleado', titulo: 'Atendió', render: (v) => nombrePropio(v.empleado) },
              { clave: 'renglones', titulo: 'Productos', alinear: 'der', render: (v) => <span className="numeros">{v.renglones}</span> },
              { clave: 'total', titulo: 'Total', alinear: 'der', render: (v) => <strong className="numeros">{moneda(v.total)}</strong> },
            ]}
            vacio={
              <Vacio icono={LuReceiptText} titulo={buscar ? 'Ninguna venta coincide con la búsqueda' : `No hay ventas en ${textoPeriodo(periodo)}`}>
                {buscar ? 'Prueba con el folio o con otro nombre.' : 'Elige un periodo más amplio para ver ventas anteriores.'}
              </Vacio>
            }
          />
          <Paginacion pagina={datos.pagina} limite={datos.limite} total={datos.total} alCambiar={setPagina} />
        </section>
      )}

      <DetalleVenta folio={abierta} alCerrar={cerrarDetalle} alCancelar={cancelar} />
    </div>
  );
}
