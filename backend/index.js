const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── DB CONNECTION ─────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ══════════════════════════════════════════════════════════════════════════
// CATEGORIAS - CRUD completo
// ══════════════════════════════════════════════════════════════════════════

app.get("/api/categorias", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Categoria ORDER BY id_categoria");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/categorias", async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: "El nombre es requerido" });
  try {
    const result = await pool.query(
      "INSERT INTO Categoria (nombre, descripcion) VALUES ($1, $2) RETURNING *",
      [nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/categorias/:id", async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: "El nombre es requerido" });
  try {
    const result = await pool.query(
      "UPDATE Categoria SET nombre=$1, descripcion=$2 WHERE id_categoria=$3 RETURNING *",
      [nombre, descripcion, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Categoría no encontrada" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/categorias/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Categoria WHERE id_categoria=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Categoría no encontrada" });
    res.json({ mensaje: "Categoría eliminada" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════
// ITEMS - CRUD completo
// ══════════════════════════════════════════════════════════════════════════

app.get("/api/items", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, c.nombre AS categoria, p.nombre AS proveedor
      FROM Item i
      JOIN Categoria c ON i.id_categoria = c.id_categoria
      JOIN Proveedor  p ON i.id_proveedor  = p.id_proveedor
      ORDER BY i.id_item
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/items", async (req, res) => {
  const { nombre, descripcion, precio, stock, es_edicion_limitada,
          id_categoria, id_proveedor } = req.body;
  if (!nombre || !precio || stock === undefined || !id_categoria || !id_proveedor)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  try {
    const result = await pool.query(
      `INSERT INTO Item (nombre, descripcion, precio, stock, es_edicion_limitada,
        id_categoria, id_proveedor)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre, descripcion, precio, stock, es_edicion_limitada ?? false,
       id_categoria, id_proveedor]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/items/:id", async (req, res) => {
  const { nombre, descripcion, precio, stock, es_edicion_limitada,
          id_categoria, id_proveedor } = req.body;
  if (!nombre || !precio || stock === undefined || !id_categoria || !id_proveedor)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  try {
    const result = await pool.query(
      `UPDATE Item SET nombre=$1, descripcion=$2, precio=$3, stock=$4,
        es_edicion_limitada=$5, id_categoria=$6, id_proveedor=$7
       WHERE id_item=$8 RETURNING *`,
      [nombre, descripcion, precio, stock, es_edicion_limitada ?? false,
       id_categoria, id_proveedor, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Ítem no encontrado" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Item WHERE id_item=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Ítem no encontrado" });
    res.json({ mensaje: "Ítem eliminado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════
// LOOTBOXES - CRUD completo
// ══════════════════════════════════════════════════════════════════════════

app.get("/api/lootboxes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, c.nombre AS categoria, p.nombre AS proveedor
      FROM Lootbox l
      JOIN Categoria c ON l.id_categoria = c.id_categoria
      JOIN Proveedor  p ON l.id_proveedor  = p.id_proveedor
      ORDER BY l.id_lootbox
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/lootboxes", async (req, res) => {
  const { nombre, descripcion, precio, stock, es_edicion_limitada,
          fecha_expiracion, id_categoria, id_proveedor } = req.body;
  if (!nombre || !precio || stock === undefined || !id_categoria || !id_proveedor)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  try {
    const result = await pool.query(
      `INSERT INTO Lootbox (nombre, descripcion, precio, stock,
        es_edicion_limitada, fecha_expiracion, id_categoria, id_proveedor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nombre, descripcion, precio, stock, es_edicion_limitada ?? false,
       fecha_expiracion || null, id_categoria, id_proveedor]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/lootboxes/:id", async (req, res) => {
  const { nombre, descripcion, precio, stock, es_edicion_limitada,
          fecha_expiracion, id_categoria, id_proveedor } = req.body;
  if (!nombre || !precio || stock === undefined || !id_categoria || !id_proveedor)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  try {
    const result = await pool.query(
      `UPDATE Lootbox SET nombre=$1, descripcion=$2, precio=$3, stock=$4,
        es_edicion_limitada=$5, fecha_expiracion=$6,
        id_categoria=$7, id_proveedor=$8
       WHERE id_lootbox=$9 RETURNING *`,
      [nombre, descripcion, precio, stock, es_edicion_limitada ?? false,
       fecha_expiracion || null, id_categoria, id_proveedor, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Lootbox no encontrada" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/lootboxes/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Lootbox WHERE id_lootbox=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Lootbox no encontrada" });
    res.json({ mensaje: "Lootbox eliminada" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════
// PROVEEDORES - CRUD
// ══════════════════════════════════════════════════════════════════════════

app.get("/api/proveedores", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Proveedor ORDER BY id_proveedor");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/proveedores", async (req, res) => {
  const { nombre, contacto, activo } = req.body;
  if (!nombre) return res.status(400).json({ error: "El nombre es requerido" });
  try {
    const result = await pool.query(
      "INSERT INTO Proveedor (nombre, contacto, activo) VALUES ($1,$2,$3) RETURNING *",
      [nombre, contacto, activo ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/proveedores/:id", async (req, res) => {
  const { nombre, contacto, activo } = req.body;
  if (!nombre) return res.status(400).json({ error: "El nombre es requerido" });
  try {
    const result = await pool.query(
      "UPDATE Proveedor SET nombre=$1, contacto=$2, activo=$3 WHERE id_proveedor=$4 RETURNING *",
      [nombre, contacto, activo ?? true, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Proveedor no encontrado" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/proveedores/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Proveedor WHERE id_proveedor=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Proveedor no encontrado" });
    res.json({ mensaje: "Proveedor eliminado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════════════════════════════

app.get("/api/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Usuario ORDER BY id_usuario");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════
// ÓRDENES - con transacción explícita
// ══════════════════════════════════════════════════════════════════════════

app.get("/api/ordenes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM venta_resumen ORDER BY fecha DESC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/ordenes", async (req, res) => {
  const { id_usuario, id_empleado, items } = req.body;
  if (!id_usuario || !id_empleado || !items || items.length === 0)
    return res.status(400).json({ error: "Faltan datos de la orden" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const total = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);

    const ordenResult = await client.query(
      `INSERT INTO Orden (fecha, total, estado, id_usuario, id_empleado)
       VALUES (NOW(), $1, 'completada', $2, $3) RETURNING *`,
      [total, id_usuario, id_empleado]
    );
    const orden = ordenResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO DetalleOrden (id_orden, id_item, id_lootbox, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [orden.id_orden, item.id_item || null, item.id_lootbox || null,
         item.cantidad, item.precio_unitario]
      );

      if (item.id_item) {
        const stockCheck = await client.query(
          "SELECT stock FROM Item WHERE id_item=$1", [item.id_item]
        );
        if (stockCheck.rows[0].stock < item.cantidad)
          throw new Error(`Stock insuficiente para ítem ${item.id_item}`);
        await client.query(
          "UPDATE Item SET stock = stock - $1 WHERE id_item = $2",
          [item.cantidad, item.id_item]
        );
      }
      if (item.id_lootbox) {
        const stockCheck = await client.query(
          "SELECT stock FROM Lootbox WHERE id_lootbox=$1", [item.id_lootbox]
        );
        if (stockCheck.rows[0].stock < item.cantidad)
          throw new Error(`Stock insuficiente para lootbox ${item.id_lootbox}`);
        await client.query(
          "UPDATE Lootbox SET stock = stock - $1 WHERE id_lootbox = $2",
          [item.cantidad, item.id_lootbox]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ mensaje: "Orden creada", orden });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════
// REPORTES
// ══════════════════════════════════════════════════════════════════════════

app.get("/api/reportes/top-items", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.nombre AS item, c.nombre AS categoria,
             p.nombre AS proveedor,
             SUM(d.cantidad) AS total_vendido,
             SUM(d.cantidad * d.precio_unitario) AS ingresos
      FROM DetalleOrden d
      JOIN Item      i ON d.id_item      = i.id_item
      JOIN Categoria c ON i.id_categoria = c.id_categoria
      JOIN Proveedor p ON i.id_proveedor = p.id_proveedor
      GROUP BY i.nombre, c.nombre, p.nombre
      ORDER BY total_vendido DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/ventas-empleado", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.nombre AS empleado, e.rol,
             COUNT(o.id_orden) AS total_ordenes,
             SUM(o.total) AS total_vendido
      FROM Orden o
      JOIN Empleado e ON o.id_empleado = e.id_empleado
      GROUP BY e.nombre, e.rol
      HAVING COUNT(o.id_orden) > 0
      ORDER BY total_vendido DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/historial/:id_usuario", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id_orden, o.fecha, o.total, o.estado,
             COALESCE(i.nombre, l.nombre) AS producto,
             d.cantidad, d.precio_unitario
      FROM Orden o
      JOIN DetalleOrden d ON o.id_orden   = d.id_orden
      LEFT JOIN Item    i ON d.id_item    = i.id_item
      LEFT JOIN Lootbox l ON d.id_lootbox = l.id_lootbox
      WHERE o.id_usuario = $1
      ORDER BY o.fecha DESC
    `, [req.params.id_usuario]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/usuarios-limitados", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM Usuario
      WHERE id_usuario IN (
        SELECT DISTINCT o.id_usuario
        FROM Orden o
        JOIN DetalleOrden d ON o.id_orden = d.id_orden
        WHERE d.id_lootbox IN (
          SELECT id_lootbox FROM Lootbox WHERE es_edicion_limitada = TRUE
        )
      )
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/items-sin-venta", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.id_item, i.nombre, i.precio, i.stock
      FROM Item i
      WHERE NOT EXISTS (
        SELECT 1 FROM DetalleOrden d WHERE d.id_item = i.id_item
      )
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/categorias-populares", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.nombre AS categoria,
             COUNT(DISTINCT i.id_item) AS total_items,
             SUM(d.cantidad) AS unidades_vendidas,
             SUM(d.cantidad * d.precio_unitario) AS ingresos_totales
      FROM Categoria c
      JOIN Item         i ON c.id_categoria = i.id_categoria
      JOIN DetalleOrden d ON i.id_item       = d.id_item
      GROUP BY c.nombre
      HAVING SUM(d.cantidad) > 2
      ORDER BY ingresos_totales DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reportes/ranking-usuarios", async (req, res) => {
  try {
    const result = await pool.query(`
      WITH gasto_por_usuario AS (
        SELECT u.id_usuario, u.nombre_usuario, u.email,
               COUNT(o.id_orden)  AS total_ordenes,
               SUM(o.total)       AS gasto_total
        FROM Usuario u
        LEFT JOIN Orden o ON u.id_usuario = o.id_usuario
        GROUP BY u.id_usuario, u.nombre_usuario, u.email
      )
      SELECT *, RANK() OVER (ORDER BY gasto_total DESC NULLS LAST) AS ranking
      FROM gasto_por_usuario
      ORDER BY ranking
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
