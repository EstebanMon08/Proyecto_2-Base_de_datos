DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'proy3') THEN
    CREATE USER proy3 WITH PASSWORD 'secret';
  END IF;
END $$;

GRANT CONNECT ON DATABASE lootboxdb TO proy3;
GRANT USAGE ON SCHEMA public TO proy3;


-- Rol 1: Administrador
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_admin') THEN
    CREATE ROLE rol_admin;
  END IF;
END $$;

-- Rol 2: Empleado
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_empleado') THEN
    CREATE ROLE rol_empleado;
  END IF;
END $$;

-- Rol 3: Bodeguero
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_bodeguero') THEN
    CREATE ROLE rol_bodeguero;
  END IF;
END $$;

-- Rol 4: Contador
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_contador') THEN
    CREATE ROLE rol_contador;
  END IF;
END $$;

-- Rol 5: Cliente
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_cliente') THEN
    CREATE ROLE rol_cliente;
  END IF;
END $$;




--ADMIN
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO rol_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rol_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public        TO rol_admin;

--EMPLEADO
GRANT SELECT, INSERT, UPDATE ON Orden        TO rol_empleado;
GRANT SELECT, INSERT         ON DetalleOrden TO rol_empleado;
GRANT SELECT                 ON Item         TO rol_empleado;
GRANT SELECT                 ON Lootbox      TO rol_empleado;
GRANT SELECT                 ON Categoria    TO rol_empleado;
GRANT SELECT                 ON Proveedor    TO rol_empleado;
GRANT SELECT                 ON Usuario      TO rol_empleado;
GRANT SELECT, USAGE ON SEQUENCE orden_id_orden_seq           TO rol_empleado;
GRANT SELECT, USAGE ON SEQUENCE detalleorden_id_detalle_seq  TO rol_empleado;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public              TO rol_empleado;

--ROL_BODEGUERO
GRANT SELECT, UPDATE ON Item     TO rol_bodeguero;
GRANT SELECT, UPDATE ON Lootbox  TO rol_bodeguero;
GRANT SELECT         ON Categoria  TO rol_bodeguero;
GRANT SELECT         ON Proveedor  TO rol_bodeguero;
GRANT SELECT         ON DetalleOrden TO rol_bodeguero;
REVOKE ALL ON Orden   FROM rol_bodeguero;
REVOKE ALL ON Usuario FROM rol_bodeguero;
REVOKE ALL ON Empleado FROM rol_bodeguero;

--ROL_CONTADOR
GRANT SELECT ON Orden        TO rol_contador;
GRANT SELECT ON DetalleOrden TO rol_contador;
GRANT SELECT ON Item         TO rol_contador;
GRANT SELECT ON Lootbox      TO rol_contador;
GRANT SELECT ON Categoria    TO rol_contador;
GRANT SELECT ON Proveedor    TO rol_contador;
REVOKE ALL ON Usuario  FROM rol_contador;
REVOKE ALL ON Empleado FROM rol_contador;

--ROL_CLIENTE
GRANT SELECT ON Item      TO rol_cliente;
GRANT SELECT ON Lootbox   TO rol_cliente;
GRANT SELECT ON Categoria TO rol_cliente;
REVOKE ALL ON Orden        FROM rol_cliente;
REVOKE ALL ON DetalleOrden FROM rol_cliente;
REVOKE ALL ON Empleado     FROM rol_cliente;
REVOKE ALL ON Usuario      FROM rol_cliente;
REVOKE ALL ON Proveedor    FROM rol_cliente;


GRANT rol_admin TO proy3;
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO proy3;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO proy3;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public        TO proy3;
