// Bitácora de auditoría: la llenan los triggers de la base de datos.
import { useEffect, useState } from 'react';
import { LuScrollText } from 'react-icons/lu';
import { Tabla } from '../componentes/Tabla.jsx';
import { Buscador, CabeceraPagina, Cargando, MensajeError, Paginacion, Panel, Segmentado, Vacio } from '../componentes/ui.jsx';
import { capitalizar, fechaHora, nombrePropio } from '../formato.js';
import { useApi, useRetardo } from '../hooks.js';

const TABLAS = [
  { valor: 'todas', etiqueta: 'Todo' },
  { valor: 'ventas', etiqueta: 'Ventas' },
  { valor: 'compras', etiqueta: 'Compras' },
  { valor: 'productos', etiqueta: 'Productos' },
  { valor: 'clientes', etiqueta: 'Clientes' },
  { valor: 'proveedores', etiqueta: 'Proveedores' },
  { valor: 'empleados', etiqueta: 'Empleados' },
];

const OPERACIONES = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' };

const NOMBRE_TABLA = {
  producto: 'Productos',
  venta: 'Ventas',
  detalle_venta: 'Ventas (renglón)',
  compra: 'Compras',
  detalle_compra: 'Compras (renglón)',
  cliente: 'Clientes',
  p_fisica: 'Clientes',
  p_moral: 'Clientes',
  empleado: 'Empleados',
  proveedor: 'Proveedores',
};

export default function Auditoria() {
  const [tabla, setTabla] = useState('todas');
  const [operacion, setOperacion] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const buscar = useRetardo(busqueda);

  useEffect(() => setPagina(1), [tabla, operacion, buscar]);

  const { datos, error, cargando, recargar } = useApi('/auditoria', {
    tabla: tabla === 'todas' ? null : tabla,
    operacion: operacion === 'todas' ? null : operacion,
    buscar,
    pagina,
    limite: 50,
  });
  const r = datos?.resumen;

  return (
    <div className="pagina">
      <CabeceraPagina
        titulo="Auditoría"
        descripcion="Cada alta, cambio y baja queda registrada por la base de datos, con quién la hizo y cuándo."
      />

      <div className="filtros filtros--columna">
        <div className="filtros__fila">
          <Segmentado etiqueta="Qué se modificó" opciones={TABLAS} valor={tabla} alCambiar={setTabla} />
          <Buscador valor={busqueda} alCambiar={setBusqueda} etiqueta="Buscar en la bitácora" placeholder="Descripción o usuario" className="filtros__buscador" />
        </div>
        <Segmentado
          etiqueta="Tipo de movimiento"
          valor={operacion}
          alCambiar={setOperacion}
          opciones={[
            { valor: 'todas', etiqueta: 'Todos', conteo: r?.total },
            { valor: 'INSERT', etiqueta: 'Altas', conteo: r?.inserciones },
            { valor: 'UPDATE', etiqueta: 'Cambios', conteo: r?.actualizaciones },
            { valor: 'DELETE', etiqueta: 'Bajas', conteo: r?.eliminaciones },
          ]}
        />
      </div>

      <MensajeError error={error} alReintentar={recargar} />
      {cargando && !datos && <Cargando />}

      {datos && (
        <Panel>
          <Tabla
            etiqueta="Bitácora de auditoría"
            cargando={cargando}
            filas={datos.registros}
            columnas={[
              { clave: 'fechaHora', titulo: 'Cuándo', render: (a) => <span className="sin-salto">{fechaHora(a.fechaHora)}</span>, ancho: '170px' },
              { clave: 'usuario', titulo: 'Quién', className: 'sin-salto', render: (a) => nombrePropio(a.usuario) },
              { clave: 'tabla', titulo: 'Dónde', className: 'sin-salto', render: (a) => NOMBRE_TABLA[a.tabla] ?? a.tabla },
              {
                clave: 'operacion', titulo: 'Movimiento',
                render: (a) => <span className={`movimiento movimiento--${a.operacion.toLowerCase()}`}>{OPERACIONES[a.operacion]}</span>,
              },
              { clave: 'descripcion', titulo: 'Detalle', className: 'tabla__td--texto-largo', render: (a) => capitalizar(a.descripcion) },
            ]}
            vacio={<Vacio icono={LuScrollText} titulo="No hay movimientos con estos filtros" />}
          />
          <Paginacion pagina={datos.pagina} limite={datos.limite} total={datos.total} alCambiar={setPagina} />
        </Panel>
      )}
    </div>
  );
}
