const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

// CONFIGURACIÓN DIRECTA
const cuit = '20202042644'; 
const certPath = path.join(__dirname, 'secure', 'afip', 'OsoSound1_25445e4535602c94.crt');
const keyPath = path.join(__dirname, 'secure', 'afip', 'private.key');

console.log('--- DIAGNÓSTICO AFIP LOCAL ---');
console.log('Certificado:', certPath);
console.log('Clave:', keyPath);

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('ERROR: No se encuentran los archivos en secure/afip/');
    process.exit(1);
}

const afip = new Afip({
    CUIT: cuit,
    production: true, // Probamos producción directo
    cert: fs.readFileSync(certPath, 'utf8'),
    key: fs.readFileSync(keyPath, 'utf8')
});

async function test() {
    try {
        console.log('\n1. Intentando obtener Ticket de Acceso para Facturación (wsfe)...');
        const ta_wsfe = await afip.GetServiceTA('wsfe');
        console.log('✅ ÉXITO wsfe: Ticket obtenido correctamente.');
    } catch (e) {
        console.error('❌ FALLO wsfe:', e.message);
    }

    try {
        console.log('\n2. Intentando obtener Ticket para Padrón A13...');
        const ta_padron = await afip.GetServiceTA('ws_sr_padron_a13');
        console.log('✅ ÉXITO Padrón A13: Ticket obtenido correctamente.');
    } catch (e) {
        console.error('❌ FALLO Padrón A13:', e.message);
    }

    try {
        console.log('\n3. Intentando obtener Ticket para Constancia Inscripción...');
        const ta_const = await afip.GetServiceTA('ws_sr_constancia_inscripcion');
        console.log('✅ ÉXITO Constancia Inscripción: Ticket obtenido correctamente.');
    } catch (e) {
        console.error('❌ FALLO Constancia Inscripción:', e.message);
    }
}

test();
