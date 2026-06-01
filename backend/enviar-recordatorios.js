const Database = require('better-sqlite3');
const path = require('path');
const axios = require('axios');

const dbPath = path.join(__dirname, 'citas.db');
const db = new Database(dbPath);

const WASENDER_API_KEY = 'ffc100942001784806c639447aadbe43dd4c4d9c12ac4da37392d35b80ab5989';

async function enviarWhatsApp(telefono, mensaje) {
    try {
        const url = 'https://wasenderapi.com/api/send-message';
        
        const response = await axios.post(url, {
            to: '+' + telefono,
            text: mensaje
        }, {
            headers: {
                'Authorization': 'Bearer ' + WASENDER_API_KEY,
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

    console.log(`📅 Fecha manana: ${fechaManana}`);
    console.log(`📋 Citas encontradas: ${citas.length}`);

    if (citas.length === 0) {
        console.log('No hay citas para enviar recordatorio.');
        return;
    }

    citas.forEach(async (cita) => {
        const mensaje = `Hola ${cita.nombre}, le recordamos su cita manana ${cita.fecha} a las ${cita.hora} en nuestra peluqueria. Por favor confirme con un SI si va a venir. Gracias.`;
        
        const enviado = await enviarWhatsApp(cita.telefono, mensaje);
        if (enviado) {
            const update = db.prepare('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?');
            update.run(cita.id);
            console.log(`✅ Recordatorio enviado y marcado para ${cita.nombre}`);
        }
    });
}

enviarRecordatorios();