import Afip from '@afipsdk/afip.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const decodePem = (value: string | undefined) => {
  if (!value) return undefined;
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
};

const resolveSecretContent = (pemEnvName: string, pathEnvName: string) => {
  const pemValue = decodePem(process.env[pemEnvName]);
  if (pemValue) return pemValue;

  const filePath = process.env[pathEnvName];
  if (!filePath) return undefined;

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error: any) {
    return undefined;
  }
};

class AfipService {
  private afip: any;

  constructor() {
    this.initAfip();
  }

  private initAfip() {
    const cert = resolveSecretContent('AFIP_CERT_PEM', 'AFIP_CERT_PATH');
    const key = resolveSecretContent('AFIP_KEY_PEM', 'AFIP_KEY_PATH');

    if (!cert || !key) {
      this.afip = null;
      console.warn('[AFIP] Certificado/clave no configurados.');
      return;
    }

    try {
      this.afip = new Afip({
        CUIT: process.env.COMPANY_CUIT || '20123456789',
        production: process.env.NODE_ENV === 'production',
        cert,
        key,
        access_token: ''
      });
    } catch (e: any) {
      console.error('[AFIP] Error al inicializar SDK:', e.message);
    }
  }

  async getTaxpayerDetails(cuit: string) {
    if (!this.afip) throw new Error('AFIP no configurado');
    const cleanCuit = cuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) throw new Error('CUIT inválido');
    
    // Lista de servicios en orden de prioridad
    const methods = [
      'RegisterScopeFive',
      'RegisterScopeFour',
      'RegisterScopeTen',
      'RegisterInscriptionProof',
      'RegisterScopeThirteen'
    ];

    let details: any = null;
    let usedMethod = '';

    for (const method of methods) {
      try {
        console.log('[AFIP] Intentando ' + method + ' para ' + cleanCuit + '...');
        details = await this.afip[method].getTaxpayerDetails(cleanCuit);
        if (details) {
          usedMethod = method;
          console.log('[AFIP] ¡Éxito con ' + method + '!');
          break;
        }
      } catch (e: any) {
        const errMsg = e.message.toLowerCase();
        console.log('[AFIP] Falló ' + method + ': ' + e.message);
        
        // Si el error es de TOKEN o 401, reiniciamos y REINTENTAMOS este mismo método una vez
        if (errMsg.includes('token') || errMsg.includes('401') || errMsg.includes('unauthorized')) {
          console.warn('[AFIP] Error de autenticación detectado. Re-inicializando...');
          this.initAfip();
          try {
            details = await this.afip[method].getTaxpayerDetails(cleanCuit);
            if (details) {
              usedMethod = method;
              break;
            }
          } catch (retryErr: any) {
            console.log('[AFIP] Reintento fallido para ' + method);
          }
        }
      }
    }

    if (!details) {
      console.log('[AFIP] No se encontró información en ningún padrón para ' + cleanCuit);
      return { nombre: '', razonSocial: '', cuit: cleanCuit, _notFound: true };
    }

    // NORMALIZACIÓN AGRESIVA DE NOMBRE
    let finalName = '';
    
    // 1. Intentar campos directos
    finalName = details.razonSocial || details.nombre || '';
    
    // 2. Si es persona física (apellido + nombre)
    if (!finalName && details.apellido) {
      finalName = details.apellido + (details.nombre ? ' ' + details.nombre : '');
    }
    
    // 3. Buscar en sub-objetos comunes (datosGenerales)
    if (!finalName && details.datosGenerales) {
      const dg = details.datosGenerales;
      finalName = dg.razonSocial || (dg.apellido ? dg.apellido + (dg.nombre ? ' ' + dg.nombre : '') : '');
    }

    // 4. Fallback a lo que sea que haya
    if (!finalName) {
      finalName = details.descripcion || '';
    }

    const result = {
      ...details,
      nombre: finalName.trim(),
      razonSocial: finalName.trim(),
      _source: usedMethod,
      _notFound: false
    };

    console.log('[AFIP] Resultado normalizado:', result.nombre);
    return result;
  }

  async createInvoice(data: any) {
    if (!this.afip) throw new Error('AFIP no configurado');
    try {
      const lastVoucher = await this.afip.ElectronicBilling.getLastVoucher(data.PtoVta, data.CbteTipo);
      const nextNumber = lastVoucher + 1;
      const voucherData = {
        CantReg: 1, PtoVta: data.PtoVta, CbteTipo: data.CbteTipo, DocTipo: data.DocTipo, DocNro: data.DocNro,
        CbteDesde: nextNumber, CbteHasta: nextNumber, CbteFch: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        ImpTotal: data.ImpTotal, ImpNeto: data.ImpNeto, ImpIVA: data.ImpIVA, MonId: 'PES', MonCotiz: 1, Iva: data.IvaDetails
      };
      const result = await this.afip.ElectronicBilling.createVoucher(voucherData);
      return { cae: result.CAE, caeFchVto: result.CAEFchVto || result.CAEAfterVTo, voucherNumber: nextNumber, fullResult: result };
    } catch (error: any) { throw new Error('AFIP: ' + error.message); }
  }
}

export default new AfipService();
