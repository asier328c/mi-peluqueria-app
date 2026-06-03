const axios = require('axios');

const API_URL = 'https://mi-peluqueria-app.onrender.com';

async function crearCliente() {
    try {
        const res = await axios.post(`${API_URL}/clientes`, {
            nombre: 'Maria Garcia',
            telefono: '34611223344',
            notas: 'Cliente habitual'
        });
        console.log('✅ Cliente creado:', res.data);
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

async function crearCita() {
    try {
        const res = await axios.post(`${API_URL}/citas`, {
            nombre: 'Maria Garcia',
            fecha: '04/06/2026',
            hora: '10:00',
            servicio: 'tinte'
        });
        console.log('✅ Cita creada:', res.data);
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

async function verConfig() {
    try {
        const res = await axios.get(`${API_URL}/config/mensaje`);
        console.log('✅ Config:', res.data);
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

async function main() {
    console.log('🧪 Probando Render...\n');
    await crearCliente();
    await crearCita();
    await verConfig();
}

main();