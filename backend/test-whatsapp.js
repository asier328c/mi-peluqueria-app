// ============================================
// SCRIPT DE PRUEBA PARA ENVIAR WHATSAPP (Wappfly)
// ============================================

const axios = require('axios');

// CONFIGURACION WAPPFLY
const WAPPFLY_API_KEY = '58af262719284617adc07231e83718f95bacfc9ec7a59ea40994efcc0cb54077';
const WAPPFLY_PHONE = '34636894249'; // Tu número de Wappfly (sin +)

// Numero de destino (tu movil para probar)
const TELEFONO_DESTINO = '34644822278'; // <-- REEMPLAZA CON TU NUMERO

// Mensaje de prueba
const MENSAJE = 'Hola! Este es un mensaje de prueba de tu sistema de citas. Si lo recibes, todo funciona correctamente. 🎉';

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