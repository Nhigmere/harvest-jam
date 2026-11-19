-- =====================================================================
-- HARVEST JAM · 02_funciones.sql — Funciones del negocio
-- Usuario para la auditoría, cálculos (totales, ganancia, stock),
-- reportes y registro de ventas, compras y clientes (todo o nada).
-- Ejecutar después de 01_tablas.sql. Se puede volver a correr: usa
-- CREATE OR REPLACE.
--
-- Se conservan los nombres de las funciones originales. Cambios clave:
--   * La auditoría registra quién hizo cada cambio (app.usuario o el
--     usuario de PostgreSQL).
--   * registrar_venta_completa y registrar_compra_completa guardan todo o
--     nada: si un renglón falla, no queda una venta a medias.
--   * Productos más vendidos y clientes frecuentes aceptan un rango de
--     fechas opcional.
-- =====================================================================

set search_path to fruteria, public;

-- ---------------------------------------------------------------------
-- 1. Usuario que aparece en la auditoría
-- ---------------------------------------------------------------------

-- La API manda el nombre del empleado con set_config('app.usuario', ...).
-- Si no viene, se usa el usuario de PostgreSQL que inició la sesión.
create or replace function obtener_usuario_actual() returns varchar
language sql stable as
$$
    select coalesce(nullif(current_setting('app.usuario', true), ''), session_user)::varchar;
$$;

alter table auditoria alter column usuario set default obtener_usuario_actual();

-- Única puerta para escribir en la bitácora. Solo la usan los triggers.
create or replace function registrar_auditoria(p_tabla varchar, p_operacion varchar, p_descripcion text)
returns void
language sql security definer set search_path = fruteria, public as
$$
    insert into auditoria (tabla, operacion, descripcion)
    values (p_tabla, p_operacion, p_descripcion);
$$;

revoke all on function registrar_auditoria(varchar, varchar, text) from public;

-- Unidades que se pueden vender en fracciones (1.5 kg). El resto va en enteros.
create or replace function es_unidad_fraccionable(p_unidad varchar) returns boolean
language sql immutable as
$$
    select lower(coalesce(p_unidad, '')) in ('kilogramo', 'kg', 'gramo', 'litro');
$$;

-- Texto legible para una cantidad: '1.5 kg', '2 piezas', '1 manojo'.
create or replace function describir_cantidad(p_cantidad numeric, p_unidad varchar) returns text
language sql immutable as
$$
    select trim_scale(p_cantidad)::text || ' ' ||
           case
               when lower(p_unidad) in ('kilogramo', 'kg') then 'kg'
               when p_cantidad = 1 then lower(p_unidad)
               else lower(p_unidad) || 's'
           end;
$$;

-- ---------------------------------------------------------------------
-- 2. Funciones de cálculo
-- ---------------------------------------------------------------------

-- Total de una venta con el precio que tenía cada producto al venderse.
create or replace function calcular_total_venta(folio_venta_parametro integer) returns numeric
language sql stable as
$$
    select coalesce(round(sum(dv.cantidad * coalesce(dv.precio_unitario, p.precio_v)), 2), 0)
    from detalle_venta dv
    join producto p on p.codigo = dv.codigo
    where dv.folio_v = folio_venta_parametro;
$$;

-- Total de una compra con el costo registrado en cada renglón.
create or replace function calcular_total_compra(folio_compra_parametro integer) returns numeric
language sql stable as
$$
    select coalesce(round(sum(dc.cantidad * coalesce(dc.precio_unitario, p.precio_c)), 2), 0)
    from detalle_compra dc
    join producto p on p.codigo = dc.codigo
    where dc.folio_c = folio_compra_parametro;
$$;

-- ¿Alcanza la existencia para vender esa cantidad?
create or replace function verificar_disponibilidad_stock(codigo_producto_parametro integer,
                                                          cantidad_requerida_parametro numeric)
returns boolean
language sql stable as
$$
    select coalesce((select existencia >= cantidad_requerida_parametro
                     from producto where codigo = codigo_producto_parametro), false);
$$;

-- Ganancia por unidad (precio de venta menos precio de compra).
create or replace function calcular_ganancia_por_producto(codigo_producto_parametro integer)
returns numeric
language sql stable as
$$
    select coalesce((select precio_v - precio_c from producto
                     where codigo = codigo_producto_parametro), 0);
$$;

-- ---------------------------------------------------------------------
-- 3. Funciones de reporte
-- ---------------------------------------------------------------------

-- Productos con existencia igual o menor al umbral.
create or replace function obtener_productos_con_stock_bajo(umbral_minimo numeric)
returns table (
    codigo_producto_resultado     integer,
    nombre_producto_resultado     varchar,
    existencia_producto_resultado numeric,
    unidad_medida_resultado       varchar,
    precio_compra_resultado       numeric
)
language sql stable as
$$
    select codigo, descripcion, existencia, unidad_medida, precio_c
    from producto
    where existencia <= umbral_minimo
    order by existencia asc, descripcion;
$$;

