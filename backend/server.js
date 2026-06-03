const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./lib/db');
const { 
    enviarRecordatorios, 
    reintentarFallidos, 
    normalizarFecha, 
    obtenerFechaManana,
    buscarOCrearCliente,
    buscarClientePorNombre,
    obtenerClientes,
    obtenerMensajeConfig
} = require('./lib/recordatorios');
const {
    citasPorMes,
    clientesTop,
    serviciosTop,
    resumenGeneral,
    citasPorDiaSemana,
    enviosPorDia
} = require('./lib/estadisticas');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================
// RUTAS DE CLIENTES
// ============================================

app.get('/clientes', (req, res) => {
    const clientes = obtenerClientes();
    res.json({ exito: true, datos: clientes });
});

app.get('/clientes/buscar/:nombre', (req, res) => {
    const { nombre } = req.params;
    const clientes = buscarClientePorNombre(nombre);
    res.json({ exito: true, datos: clientes });
});

app.post('/clientes', (req, res) => {
    const { nombre, telefono, notas } = req.body;
    
    if (!nombre || !telefono) {
        return res.status(400).json({ exito: false, mensaje: 'Nombre y teléfono son obligatorios' });
    }

    try {
        const cliente = buscarOCrearCliente(nombre, telefono);
        
        if (notas) {
            db.prepare('UPDATE clientes SET notas = ? WHERE id = ?').run(notas, cliente.id);
        }
        
        res.json({ 
            exito: true, 
            mensaje: 'Cliente guardado',
            datos: cliente 
        });
    } catch (error) {
        res.status(400).json({ exito: false, mensaje: error.message });
    }
});

// ============================================
// RUTAS DE CONFIGURACIÓN
// ============================================

app.get('/config/mensaje', (req, res) => {
    const config = obtenerMensajeConfig();
    res.json({ 
        exito: true, 
        mensaje: config,
        variables: '{nombre}, {fecha}, {hora}, {servicio}'
    });
});

app.post('/config/mensaje', (req, res) => {
    const { mensaje_recordatorio, mensaje_confirmacion } = req.body;
    
    if (!mensaje_recordatorio) {
        return res.status(400).json({ exito: false, mensaje: 'El mensaje de recordatorio es obligatorio' });
    }

    try {
        const stmt = db.prepare(`
            UPDATE config_mensajes 
            SET mensaje_recordatorio = ?, 
                mensaje_confirmacion = ?,
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id = 1
        `);
        stmt.run(mensaje_recordatorio, mensaje_confirmacion || '');
        
        res.json({ 
            exito: true, 
            mensaje: 'Mensaje actualizado correctamente' 
        });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ============================================
// RUTAS DE CITAS
// ============================================

app.post('/citas', (req, res) => {
    const { nombre, telefono, fecha, hora, servicio } = req.body;
    
    if (!nombre || !fecha || !hora) {
        return res.status(400).json({ exito: false, mensaje: 'Nombre, fecha y hora son obligatorios' });
    }

    try {
        const fechaNormalizada = normalizarFecha(fecha);
        
        let telefonoFinal = telefono;
        if (!telefonoFinal) {
            const clientes = buscarClientePorNombre(nombre);
            if (clientes.length > 0) {
                telefonoFinal = clientes[0].telefono;
            } else {
                return res.status(400).json({ 
                    exito: false, 
                    mensaje: 'Teléfono no proporcionado y cliente no encontrado' 
                });
            }
        }
        
        buscarOCrearCliente(nombre, telefonoFinal);
        
        const stmt = db.prepare(`
            INSERT INTO citas (nombre, telefono, fecha, hora, servicio) 
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(nombre, telefonoFinal, fechaNormalizada, hora, servicio || '');
        
        res.json({ 
            exito: true, 
            mensaje: 'Cita guardada',
            id: result.lastInsertRowid,
            telefono_usado: telefonoFinal
        });
        
    } catch (error) {
        res.status(400).json({ exito: false, mensaje: error.message });
    }
});

app.get('/citas/:fecha', (req, res) => {
    const { fecha } = req.params;
    try {
        const fechaNormalizada = normalizarFecha(fecha);
        const stmt = db.prepare('SELECT * FROM citas WHERE fecha = ? ORDER BY hora');
        const citas = stmt.all(fechaNormalizada);
        res.json({ exito: true, datos: citas });
    } catch (error) {
        res.status(400).json({ exito: false, mensaje: error.message });
    }
});

app.get('/citas', (req, res) => {
    const stmt = db.prepare('SELECT * FROM citas ORDER BY fecha DESC, hora DESC');
    const citas = stmt.all();
    res.json({ exito: true, datos: citas });
});

app.delete('/citas/:id', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM citas WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
        return res.status(404).json({ exito: false, mensaje: 'Cita no encontrada' });
    }
    
    res.json({ exito: true, mensaje: 'Cita eliminada' });
});

// ============================================
// RUTAS DE ESTADÍSTICAS (NUEVO)
// ============================================

app.get('/stats/resumen', (req, res) => {
    try {
        const datos = resumenGeneral();
        res.json({ exito: true, datos });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

app.get('/stats/citas-mes', (req, res) => {
    try {
        const datos = citasPorMes();
        res.json({ exito: true, datos });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

app.get('/stats/clientes-top', (req, res) => {
    try {
        const datos = clientesTop();
        res.json({ exito: true, datos });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

app.get('/stats/servicios', (req, res) => {
    try {
        const datos = serviciosTop();
        res.json({ exito: true, datos });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

app.get('/stats/dias-semana', (req, res) => {
    try {
        const datos = citasPorDiaSemana();
        res.json({ exito: true, datos });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

app.get('/stats/envios', (req, res) => {
    try {
        const datos = enviosPorDia();
        res.json({ exito: true, datos });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

// ============================================
// ADMINISTRACIÓN
// ============================================

app.post('/admin/enviar-recordatorios', async (req, res) => {
    const { fecha } = req.body;
    
    try {
        console.log('👤 Envío manual solicitado via API');
        const resultado = await enviarRecordatorios(fecha);
        res.json({ exito: true, ...resultado });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
});

app.get('/admin/logs', (req, res) => {
    const stmt = db.prepare(`
        SELECT * FROM logs_envio 
        ORDER BY creado_en DESC 
        LIMIT 100
    `);
    const logs = stmt.all();
    res.json({ exito: true, datos: logs });
});

app.get('/admin/estadisticas', (req, res) => {
    const hoy = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
        SELECT estado, COUNT(*) as cantidad
        FROM logs_envio
        WHERE DATE(creado_en) = ?
        GROUP BY estado
    `);
    const stats = stmt.all(hoy);
    res.json({ exito: true, fecha: hoy, datos: stats });
});

// ============================================
// CRON JOBS
// ============================================

cron.schedule('0 9 * * *', async () => {
    console.log('🤖 Cron: Enviando recordatorios...');
    await enviarRecordatorios();
});

cron.schedule('30 9 * * *', async () => {
    console.log('🔄 Cron: Reintentando fallidos...');
    await reintentarFallidos();
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, () => {
    console.log(`✂️ Servidor en puerto ${PUERTO}`);
    console.log(`📅 Panel: http://localhost:${PUERTO}/`);
    console.log(`👥 Clientes: http://localhost:${PUERTO}/clientes`);
    console.log(`📊 Stats: http://localhost:${PUERTO}/stats/resumen`);
    console.log(`🤖 Recordatorios: 9:00 AM | Reintentos: 9:30 AM`);
});