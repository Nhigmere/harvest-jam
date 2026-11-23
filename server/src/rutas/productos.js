// /api/productos
import { Router } from 'express';
import { config } from '../config.js';
import * as productos from '../dao/productos.js';
import { HttpError, noEncontrado } from '../errores.js';
import { requiere, ruta } from '../middleware.js';
import { PERMISOS as P } from '../permisos.js';
import { id, numero, opcion, texto } from '../validacion.js';

const router = Router();

export const UNIDADES = ['kilogramo', 'pieza', 'manojo', 'charola', 'ramito', 'litro', 'paquete'];
const FRACCIONABLES = ['kilogramo', 'litro'];

function validarProducto(cuerpo = {}) {
  const unidadMedida = opcion(cuerpo.unidadMedida, UNIDADES, { campo: 'unidadMedida', etiqueta: 'La unidad de medida', requerido: true });
  const existencia = numero(cuerpo.existencia ?? 0, { campo: 'existencia', etiqueta: 'La existencia', min: 0, max: 999_999 });
  if (!FRACCIONABLES.includes(unidadMedida) && !Number.isInteger(existencia)) {
    throw new HttpError(400, `La existencia debe ser entera cuando el producto se maneja por ${unidadMedida}.`, { campo: 'existencia' });
  }
  let proveedores;
  if (Array.isArray(cuerpo.proveedores)) {
    const mapa = new Map();
    for (const item of cuerpo.proveedores) {
      const esObjeto = item && typeof item === 'object';
      const idProv = id(esObjeto ? item.id : item, 'El proveedor');
      const diasEntrega = esObjeto
        ? numero(item.diasEntrega, { campo: 'diasEntrega', etiqueta: 'Los días de entrega', entero: true, min: 0, max: 30 })
        : null;
      mapa.set(idProv, { id: idProv, diasEntrega });
    }
    proveedores = [...mapa.values()];
  }

  return {
    descripcion: texto(cuerpo.descripcion, { campo: 'descripcion', etiqueta: 'La descripción', requerido: true, min: 3, max: 100 })?.toLowerCase(),
    categoria: texto(cuerpo.categoria, { campo: 'categoria', etiqueta: 'La categoría', requerido: true, min: 3, max: 50 })?.toLowerCase(),
    unidadMedida,
    existencia,
    precioCompra: numero(cuerpo.precioCompra ?? 0, { campo: 'precioCompra', etiqueta: 'El precio de compra', min: 0, max: 999_999.99 }),
    precioVenta: numero(cuerpo.precioVenta, { campo: 'precioVenta', etiqueta: 'El precio de venta', requerido: true, mayorQue: 0, max: 999_999.99 }),
    stockMinimo: numero(cuerpo.stockMinimo, { campo: 'stockMinimo', etiqueta: 'El stock mínimo', min: 0, max: 999_999 }),
    vidaUtilDias: numero(cuerpo.vidaUtilDias, { campo: 'vidaUtilDias', etiqueta: 'La vida útil (días)', entero: true, min: 1, max: 60 }),
    proveedores,
  };
}

router.get('/', requiere(P.VER_PRODUCTOS, P.CREAR_VENTAS, P.CREAR_COMPRAS), ruta(async (req, res) => {
  const estado = ['disponible', 'bajo', 'agotado'].includes(req.query.estado) ? req.query.estado : null;
  const idProveedor = req.query.proveedor ? id(req.query.proveedor, 'El proveedor') : null;
  const lista = await productos.listar(req.consultar, {
    buscar: req.query.buscar?.trim() || null,
    categoria: req.query.categoria?.trim().toLowerCase() || null,
    estado,
    umbral: config.umbralStockBajo,
    idProveedor,
  });
  res.json({ productos: lista, umbralStockBajo: config.umbralStockBajo, unidades: UNIDADES });
}));

router.get('/categorias', requiere(P.VER_PRODUCTOS), ruta(async (req, res) => {
  res.json({ categorias: await productos.categorias(req.consultar) });
}));

router.get('/:codigo', requiere(P.VER_PRODUCTOS), ruta(async (req, res) => {
  const codigo = id(req.params.codigo, 'El código');
  const conProveedores = req.sesion.permisos.includes(P.VER_PROVEEDORES);
  const producto = await productos.obtener(req.consultar, codigo, { conProveedores });
  if (!producto) throw noEncontrado('El producto');
  res.json(producto);
}));

router.post('/', requiere(P.EDITAR_PRODUCTOS), ruta(async (req, res) => {
  const datos = validarProducto(req.body);
  const codigo = await req.transaccion((q) => productos.crear(q, datos));
  res.status(201).json(await productos.obtener(req.consultar, codigo, { conProveedores: true }));
}));

router.put('/:codigo', requiere(P.EDITAR_PRODUCTOS), ruta(async (req, res) => {
  const codigo = id(req.params.codigo, 'El código');
  const datos = validarProducto(req.body);
  const ok = await req.transaccion((q) => productos.actualizar(q, codigo, datos));
  if (!ok) throw noEncontrado('El producto');
  res.json(await productos.obtener(req.consultar, codigo, { conProveedores: true }));
}));

router.delete('/:codigo', requiere(P.ELIMINAR_PRODUCTOS), ruta(async (req, res) => {
  const codigo = id(req.params.codigo, 'El código');
  const ok = await req.transaccion((q) => productos.eliminar(q, codigo));
  if (!ok) throw noEncontrado('El producto');
  res.status(204).end();
}));

export default router;
