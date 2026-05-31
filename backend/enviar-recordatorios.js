const Database = require('better-sqlite3');
const path = require('path');
const axios = require('axios');

const dbPath = path.join(__dirname, 'citas.db');
const db = new Database(dbPath);

const WAPPFLY_API_KEY = '58af262719284617adc07231e83718f95bacfc9ec7a59ea40994efcc0cb54077';

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
        console.log(`✅ Enviado a ${telefono}:`, response.data);
        return true;
    } catch (error) {
        console.error(`❌ Error a ${telefono}:`, error.response?.data || error.message);
        return false;
    }
}

function enviarRecordatorios() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split('T')[0];

    const stmt = db.prepare('SELECT * FROM citas WHERE fecha = ? AND recordatorio_enviado = 0');
    const citas = stmt.all(fechaManana);

    console.log(`📅 Fecha mañana: ${fechaManana}`);
    console.log(`📋 Citas encontradas: ${citas.length}`);

    if (citas.length === 0) {
        console.log('No hay citas para enviar recordatorio.');
        return;
    }

    citas.forEach(async (cita) => {
        const mensaje = `Hola ${cita.nombre}, le recordamos su cita mañana ${cita.fecha} a las ${cita.hora} en nuestra peluquería. Por favor confirme con un SI si va a venir. Gracias.`;
        
        const enviado = await enviarWhatsApp(cita.telefono, mensaje);
        if (enviado) {
            const update = db.prepare('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?');
            update.run(cita.id);
            console.log(`✅ Recordatorio enviado y marcado para ${cita.nombre}`);
        }
    });
}

enviarRecordatorios();