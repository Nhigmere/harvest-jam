-- =====================================================================
-- HARVEST JAM · 03_triggers.sql — Triggers de stock y de auditoría
-- Ejecutar después de 02_funciones.sql (usan registrar_auditoria,
-- obtener_usuario_actual y describir_cantidad). Se puede volver a correr:
-- cada trigger se borra antes de crearse.
--
-- Cambios clave respecto a Funciones_Triggers.sql:
--   * Si no hay stock, la venta completa se cancela con un mensaje claro.
--     Antes el trigger devolvía NULL y el renglón se perdía en silencio.
--   * Los triggers que tocan stock y auditoría corren como SECURITY
--     DEFINER: un cajero ya no necesita permiso para editar existencias ni
--     para escribir en la bitácora, así que no puede alterarlas a mano.
--   * La auditoría ahora también cubre clientes y proveedores.
-- =====================================================================

set search_path to fruteria, public;

-- ---------------------------------------------------------------------
-- 1. Triggers de stock (ventas y compras)
-- ---------------------------------------------------------------------

-- Antes de guardar un renglón de venta: valida, fija precio y descuenta stock.
create or replace function procesar_stock_por_venta() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
declare
    p producto%rowtype;
begin
    select * into p from producto where codigo = new.codigo for update;

    if not found then
        raise exception 'El producto con código % no existe', new.codigo;
    end if;

    if new.cantidad is null or new.cantidad <= 0 then
        raise exception 'La cantidad de "%" debe ser mayor a cero', p.descripcion;
    end if;

    if not es_unidad_fraccionable(p.unidad_medida) and new.cantidad <> trunc(new.cantidad) then
        raise exception '"%" se vende por %: la cantidad debe ser un número entero',
            p.descripcion, p.unidad_medida;
    end if;

    if p.existencia < new.cantidad then
        raise exception 'Stock insuficiente para "%": hay % y se pidieron %',
            p.descripcion, trim_scale(p.existencia), trim_scale(new.cantidad);
    end if;

    new.precio_unitario := coalesce(new.precio_unitario, p.precio_v);

    update producto set existencia = existencia - new.cantidad where codigo = new.codigo;

    perform registrar_auditoria('detalle_venta', 'INSERT',
        format('venta folio %s: %s de %s (código %s) a $%s',
               new.folio_v, describir_cantidad(new.cantidad, p.unidad_medida),
               p.descripcion, new.codigo, new.precio_unitario));
    return new;
end;
$$;

drop trigger if exists trigger_procesar_stock_por_venta on detalle_venta;
create trigger trigger_procesar_stock_por_venta
    before insert on detalle_venta
    for each row execute function procesar_stock_por_venta();

-- Al cancelar una venta se devuelve el stock.
create or replace function revertir_stock_por_cancelacion_venta() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
begin
    update producto set existencia = existencia + old.cantidad where codigo = old.codigo;

    perform registrar_auditoria('detalle_venta', 'DELETE',
        format('venta folio %s cancelada: regresan %s del producto %s al inventario',
               old.folio_v, trim_scale(old.cantidad), old.codigo));
    return old;
end;
$$;

drop trigger if exists trigger_revertir_stock_por_cancelacion_venta on detalle_venta;
create trigger trigger_revertir_stock_por_cancelacion_venta
    after delete on detalle_venta
    for each row execute function revertir_stock_por_cancelacion_venta();

-- Antes de guardar un renglón de compra: fija costo y suma stock.
create or replace function actualizar_stock_por_compra() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
declare
    p producto%rowtype;
begin
    select * into p from producto where codigo = new.codigo for update;

    if not found then
        raise exception 'El producto con código % no existe', new.codigo;
    end if;

    if new.cantidad is null or new.cantidad <= 0 then
        raise exception 'La cantidad de "%" debe ser mayor a cero', p.descripcion;
    end if;

    if not es_unidad_fraccionable(p.unidad_medida) and new.cantidad <> trunc(new.cantidad) then
        raise exception '"%" se maneja por %: la cantidad debe ser un número entero',
            p.descripcion, p.unidad_medida;
    end if;

    new.precio_unitario := coalesce(new.precio_unitario, p.precio_c);

    update producto set existencia = existencia + new.cantidad where codigo = new.codigo;

    perform registrar_auditoria('detalle_compra', 'INSERT',
        format('compra folio %s: entran %s de %s (código %s) a $%s',
               new.folio_c, describir_cantidad(new.cantidad, p.unidad_medida),
               p.descripcion, new.codigo, new.precio_unitario));
    return new;