-- Productos más vendidos, opcionalmente en un rango de fechas.
create or replace function obtener_productos_mas_vendidos(limite_registros integer,
                                                          fecha_inicio date default null,
                                                          fecha_fin date default null)
returns table (
    codigo_producto_resultado integer,
    nombre_producto_resultado varchar,
    unidad_medida_resultado   varchar,
    total_unidades_vendidas   numeric,
    importe_total             numeric
)
language sql stable as
$$
    select p.codigo, p.descripcion, p.unidad_medida,
           sum(dv.cantidad),
           round(sum(dv.cantidad * coalesce(dv.precio_unitario, p.precio_v)), 2)
    from detalle_venta dv
    join venta v    on v.folio_v = dv.folio_v
    join producto p on p.codigo = dv.codigo
    where (fecha_inicio is null or v.fecha >= fecha_inicio)
      and (fecha_fin is null or v.fecha < fecha_fin + 1)
    group by p.codigo, p.descripcion, p.unidad_medida
    order by 5 desc, 4 desc
    limit limite_registros;
$$;

-- Número de ventas y monto vendido por empleado en un rango de fechas.
create or replace function obtener_ventas_por_empleado(fecha_inicio_rango date, fecha_fin_rango date)
returns table (
    id_empleado_resultado     integer,
    nombre_empleado_resultado varchar,
    cantidad_total_ventas     bigint,
    monto_total_ventas        numeric
)
language sql stable as
$$
    with totales as (
        select v.folio_v, v.id_e, calcular_total_venta(v.folio_v) as total
        from venta v
        where v.fecha >= fecha_inicio_rango
          and v.fecha < fecha_fin_rango + 1
    )
    select e.id_e, e.nombre, count(t.folio_v), coalesce(sum(t.total), 0)
    from totales t
    join empleado e on e.id_e = t.id_e
    group by e.id_e, e.nombre
    order by 4 desc;
$$;

-- Mejores clientes (físicos y morales). Excluye "público en general".
create or replace function obtener_clientes_frecuentes(limite_registros integer,
                                                       fecha_inicio date default null,
                                                       fecha_fin date default null)
returns table (
    id_cliente_resultado     integer,
    nombre_cliente_resultado varchar,
    tipo_cliente_resultado   varchar,
    total_compras_realizadas bigint,
    monto_total              numeric
)
language sql stable as
$$
    select c.id_c,
           coalesce(pf.nombre, pm.razon_social, 'sin nombre')::varchar,
           (case when pf.id_c is not null then 'fisica' else 'moral' end)::varchar,
           count(v.folio_v),
           coalesce(sum(calcular_total_venta(v.folio_v)), 0)
    from cliente c
    left join p_fisica pf on pf.id_c = c.id_c
    left join p_moral pm  on pm.id_c = c.id_c
    join venta v          on v.id_c = c.id_c
    where coalesce(c.rfc, '') <> 'XAXX010101000'
      and (fecha_inicio is null or v.fecha >= fecha_inicio)
      and (fecha_fin is null or v.fecha < fecha_fin + 1)
    group by c.id_c, pf.nombre, pm.razon_social, pf.id_c
    order by 4 desc, 5 desc
    limit limite_registros;
$$;

-- Una venta con todos sus renglones (para el ticket).
create or replace function obtener_venta_con_detalles(folio_venta_parametro integer)
returns table (
    folio_venta          integer,
    fecha_venta          timestamp,
    id_cliente           integer,
    nombre_cliente       varchar,
    telefono_cliente     varchar,
    rfc_cliente          varchar,
    id_empleado          integer,
    nombre_empleado      varchar,
    codigo_producto      integer,
    descripcion_producto varchar,
    unidad_medida        varchar,
    cantidad_producto    numeric,
    precio_unitario      numeric,
    subtotal_producto    numeric
)
language sql stable as
$$
    select v.folio_v, v.fecha, v.id_c,
           coalesce(pf.nombre, pm.razon_social)::varchar,
           c.telefono, c.rfc, v.id_e, e.nombre,
           dv.codigo, p.descripcion, p.unidad_medida, dv.cantidad,
           coalesce(dv.precio_unitario, p.precio_v),
           round(dv.cantidad * coalesce(dv.precio_unitario, p.precio_v), 2)
    from venta v
    left join cliente c        on c.id_c = v.id_c
    left join p_fisica pf      on pf.id_c = c.id_c
    left join p_moral pm       on pm.id_c = c.id_c
    left join empleado e       on e.id_e = v.id_e
    left join detalle_venta dv on dv.folio_v = v.folio_v
    left join producto p       on p.codigo = dv.codigo
    where v.folio_v = folio_venta_parametro
    order by p.descripcion;
$$;

-- ---------------------------------------------------------------------
-- 4. Registro de ventas, compras y clientes (todo o nada)
-- ---------------------------------------------------------------------

-- detalles: [{"codigo": 5000, "cantidad": 1.5}, ...]
-- Si un producto viene repetido se suman sus cantidades.
create or replace function registrar_venta_completa(id_cliente_parametro integer,
                                                    id_empleado_parametro integer,
                                                    detalles json)
