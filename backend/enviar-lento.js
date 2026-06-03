const { enviarRecordatorios } = require('./lib/recordatorios');

async function main() {
    console.log('📱 Enviando recordatorios con espera de 1 minuto entre cada uno...\n');
    
    // Primero obtenemos las citas pendientes
    const db = require('./lib/db');
    const fecha = '2026-06-03';
    
    const stmt = db.prepare(`
        SELECT * FROM citas 
        WHERE fecha = ? 
        AND recordatorio_enviado = 0
        AND estado != 'cancelada'
        ORDER BY hora
    `);
    const citas = stmt.all(fecha);
    
    console.log(`📋 Citas pendientes: ${citas.length}\n`);
    
    for (const cita of citas) {
        console.log(`⏳ Esperando 1 minuto antes de enviar a ${cita.nombre}...`);
        await new Promise(r => setTimeout(r, 60000)); // 60 segundos = 1 minuto
        
        // Enviar uno por uno
        const { enviarWhatsApp } = require('./lib/whatsapp');
        const mensaje = `Hola ${cita.nombre}, le recordamos su cita el 03/06/2026 a las ${cita.hora} para ${cita.servicio || 'su servicio'}. Por favor confirme con un SI si va a venir. Gracias.`;
        
        const resultado = await enviarWhatsApp(cita.telefono, mensaje);
        
        if (resultado.exito) {
            db.prepare('UPDATE citas SET recordatorio_enviado = 1 WHERE id = ?').run(cita.id);
            console.log(`✅ Enviado a ${cita.nombre}\n`);
        } else {
            console.log(`❌ Falló a ${cita.nombre}: ${JSON.stringify(resultado.error)}\n`);
        }
    }
    
    console.log('🏁 Proceso finalizado');
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Error:', err);
    process.exit(1);
});