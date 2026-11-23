-- =====================================================================
-- HARVEST JAM · 07_dss.sql — Esquema analítico ETL y Módulo DSS
--
-- Regla de Oro: este script NO modifica ni borra nada del esquema
-- operativo "fruteria". Todo vive aislado en el esquema "etl".
-- Se puede ejecutar varias veces sin error (idempotente).
-- =====================================================================

set search_path to fruteria, public;

create schema if not exists etl authorization postgres;

-- ---------------------------------------------------------------------
-- 1. Tablas de control y trazabilidad del ETL (vista /etl)
-- ---------------------------------------------------------------------

create table if not exists etl.corridas (
    id bigserial primary key,
    iniciado_en timestamp(0) not null default localtimestamp(0),
    terminado_en timestamp(0),
    duracion_ms integer not null default 0,
    modo varchar(20) not null default 'completo' check (
        modo in ('completo', 'prueba')
    ),
    ejecutado_por varchar(80) not null default 'sistema',
    estado varchar(20) not null default 'en_curso' check (
        estado in (
            'en_curso',
            'ok',
            'con_rechazos',
            'error'
        )
    ),
    filas_leidas integer not null default 0,
    filas_limpiadas integer not null default 0,
    filas_imputadas integer not null default 0,
    filas_cargadas integer not null default 0,
    filas_rechazadas integer not null default 0,
    fecha_corte date,
    detalle_error text
);

create table if not exists etl.cambios (
    id bigserial primary key,
    corrida_id bigint not null references etl.corridas (id) on delete cascade,
    fecha_hora timestamp(0) not null default localtimestamp(0),
    entidad varchar(30) not null,
    fuente varchar(80) not null,
    clave varchar(60) not null,
    campo varchar(60) not null,
    tipo varchar(20) not null check (
        tipo in (
            'LIMPIADO',
            'IMPUTADO',
            'RECHAZADO',
            'CARGADO'
        )
    ),
    regla varchar(16) not null,
    valor_antes text,
    valor_despues text,
    motivo text not null,
    dato_antes jsonb,
    dato_despues jsonb
);

create table if not exists etl.rechazos (
    id bigserial primary key,
    corrida_id bigint not null references etl.corridas (id) on delete cascade,
    fecha_hora timestamp(0) not null default localtimestamp(0),
    entidad varchar(30) not null,
    fuente varchar(80) not null,
    clave varchar(60) not null,
    regla varchar(16) not null,
    motivo text not null,
    dato_original jsonb not null
);

-- ---------------------------------------------------------------------
-- 2. Tablas limpias del ETL (resultado listo para analizar)
-- ---------------------------------------------------------------------

create table if not exists etl.parametros_producto (
    codigo integer primary key,
    stock_minimo numeric(10, 3) not null default 10,
    vida_util_dias integer not null default 7,
    dias_entrega integer not null default 2,
    entrega_imputada boolean not null default false,
    proveedor_principal varchar(100),
    fuente varchar(80) not null default 'csv_simulado',
    actualizado_en timestamp(0) not null default localtimestamp(0)
);

create table if not exists etl.venta_limpia (
    folio_v integer not null,
    codigo integer not null,
    fecha timestamp(0) not null,
    producto varchar(100) not null,
    categoria varchar(50) not null,
    unidad_medida varchar(20) not null,
    cantidad numeric(10, 3) not null,
    precio_unitario numeric(8, 2) not null,
    costo_unitario numeric(8, 2) not null,
    importe numeric(12, 2) not null,
    margen numeric(12, 2) not null,
    primary key (folio_v, codigo)
);

create table if not exists etl.resumen_producto (
    codigo integer primary key,
    descripcion varchar(100) not null,
    categoria varchar(50) not null,
    unidad_medida varchar(20) not null,
    existencia numeric(10, 3) not null,
    precio_c numeric(8, 2) not null,
    precio_v numeric(8, 2) not null,
    stock_minimo numeric(10, 3) not null,
    vida_util_dias integer not null,
    dias_entrega integer not null,
    entrega_imputada boolean not null default false,
    proveedor_principal varchar(100),
    dias_con_ventas integer not null default 0,
    unidades_vendidas numeric(12, 3) not null default 0,
    demanda_diaria numeric(10, 4) not null default 0,
    dias_cobertura numeric(10, 2),
    rotacion numeric(10, 3) not null default 0,
    brecha_minimo numeric(10, 3) not null default 0,
    margen_entrega numeric(10, 2),
    margen_pct numeric(6, 2) not null default 0,
    riesgo_merma boolean not null default false,
    datos_suficientes boolean not null default false,
    ventana_dias integer not null default 28,
    fecha_corte date,
    actualizado_en timestamp(0) not null default localtimestamp(0)
);