end;
$$;

drop trigger if exists trigger_actualizar_stock_por_compra on detalle_compra;
create trigger trigger_actualizar_stock_por_compra
    before insert on detalle_compra
    for each row execute function actualizar_stock_por_compra();

-- Al eliminar una compra se resta lo que había entrado. Si esa mercancía
-- ya se vendió, la eliminación se cancela (antes dejaba el stock descuadrado).
create or replace function revertir_stock_por_eliminacion_compra() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
declare
    p producto%rowtype;
begin
    select * into p from producto where codigo = old.codigo for update;

    if p.existencia < old.cantidad then
        raise exception 'No se puede eliminar la compra %: de "%" entraron % pero solo quedan % (ya se vendió parte)',
            old.folio_c, p.descripcion, trim_scale(old.cantidad), trim_scale(p.existencia);
    end if;

    update producto set existencia = existencia - old.cantidad where codigo = old.codigo;

    perform registrar_auditoria('detalle_compra', 'DELETE',
        format('compra folio %s eliminada: salen %s de %s del inventario',
               old.folio_c, trim_scale(old.cantidad), p.descripcion));
    return old;
end;
$$;

drop trigger if exists trigger_revertir_stock_por_eliminacion_compra on detalle_compra;
create trigger trigger_revertir_stock_por_eliminacion_compra
    after delete on detalle_compra
    for each row execute function revertir_stock_por_eliminacion_compra();

-- Los renglones no se editan: se cancela el folio y se registra otro.
create or replace function impedir_modificar_detalle() returns trigger
language plpgsql as
$$
begin
    raise exception 'Los renglones de % no se modifican: cancela el folio y regístralo de nuevo', tg_table_name;
end;
$$;

drop trigger if exists trigger_impedir_modificar_detalle_venta on detalle_venta;
create trigger trigger_impedir_modificar_detalle_venta
    before update on detalle_venta
    for each row execute function impedir_modificar_detalle();

drop trigger if exists trigger_impedir_modificar_detalle_compra on detalle_compra;
create trigger trigger_impedir_modificar_detalle_compra
    before update on detalle_compra
    for each row execute function impedir_modificar_detalle();

-- ---------------------------------------------------------------------
-- 2. Triggers de auditoría
-- ---------------------------------------------------------------------

-- producto: altas, bajas y cambios hechos a mano (precio, datos o ajuste
-- de existencia). Los movimientos por venta o compra ya se registran en
-- sus propias tablas, por eso se omiten aquí (pg_trigger_depth() > 1).
create or replace function auditar_cambios_en_producto() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
declare
    cambios text[] := '{}';
begin
    if tg_op = 'INSERT' then
        perform registrar_auditoria('producto', 'INSERT',
            format('nuevo producto %s - %s (venta $%s por %s)',
                   new.codigo, new.descripcion, new.precio_v, new.unidad_medida));
        return new;
    elsif tg_op = 'DELETE' then
        perform registrar_auditoria('producto', 'DELETE',
            format('producto eliminado: %s - %s', old.codigo, old.descripcion));
        return old;
    end if;

    if pg_trigger_depth() > 1 then
        return new;
    end if;

    if new.descripcion is distinct from old.descripcion then
        cambios := cambios || format('descripción "%s" → "%s"', old.descripcion, new.descripcion);
    end if;
    if new.categoria is distinct from old.categoria then
        cambios := cambios || format('categoría %s → %s', old.categoria, new.categoria);
    end if;
    if new.unidad_medida is distinct from old.unidad_medida then
        cambios := cambios || format('unidad %s → %s', old.unidad_medida, new.unidad_medida);
    end if;
    if new.precio_c is distinct from old.precio_c then
        cambios := cambios || format('precio compra $%s → $%s', old.precio_c, new.precio_c);
    end if;
    if new.precio_v is distinct from old.precio_v then
        cambios := cambios || format('precio venta $%s → $%s', old.precio_v, new.precio_v);
    end if;
    if new.existencia is distinct from old.existencia then
        cambios := cambios || format('ajuste de existencia %s → %s',
                                     trim_scale(old.existencia), trim_scale(new.existencia));
    end if;

    if array_length(cambios, 1) > 0 then
        perform registrar_auditoria('producto', 'UPDATE',
            format('producto %s - %s: %s', new.codigo, new.descripcion, array_to_string(cambios, '; ')));
    end if;
    return new;
