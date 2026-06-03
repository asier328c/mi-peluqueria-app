const db = require('./db');

// Citas por mes (últimos 6 meses)
function citasPorMes() {
    const stmt = db.prepare(`
        SELECT 
            strftime('%Y-%m', fecha) as mes,
            COUNT(*) as total,
            SUM(CASE WHEN recordatorio_enviado = 1 THEN 1 ELSE 0 END) as recordatorios_enviados,
            SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
            SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas
        FROM citas
        WHERE fecha >= date('now', '-6 months')
        GROUP BY mes
        ORDER BY mes DESC
    `);
    return stmt.all();
}

// Clientes más frecuentes (top 10)
function clientesTop() {
    const stmt = db.prepare(`
        SELECT 
            nombre,
            COUNT(*) as total_citas,
            MAX(fecha) as ultima_cita,
            SUM(CASE WHEN recordatorio_enviado = 1 THEN 1 ELSE 0 END) as recordatorios_recibidos
        FROM citas
        GROUP BY nombre
        ORDER BY total_citas DESC
        LIMIT 10
    `);
    return stmt.all();
}

// Servicios más solicitados
function serviciosTop() {
    const stmt = db.prepare(`
        SELECT 
            COALESCE(NULLIF(servicio, ''), 'Sin especificar') as servicio,
            COUNT(*) as total,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM citas), 1) as porcentaje
        FROM citas
        GROUP BY servicio
        ORDER BY total DESC
        LIMIT 8
    `);
    return stmt.all();
}

// Resumen general
function resumenGeneral() {
    const totalCitas = db.prepare('SELECT COUNT(*) as count FROM citas').get().count;
    const totalClientes = db.prepare('SELECT COUNT(*) as count FROM clientes').get().count;
    const citasHoy = db.prepare("SELECT COUNT(*) as count FROM citas WHERE fecha = date('now')").get().count;
    const citasManana = db.prepare("SELECT COUNT(*) as count FROM citas WHERE fecha = date('now', '+1 day')").get().count;
    const recordatoriosEnviados = db.prepare('SELECT COUNT(*) as count FROM logs_envio WHERE estado = "enviado"').get().count;
    const tasaExito = db.prepare(`
        SELECT 
            ROUND(
                SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) * 100.0 / 
                NULLIF(COUNT(*), 0), 
                1
            ) as tasa
        FROM logs_envio
    `).get().tasa || 0;

    return {
        total_citas: totalCitas,
        total_clientes: totalClientes,
        citas_hoy: citasHoy,
        citas_manana: citasManana,
        recordatorios_enviados: recordatoriosEnviados,
        tasa_exito: tasaExito
    };
}

// Citas por día de la semana (para ver qué días son más ocupados)
function citasPorDiaSemana() {
    const stmt = db.prepare(`
        SELECT 
            CASE strftime('%w', fecha)
                WHEN '0' THEN 'Domingo'
                WHEN '1' THEN 'Lunes'
                WHEN '2' THEN 'Martes'
                WHEN '3' THEN 'Miércoles'
                WHEN '4' THEN 'Jueves'
                WHEN '5' THEN 'Viernes'
                WHEN '6' THEN 'Sábado'
            END as dia,
            COUNT(*) as total
        FROM citas
        GROUP BY strftime('%w', fecha)
        ORDER BY strftime('%w', fecha)
    `);
    return stmt.all();
}

// Evolución de envíos (últimos 30 días)
function enviosPorDia() {
    const stmt = db.prepare(`
        SELECT 
            DATE(creado_en) as fecha,
            COUNT(*) as total_envios,
            SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) as exitosos,
            SUM(CASE WHEN estado = 'fallido' THEN 1 ELSE 0 END) as fallidos
        FROM logs_envio
        WHERE creado_en >= date('now', '-30 days')
        GROUP BY DATE(creado_en)
        ORDER BY fecha
    `);
    return stmt.all();
}

module.exports = {
    citasPorMes,
    clientesTop,
    serviciosTop,
    resumenGeneral,
    citasPorDiaSemana,
    enviosPorDia
};