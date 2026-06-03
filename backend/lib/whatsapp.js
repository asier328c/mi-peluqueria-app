const axios = require('axios');

const WASENDER_API_KEY = 'ffc100942001784806c639447aadbe43dd4c4d9c12ac4da37392d35b80ab5989';

async function enviarWhatsApp(telefono, mensaje) {
    try {
        const url = 'https://wasenderapi.com/api/send-message';
        
        const response = await axios.post(url, {
            to: '+' + telefono.replace(/^\+/, ''),
            text: mensaje
        }, {
            headers: {
                'Authorization': 'Bearer ' + WASENDER_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        console.log(`✅ Enviado a ${telefono}:`, response.data);
        return { exito: true, data: response.data };
        
    } catch (error) {
        const errorInfo = error.response?.data || error.message;
        console.error(`❌ Error a ${telefono}:`, errorInfo);
        return { exito: false, error: errorInfo };
    }
}

module.exports = { enviarWhatsApp };