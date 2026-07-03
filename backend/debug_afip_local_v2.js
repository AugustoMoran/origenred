const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

// CONFIGURACIÓN DIRECTA CON PATHS REALES
const cuit = '20202042644'; 
const rootDir = 'C:\\Users\\augus\\OneDrive\\Desktop\\trabajos\\plataforma-de-facturacion';
const certPath = 'C:\\Users\\augus\\OneDrive\\Desktop\\trabajos\\plataforma-de-facturacion\\secure\\afip\\OsoSound1_25445e4535602c94.crt';
const keyPath = 'C:\\Users\\augus\\OneDrive\\Desktop\\trabajos\\plataforma-de-facturacion\\secure\\afip\\private.key';

console.log('--- DIAGNÓSTICO AFIP LOCAL ---');
console.log('Certificado:', certPath);
console.log('Clave:', keyPath);

if (!fs.existsSync(certPath)) {
    console.error('ERROR: No existe el certificado en ' + certPath);
    process.exit(1);
}
if (!fs.existsSync(keyPath)) {
    console.error('ERROR: No existe la clave en ' + keyPath);
    process.exit(1);
}

const afip = new Afip({
    CUIT: cuit,
    production: true,
    cert: fs.readFileSync(certPath, 'utf8'),
    key: fs.readFileSync(keyPath, 'utf8')
});

async function test() {
    console.log('\n--- Probando Servicios en PRODUCCIÓN (CUIT 20202042644) ---');
    
    const services = ['wsfe', 'ws_sr_padron_a13', 'ws_sr_constancia_inscripcion'];
    
    for (const service of services) {
        try {
            console.log(`\n> Solicitando Ticket para: ${service}...`);
            const ta = await afip.GetServiceTA(service);
            console.log(`✅ EXITO: Ticket obtenido para ${service}.`);
        } catch (e) {
            console.error(`❌ FALLO ${service}:`, e.message);
            // Intentamos mostrar si hay data de respuesta
            if (e.response && e.response.data) {
                console.log('Detalle error:', e.response.data);
            }
        }
    }
}

test();
