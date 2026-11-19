-- =====================================================================
-- HARVEST JAM · 99_borrar_todo.sql — Borra el esquema para empezar de cero
--
-- Elimina tablas, funciones, triggers y datos del esquema fruteria.
-- Los roles y usuarios de PostgreSQL NO se borran (son de todo el
-- servidor); 04_roles.sql los reutiliza si ya existen.
-- =====================================================================

drop schema if exists fruteria cascade;

-- Si también quieres borrar los roles y usuarios, descomenta esto
-- (antes deben quitarse sus permisos en todas las bases donde existan):
--
-- drop owned by francisco_mendoza, uviel_mata, robert_de_niro, manuel_gomez,
--               ricardo_valencia, juan_gonzales, laura_perez;
-- drop user if exists francisco_mendoza, uviel_mata, robert_de_niro, manuel_gomez,
--                     ricardo_valencia, juan_gonzales, laura_perez;
-- drop role if exists administrador, gerente, cajero, comprador, admin_clientes, contador;

select 'esquema fruteria eliminado' as estado;
