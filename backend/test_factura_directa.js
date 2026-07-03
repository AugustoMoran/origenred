const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const cuit = '20202042644';
const certPath = 'C:\\Users\\augus\\OneDrive\\Desktop\\trabajos\\plataforma-de-facturacion\\secure\\afip\\OsoSound1_25445e4535602c94.crt';
const keyPath = 'C:\\Users\\augus\\OneDrive\\Desktop\\trabajos\\plataforma-de-facturacion\\secure\\afip\\private.key';

const afip = new Afip({
    CUIT: cuit,
    production: true,
    cert: fs.readFileSync(certPath, 'utf8'),
    key: fs.readFileSync(keyPath, 'utf8')
});

async function testFactura() {
    console.log('--- PRUEBA DIRECTA WSFE (Facturación) ---');
    try {
        // Obtenemos el último número de comprobante para el punto de venta 1, tipo 11 (C)
        // Esto es lo más básico de facturación
        const lastNb = await afip.ElectronicBilling.getLastVoucher(1, 11);
        console.log('✅ CONEXIÓN EXITOSA CON WSFE');
        console.log('Último comprobante (Punto 1, Tipo 11):', lastNb);
    } catch (e) {
        console.error('❌ FALLO WSFE:', e.message);
        if (e.response && e.response.data) {
            console.log('Detalle del servidor AFIP:', e.response.data);
        }
    }
}

testFactura();