-- ---------------------------------------------------------------------
-- 3. Tablas de trazabilidad del módulo de decisiones (DSS)
-- ---------------------------------------------------------------------

create table if not exists etl.dss_parametros (
    version varchar(20) primary key,
    ventana_dias integer not null default 28,
    colchon_dias integer not null default 3,
    cobertura_objetivo integer not null default 7,
    min_dias_ventas integer not null default 5,
    peso_urgencia numeric(4, 2) not null default 0.40,
    peso_demanda numeric(4, 2) not null default 0.25,
    peso_margen numeric(4, 2) not null default 0.20,
    peso_brecha numeric(4, 2) not null default 0.15,
    creado_en timestamp(0) not null default localtimestamp(0),
    creado_por varchar(80) not null default 'sistema',
    notas text
);

insert into
    etl.dss_parametros (
        version,
        ventana_dias,
        colchon_dias,
        cobertura_objetivo,
        min_dias_ventas,
        peso_urgencia,
        peso_demanda,
        peso_margen,
        peso_brecha,
        creado_por,
        notas
    )
values (
        'v1',
        28,
        3,
        7,
        5,
        0.40,
        0.25,
        0.20,
        0.15,
        'sistema',
        'Pesos iniciales balanceados para frutería perecedera: 40% urgencia, 25% demanda, 20% margen, 15% brecha contra mínimo.'
    )
on conflict (version) do nothing;

create table if not exists etl.dss_corridas (
    id bigserial primary key,
    fecha_hora timestamp(0) not null default localtimestamp(0),
    ejecutado_por varchar(80) not null,
    version_parametros varchar(20) not null references etl.dss_parametros (version),
    escenario varchar(60) not null,
    factor_demanda numeric(5, 2) not null default 1.00,
    extra_entrega integer not null default 0,
    presupuesto numeric(12, 2),
    fecha_corte date,
    total_critica integer not null default 0,
    total_alta integer not null default 0,
    total_media integer not null default 0,
    total_baja integer not null default 0,
    total_sobre integer not null default 0,
    total_insuficientes integer not null default 0,
    monto_sugerido numeric(12, 2) not null default 0,
    monto_cubierto numeric(12, 2) not null default 0,
    fuera_presupuesto integer not null default 0
);

create table if not exists etl.dss_recomendaciones (
    corrida_id bigint not null references etl.dss_corridas (id) on delete cascade,
    codigo integer not null,
    descripcion varchar(100) not null,
    prioridad varchar(20) not null,
    es_emergencia boolean not null default false,
    puntaje numeric(5, 2),
    cantidad_sugerida numeric(10, 3) not null default 0,
    costo_estimado numeric(12, 2) not null default 0,
    en_presupuesto boolean not null default true,
    explicacion text not null,
    desglose jsonb not null default '{}'::jsonb,
    primary key (corrida_id, codigo)
);

-- Índices para filtros rápidos en /etl y /decisiones
create index if not exists idx_etl_cambios_corrida on etl.cambios (corrida_id desc, id desc);

create index if not exists idx_etl_cambios_tipo on etl.cambios (tipo);

create index if not exists idx_etl_cambios_entidad on etl.cambios (entidad);

create index if not exists idx_etl_rechazos_corr on etl.rechazos (corrida_id desc);

create index if not exists idx_etl_venta_fecha on etl.venta_limpia (fecha desc);

create index if not exists idx_etl_venta_codigo on etl.venta_limpia (codigo);

-- ---------------------------------------------------------------------
-- 4. Permisos por rol (doble capa igual que 04_roles.sql)
--    cajero y admin_clientes NO tienen acceso al esquema etl.
-- ---------------------------------------------------------------------
revoke all on schema etl from public;

revoke all on all tables in schema etl
from
    administrador,
    gerente,
    contador,
    comprador,
    cajero,
    admin_clientes;

revoke all on all sequences in schema etl
from
    administrador,
    gerente,
    contador,
    comprador,
    cajero,
    admin_clientes;

grant usage on schema etl to administrador,
gerente,
contador,
comprador;

-- Administrador: control total (ejecuta ETL y DSS)
grant all privileges on all tables in schema etl to administrador;

grant all privileges on all sequences in schema etl to administrador;

-- Gerente y Comprador: leen todo el esquema etl y pueden guardar corridas DSS
grant select on all tables in schema etl to gerente, comprador;

grant insert on etl.dss_corridas,
etl.dss_recomendaciones to gerente,
comprador;

grant usage,
select on all sequences in schema etl to gerente, comprador;

-- Contador: solo lectura completa de ETL y DSS
grant select on all tables in schema etl to contador;

select 'esquema etl y modulo dss listos' as estado;