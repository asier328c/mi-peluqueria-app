const db = require('./db');
const { enviarWhatsApp } = require('./whatsapp');

function normalizarFecha(fecha) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }
    
    const partes = fecha.split(/[\/-]/);
    if (partes.length === 3) {
        const [dia, mes, anio] = partes;
        if (anio.length === 4) {
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        if (dia.length === 4) {
            return `${dia}-${mes.padStart(2, '0')}-${anio.padStart(2, '0')}`;
        }
    }
    
    throw new Error(`Formato de fecha no reconocido: ${fecha}`);
}

function obtenerFechaManana() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().split('T')[0];
}

function formatearFechaVisual(fecha) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
}

function obtenerMensajeConfig() {
    const stmt = db.prepare('SELECT * FROM config_mensajes WHERE id = 1');
    const config = stmt.get();
    return config ? config.mensaje_recordatorio : 'Hola {nombre}, le recordamos su cita el {fecha} a las {hora}.';
}

function personalizarMensaje(mensajeBase, cita) {
    return mensajeBase
        .replace(/{nombre}/g, cita.nombre)
        .replace(/{fecha}/g, formatearFechaVisual(cita.fecha))
        .replace(/{hora}/g, cita.hora)
        .replace(/{servicio}/g, cita.servicio || 'su servicio');
}

function guardarLog(citaId, telefono, mensaje, estado, respuesta, error) {
    const stmt = db.prepare(`
        INSERT INTO logs_envio (cita_id, telefono, mensaje, estado, respuesta_api, error)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(citaId, telefono, mensaje, estado, JSON.stringify(respuesta), error || null);
}

function buscarOCrearCliente(nombre, telefono) {
    const stmtBuscar = db.prepare('SELECT * FROM clientes WHERE nombre = ?');
    const cliente = stmtBuscar.get(nombre);
    
    if (cliente) {
        return cliente;
    }
    
    const stmtInsertar = db.prepare('INSERT INTO clientes (nombre, telefono) VALUES (?, ?)');
    const result = stmtInsertar.run(nombre, telefono);
    return { id: result.lastInsertRowid, nombre, telefono };
}

function buscarClientePorNombre(nombre) {
    const stmt = db.prepare('SELECT * FROM clientes WHERE nombre LIKE ?');
    return stmt.all(`%${nombre}%`);
}

function obtenerClientes() {
    const stmt = db.prepare('SELECT * FROM clientes ORDER BY nombre');
    return stmt.all();
}

// Función para esperar (delay)
function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function enviarRecordatorios(fechaObjetivo = null) {
    const fecha = fechaObjetivo || obtenerFechaManana();
    
    console.log(`📅 Buscando citas para: ${fecha}`);
    
    const stmt = db.prepare(`
        SELECT * FROM citas 
        WHERE fecha = ? 
        AND recordatorio_enviado = 0
        AND estado != 'cancelada'
        ORDER BY hora
    `);
    const citas = stmt.all(fecha);

    console.log(`📋 Citas encontradas: ${citas.length}`);

    if (citas.length === 0) {
        console.log('No hay citas para enviar recordatorio.');
        return { enviados: 0, fallidos: 0, total: 0 };
    }

    const mensajeBase = obtenerMensajeConfig();
    let enviados = 0;
    let fallidos = 0;

    for (const cita of citas) {
        const mensaje = personalizarMensaje(mensajeBase, cita);
        
        console.log(`⏳ Enviando a ${cita.nombre} (${cita.telefono})...`);
        
        const resultado = await enviarWhatsApp(cita.telefono, mensaje);
        
        if (resultado.exito) {
            const update = db.prepare('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?');
            update.run(cita.id);
            
            guardarLog(cita.id, cita.telefono, mensaje, 'enviado', resultado.data, null);
            console.log(`✅ Recordatorio enviado para ${cita.nombre}`);
            enviados++;
            
        } else {
            guardarLog(cita.id, cita.telefono, mensaje, 'fallido', null, JSON.stringify(resultado.error));
            console.log(`❌ Falló envío para ${cita.nombre}`);
            fallidos++;
        }

        // ⏱️ ESPERAR 1 MINUTO ENTRE CADA MENSAJE (WasenderAPI prueba gratuita)
        if (citas.indexOf(cita) < citas.length - 1) {
            console.log('⏱️ Esperando 60 segundos antes del siguiente envío...\n');
            await esperar(60000);
        }
    }

    console.log(`\n📊 Resumen: ${enviados} enviados, ${fallidos} fallidos, ${citas.length} total`);
    return { enviados, fallidos, total: citas.length };
}

async function reintentarFallidos(fecha) {
    const stmt = db.prepare(`
        SELECT c.* FROM citas c
        JOIN logs_envio l ON c.id = l.cita_id
        WHERE c.fecha = ? 
        AND c.recordatorio_enviado = 0
        AND l.estado = 'fallido'
        AND l.creado_en > datetime('now', '-2 hours')
        GROUP BY c.id
    `);
    const citas = stmt.all(fecha || obtenerFechaManana());
    
    if (citas.length === 0) return { reintentados: 0 };
    
    const mensajeBase = obtenerMensajeConfig();
    console.log(`🔄 Reintentando ${citas.length} envíos fallidos...`);
    let reintentados = 0;
    
    for (const cita of citas) {
        const mensaje = personalizarMensaje(mensajeBase, cita);
        
        console.log(`⏳ Reintentando a ${cita.nombre}...`);
        
        const resultado = await enviarWhatsApp(cita.telefono, mensaje);
        
        if (resultado.exito) {
            db.prepare('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?').run(cita.id);
            guardarLog(cita.id, cita.telefono, mensaje, 'reintentado', resultado.data, null);
            reintentados++;
        }
        
        // Esperar 1 minuto entre reintentos también
        if (citas.indexOf(cita) < citas.length - 1) {
            console.log('⏱️ Esperando 60 segundos...\n');
            await esperar(60000);
        }
    }
    
    return { reintentados };
}

module.exports = { 
    enviarRecordatorios, 
    reintentarFallidos, 
    normalizarFecha,
    obtenerFechaManana,
    buscarOCrearCliente,
    buscarClientePorNombre,
    obtenerClientes,
    personalizarMensaje,
    obtenerMensajeConfig
};