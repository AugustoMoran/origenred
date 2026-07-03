const fs = require('fs');
const { X509Certificate } = require('crypto');

try {
    const certPath = 'c:/Users/augus/OneDrive/Desktop/trabajos/plataforma-de-facturacion/backend/uploads/ososound1.crt';
    const certBuffer = fs.readFileSync(certPath);
    const cert = new X509Certificate(certBuffer);
    console.log('--- CERTIFICADO LOCAL ---');
    console.log('Serial Number:', cert.serialNumber);
    console.log('Subject:', cert.subject);
    console.log('Valid From:', cert.validFrom);
    console.log('Valid To:', cert.validTo);
} catch (error) {
    console.error('Error reading certificate:', error.message);
}
