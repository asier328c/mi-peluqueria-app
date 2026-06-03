const { enviarRecordatorios, reintentarFallidos, obtenerFechaManana } = require('./lib/recordatorios');

const fechaManual = process.argv[2];

async function main() {
    console.log('🚀 Iniciando envío de recordatorios...\n');
    
    const resultado = await enviarRecordatorios(fechaManual);
    
    if (resultado.fallidos > 0) {
        console.log('\n⏳ Esperando 30 segundos antes de reintentar fallidos...');
        await new Promise(r => setTimeout(r, 30000));
        await reintentarFallidos(fechaManual || obtenerFechaManana());
    }
    
    console.log('\n🏁 Proceso finalizado');
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
});