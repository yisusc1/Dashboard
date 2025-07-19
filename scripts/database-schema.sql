-- Crear tabla de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    fecha_solicitud DATE NOT NULL,
    nombre_cliente VARCHAR(255) NOT NULL,
    cedula VARCHAR(20) NOT NULL,
    contacto_1 VARCHAR(20) NOT NULL,
    contacto_2 VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    ubicacion VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    sector VARCHAR(255) NOT NULL,
    calle VARCHAR(255) NOT NULL,
    casa VARCHAR(100) NOT NULL,
    coordenadas TEXT,
    tipo_servicio VARCHAR(50) NOT NULL,
    fecha_disponibilidad DATE NOT NULL,
    asesor VARCHAR(255) NOT NULL,
    fuente_conocimiento VARCHAR(100) NOT NULL,
    estado_solicitud VARCHAR(50) DEFAULT 'Pendiente',
    equipo VARCHAR(50),
    tecnico_1 VARCHAR(255),
    tecnico_2 VARCHAR(255),
    fecha_asignada DATE,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de técnicos
CREATE TABLE IF NOT EXISTS technicians (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    especialidad VARCHAR(100),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Insertar técnicos de ejemplo
INSERT INTO technicians (nombre, especialidad) VALUES
('Juan Pérez', 'Instalación'),
('María García', 'Instalación'),
('Carlos López', 'Soporte'),
('Ana Martín', 'Soporte'),
('Luis Rodríguez', 'Instalación'),
('Carmen Silva', 'Soporte')
ON CONFLICT (nombre) DO NOTHING;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_disponibilidad ON solicitudes(fecha_disponibilidad);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_asignada ON solicitudes(fecha_asignada);
CREATE INDEX IF NOT EXISTS idx_technicians_activo ON technicians(activo);
