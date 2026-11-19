// Errores HTTP y traducción de errores de PostgreSQL a mensajes claros.

export class HttpError extends Error {
  constructor(status, mensaje, extra = {}) {
    super(mensaje);
    this.status = status;
    this.extra = extra;
  }
}

export const noEncontrado = (que) => new HttpError(404, `${que} no existe o fue eliminado`);

// Mensajes para las llaves foráneas, según la restricción que falló.
// "borrar" es cuando se intenta eliminar algo que otros registros usan;
// "insertar" es cuando se manda un id que no existe.
const LLAVES_FORANEAS = {
  venta_id_c_fkey: {
    borrar: 'No se puede eliminar el cliente porque tiene ventas registradas.',
    insertar: 'El cliente seleccionado no existe.',
  },
  venta_id_e_fkey: {
    borrar: 'No se puede eliminar el empleado porque tiene ventas registradas.',
    insertar: 'El empleado seleccionado no existe.',
  },
  compra_id_e_fkey: {
    borrar: 'No se puede eliminar el empleado porque tiene compras registradas.',
    insertar: 'El empleado seleccionado no existe.',
  },
  compra_id_p_fkey: {
    borrar: 'No se puede eliminar el proveedor porque tiene compras registradas.',
    insertar: 'El proveedor seleccionado no existe.',
  },
  detalle_venta_codigo_fkey: {
    borrar: 'No se puede eliminar el producto porque aparece en ventas. Si ya no se vende, deja su existencia en 0.',
    insertar: 'Uno de los productos no existe.',
  },
  detalle_compra_codigo_fkey: {
    borrar: 'No se puede eliminar el producto porque aparece en compras. Si ya no se vende, deja su existencia en 0.',
    insertar: 'Uno de los productos no existe.',
  },
  producto_proveedor_id_p_fkey: { insertar: 'Uno de los proveedores seleccionados no existe.' },
  producto_proveedor_codigo_fkey: { insertar: 'El producto no existe.' },
  supervisor_id_s_fkey: { insertar: 'El supervisor seleccionado no existe.' },
};

const COLUMNAS_LEGIBLES = {
  descripcion: 'la descripción',
  precio_v: 'el precio de venta',
  precio_c: 'el precio de compra',
  existencia: 'la existencia',
  nombre: 'el nombre',
  razon_social: 'la razón social',
  ciudad: 'la ciudad',
  turno: 'el turno',
  salario: 'el salario',
  cantidad: 'la cantidad',
  id_p: 'el proveedor',
  codigo: 'el producto',
};

// Nombre de la restricción que falló. pg lo trae en err.constraint; si no,
// se lee del mensaje (también funciona con PostgreSQL configurado en español).
const restriccionDe = (err) =>
  err.constraint ?? /(?:constraint|foránea|restricción de unicidad|restricción)\s*[«"]([^»"]+)[»"]/i.exec(err.message ?? '')?.[1];

export function traducirErrorPg(err) {
  if (!err || typeof err.code !== 'string') return null;

  switch (err.code) {
    case '23503': {
      const casos = LLAVES_FORANEAS[restriccionDe(err)] ?? {};
      const esBorrado = /still referenced|todavía|aún|update or delete|update o delete/i.test(`${err.detail ?? ''} ${err.message ?? ''}`);
      const mensaje = esBorrado
        ? casos.borrar ?? 'No se puede eliminar porque otros registros dependen de este.'
        : casos.insertar ?? 'Uno de los datos relacionados no existe.';
      return new HttpError(409, mensaje);
    }
    case '23505': {
      if (restriccionDe(err) === 'empleado_usuario_key') {
        return new HttpError(409, 'Ese usuario de PostgreSQL ya está ligado a otro empleado.', { campo: 'usuario' });
      }
      return new HttpError(409, 'Ya existe un registro con esos datos.');
    }
    case '23514':
      return new HttpError(400, `Un valor no cumple las reglas de la base de datos (${err.constraint ?? 'restricción'}).`);
    case '23502': {
      const columna = COLUMNAS_LEGIBLES[err.column] ?? err.column ?? 'un dato';
      return new HttpError(400, `Falta ${columna}.`);
    }
    case '22P02':
    case '22003':
    case '22007':
    case '22008':
      return new HttpError(400, 'Uno de los datos no tiene un formato válido.');
    case 'P0001':
      // Reglas del negocio que validan los triggers (stock, compras ya vendidas...).
      return new HttpError(409, err.message);
    case '42501':
      return new HttpError(403, 'Tu rol no tiene permiso en la base de datos para hacer esto.');
    case '28P01':
    case '28000':
      return new HttpError(401, 'Usuario o contraseña incorrectos.');
    case '3D000':
      return new HttpError(503, 'No existe la base de datos configurada. Revisa PGDATABASE en el archivo .env.');
    case '57P01':
    case '57P03':
    case '08001':
    case '08006':
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
    case 'ETIMEDOUT':
      return new HttpError(503, 'No hay conexión con la base de datos. Verifica que PostgreSQL esté encendido.');
    default:
      return null;
  }
}

// Middleware final de Express: convierte cualquier error en JSON.
// eslint-disable-next-line no-unused-vars
export function manejadorErrores(err, req, res, next) {
  const http = err instanceof HttpError ? err : traducirErrorPg(err);

  if (http) {
    return res.status(http.status).json({ error: http.message, ...http.extra });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido.' });
  }

  console.error('[error no controlado]', err);
  return res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
}