returns integer
language plpgsql as
$$
declare
    nuevo_folio integer;
begin
    if detalles is null or json_typeof(detalles) <> 'array' or json_array_length(detalles) = 0 then
        raise exception 'La venta debe tener al menos un producto';
    end if;

    insert into venta (id_c, id_e)
    values (id_cliente_parametro, id_empleado_parametro)
    returning folio_v into nuevo_folio;

    -- Cada renglón dispara procesar_stock_por_venta: valida stock,
    -- fija el precio y descuenta la existencia.
    insert into detalle_venta (folio_v, codigo, cantidad, observaciones)
    select nuevo_folio,
           (d ->> 'codigo')::integer,
           sum((d ->> 'cantidad')::numeric),
           max(d ->> 'observaciones')
    from json_array_elements(detalles) d
    group by (d ->> 'codigo')::integer
    order by 2;

    return nuevo_folio;
end;
$$;

-- detalles: [{"codigo": 5000, "cantidad": 20, "precio_unitario": 40.5}, ...]
-- precio_unitario es opcional; si falta se usa el precio de compra del producto.
create or replace function registrar_compra_completa(id_proveedor_parametro integer,
                                                     id_empleado_parametro integer,
                                                     detalles json,
                                                     no_lote_parametro integer default null)
returns integer
language plpgsql as
$$
declare
    nuevo_folio integer;
begin
    if detalles is null or json_typeof(detalles) <> 'array' or json_array_length(detalles) = 0 then
        raise exception 'La compra debe tener al menos un producto';
    end if;

    insert into compra (id_p, id_e, no_lote)
    values (id_proveedor_parametro, id_empleado_parametro, no_lote_parametro)
    returning folio_c into nuevo_folio;

    insert into detalle_compra (folio_c, codigo, cantidad, precio_unitario)
    select nuevo_folio,
           (d ->> 'codigo')::integer,
           sum((d ->> 'cantidad')::numeric),
           max((d ->> 'precio_unitario')::numeric)
    from json_array_elements(detalles) d
    group by (d ->> 'codigo')::integer
    order by 2;

    return nuevo_folio;
end;
$$;

-- Normaliza 'Física', 'fisica', 'MORAL'... a 'fisica' o 'moral'.
create or replace function normalizar_tipo_cliente(p_tipo varchar) returns varchar
language plpgsql immutable as
$$
declare
    t varchar := translate(lower(trim(coalesce(p_tipo, ''))), 'áéíóú', 'aeiou');
begin
    if t in ('fisica', 'persona fisica') then
        return 'fisica';
    elsif t in ('moral', 'persona moral') then
        return 'moral';
    end if;
    raise exception 'Tipo de cliente no válido: "%" (usa física o moral)', p_tipo;
end;
$$;

-- Registra un cliente y su tipo. nombre_parametro es el nombre de la
-- persona física o la razón social de la persona moral.
create or replace function registrar_cliente(tipo_cliente_parametro varchar,
                                             nombre_parametro varchar,
                                             telefono_parametro varchar,
                                             rfc_parametro varchar,
                                             domicilio_parametro varchar)
returns integer
language plpgsql as
$$
declare
    tipo varchar := normalizar_tipo_cliente(tipo_cliente_parametro);
    nuevo_id integer;
begin
    insert into cliente (telefono, rfc, domicilio)
    values (telefono_parametro, rfc_parametro, domicilio_parametro)
    returning id_c into nuevo_id;

    if tipo = 'fisica' then
        insert into p_fisica (id_c, nombre) values (nuevo_id, nombre_parametro);
    else
        insert into p_moral (id_c, razon_social) values (nuevo_id, nombre_parametro);
    end if;

    return nuevo_id;
end;
$$;

-- Actualiza un cliente; si cambia de tipo lo mueve de tabla.
create or replace function actualizar_cliente(id_cliente_parametro integer,
                                              tipo_cliente_parametro varchar,
                                              nombre_parametro varchar,
                                              telefono_parametro varchar,
                                              rfc_parametro varchar,
                                              domicilio_parametro varchar)
returns boolean
language plpgsql as
$$
declare
    tipo varchar := normalizar_tipo_cliente(tipo_cliente_parametro);
begin
    update cliente
    set telefono = telefono_parametro,
        rfc = rfc_parametro,
        domicilio = domicilio_parametro
    where id_c = id_cliente_parametro;

    if not found then
        return false;
    end if;

    if tipo = 'fisica' then
        delete from p_moral where id_c = id_cliente_parametro;
        insert into p_fisica (id_c, nombre) values (id_cliente_parametro, nombre_parametro)
        on conflict (id_c) do update set nombre = excluded.nombre;
    else
        delete from p_fisica where id_c = id_cliente_parametro;
        insert into p_moral (id_c, razon_social) values (id_cliente_parametro, nombre_parametro)
        on conflict (id_c) do update set razon_social = excluded.razon_social;
    end if;

    return true;
end;
$$;

select 'funciones instaladas' as estado;
