# Esquema de Roles — LootVault (Proyecto 3)

## Roles definidos en el DBMS

Se definen exactamente **5 roles** en PostgreSQL mediante `CREATE ROLE`, con permisos granulares asignados por tabla y operación usando `GRANT` y `REVOKE`.

---

## Tabla de permisos por rol

| Rol | Descripción | Tabla | Operaciones permitidas |
|-----|-------------|-------|------------------------|
| `rol_admin` | Control total del sistema | **Todas** | SELECT, INSERT, UPDATE, DELETE |
| `rol_empleado` | Atiende ventas al cliente | `Orden` | SELECT, INSERT, UPDATE |
| | | `DetalleOrden` | SELECT, INSERT |
| | | `Item` | SELECT |
| | | `Lootbox` | SELECT |
| | | `Categoria` | SELECT |
| | | `Proveedor` | SELECT |
| | | `Usuario` | SELECT |
| `rol_bodeguero` | Gestiona inventario y stock | `Item` | SELECT, UPDATE |
| | | `Lootbox` | SELECT, UPDATE |
| | | `Categoria` | SELECT |
| | | `Proveedor` | SELECT |
| | | `DetalleOrden` | SELECT |
| | `Orden`, `Usuario`, `Empleado` | **Sin acceso** (REVOKE ALL) |
| `rol_contador` | Auditoría financiera y reportes | `Orden` | SELECT |
| | | `DetalleOrden` | SELECT |
| | | `Item` | SELECT |
| | | `Lootbox` | SELECT |
| | | `Categoria` | SELECT |
| | | `Proveedor` | SELECT |
| | `Usuario`, `Empleado` | **Sin acceso** (REVOKE ALL) |
| `rol_cliente` | Visualiza catálogo público | `Item` | SELECT |
| | | `Lootbox` | SELECT |
| | | `Categoria` | SELECT |
| | `Orden`, `DetalleOrden`, `Empleado`, `Usuario`, `Proveedor` | **Sin acceso** (REVOKE ALL) |

---

## Usuarios de prueba por rol

| Username | Contraseña | Rol | Nombre |
|----------|------------|-----|--------|
| `admin` | `admin123` | `rol_admin` | Administrador Principal |
| `empleado1` | `empleado123` | `rol_empleado` | Carlos Empleado |
| `bodeguero1` | `bodeguero123` | `rol_bodeguero` | María Bodeguera |
| `contador1` | `contador123` | `rol_contador` | Luis Contador |
| `cliente1` | `cliente123` | `rol_cliente` | Ana Cliente |

---

## Vistas protegidas por rol en la UI

| Sección | admin | empleado | bodeguero | contador | cliente |
|---------|:-----:|:--------:|:---------:|:--------:|:-------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ítems | ✅ | ✅ | ✅ | ❌ | ✅ |
| Lootboxes | ✅ | ✅ | ✅ | ❌ | ✅ |
| Categorías | ✅ | ✅ | ✅ | ❌ | ✅ |
| Proveedores | ✅ | ✅ | ✅ | ❌ | ❌ |
| Órdenes | ✅ | ✅ | ❌ | ✅ | ❌ |
| Usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reportes | ✅ | ❌ | ❌ | ✅ | ❌ |

> Las rutas de la API también están protegidas en el backend con middleware `requireRole(...)`.  
> Si un rol intenta acceder a una ruta no permitida, el servidor responde con **HTTP 403**.
