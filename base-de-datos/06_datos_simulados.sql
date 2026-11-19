-- =====================================================================
-- HARVEST JAM · 06_datos_simulados.sql — DATOS SIMULADOS (opcional)
--
-- Genera ventas y compras de los últimos 90 días para que el tablero,
-- los reportes y el futuro módulo de decisiones tengan movimiento reciente.
-- NO son datos reales: se generan con números aleatorios repetibles
-- (setseed), respetando el stock y las reglas de los triggers.
--
-- Qué hace:
--   * Cada 3 días compra lo que se está acabando (al proveedor ligado al
--     producto en producto_proveedor; si no hay, a "central de frutas").
--   * Cada día registra entre 20 y 38 tickets (más los fines de semana),
--     de 8:00 a 20:00, casi siempre a "público en general".
--   * Al final borra de la auditoría los miles de renglones de la carga y
--     deja uno solo que dice que se cargaron datos simulados.
--
-- Ejecutar después de 05_datos.sql, como postgres. Tarda unos segundos.
-- =====================================================================

set search_path to fruteria, public;
select set_config('app.usuario', 'datos simulados', false);

do $$
declare
    dias constant int := 90;
    inicio date := current_date - (dias - 1);
    d date;
    idx int;
    n_tickets int;
    hora timestamp;
    folio int;
    folio_compra int;
    cliente_id int;
    empleado_id int;
    n_lineas int;
    k int;
    cod int;
    qty numeric;
    x numeric;
    usados int[];
    stock numeric;
    unidad varchar;
    ultimo_audit int;
    clientes int[];
    total_peso numeric;
    total_ventas int := 0;
    total_compras int := 0;
    proveedor_actual int;
    lote int := 6000;
    r record;
begin
    perform setseed(0.42);

    select coalesce(max(id), 0) into ultimo_audit from auditoria;
    select array_agg(id_c order by id_c) into clientes
    from cliente where coalesce(rfc, '') <> 'XAXX010101000';

    -- Qué tanto se vende cada producto (10 = muy popular, 1 = poco).
    create temp table demo_peso (codigo int primary key, peso numeric, acumulado numeric) on commit drop;

    insert into demo_peso (codigo, peso)
    select codigo,
           case
               when codigo in (5000, 5005, 5007, 5008, 5012, 5014, 5022, 5023, 5024, 5031, 5048, 5050) then 10
               when codigo in (5028, 5029, 5030, 5034, 5035, 5036, 5037, 5038, 5039, 5040, 5041, 5052, 5053) then 1
               else 3
           end
    from producto;

    update demo_peso w set acumulado = s.acum
    from (select codigo, sum(peso) over (order by codigo) as acum from demo_peso) s
    where s.codigo = w.codigo;

    select sum(peso) into total_peso from demo_peso;

    for idx in 0 .. dias - 1 loop
        d := inicio + idx;

        -- 1) Reabasto cada 3 días: una compra por proveedor
        if idx % 3 = 0 then
            proveedor_actual := null;
            for r in
                select p.codigo, p.precio_c, w.peso,
                       coalesce((select min(pp.id_p) from producto_proveedor pp where pp.codigo = p.codigo), 2003) as id_p
                from producto p
                join demo_peso w on w.codigo = p.codigo
                where p.existencia < w.peso * 3 + 6
                order by 4, 1
            loop
                if proveedor_actual is distinct from r.id_p then
                    lote := lote + 1;
                    insert into compra (no_lote, fecha, id_p, id_e)
                    values (lote, d + time '07:00' + random() * interval '50 minutes', r.id_p, 7000)
                    returning folio_c into folio_compra;
                    proveedor_actual := r.id_p;
                    total_compras := total_compras + 1;
                end if;

                insert into detalle_compra (folio_c, codigo, cantidad, precio_unitario)
                values (folio_compra, r.codigo, ceil(r.peso * 5 + 8 + random() * r.peso),
                        round((r.precio_c * (0.92 + random() * 0.16))::numeric, 2));
            end loop;
        end if;

        -- 2) Ventas del día, en orden de hora
        n_tickets := 20 + floor(random() * 10)::int
                     + case extract(isodow from d) when 6 then 9 when 7 then 5 else 0 end;

        for hora in
            select h from (
                select d + time '08:00' + random() * interval '12 hours' as h
                from generate_series(1, n_tickets)
            ) s
            where h <= localtimestamp
            order by h
        loop
            empleado_id := case when extract(hour from hora) < 14
                                then (array[7020, 7002])[1 + floor(random() * 2)::int]
                                else (array[7005, 7011])[1 + floor(random() * 2)::int] end;
            cliente_id := case when random() < 0.7 then 3101
                               else clientes[1 + floor(random() * array_length(clientes, 1))::int] end;
            n_lineas := 1 + floor(power(random(), 1.6) * 4)::int;
            usados := '{}';
            folio := null;

            for k in 1 .. n_lineas loop
                x := random() * total_peso;
                select codigo into cod from demo_peso where acumulado >= x order by acumulado limit 1;
                continue when cod = any (usados);

                select existencia, unidad_medida into stock, unidad from producto where codigo = cod;
                qty := case when es_unidad_fraccionable(unidad)
                            then round((0.5 + random() * 2.5) * 4) / 4
                            else 1 + floor(random() * 3) end;
                continue when stock < qty;

                if folio is null then
                    insert into venta (fecha, id_c, id_e)
                    values (date_trunc('second', hora), cliente_id, empleado_id)
                    returning folio_v into folio;
                    total_ventas := total_ventas + 1;
                end if;

                insert into detalle_venta (folio_v, codigo, cantidad) values (folio, cod, qty);
                usados := usados || cod;
            end loop;
        end loop;
    end loop;

    -- La carga dejó miles de renglones en la bitácora: se resumen en uno.
    delete from auditoria where id > ultimo_audit;
    insert into auditoria (tabla, operacion, descripcion)
    values ('venta', 'INSERT',
            format('carga de DATOS SIMULADOS: %s ventas y %s compras del %s al %s',
                   total_ventas, total_compras, to_char(inicio, 'DD/MM/YYYY'), to_char(current_date, 'DD/MM/YYYY')));

    raise notice 'Datos simulados: % ventas y % compras', total_ventas, total_compras;
end
$$;

select 'datos simulados cargados (no son reales)' as estado;
