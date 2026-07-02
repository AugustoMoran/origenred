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

const normalizePemContent = (value: string) => value.trim();

const parseBooleanEnv = (value: string | undefined, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

class AfipService {
  private afip: any;
  private currentProduction = false;

  constructor() {
    this.initAfip();
  }

  private initAfip(productionOverride?: boolean) {
    const cert = resolveSecretContent('AFIP_CERT_PEM', 'AFIP_CERT_PATH');
    const key = resolveSecretContent('AFIP_KEY_PEM', 'AFIP_KEY_PATH');
    const production = productionOverride ?? parseBooleanEnv(process.env.AFIP_PRODUCTION, false);

    if (!cert || !key) {
      this.afip = null;
      console.warn('[AFIP] Certificado/clave no configurados.');
      return;
    }

    try {
      const options: any = {
        CUIT: process.env.COMPANY_CUIT || '20123456789',
        production,
        cert: normalizePemContent(cert),
        key: normalizePemContent(key),
      };

      // Importante: NO enviar access_token vacío, deja que el SDK gestione WSAA.
      this.afip = new Afip(options);
      this.currentProduction = production;
      console.log(`[AFIP] SDK inicializado en modo ${production ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'} (AFIP_PRODUCTION=${String(process.env.AFIP_PRODUCTION)})`);
    } catch (e: any) {
      console.error('[AFIP] Error al inicializar SDK:', e.message);
    }
  }

  private async executePadronLookups(cleanCuit: string) {
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
    let hadAuthError = false;

    for (const method of methods) {
      const lookupFn = this.afip?.[method]?.getTaxpayerDetails;
      if (typeof lookupFn !== 'function') {
        console.log(`[AFIP] ${method} no está disponible en esta versión del SDK`);
        continue;
      }

      try {
        console.log('[AFIP] Intentando ' + method + ' para ' + cleanCuit + '...');
        details = await lookupFn.call(this.afip[method], cleanCuit);
        if (details) {
          usedMethod = method;
          console.log('[AFIP] ¡Éxito con ' + method + '!');
          break;
        }
      } catch (e: any) {
        const errMsg = String(e?.message || '').toLowerCase();
        console.log('[AFIP] Falló ' + method + ': ' + String(e?.message || e));
        
        // Si el error es de TOKEN o 401, reiniciamos y REINTENTAMOS este mismo método una vez
        if (errMsg.includes('token') || errMsg.includes('401') || errMsg.includes('unauthorized')) {
          hadAuthError = true;
          console.warn('[AFIP] Error de autenticación detectado. Re-inicializando...');
          this.initAfip(this.currentProduction);
          try {
            const retryFn = this.afip?.[method]?.getTaxpayerDetails;
            if (typeof retryFn !== 'function') {
              continue;
            }
            details = await retryFn.call(this.afip[method], cleanCuit);
            if (details) {
              usedMethod = method;
              break;
            }
          } catch (retryErr: any) {
            const retryMsg = String(retryErr?.message || '').toLowerCase();
            if (retryMsg.includes('token') || retryMsg.includes('401') || retryMsg.includes('unauthorized')) {
              hadAuthError = true;
            }
            console.log('[AFIP] Reintento fallido para ' + method + ': ' + String(retryErr?.message || retryErr));
          }
        }
      }
    }

    return { details, usedMethod, hadAuthError };
  }

  async getTaxpayerDetails(cuit: string) {
    if (!this.afip) throw new Error('AFIP no configurado');
    const cleanCuit = cuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) throw new Error('CUIT inválido');

    let { details, usedMethod, hadAuthError } = await this.executePadronLookups(cleanCuit);

    // Fallback automático: si hay 401 en un entorno, probamos el otro una sola vez
    if (!details && hadAuthError) {
      const switchedProduction = !this.currentProduction;
      console.warn(`[AFIP] 401 detectado. Probando fallback automático en modo ${switchedProduction ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}...`);
      this.initAfip(switchedProduction);

      const secondTry = await this.executePadronLookups(cleanCuit);
      details = secondTry.details;
      usedMethod = secondTry.usedMethod;
      hadAuthError = secondTry.hadAuthError;
    }

    if (!details) {
      if (hadAuthError) {
        console.warn(`[AFIP] Sin datos para ${cleanCuit}: autenticación rechazada por ARCA (401). Revisar certificado/clave y AFIP_PRODUCTION.`);
        return {
          nombre: '',
          razonSocial: '',
          cuit: cleanCuit,
          _notFound: true,
          _afipAuthError: true,
          _message: 'ARCA rechazó la autenticación (401). Revisar credenciales y modo de entorno.'
        };
      }

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

  async getPointsOfSale() {
    if (!this.afip) throw new Error('AFIP no configurado');
    return await this.afip.ElectronicBilling.getSalesPoints();
  }

  async getVoucherTypes() {
    if (!this.afip) throw new Error('AFIP no configurado');
    return await this.afip.ElectronicBilling.getVoucherTypes();
  }
}

export default new AfipService();
