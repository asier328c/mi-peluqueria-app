const axios = require('axios');

async function crearCliente() {
    try {
        const res = await axios.post('http://localhost:3000/clientes', {
            nombre: 'Maria Garcia',
            telefono: '34611223344',
            notas: 'Cliente habitual, prefiere por la mañana'
        });
        console.log('✅ Cliente creado:', res.data);
    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);
    }
}

crearCliente();