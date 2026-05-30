-- ============================================================
-- PROYECTO 3 — AUTENTICACIÓN
-- Archivo: db/seed_auth.sql  →  04_seed_auth.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS AppUsuario (
  id_appusuario SERIAL PRIMARY KEY,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(30)  NOT NULL CHECK (rol IN (
                  'rol_admin','rol_empleado','rol_bodeguero',
                  'rol_contador','rol_cliente')),
  nombre        VARCHAR(100) NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO AppUsuario (username, password_hash, rol, nombre) VALUES
  ('admin',
   '$2b$10$8rsCT9Q4HemQzjyAVqMYeem5ioXMeBZSReVC48AoS1RmkH2UhYbte',
   'rol_admin',      'Administrador Principal'),
  ('empleado1',
   '$2b$10$Ie0/bwf577ppweN8jaNrU./WFiEcPN6bbsf.P590hWxoGFLlflB2C',
   'rol_empleado',   'Carlos Empleado'),
  ('bodeguero1',
   '$2b$10$fa4DG.VJKnmNz5SipbR6ieJrDoKTb.0mTaT3yK6l52OzokqUEYbLe',
   'rol_bodeguero',  'María Bodeguera'),
  ('contador1',
   '$2b$10$ZJvHDIOToU7/xOE55tMAGug8oxbP.ckTdDGP/pJFhuKVGOomMf1m2',
   'rol_contador',   'Luis Contador'),
  ('cliente1',
   '$2b$10$XMWOy.WLX9hqjZnVu0mxIe6EyiX/b/7DHfgOY5UnKIwBDh0/K7gUW',
   'rol_cliente',    'Ana Cliente')
ON CONFLICT (username) DO NOTHING;