end;
$$;

drop trigger if exists trigger_auditar_cambios_en_producto on producto;
create trigger trigger_auditar_cambios_en_producto
    after insert or update or delete on producto
    for each row execute function auditar_cambios_en_producto();

-- empleado: altas, bajas y cambios de nombre, turno, salario o usuario.
create or replace function auditar_cambios_en_empleado() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
declare
    cambios text[] := '{}';
begin
    if tg_op = 'INSERT' then
        perform registrar_auditoria('empleado', 'INSERT',
            format('nuevo empleado %s - %s (turno %s)', new.id_e, new.nombre, new.turno));
        return new;
    elsif tg_op = 'DELETE' then
        perform registrar_auditoria('empleado', 'DELETE',
            format('empleado eliminado: %s - %s', old.id_e, old.nombre));
        return old;
    end if;

    if new.nombre is distinct from old.nombre then
        cambios := cambios || format('nombre "%s" → "%s"', old.nombre, new.nombre);
    end if;
    if new.turno is distinct from old.turno then
        cambios := cambios || format('turno %s → %s', old.turno, new.turno);
    end if;
    if new.salario is distinct from old.salario then
        cambios := cambios || format('salario $%s → $%s', old.salario, new.salario);
    end if;
    if new.usuario is distinct from old.usuario then
        cambios := cambios || format('usuario %s → %s', coalesce(old.usuario, '(ninguno)'),
                                     coalesce(new.usuario, '(ninguno)'));
    end if;

    if array_length(cambios, 1) > 0 then
        perform registrar_auditoria('empleado', 'UPDATE',
            format('empleado %s - %s: %s', new.id_e, new.nombre, array_to_string(cambios, '; ')));
    end if;
    return new;
end;
$$;

drop trigger if exists trigger_auditar_cambios_en_empleado on empleado;
create trigger trigger_auditar_cambios_en_empleado
    after insert or update or delete on empleado
    for each row execute function auditar_cambios_en_empleado();

-- proveedor: altas, bajas y cambios.
create or replace function auditar_cambios_en_proveedor() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
begin
    if tg_op = 'INSERT' then
        perform registrar_auditoria('proveedor', 'INSERT',
            format('nuevo proveedor %s - %s (%s)', new.id_p, new.nombre, new.ciudad));
        return new;
    elsif tg_op = 'DELETE' then
        perform registrar_auditoria('proveedor', 'DELETE',
            format('proveedor eliminado: %s - %s', old.id_p, old.nombre));
        return old;
    end if;

    if (new.nombre, new.ciudad, new.contacto, new.tel_contacto)
       is distinct from (old.nombre, old.ciudad, old.contacto, old.tel_contacto) then
        perform registrar_auditoria('proveedor', 'UPDATE',
            format('proveedor %s - %s modificado', new.id_p, new.nombre));
    end if;
    return new;
end;
$$;

drop trigger if exists trigger_auditar_cambios_en_proveedor on proveedor;
create trigger trigger_auditar_cambios_en_proveedor
    after insert or update or delete on proveedor
    for each row execute function auditar_cambios_en_proveedor();

-- cliente: el alta se registra al guardar su tipo (física o moral), que es
-- donde está el nombre; la baja se registra antes de borrar, por la misma razón.
create or replace function auditar_cambios_en_cliente() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
declare
    nombre_cliente varchar;
