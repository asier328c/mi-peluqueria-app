// ============================================
// SCRIPT DE PRUEBA PARA ENVIAR WHATSAPP (WasenderAPI)
// ============================================

const axios = require('axios');

// CONFIGURACION WASENDERAPI
const WASENDER_API_KEY = 'ffc100942001784806c639447aadbe43dd4c4d9c12ac4da37392d35b80ab5989';

// Numero de destino (tu movil para probar)
const TELEFONO_DESTINO = '34644822278'; // <-- REEMPLAZA CON TU NUMERO

// Mensaje de prueba
const MENSAJE = 'Hola! Este es un mensaje de prueba de tu sistema de citas con WasenderAPI. Si lo recibes, todo funciona correctamente. 🎉';

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
        
        console.log('✅ WhatsApp enviado correctamente:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Error enviando WhatsApp:', error.response?.data || error.message);
        return false;
    }
}

// Enviar mensaje de prueba
console.log('🚀 Enviando mensaje de prueba...');
enviarWhatsApp(TELEFONO_DESTINO, MENSAJE);