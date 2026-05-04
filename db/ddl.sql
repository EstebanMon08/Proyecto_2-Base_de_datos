-- DDL para Lootbox Store
-- UNIVERSIDAD DEL VALLE DE GUATEMALA
-- Base de Datos 1
-- Proyecto 2


-- Tabla: Categoria
CREATE TABLE Categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  TEXT
);

-- Tabla: Proveedor
CREATE TABLE Proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    contacto     VARCHAR(120),
    activo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tabla: Item
CREATE TABLE Item (
    id_item             SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    descripcion         TEXT,
    precio              DECIMAL(10,2) NOT NULL,
    stock               INT          NOT NULL CHECK (stock >= 0),
    es_edicion_limitada BOOLEAN      NOT NULL DEFAULT FALSE,
    id_categoria        INT          NOT NULL,
    id_proveedor        INT          NOT NULL,
    CONSTRAINT fk_item_categoria FOREIGN KEY (id_categoria) REFERENCES Categoria(id_categoria),
    CONSTRAINT fk_item_proveedor FOREIGN KEY (id_proveedor) REFERENCES Proveedor(id_proveedor)
);

-- Tabla: Lootbox
CREATE TABLE Lootbox (
    id_lootbox          SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    descripcion         TEXT,
    precio              DECIMAL(10,2) NOT NULL,
    stock               INT           NOT NULL CHECK (stock >= 0),
    es_edicion_limitada BOOLEAN       NOT NULL DEFAULT FALSE,
    fecha_expiracion    DATE,
    id_categoria        INT           NOT NULL,
    id_proveedor        INT           NOT NULL,
    CONSTRAINT fk_lootbox_categoria FOREIGN KEY (id_categoria) REFERENCES Categoria(id_categoria),
    CONSTRAINT fk_lootbox_proveedor FOREIGN KEY (id_proveedor) REFERENCES Proveedor(id_proveedor)
);

-- Tabla: ContenidoLootbox
CREATE TABLE ContenidoLootbox (
    id_contenido SERIAL PRIMARY KEY,
    id_lootbox   INT            NOT NULL,
    id_item      INT            NOT NULL,
    probabilidad DECIMAL(5,4)   NOT NULL CHECK (probabilidad > 0 AND probabilidad <= 1),
    cantidad     INT            NOT NULL CHECK (cantidad > 0),
    CONSTRAINT fk_contenido_lootbox FOREIGN KEY (id_lootbox) REFERENCES Lootbox(id_lootbox),
    CONSTRAINT fk_contenido_item    FOREIGN KEY (id_item)    REFERENCES Item(id_item)
);

-- Tabla: Empleado
CREATE TABLE Empleado (
    id_empleado     SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    rol             VARCHAR(60)  NOT NULL,
    email           VARCHAR(120) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL
);

-- Tabla: Usuario
CREATE TABLE Usuario (
    id_usuario      SERIAL PRIMARY KEY,
    nombre_usuario  VARCHAR(60)   NOT NULL UNIQUE,
    email           VARCHAR(120)  NOT NULL UNIQUE,
    saldo           DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
    fecha_registro  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Tabla: Orden
CREATE TABLE Orden (
    id_orden    SERIAL PRIMARY KEY,
    fecha       TIMESTAMP     NOT NULL DEFAULT NOW(),
    total       DECIMAL(12,2) NOT NULL,
    estado      VARCHAR(30)   NOT NULL DEFAULT 'completada',
    id_usuario  INT           NOT NULL,
    id_empleado INT           NOT NULL,
    CONSTRAINT fk_orden_usuario  FOREIGN KEY (id_usuario)  REFERENCES Usuario(id_usuario),
    CONSTRAINT fk_orden_empleado FOREIGN KEY (id_empleado) REFERENCES Empleado(id_empleado)
);

-- Tabla: DetalleOrden
CREATE TABLE DetalleOrden (
    id_detalle      SERIAL PRIMARY KEY,
    id_orden        INT           NOT NULL,
    id_item         INT,
    id_lootbox      INT,
    cantidad        INT           NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalle_orden   FOREIGN KEY (id_orden)   REFERENCES Orden(id_orden),
    CONSTRAINT fk_detalle_item    FOREIGN KEY (id_item)    REFERENCES Item(id_item),
    CONSTRAINT fk_detalle_lootbox FOREIGN KEY (id_lootbox) REFERENCES Lootbox(id_lootbox),
    CONSTRAINT chk_detalle_producto CHECK (
        (id_item IS NOT NULL AND id_lootbox IS NULL) OR
        (id_item IS NULL AND id_lootbox IS NOT NULL)
    )
);


-- ÍNDICES
-- 1. Índice en Item.id_categoria
CREATE INDEX idx_item_categoria ON Item(id_categoria);

-- 2. Índice en Lootbox.id_categoria
CREATE INDEX idx_lootbox_categoria ON Lootbox(id_categoria);

-- 3. Índice en Orden.id_usuario
CREATE INDEX idx_orden_usuario ON Orden(id_usuario);

-- 4. Índice en DetalleOrden.id_orden
CREATE INDEX idx_detalle_orden ON DetalleOrden(id_orden);

-- 5. Índice en ContenidoLootbox.id_lootbox
CREATE INDEX idx_contenido_lootbox ON ContenidoLootbox(id_lootbox);
