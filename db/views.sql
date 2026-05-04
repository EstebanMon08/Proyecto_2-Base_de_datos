-- ============================================================
-- VIEWS
-- Agregar al final del ddl.sql o ejecutar por separado
-- ============================================================

-- Vista: resumen de ventas con datos de usuario y empleado
-- Usada por GET /api/ordenes en el backend
CREATE OR REPLACE VIEW venta_resumen AS
SELECT
    o.id_orden,
    o.fecha,
    o.total,
    o.estado,
    u.nombre_usuario   AS usuario,
    u.email            AS email_usuario,
    e.nombre           AS empleado,
    e.rol              AS rol_empleado,
    COUNT(d.id_detalle) AS num_productos
FROM Orden o
JOIN Usuario      u ON o.id_usuario  = u.id_usuario
JOIN Empleado     e ON o.id_empleado = e.id_empleado
JOIN DetalleOrden d ON o.id_orden    = d.id_orden
GROUP BY o.id_orden, o.fecha, o.total, o.estado,
         u.nombre_usuario, u.email, e.nombre, e.rol;
