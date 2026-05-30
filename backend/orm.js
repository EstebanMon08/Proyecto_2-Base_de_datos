// ============================================================
// PROYECTO 3 — ORM CON SEQUELIZE
// Archivo: backend/orm.js
// ============================================================

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,     // proy3
  process.env.DB_PASSWORD, // secret
  {
    host:    process.env.DB_HOST,
    port:    process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

// ── MODELOS ────────────────────────────────────────────────

const Categoria = sequelize.define('Categoria', {
  id_categoria: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:       { type: DataTypes.STRING(100), allowNull: false },
  descripcion:  { type: DataTypes.TEXT },
}, { tableName: 'categoria', timestamps: false });

const Proveedor = sequelize.define('Proveedor', {
  id_proveedor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:       { type: DataTypes.STRING(100), allowNull: false },
  contacto:     { type: DataTypes.STRING(120) },
  activo:       { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'proveedor', timestamps: false });

const Item = sequelize.define('Item', {
  id_item:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:              { type: DataTypes.STRING(100), allowNull: false },
  descripcion:         { type: DataTypes.TEXT },
  precio:              { type: DataTypes.DECIMAL(10,2), allowNull: false },
  stock:               { type: DataTypes.INTEGER, allowNull: false },
  es_edicion_limitada: { type: DataTypes.BOOLEAN, defaultValue: false },
  id_categoria:        { type: DataTypes.INTEGER, allowNull: false },
  id_proveedor:        { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'item', timestamps: false });

const AppUsuario = sequelize.define('AppUsuario', {
  id_appusuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username:      { type: DataTypes.STRING(60), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  rol:           { type: DataTypes.STRING(30), allowNull: false },
  nombre:        { type: DataTypes.STRING(100), allowNull: false },
  activo:        { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'appusuario', timestamps: false });

// ── FUNCIONES CRUD VÍA ORM ─────────────────────────────────
// Estas reemplazan las queries directas de pg en las rutas

// CRUD 1 — Categorías
const orm = {

  async getCategorias() {
    return Categoria.findAll({ order: [['id_categoria', 'ASC']] });
  },

  async createCategoria({ nombre, descripcion }) {
    return Categoria.create({ nombre, descripcion });
  },

  async updateCategoria(id, { nombre, descripcion }) {
    const cat = await Categoria.findByPk(id);
    if (!cat) throw new Error('Categoría no encontrada');
    return cat.update({ nombre, descripcion });
  },

  async deleteCategoria(id) {
    const cat = await Categoria.findByPk(id);
    if (!cat) throw new Error('Categoría no encontrada');
    await cat.destroy();
    return { mensaje: 'Categoría eliminada' };
  },

  // CRUD 2 — Proveedores
  async getProveedores() {
    return Proveedor.findAll({ order: [['id_proveedor', 'ASC']] });
  },

  async createProveedor({ nombre, contacto, activo }) {
    return Proveedor.create({ nombre, contacto, activo: activo ?? true });
  },

  async updateProveedor(id, { nombre, contacto, activo }) {
    const prov = await Proveedor.findByPk(id);
    if (!prov) throw new Error('Proveedor no encontrado');
    return prov.update({ nombre, contacto, activo: activo ?? true });
  },

  async deleteProveedor(id) {
    const prov = await Proveedor.findByPk(id);
    if (!prov) throw new Error('Proveedor no encontrado');
    await prov.destroy();
    return { mensaje: 'Proveedor eliminado' };
  },

  // CRUD 3 — Items (crear y actualizar usan el SP, delete usa ORM)
  async deleteItem(id) {
    const item = await Item.findByPk(id);
    if (!item) throw new Error('Ítem no encontrado');
    await item.destroy();
    return { mensaje: 'Ítem eliminado' };
  },

  // Auth
  async getAppUsuarioByUsername(username) {
    return AppUsuario.findOne({ where: { username, activo: true } });
  },
};

module.exports = { sequelize, orm, Categoria, Proveedor, Item, AppUsuario };
