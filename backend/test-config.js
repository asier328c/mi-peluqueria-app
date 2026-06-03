const axios = require('axios');

async function cambiarMensaje() {
    try {
        const res = await axios.post('http://localhost:3000/config/mensaje', {
            mensaje_recordatorio: '¡Hola {nombre}! 👋 Le recordamos su cita el {fecha} a las {hora} para {servicio}. Por favor confirme respondiendo SI. ¡Gracias! 💇‍♀️'
        });
        console.log('✅ Config actualizada:', res.data);
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

cambiarMensaje();