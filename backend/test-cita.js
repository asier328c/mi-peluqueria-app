const axios = require('axios');

async function crearCita() {
    try {
        // Creamos cita SOLO con nombre, fecha y hora (sin teléfono)
        const res = await axios.post('http://localhost:3000/citas', {
            nombre: 'Maria Garcia',
            fecha: '03/06/2026',  // formato dd/mm/aaaa
            hora: '10:00',
            servicio: 'tintura'
        });
        console.log('✅ Cita creada:', res.data);
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

crearCita();