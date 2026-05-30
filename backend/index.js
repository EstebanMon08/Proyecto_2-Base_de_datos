const express  = require("express");
const { Pool } = require("pg");
const cors     = require("cors");
const path     = require("path");
const bcrypt   = require("bcrypt");
const session  = require("express-session");
const { sequelize, orm } = require('./orm');

const app  = express();
const PORT = process.env.PORT || 3000;

//DB CONNECTION
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

//MIDDLEWARE
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || "lootbox_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }
}));

sequelize.authenticate()
  .then(() => console.log('ORM Sequelize conectado'))
  .catch(err => console.error('Error ORM:', err));

// ── PERMISOS POR ROL ───────────────────────────────────────
const ROLE_PERMISSIONS = {
  rol_admin:     ["dashboard","items","lootboxes","categorias","proveedores","ordenes","usuarios","reportes"],
  rol_empleado:  ["dashboard","items","lootboxes","categorias","proveedores","ordenes","usuarios"],
  rol_bodeguero: ["dashboard","items","lootboxes","categorias","proveedores"],
  rol_contador:  ["dashboard","ordenes","reportes"],
  rol_cliente:   ["dashboard","items","lootboxes","categorias"],
};

// ── MIDDLEWARES DE AUTH ────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.usuario)
    return res.status(401).json({ error: "No autenticado" });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.usuario)
      return res.status(401).json({ error: "No autenticado" });
    if (!roles.includes(req.session.usuario.rol))
      return res.status(403).json({ error: "No tienes permiso para esta acción" });
    next();
  };
}

// ── HELPER STORED PROCEDURES ───────────────────────────────
async function callSP(spName, inParams, outParams) {
  const allParams = [...inParams, ...outParams.map(() => null)];
  const placeholders = allParams.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query(`CALL ${spName}(${placeholders})`, allParams);
  return result.rows[0];
}

// ── AUTH ROUTES ────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Usuario y contraseña requeridos" });
  try {
    const result = await pool.query(
      "SELECT * FROM AppUsuario WHERE username = $1 AND activo = TRUE", [username]
    );
    if (!result.rows.length)
      return res.status(401).json({ error: "Credenciales inválidas" });
    const usuario = result.rows[0];
    const match = await bcrypt.compare(password, usuario.password_hash);
    if (!match)
      return res.status(401).json({ error: "Credenciales inválidas" });
    req.session.usuario = {
      id: usuario.id_appusuario, username: usuario.username,
      nombre: usuario.nombre, rol: usuario.rol,
    };
    res.json({ mensaje: "Login exitoso", usuario: req.session.usuario,
      permisos: ROLE_PERMISSIONS[usuario.rol] || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
    res.clearCookie("connect.sid");
    res.json({ mensaje: "Sesión cerrada" });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.usuario)
    return res.status(401).json({ error: "No autenticado" });
  res.json({ usuario: req.session.usuario,
    permisos: ROLE_PERMISSIONS[req.session.usuario.rol] || [] });
});

