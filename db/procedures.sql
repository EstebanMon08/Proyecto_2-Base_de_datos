-- ============================================================
-- PROYECTO 3 — STORED PROCEDURES
-- Archivo: db/procedures.sql → 05_procedures.sql
-- ============================================================

-- ============================================================
-- SP 1: sp_registrar_venta
-- Registra una orden completa con sus detalles
-- Transacción explícita con ROLLBACK si no hay stock
-- Parámetros de salida: id de la orden creada y mensaje
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_registrar_venta(
  IN  p_id_usuario   INT,
  IN  p_id_empleado  INT,
  IN  p_id_item      INT,
  IN  p_id_lootbox   INT,
  IN  p_cantidad     INT,
  IN  p_precio       DECIMAL(10,2),
  OUT p_id_orden     INT,
  OUT p_mensaje      TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock     INT;
  v_total     DECIMAL(12,2);
BEGIN
  -- Validar que se indicó exactamente un producto
  IF (p_id_item IS NULL AND p_id_lootbox IS NULL) OR
     (p_id_item IS NOT NULL AND p_id_lootbox IS NOT NULL) THEN
    RAISE EXCEPTION 'Debe indicarse exactamente un producto (item o lootbox)';
  END IF;

  -- Verificar stock
  IF p_id_item IS NOT NULL THEN
    SELECT stock INTO v_stock FROM Item WHERE id_item = p_id_item;
    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Ítem % no encontrado', p_id_item;
    END IF;
    IF v_stock < p_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para ítem %. Disponible: %, Solicitado: %',
        p_id_item, v_stock, p_cantidad;
    END IF;
  ELSE
    SELECT stock INTO v_stock FROM Lootbox WHERE id_lootbox = p_id_lootbox;
    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Lootbox % no encontrada', p_id_lootbox;
    END IF;
    IF v_stock < p_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para lootbox %. Disponible: %, Solicitado: %',
        p_id_lootbox, v_stock, p_cantidad;
    END IF;
  END IF;

  v_total := p_cantidad * p_precio;

  -- Insertar orden
  INSERT INTO Orden (fecha, total, estado, id_usuario, id_empleado)
  VALUES (NOW(), v_total, 'completada', p_id_usuario, p_id_empleado)
  RETURNING id_orden INTO p_id_orden;

  -- Insertar detalle
  INSERT INTO DetalleOrden (id_orden, id_item, id_lootbox, cantidad, precio_unitario)
  VALUES (p_id_orden, p_id_item, p_id_lootbox, p_cantidad, p_precio);

  -- Descontar stock
  IF p_id_item IS NOT NULL THEN
    UPDATE Item SET stock = stock - p_cantidad WHERE id_item = p_id_item;
  ELSE
    UPDATE Lootbox SET stock = stock - p_cantidad WHERE id_lootbox = p_id_lootbox;
  END IF;

  p_mensaje := 'Venta registrada correctamente. Orden #' || p_id_orden;

EXCEPTION
  WHEN OTHERS THEN
    -- El ROLLBACK lo maneja PostgreSQL al salir con excepción
    p_id_orden := NULL;
    p_mensaje  := 'ERROR: ' || SQLERRM;
    RAISE;
END;
$$;


-- ============================================================
-- SP 2: sp_actualizar_stock
-- Actualiza el stock de un ítem o lootbox
-- Parámetros de salida: stock anterior y nuevo
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_actualizar_stock(
  IN  p_tipo         VARCHAR(10),  -- 'item' o 'lootbox'
  IN  p_id           INT,
  IN  p_nuevo_stock  INT,
  OUT p_stock_anterior INT,
  OUT p_mensaje        TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_nuevo_stock < 0 THEN
    RAISE EXCEPTION 'El stock no puede ser negativo';
  END IF;

  IF p_tipo = 'item' THEN
    SELECT stock INTO p_stock_anterior FROM Item WHERE id_item = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ítem % no encontrado', p_id;
    END IF;
    UPDATE Item SET stock = p_nuevo_stock WHERE id_item = p_id;
    p_mensaje := 'Stock de ítem ' || p_id || ' actualizado: ' ||
                 p_stock_anterior || ' → ' || p_nuevo_stock;

  ELSIF p_tipo = 'lootbox' THEN
    SELECT stock INTO p_stock_anterior FROM Lootbox WHERE id_lootbox = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lootbox % no encontrada', p_id;
    END IF;
    UPDATE Lootbox SET stock = p_nuevo_stock WHERE id_lootbox = p_id;
    p_mensaje := 'Stock de lootbox ' || p_id || ' actualizado: ' ||
                 p_stock_anterior || ' → ' || p_nuevo_stock;
  ELSE
    RAISE EXCEPTION 'Tipo inválido: %. Use "item" o "lootbox"', p_tipo;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    p_stock_anterior := NULL;
    p_mensaje := 'ERROR: ' || SQLERRM;
    RAISE;
END;
$$;


-- ============================================================
-- SP 3: sp_crear_item
-- Crea un ítem validando categoría y proveedor existentes
-- Parámetro de salida: id del ítem creado
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_crear_item(
  IN  p_nombre              VARCHAR(100),
  IN  p_descripcion         TEXT,
  IN  p_precio              DECIMAL(10,2),
  IN  p_stock               INT,
  IN  p_es_edicion_limitada BOOLEAN,
  IN  p_id_categoria        INT,
  IN  p_id_proveedor        INT,
  OUT p_id_item             INT,
  OUT p_mensaje             TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_existe  BOOLEAN;
  v_prov_existe BOOLEAN;
BEGIN
  -- Validaciones
  IF p_precio <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;
  IF p_stock < 0 THEN
    RAISE EXCEPTION 'El stock no puede ser negativo';
  END IF;

  SELECT EXISTS(SELECT 1 FROM Categoria WHERE id_categoria = p_id_categoria)
    INTO v_cat_existe;
  IF NOT v_cat_existe THEN
    RAISE EXCEPTION 'Categoría % no existe', p_id_categoria;
  END IF;

  SELECT EXISTS(SELECT 1 FROM Proveedor WHERE id_proveedor = p_id_proveedor AND activo = TRUE)
    INTO v_prov_existe;
  IF NOT v_prov_existe THEN
    RAISE EXCEPTION 'Proveedor % no existe o está inactivo', p_id_proveedor;
  END IF;

  INSERT INTO Item (nombre, descripcion, precio, stock, es_edicion_limitada, id_categoria, id_proveedor)
  VALUES (p_nombre, p_descripcion, p_precio, p_stock, p_es_edicion_limitada, p_id_categoria, p_id_proveedor)
  RETURNING id_item INTO p_id_item;

  p_mensaje := 'Ítem "' || p_nombre || '" creado con ID ' || p_id_item;

EXCEPTION
  WHEN OTHERS THEN
    p_id_item := NULL;
    p_mensaje := 'ERROR: ' || SQLERRM;
    RAISE;
END;
$$;


-- ============================================================
-- SP 4: sp_cancelar_orden
-- Cancela una orden y restaura el stock de los productos
-- Transacción con ROLLBACK si algo falla
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_cancelar_orden(
  IN  p_id_orden  INT,
  OUT p_mensaje   TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_estado   VARCHAR(30);
  v_detalle  RECORD;
BEGIN
  -- Verificar que la orden existe y está completada
  SELECT estado INTO v_estado FROM Orden WHERE id_orden = p_id_orden;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden % no encontrada', p_id_orden;
  END IF;
  IF v_estado = 'cancelada' THEN
    RAISE EXCEPTION 'La orden % ya está cancelada', p_id_orden;
  END IF;

  -- Restaurar stock por cada detalle
  FOR v_detalle IN
    SELECT id_item, id_lootbox, cantidad
    FROM DetalleOrden
    WHERE id_orden = p_id_orden
  LOOP
    IF v_detalle.id_item IS NOT NULL THEN
      UPDATE Item SET stock = stock + v_detalle.cantidad
      WHERE id_item = v_detalle.id_item;
    END IF;
    IF v_detalle.id_lootbox IS NOT NULL THEN
      UPDATE Lootbox SET stock = stock + v_detalle.cantidad
      WHERE id_lootbox = v_detalle.id_lootbox;
    END IF;
  END LOOP;

  -- Marcar como cancelada
  UPDATE Orden SET estado = 'cancelada' WHERE id_orden = p_id_orden;

  p_mensaje := 'Orden #' || p_id_orden || ' cancelada y stock restaurado';

EXCEPTION
  WHEN OTHERS THEN
    p_mensaje := 'ERROR: ' || SQLERRM;
    RAISE;
END;
$$;


-- ============================================================
-- SP 5: sp_reporte_ventas_periodo
-- Genera resumen de ventas entre dos fechas
-- Parámetros de salida: total de órdenes e ingresos del período
-- ============================================================
CREATE OR REPLACE PROCEDURE sp_reporte_ventas_periodo(
  IN  p_fecha_inicio  DATE,
  IN  p_fecha_fin     DATE,
  OUT p_total_ordenes INT,
  OUT p_total_ingresos DECIMAL(12,2),
  OUT p_mensaje        TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_fecha_inicio > p_fecha_fin THEN
    RAISE EXCEPTION 'La fecha de inicio no puede ser mayor a la fecha fin';
  END IF;

  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(total), 0)
  INTO p_total_ordenes, p_total_ingresos
  FROM Orden
  WHERE fecha::DATE BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado = 'completada';

  p_mensaje := 'Período ' || p_fecha_inicio || ' → ' || p_fecha_fin ||
               ': ' || p_total_ordenes || ' órdenes, $' ||
               ROUND(p_total_ingresos, 2) || ' en ingresos';

EXCEPTION
  WHEN OTHERS THEN
    p_total_ordenes  := 0;
    p_total_ingresos := 0;
    p_mensaje := 'ERROR: ' || SQLERRM;
    RAISE;
END;
$$;
