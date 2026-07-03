const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const SECURE_DIR = 'c:/Users/augus/OneDrive/Desktop/trabajos/plataforma-de-facturacion/secure/afip';
const KEY_PATH = path.join(SECURE_DIR, 'private.key');
const CSR_PATH = path.join(SECURE_DIR, 'OsoNueva.csr');

console.log('--- GENERADOR DE CSR (OsoNueva) ---');

// Verificar si existe OpenSSL o usar un método alternativo
try {
    // Intentar con OpenSSL si está en el PATH
    const command = `openssl req -new -key "${KEY_PATH}" -subj "/C=AR/O=OsoSound/CN=OsoNueva/serialNumber=CUIT 20202042644" -out "${CSR_PATH}"`;
    execSync(command);
    console.log('✅ CSR creado con éxito usando OpenSSL.');
    console.log('Ubicación:', CSR_PATH);
} catch (error) {
    console.log('⚠️ OpenSSL no está en el PATH o falló. Intentando método alternativo...');
    
    // Si falla OpenSSL, el usuario deberá usar un generador online o proveeré el comando exacto para que lo corra donde tenga openssl
    console.log('\n❌ No se pudo ejecutar openssl automáticamente.');
    console.log('Por favor, ejecutá este comando manualmente en una terminal donde tengas openssl (ej: Git Bash):');
    console.log(`\nopenssl req -new -key private.key -subj "/C=AR/O=OsoSound/CN=OsoNueva/serialNumber=CUIT 20202042644" -out OsoNueva.csr\n`);
}