// ── STORED PROCEDURE ROUTES ────────────────────────────────
app.post('/api/sp/ventas', requireRole('rol_admin','rol_empleado'), async (req, res) => {
  const { id_usuario, id_empleado, id_item, id_lootbox, cantidad, precio } = req.body;
  if (!id_usuario || !id_empleado || !cantidad || !precio)
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  try {
    const r = await callSP('sp_registrar_venta',
      [id_usuario, id_empleado, id_item||null, id_lootbox||null, cantidad, precio],
      ['p_id_orden','p_mensaje']);
    if (!r.p_id_orden) return res.status(400).json({ error: r.p_mensaje });
    res.status(201).json({ id_orden: r.p_id_orden, mensaje: r.p_mensaje });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/sp/stock', requireRole('rol_admin','rol_bodeguero'), async (req, res) => {
  const { tipo, id, nuevo_stock } = req.body;
  if (!tipo || !id || nuevo_stock === undefined)
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  try {
    const r = await callSP('sp_actualizar_stock', [tipo, id, nuevo_stock],
      ['p_stock_anterior','p_mensaje']);
    res.json({ stock_anterior: r.p_stock_anterior, mensaje: r.p_mensaje });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/sp/items', requireRole('rol_admin','rol_bodeguero'), async (req, res) => {
  const { nombre, descripcion, precio, stock, es_edicion_limitada, id_categoria, id_proveedor } = req.body;
  if (!nombre || !precio || stock === undefined || !id_categoria || !id_proveedor)
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  try {
    const r = await callSP('sp_crear_item',
      [nombre, descripcion||null, precio, stock, es_edicion_limitada??false, id_categoria, id_proveedor],
      ['p_id_item','p_mensaje']);
    if (!r.p_id_item) return res.status(400).json({ error: r.p_mensaje });
    res.status(201).json({ id_item: r.p_id_item, mensaje: r.p_mensaje });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/sp/ordenes/:id/cancelar', requireRole('rol_admin','rol_empleado'), async (req, res) => {
  try {
    const r = await callSP('sp_cancelar_orden', [parseInt(req.params.id)], ['p_mensaje']);
    res.json({ mensaje: r.p_mensaje });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/sp/reportes/ventas', requireRole('rol_admin','rol_contador'), async (req, res) => {
  const { desde, hasta } = req.query;
  if (!desde || !hasta)
    return res.status(400).json({ error: 'Parámetros desde y hasta requeridos' });
  try {
    const r = await callSP('sp_reporte_ventas_periodo', [desde, hasta],
      ['p_total_ordenes','p_total_ingresos','p_mensaje']);
    res.json({ total_ordenes: r.p_total_ordenes, total_ingresos: r.p_total_ingresos, mensaje: r.p_mensaje });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── ORM ROUTES ─────────────────────────────────────────────
app.get('/api/orm/categorias', requireAuth, async (req, res) => {
  try { res.json(await orm.getCategorias()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/orm/categorias', requireRole('rol_admin'), async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try { res.status(201).json(await orm.createCategoria({ nombre, descripcion })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/orm/categorias/:id', requireRole('rol_admin'), async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try { res.json(await orm.updateCategoria(req.params.id, { nombre, descripcion })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/orm/categorias/:id', requireRole('rol_admin'), async (req, res) => {
  try { res.json(await orm.deleteCategoria(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/orm/proveedores', requireAuth, async (req, res) => {
  try { res.json(await orm.getProveedores()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/orm/proveedores', requireRole('rol_admin'), async (req, res) => {
  const { nombre, contacto, activo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try { res.status(201).json(await orm.createProveedor({ nombre, contacto, activo })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/orm/proveedores/:id', requireRole('rol_admin'), async (req, res) => {
  const { nombre, contacto, activo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try { res.json(await orm.updateProveedor(req.params.id, { nombre, contacto, activo })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/orm/proveedores/:id', requireRole('rol_admin'), async (req, res) => {
  try { res.json(await orm.deleteProveedor(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/orm/items/:id', requireRole('rol_admin'), async (req, res) => {
  try { res.json(await orm.deleteItem(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CATEGORIAS ─────────────────────────────────────────────
app.get("/api/categorias", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Categoria ORDER BY id_categoria");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/categorias", requireRole("rol_admin"), async (req, res) => {
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

app.put("/api/categorias/:id", requireRole("rol_admin"), async (req, res) => {
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

app.delete("/api/categorias/:id", requireRole("rol_admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Categoria WHERE id_categoria=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Categoría no encontrada" });
    res.json({ mensaje: "Categoría eliminada" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ITEMS ──────────────────────────────────────────────────
app.get("/api/items", requireAuth, async (req, res) => {
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

app.post("/api/items", requireRole("rol_admin", "rol_bodeguero"), async (req, res) => {
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

app.put("/api/items/:id", requireRole("rol_admin", "rol_bodeguero"), async (req, res) => {
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

app.delete("/api/items/:id", requireRole("rol_admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Item WHERE id_item=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Ítem no encontrado" });
    res.json({ mensaje: "Ítem eliminado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── LOOTBOXES ──────────────────────────────────────────────
app.get("/api/lootboxes", requireAuth, async (req, res) => {
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

app.post("/api/lootboxes", requireRole("rol_admin", "rol_bodeguero"), async (req, res) => {
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

app.put("/api/lootboxes/:id", requireRole("rol_admin", "rol_bodeguero"), async (req, res) => {
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

app.delete("/api/lootboxes/:id", requireRole("rol_admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Lootbox WHERE id_lootbox=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Lootbox no encontrada" });
    res.json({ mensaje: "Lootbox eliminada" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PROVEEDORES ────────────────────────────────────────────
app.get("/api/proveedores", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Proveedor ORDER BY id_proveedor");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/proveedores", requireRole("rol_admin"), async (req, res) => {
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

app.put("/api/proveedores/:id", requireRole("rol_admin"), async (req, res) => {
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

app.delete("/api/proveedores/:id", requireRole("rol_admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM Proveedor WHERE id_proveedor=$1 RETURNING *", [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Proveedor no encontrado" });
    res.json({ mensaje: "Proveedor eliminado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── USUARIOS ───────────────────────────────────────────────
app.get("/api/usuarios", requireRole("rol_admin", "rol_empleado"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Usuario ORDER BY id_usuario");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ÓRDENES ────────────────────────────────────────────────
app.get("/api/ordenes", requireRole("rol_admin", "rol_empleado", "rol_contador"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM venta_resumen ORDER BY fecha DESC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/ordenes", requireRole("rol_admin", "rol_empleado"), async (req, res) => {
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

// ── REPORTES ───────────────────────────────────────────────
app.get("/api/reportes/top-items", requireRole("rol_admin", "rol_contador"), async (req, res) => {
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

app.get("/api/reportes/ventas-empleado", requireRole("rol_admin", "rol_contador"), async (req, res) => {
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

app.get("/api/reportes/historial/:id_usuario", requireRole("rol_admin", "rol_empleado"), async (req, res) => {
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

app.get("/api/reportes/usuarios-limitados", requireRole("rol_admin", "rol_contador"), async (req, res) => {
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

app.get("/api/reportes/items-sin-venta", requireRole("rol_admin", "rol_contador"), async (req, res) => {
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

app.get("/api/reportes/categorias-populares", requireRole("rol_admin", "rol_contador"), async (req, res) => {
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

app.get("/api/reportes/ranking-usuarios", requireRole("rol_admin", "rol_contador"), async (req, res) => {
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

// ── START ──────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));