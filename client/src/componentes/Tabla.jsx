// Tabla de datos con orden por columna (opcional) y filas que se pueden abrir.
import { useEffect, useMemo, useState } from 'react';
import { LuArrowDown, LuArrowUp } from 'react-icons/lu';
import { Paginacion } from './ui.jsx';

export function Tabla({
  columnas,
  filas,
  clave = 'id',
  alAbrir,
  vacio,
  cargando = false,
  ordenInicial = null,
  etiqueta,
  className = '',
  porPagina = null,
}) {
  const [orden, setOrden] = useState(ordenInicial);
  const [pagina, setPagina] = useState(1);

  // Si cambian los filtros (y con ellos cuántas filas hay), se regresa a la primera página.
  useEffect(() => setPagina(1), [filas.length]);

  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const columna = columnas.find((c) => c.clave === orden.clave);
    if (!columna) return filas;
    const valorDe = columna.valorOrden ?? ((f) => f[columna.clave]);
    return [...filas].sort((a, b) => {
      const va = valorDe(a);
      const vb = valorDe(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return orden.asc ? r : -r;
    });
  }, [filas, orden, columnas]);

  const visibles = porPagina ? ordenadas.slice((pagina - 1) * porPagina, pagina * porPagina) : ordenadas;

  const cambiarOrden = (clave) => {
    setOrden((o) => (o?.clave === clave ? { clave, asc: !o.asc } : { clave, asc: true }));
  };

  return (
    <div className={`tabla-contenedor ${cargando ? 'tabla-contenedor--recargando' : ''} ${className}`}>
      <table className="tabla" aria-label={etiqueta} aria-busy={cargando || undefined}>
        <thead>
          <tr>
            {columnas.map((c) => {
              const activa = orden?.clave === c.clave;
              return (
                <th
                  key={c.clave}
                  scope="col"
                  className={`tabla__th tabla__th--${c.alinear ?? 'izq'}`}
                  style={c.ancho ? { width: c.ancho } : undefined}
                  aria-sort={activa ? (orden.asc ? 'ascending' : 'descending') : undefined}
                >
                  {c.ordenable ? (
                    <button type="button" className="tabla__orden" onClick={() => cambiarOrden(c.clave)}>
                      {c.titulo}
                      {activa && (orden.asc ? <LuArrowUp aria-hidden="true" /> : <LuArrowDown aria-hidden="true" />)}
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibles.map((fila) => (
            <tr
              key={fila[clave]}
              className={alAbrir ? 'tabla__fila--abrible' : undefined}
              onClick={alAbrir ? (e) => {
                if (e.target.closest('button, a, input, select')) return;
                alAbrir(fila);
              } : undefined}
            >
              {columnas.map((c, i) => (
                <td key={c.clave} className={`tabla__td tabla__td--${c.alinear ?? 'izq'} ${c.className ?? ''}`}>
                  {i === 0 && alAbrir ? (
                    <button type="button" className="tabla__abrir" onClick={() => alAbrir(fila)}>
                      {c.render ? c.render(fila) : fila[c.clave]}
                    </button>
                  ) : c.render ? c.render(fila) : fila[c.clave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!cargando && filas.length === 0 && vacio}
      {porPagina && filas.length > porPagina && (
        <Paginacion pagina={pagina} limite={porPagina} total={filas.length} alCambiar={setPagina} />
      )}
    </div>
  );
}
