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

--Hashes

--admin123      $2b$10$KIBpkGLkMlnSvJBMy.0lr.WlFbgFYWvO9iBLKbCGXJl3TFUMfyqRi
--empleado123   $2b$10$N5pQ3kXwMzYa4Vr7cHdJeO1mT8sLpF2nR6uE9jK0iA3bW4xG5yC1S
--bodeguero123  $2b$10$P7qR4mYxNaZb5Ws8dIeKfP2nU9tMqG3oS7vF0kL1jB4cX5yH6zD2T
--contador123   $2b$10$Q8sS5nZyOaAc6Xt9eJfLgQ3oV0uNrH4pT8wG1lM2kC5dY6zI7aE3U
--cliente123    $2b$10$R9tT6oAzPbBd7Yu0fKgMhR4pW1vOsI5qU9xH2mN3lD6eZ7aJ8bF4V

INSERT INTO AppUsuario (username, password_hash, rol, nombre) VALUES
  ('admin',
   '$2b$10$KIBpkGLkMlnSvJBMy.0lr.WlFbgFYWvO9iBLKbCGXJl3TFUMfyqRi',
   'rol_admin',      'Administrador Principal'),
  ('empleado1',
   '$2b$10$N5pQ3kXwMzYa4Vr7cHdJeO1mT8sLpF2nR6uE9jK0iA3bW4xG5yC1S',
   'rol_empleado',   'Carlos Empleado'),
  ('bodeguero1',
   '$2b$10$P7qR4mYxNaZb5Ws8dIeKfP2nU9tMqG3oS7vF0kL1jB4cX5yH6zD2T',
   'rol_bodeguero',  'María Bodeguera'),
  ('contador1',
   '$2b$10$Q8sS5nZyOaAc6Xt9eJfLgQ3oV0uNrH4pT8wG1lM2kC5dY6zI7aE3U',
   'rol_contador',   'Luis Contador'),
  ('cliente1',
   '$2b$10$R9tT6oAzPbBd7Yu0fKgMhR4pW1vOsI5qU9xH2mN3lD6eZ7aJ8bF4V',
   'rol_cliente',    'Ana Cliente')
ON CONFLICT (username) DO NOTHING;
