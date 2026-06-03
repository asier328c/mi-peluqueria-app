const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function preguntar(pregunta) {
    return new Promise(resolve => rl.question(pregunta, resolve));
}

async function main() {
    console.log('📱 Enviar recordatorio manual a un cliente\n');
    
    try {
        // Buscar cliente
        const nombreBuscar = await preguntar('Nombre del cliente: ');
        
        const resBuscar = await axios.get(`http://localhost:3000/clientes/buscar/${encodeURIComponent(nombreBuscar)}`);
        const clientes = resBuscar.data.datos;
        
        if (clientes.length === 0) {
            console.log('❌ Cliente no encontrado');
            rl.close();
            return;
        }
        
        const cliente = clientes[0];
        console.log(`✅ Encontrado: ${cliente.nombre} (${cliente.telefono})`);
        
        // Pedir fecha y hora
        const fecha = await preguntar('Fecha de la cita (dd/mm/aaaa): ');
        const hora = await preguntar('Hora de la cita (HH:MM): ');
        const servicio = await preguntar('Servicio (opcional): ') || 'su servicio';
        
        // Crear cita primero
        const resCita = await axios.post('http://localhost:3000/citas', {
            nombre: cliente.nombre,
            fecha: fecha,
            hora: hora,
            servicio: servicio
        });
        
        console.log('✅ Cita creada:', resCita.data.mensaje);
        
        // Preguntar si enviar ahora
        const enviarAhora = await preguntar('¿Enviar recordatorio ahora? (si/no): ');
        
        if (enviarAhora.toLowerCase() === 'si') {
            const resEnvio = await axios.post('http://localhost:3000/admin/enviar-recordatorios', {
                fecha: resCita.data.fecha_guardada || fecha
            });
            console.log('📨 Resultado:', resEnvio.data);
        }
        
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
    
    rl.close();
}

main();