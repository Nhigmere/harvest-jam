-- =====================================================================
-- HARVEST JAM · 04_roles.sql — Roles, usuarios y permisos
--
-- Cada persona inicia sesión en la aplicación con su usuario de
-- PostgreSQL. Así la base de datos también protege los datos: aunque
-- alguien saltara la API, un cajero no podría borrar productos.
--
-- Se puede ejecutar varias veces: si un rol o usuario ya existe, solo
-- vuelve a aplicar los permisos.
--
-- Contraseña de todos los usuarios de ejemplo: 12345 (cámbiala fuera de clase).
-- Ya no se crea el superusuario "zzz" del script original.
-- =====================================================================

set search_path to fruteria, public;

-- 1. Roles (perfiles de acceso) ---------------------------------------
do $$
declare
    r text;
begin
    foreach r in array array['administrador', 'gerente', 'cajero', 'comprador', 'admin_clientes', 'contador']
    loop
        if not exists (select 1 from pg_roles where rolname = r) then
            execute format('create role %I nologin nosuperuser inherit nocreatedb nocreaterole noreplication', r);
        end if;
    end loop;
end
$$;

-- 2. Usuarios de ejemplo ----------------------------------------------
do $$
declare
    u record;
begin
    for u in
        select * from (values
            ('francisco_mendoza', 'administrador'),
            ('uviel_mata',        'administrador'),
            ('robert_de_niro',    'gerente'),
            ('manuel_gomez',      'cajero'),
            ('ricardo_valencia',  'comprador'),
            ('juan_gonzales',     'admin_clientes'),
            ('laura_perez',       'contador')
        ) as t (usuario, rol)
    loop
        if not exists (select 1 from pg_roles where rolname = u.usuario) then
            execute format('create user %I with password %L', u.usuario, '12345');
        end if;
        execute format('grant %I to %I', u.rol, u.usuario);
    end loop;
end
$$;

-- 3. Permisos sobre el esquema ----------------------------------------
-- Primero se limpian para que el script deje siempre el mismo resultado.
revoke all on all tables    in schema fruteria from administrador, gerente, cajero, comprador, admin_clientes, contador;
revoke all on all sequences in schema fruteria from administrador, gerente, cajero, comprador, admin_clientes, contador;

grant usage on schema fruteria to administrador, gerente, cajero, comprador, admin_clientes, contador;

-- a) administrador: todo
grant all privileges on all tables    in schema fruteria to administrador;
grant all privileges on all sequences in schema fruteria to administrador;

-- b) gerente y c) contador: solo lectura de todo
grant select on all tables in schema fruteria to gerente, contador;

-- d) cajero: ve el catálogo y clientes, registra ventas.
--    Ya no necesita UPDATE en existencia ni INSERT en auditoría: lo hacen
--    los triggers (SECURITY DEFINER) cuando registra una venta.
grant select on producto, cliente, p_moral, p_fisica, empleado, venta, detalle_venta to cajero;
grant insert on venta, detalle_venta to cajero;

-- e) comprador: inventario, proveedores y compras
grant select on empleado to comprador;
grant select, insert, update, delete on producto, proveedor, producto_proveedor, compra, detalle_compra to comprador;

-- f) admin_clientes: cartera de clientes
grant select on empleado to admin_clientes;
grant select, insert, update, delete on cliente, p_moral, p_fisica to admin_clientes;

-- Secuencias de los folios e ids
grant usage, select on all sequences in schema fruteria to gerente, cajero, comprador, admin_clientes, contador;

-- 4. Permisos para tablas que se agreguen después (por ejemplo, el módulo
--    de apoyo a decisiones). Aplica a objetos que cree el usuario postgres.
alter default privileges in schema fruteria grant all on tables to administrador;
alter default privileges in schema fruteria grant all on sequences to administrador;
alter default privileges in schema fruteria grant select on tables to gerente, contador;
alter default privileges in schema fruteria grant usage, select on sequences to gerente, cajero, comprador, admin_clientes, contador;

select 'roles, usuarios y permisos aplicados' as estado;
