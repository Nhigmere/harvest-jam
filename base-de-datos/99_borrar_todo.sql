-- =====================================================================
-- HARVEST JAM · 99_borrar_todo.sql — Borra todo para empezar de cero
--
-- Elimina el esquema analítico etl (corridas, cambios, rechazos,
-- parámetros, ventas limpias, resumen y fotos DSS), el esquema
-- operativo fruteria (tablas, funciones, triggers y datos), así como
-- los usuarios y roles de Harvest JAM en PostgreSQL.
-- Asegúrate de cerrar antes cualquier sesión activa con esos usuarios.
-- =====================================================================

drop schema if exists etl cascade;
drop schema if exists fruteria cascade;

do $$
declare
    u text;
    r text;
begin
    foreach u in array array[
        'francisco_mendoza', 'uviel_mata', 'robert_de_niro',
        'manuel_gomez', 'ricardo_valencia', 'juan_gonzales', 'laura_perez'
    ]
    loop
        if exists (select 1 from pg_roles where rolname = u) then
            execute format('drop owned by %I cascade', u);
            execute format('drop user if exists %I', u);
        end if;
    end loop;

    foreach r in array array[
        'administrador', 'gerente', 'cajero', 'comprador', 'admin_clientes', 'contador'
    ]
    loop
        if exists (select 1 from pg_roles where rolname = r) then
            execute format('drop owned by %I cascade', r);
            execute format('drop role if exists %I', r);
        end if;
    end loop;
end
$$;

select 'esquemas etl, fruteria, usuarios y roles eliminados' as estado;