begin
    if tg_op = 'DELETE' then
        select coalesce(pf.nombre, pm.razon_social) into nombre_cliente
        from cliente c
        left join p_fisica pf on pf.id_c = c.id_c
        left join p_moral pm  on pm.id_c = c.id_c
        where c.id_c = old.id_c;

        perform registrar_auditoria('cliente', 'DELETE',
            format('cliente eliminado: %s - %s', old.id_c, coalesce(nombre_cliente, 'sin nombre')));
        return old;
    end if;

    if (new.telefono, new.rfc, new.domicilio) is distinct from (old.telefono, old.rfc, old.domicilio) then
        perform registrar_auditoria('cliente', 'UPDATE',
            format('cliente %s: cambian teléfono, RFC o domicilio', new.id_c));
    end if;
    return new;
end;
$$;

drop trigger if exists trigger_auditar_baja_de_cliente on cliente;
create trigger trigger_auditar_baja_de_cliente
    before delete on cliente
    for each row execute function auditar_cambios_en_cliente();

drop trigger if exists trigger_auditar_cambios_en_cliente on cliente;
create trigger trigger_auditar_cambios_en_cliente
    after update on cliente
    for each row execute function auditar_cambios_en_cliente();

create or replace function auditar_tipo_de_cliente() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
declare
    tipo varchar;
    nombre_nuevo varchar;
    nombre_anterior varchar;
begin
    -- Cada tabla tiene su propia columna de nombre; por eso se separa con IF.
    if tg_table_name = 'p_fisica' then
        tipo := 'persona física';
        nombre_nuevo := new.nombre;
        if tg_op = 'UPDATE' then
            nombre_anterior := old.nombre;
        end if;
    else
        tipo := 'persona moral';
        nombre_nuevo := new.razon_social;
        if tg_op = 'UPDATE' then
            nombre_anterior := old.razon_social;
        end if;
    end if;

    if tg_op = 'INSERT' then
        perform registrar_auditoria('cliente', 'INSERT',
            format('cliente %s registrado como %s: %s', new.id_c, tipo, nombre_nuevo));
    elsif nombre_nuevo is distinct from nombre_anterior then
        perform registrar_auditoria('cliente', 'UPDATE',
            format('cliente %s: nombre "%s" → "%s"', new.id_c, nombre_anterior, nombre_nuevo));
    end if;
    return new;
end;
$$;

drop trigger if exists trigger_auditar_p_fisica on p_fisica;
create trigger trigger_auditar_p_fisica
    after insert or update on p_fisica
    for each row execute function auditar_tipo_de_cliente();

drop trigger if exists trigger_auditar_p_moral on p_moral;
create trigger trigger_auditar_p_moral
    after insert or update on p_moral
    for each row execute function auditar_tipo_de_cliente();

-- Cabeceras de venta y compra.
create or replace function auditar_cambios_en_tabla_venta() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
begin
    if tg_op = 'INSERT' then
        perform registrar_auditoria('venta', 'INSERT',
            format('nueva venta folio %s (cliente %s, empleado %s)',
                   new.folio_v, coalesce(new.id_c::text, '-'), coalesce(new.id_e::text, '-')));
    elsif tg_op = 'DELETE' then
        perform registrar_auditoria('venta', 'DELETE',
            format('venta folio %s cancelada', old.folio_v));
    end if;
    return null;
end;
$$;

drop trigger if exists trigger_auditar_cambios_en_tabla_venta on venta;
create trigger trigger_auditar_cambios_en_tabla_venta
    after insert or delete on venta
    for each row execute function auditar_cambios_en_tabla_venta();

create or replace function auditar_cambios_en_tabla_compra() returns trigger
language plpgsql security definer set search_path = fruteria, public as
$$
begin
    if tg_op = 'INSERT' then
        perform registrar_auditoria('compra', 'INSERT',
            format('nueva compra folio %s (proveedor %s, empleado %s)',
                   new.folio_c, new.id_p, coalesce(new.id_e::text, '-')));
    elsif tg_op = 'DELETE' then
        perform registrar_auditoria('compra', 'DELETE',
            format('compra folio %s eliminada', old.folio_c));
    end if;
    return null;
end;
$$;

drop trigger if exists trigger_auditar_cambios_en_tabla_compra on compra;
create trigger trigger_auditar_cambios_en_tabla_compra
    after insert or delete on compra
    for each row execute function auditar_cambios_en_tabla_compra();

select 'triggers instalados' as estado;
