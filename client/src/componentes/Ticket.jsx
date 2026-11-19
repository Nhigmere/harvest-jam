// Ticket de venta: se ve en pantalla, se imprime y se manda por WhatsApp.
import { LuMessageCircle, LuPrinter } from 'react-icons/lu';
import { useSesion } from '../auth.jsx';
import { abreviaturaUnidad, capitalizar, fechaHora, moneda, nombrePropio, telefonoWhatsApp } from '../formato.js';
import { Boton } from './ui.jsx';

const decimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 });

export function mensajeWhatsApp(venta, empresa) {
  const lineas = venta.renglones.map(
    (r) => `${decimal.format(r.cantidad)} ${abreviaturaUnidad(r.unidadMedida, r.cantidad)} ${capitalizar(r.descripcion)}: ${moneda(r.subtotal)}`,
  );
  return [
    `*${empresa.nombre}*`,
    `Ticket ${venta.folio}, ${fechaHora(venta.fecha)}`,
    '',
    ...lineas,
    '',
    `*Total: ${moneda(venta.total)}*`,
    empresa.mensajeTicket,
  ].join('\n');
}

export function Ticket({ venta }) {
  const { usuario } = useSesion();
  const empresa = usuario.empresa;
  const esMostrador = venta.cliente?.rfc === 'XAXX010101000';

  return (
    <article className="ticket" aria-label={`Ticket de la venta ${venta.folio}`}>
      <header className="ticket__cabecera">
        <img src="/logo.png" alt="" width="40" height="40" />
        <p className="ticket__empresa">{empresa.nombre}</p>
        <p>{empresa.subtitulo}</p>
        {empresa.direccion && <p>{empresa.direccion}</p>}
        {empresa.telefono && <p>Tel. {empresa.telefono}</p>}
      </header>

      <dl className="ticket__datos">
        <div><dt>Folio</dt><dd>{venta.folio}</dd></div>
        <div><dt>Fecha</dt><dd>{fechaHora(venta.fecha)}</dd></div>
        <div><dt>Cliente</dt><dd>{esMostrador ? 'Público en general' : nombrePropio(venta.cliente?.nombre)}</dd></div>
        <div><dt>Atendió</dt><dd>{nombrePropio(venta.empleado?.nombre)}</dd></div>
      </dl>

      <table className="ticket__renglones">
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col" className="ticket__num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {venta.renglones.map((r) => (
            <tr key={r.codigo}>
              <td>
                {capitalizar(r.descripcion)}
                <span className="ticket__detalle">
                  {decimal.format(r.cantidad)} {abreviaturaUnidad(r.unidadMedida, r.cantidad)} × {moneda(r.precioUnitario)}
                </span>
              </td>
              <td className="ticket__num">{moneda(r.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="ticket__total">
        <span>Total</span>
        <span>{moneda(venta.total)}</span>
      </p>
      <p className="ticket__gracias">{empresa.mensajeTicket}</p>
    </article>
  );
}

export function AccionesTicket({ venta }) {
  const { usuario } = useSesion();
  const telefono = telefonoWhatsApp(venta.cliente?.telefono);
  const enlace = telefono
    ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensajeWhatsApp(venta, usuario.empresa))}`
    : null;
  return (
    <>
      {enlace ? (
        <a className="boton boton--secundario boton--normal" href={enlace} target="_blank" rel="noreferrer">
          <LuMessageCircle aria-hidden="true" className="boton__icono" />
          Enviar por WhatsApp
        </a>
      ) : (
        <span className="texto-3 ticket-sin-telefono">Sin teléfono para WhatsApp</span>
      )}
      <Boton icono={LuPrinter} onClick={() => window.print()}>Imprimir</Boton>
    </>
  );
}
