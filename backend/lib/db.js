const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'citas.db');
const db = new Database(dbPath);

// Tabla de citas
db.exec(`CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    servicio TEXT,
    estado TEXT DEFAULT 'pendiente',
    recordatorio_enviado INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Tabla de clientes (NUEVO)
db.exec(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    telefono TEXT NOT NULL,
    notas TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Tabla de configuración de mensajes (NUEVO)
db.exec(`CREATE TABLE IF NOT EXISTS config_mensajes (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mensaje_recordatorio TEXT NOT NULL,
    mensaje_confirmacion TEXT,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Insertar mensaje por defecto si no existe
const existeConfig = db.prepare('SELECT COUNT(*) as count FROM config_mensajes').get();
if (existeConfig.count === 0) {
    db.prepare(`
        INSERT INTO config_mensajes (id, mensaje_recordatorio, mensaje_confirmacion)
        VALUES (1, 
            'Hola {nombre}, le recordamos su cita el {fecha} a las {hora} para {servicio}. Por favor confirme con un SI si va a venir. Gracias.',
            '✅ Su cita ha sido confirmada. Le esperamos el {fecha} a las {hora}.'
        )
    `).run();
}

// Tabla de logs
db.exec(`CREATE TABLE IF NOT EXISTS logs_envio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cita_id INTEGER,
    telefono TEXT,
    mensaje TEXT,
    estado TEXT,
    respuesta_api TEXT,
    error TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cita_id) REFERENCES citas(id)
)`);

module.exports = db;