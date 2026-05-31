// ============================================
// SERVIDOR DE RECORDATORIOS DE CITAS
// ============================================

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estaticos (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================
// BASE DE DATOS SQLITE
// ============================================
const dbPath = path.join(__dirname, 'citas.db');
const db = new Database(dbPath);

// Crear tabla de citas
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

// ============================================
// CONFIGURACION WHATSAPP (Wappfly)
// ============================================
const WAPPFLY_API_KEY = '58af262719284617adc07231e83718f95bacfc9ec7a59ea40994efcc0cb54077';
const WAPPFLY_PHONE = '34636894249';

// Funcion para enviar WhatsApp
async function enviarWhatsApp(telefono, mensaje) {
    try {
        const url = 'https://wappfly.com/api/messages/send';
        
        const response = await axios.post(url, {
            to: telefono + '@s.whatsapp.net',
            text: mensaje
        }, {
            headers: {
                'X-API-Token': WAPPFLY_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`WhatsApp enviado a ${telefono}:`, response.data);
        return true;
    } catch (error) {
        console.error(`Error enviando a ${telefono}:`, error.response?.data || error.message);
        return false;
    }
}

// ============================================
// RUTAS API
// ============================================

// Crear nueva cita
app.post('/citas', (req, res) => {
    const { nombre, telefono, fecha, hora, servicio } = req.body;
    
    if (!nombre || !telefono || !fecha || !hora) {
        return res.status(400).json({ exito: false, mensaje: 'Faltan datos obligatorios' });
    }

    const stmt = db.prepare('INSERT INTO citas (nombre, telefono, fecha, hora, servicio) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(nombre, telefono, fecha, hora, servicio || '');
    
    res.json({ 
        exito: true, 
        mensaje: 'Cita guardada',
        id: result.lastInsertRowid 
    });
});

// Obtener citas de una fecha
app.get('/citas/:fecha', (req, res) => {
    const { fecha } = req.params;
    const stmt = db.prepare('SELECT * FROM citas WHERE fecha = ? ORDER BY hora');
    const citas = stmt.all(fecha);
    res.json({ exito: true, datos: citas });
});

// Obtener todas las citas
app.get('/citas', (req, res) => {
    const stmt = db.prepare('SELECT * FROM citas ORDER BY fecha DESC, hora DESC');
    const citas = stmt.all();
    res.json({ exito: true, datos: citas });
});

// Eliminar cita
app.delete('/citas/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM citas WHERE id = ?');
    stmt.run(id);
    res.json({ exito: true, mensaje: 'Cita eliminada' });
});

// ============================================
// ROBOT DE RECORDATORIOS (Cron Job)
// ============================================
// Se ejecuta todos los dias a las 9:00 de la manana
cron.schedule('0 9 * * *', () => {
    console.log('🤖 Enviando recordatorios...');
    enviarRecordatorios();
});

function enviarRecordatorios() {
    // Calcular manana
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];

    // Buscar citas de manana que no tengan recordatorio enviado
    const stmt = db.prepare('SELECT * FROM citas WHERE fecha = ? AND recordatorio_enviado = 0');
    const citas = stmt.all(fechaManana);

    console.log(`Encontradas ${citas.length} citas para manana (${fechaManana})`);

    citas.forEach(cita => {
        const mensaje = `Hola ${cita.nombre}, le recordamos su cita manana ${cita.fecha} a las ${cita.hora} en nuestra peluqueria. Por favor confirme con un SI si va a venir. Gracias.`;
        
        enviarWhatsApp(cita.telefono, mensaje).then(enviado => {
            if (enviado) {
                const update = db.prepare('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?');
                update.run(cita.id);
            }
        });
    });
}

// ============================================
// INICIAR SERVIDOR
// ============================================
const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, () => {
    console.log(`✂️ Servidor de peluqueria corriendo en puerto ${PUERTO}`);
    console.log(`📅 Panel de citas: http://localhost:${PUERTO}/`);
    console.log(`🤖 Recordatorios automaticos activados (9:00 AM)`);
});