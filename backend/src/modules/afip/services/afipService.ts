import Afip from '@afipsdk/afip.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { X509Certificate, createPrivateKey, createPublicKey } from 'crypto';

dotenv.config();

/**
 * PATH DE TOKENS: Forzamos una carpeta específica para evitar conflictos de permisos
 */
const TOKENS_DIR = path.join(process.cwd(), 'uploads', '.afip_tokens');
if (!fs.existsSync(TOKENS_DIR)) {
  fs.mkdirSync(TOKENS_DIR, { recursive: true });
}

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

const parseCuit = (value: string | undefined) => (value || '').replace(/\D/g, '');

const getAfipErrorDetails = (error: any) => {
  try {
    const status = error?.response?.status;
    const data = error?.response?.data;

    let payload = '';
    if (typeof data === 'string') {
      payload = data;
    } else if (data) {
      payload = JSON.stringify(data);
    }

    if (payload.length > 500) payload = `${payload.slice(0, 500)}...`;

    return {
      status,
      payload,
    };
  } catch {
    return { status: undefined, payload: '' };
  }
};

const extractCuitFromCert = (certPem: string) => {
  try {
    const cert = new X509Certificate(certPem);
    const subject = cert.subject || '';

    // Ejemplos comunes: SERIALNUMBER=CUIT 20301234567 / serialNumber=CUIT 20301234567
    const cuitMatch = subject.match(/serialnumber\s*=\s*cuit\s*(\d{11})/i);
    if (cuitMatch?.[1]) return cuitMatch[1];

    // Fallback defensivo: primer bloque de 11 dígitos en el subject
    const any11Digits = subject.match(/(\d{11})/);
    return any11Digits?.[1];
  } catch {
    return undefined;
  }
};

const getCertValidity = (certPem: string) => {
  try {
    const cert = new X509Certificate(certPem);
    return {
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      isExpired: new Date(cert.validTo).getTime() < Date.now(),
    };
  } catch {
    return undefined;
  }
};

const isMatchingCertAndKey = (certPem: string, keyPem: string) => {
  try {
    const cert = new X509Certificate(certPem);
    const certPub = cert.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

    const privateKey = createPrivateKey(keyPem);
    const keyPub = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).toString('base64');

    return certPub === keyPub;
  } catch {
    return false;
  }
};

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
    const companyCuit = parseCuit(process.env.COMPANY_CUIT);
    const production = productionOverride ?? parseBooleanEnv(process.env.AFIP_PRODUCTION, false);

    console.log(
      `[AFIP] Config vars -> AFIP_PRODUCTION=${String(process.env.AFIP_PRODUCTION)}, ` +
      `COMPANY_CUIT=${companyCuit || 'EMPTY'}, ` +
      `AFIP_CERT_PEM=${cert ? 'OK' : 'MISSING'}, AFIP_KEY_PEM=${key ? 'OK' : 'MISSING'}, ` +
      `AFIP_CERT_PATH=${process.env.AFIP_CERT_PATH ? 'SET' : 'EMPTY'}, AFIP_KEY_PATH=${process.env.AFIP_KEY_PATH ? 'SET' : 'EMPTY'}`
    );

    if (!cert || !key) {
      this.afip = null;
      console.warn('[AFIP] Certificado/clave no configurados.');
      return;
    }

    if (companyCuit.length !== 11) {
      this.afip = null;
      console.error('[AFIP] COMPANY_CUIT inválido o ausente. Debe contener 11 dígitos.');
      return;
    }

    const normalizedCert = normalizePemContent(cert);
    const normalizedKey = normalizePemContent(key);
    const certCuit = extractCuitFromCert(normalizedCert);
    const validity = getCertValidity(normalizedCert);

    try {
      const certObj = new X509Certificate(normalizedCert);
      console.log(`[AFIP] Cert Serial: ${certObj.serialNumber}`);
      console.log(`[AFIP] Cert Subject: ${certObj.subject}`);
    } catch (e) {
      console.error('[AFIP] Error al leer metadata del certificado:', e);
    }

    if (validity) {
      console.log(`[AFIP] Cert validez -> desde=${validity.validFrom} hasta=${validity.validTo}`);
      if (validity.isExpired) {
        this.afip = null;
        console.error('[AFIP] Certificado AFIP vencido. Renovar certificado en ARCA y actualizar AFIP_CERT_PEM/AFIP_KEY_PEM.');
        return;
      }
    }

    if (!isMatchingCertAndKey(normalizedCert, normalizedKey)) {
      this.afip = null;
      console.error('[AFIP] Certificado y clave privada no coinciden. Revisar AFIP_CERT_PEM y AFIP_KEY_PEM.');
      return;
    }

    if (certCuit) {
      console.log(`[AFIP] CUIT detectado en certificado: ${certCuit}`);
    } else {
      console.warn('[AFIP] No se pudo detectar CUIT dentro del certificado (subject sin SERIALNUMBER=CUIT ...).');
    }

    if (process.env.AFIP_WSAA_URL || process.env.AFIP_WSFE_URL) {
      console.warn(
        `[AFIP] URLs custom detectadas (AFIP_WSAA_URL=${process.env.AFIP_WSAA_URL ? 'SET' : 'EMPTY'}, ` +
        `AFIP_WSFE_URL=${process.env.AFIP_WSFE_URL ? 'SET' : 'EMPTY'}). Si son incorrectas, pueden causar 401.`
      );
    }

    if (certCuit && certCuit !== companyCuit) {
      this.afip = null;
      console.error(`[AFIP] Mismatch de credenciales: COMPANY_CUIT=${companyCuit} pero certificado pertenece a CUIT=${certCuit}.`);
      return;
    }

    try {
      const options: any = {
        CUIT: companyCuit,
        production,
        cert: normalizedCert,
        key: normalizedKey,
        res_folder: TOKENS_DIR,
        ta_folder: TOKENS_DIR
      };

      this.afip = new Afip(options);

      // GARANTIZAR URLS DE PRODUCCIÓN (ARCA)
      if (production) {
        // Forzamos el servidor de login de producción
        if (this.afip.WSAA) {
          this.afip.WSAA.service_url = 'https://wsaa.afip.gov.ar/ws/services/LoginCms';
        }
        
        // La librería maneja las otras URLs internamente si 'production: true'
        // pero ante cualquier duda, aquí las forzaríamos.
      }

      this.currentProduction = production;
      console.log(`[AFIP] OK -> ENTORNO: ${production ? 'PRODUCCIÓN (ARCA)' : 'HOMOLOGACIÓN (TESTING)'}`);
      console.log(`[AFIP] CUIT Emisor: ${companyCuit} | Alias: OsoNueva`);
      
      this.clearTokensSync();

    } catch (e: any) {
      console.error('[AFIP] Error al inicializar SDK:', e.message);
    }
  }

  /**
   * Obtiene un Ticket de Acceso (TA) forzando una limpieza de caché si es necesario
   */
  private async getTA(serviceName: string) {
    try {
      return await this.afip.GetServiceTA(serviceName);
    } catch (error: any) {
      console.error(`[AFIP] Error crítico obteniendo TA para ${serviceName}:`, error.message);
      throw error;
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
        const errorDetails = getAfipErrorDetails(e);
        console.log('[AFIP] Falló ' + method + ': ' + String(e?.message || e));
        if (errorDetails.status || errorDetails.payload) {
          console.log(`[AFIP] Detalle ${method} -> status=${String(errorDetails.status)} payload=${errorDetails.payload || 'N/A'}`);
        }
        
        // Si el error es de TOKEN o 401, reiniciamos y REINTENTAMOS este mismo método una vez
        if (errMsg.includes('token') || errMsg.includes('401') || errMsg.includes('unauthorized')) {
          hadAuthError = true;
          console.warn(`[AFIP] Error 401 en ${method}. Limpiando tokens y re-inicializando...`);
          
          // BORRAMOS TOKENS CACHEADOS para forzar un nuevo pedido a ARCA
          try {
            const files = fs.readdirSync(TOKENS_DIR);
            for (const file of files) {
              fs.unlinkSync(path.join(TOKENS_DIR, file));
            }
            console.log('[AFIP] Tokens eliminados exitosamente.');
          } catch (err) {
            console.error('[AFIP] Error al limpiar tokens:', err);
          }

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
            const retryDetails = getAfipErrorDetails(retryErr);
            if (retryMsg.includes('token') || retryMsg.includes('401') || retryMsg.includes('unauthorized')) {
              hadAuthError = true;
            }
            console.log('[AFIP] Reintento fallido para ' + method + ': ' + String(retryErr?.message || retryErr));
            if (retryDetails.status || retryDetails.payload) {
              console.log(`[AFIP] Detalle reintento ${method} -> status=${String(retryDetails.status)} payload=${retryDetails.payload || 'N/A'}`);
            }
          }
        }
      }
    }

    return { details, usedMethod, hadAuthError };
  }

  async getTaxpayerDetails(cuit: string) {
    if (!this.afip) {
      return {
        nombre: '',
        razonSocial: '',
        cuit: cuit.replace(/\D/g, ''),
        _notFound: true,
        _afipAuthError: true,
        _message: 'AFIP no configurado correctamente. Revisá COMPANY_CUIT (11 dígitos) y que cert/key pertenezcan al mismo CUIT emisor.'
      };
    }
    const cleanCuit = cuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) throw new Error('CUIT inválido');

    let { details, usedMethod, hadAuthError } = await this.executePadronLookups(cleanCuit);

    if (!details) {
      if (hadAuthError) {
        console.warn(`[AFIP] Sin datos para ${cleanCuit}: autenticación rechazada por ARCA (401). Esto suele ser por falta de relación en el portal AFIP o demora en propagación.`);
        return {
          nombre: '',
          razonSocial: '',
          cuit: cleanCuit,
          _notFound: true,
          _afipAuthError: true,
          _message: 'ARCA rechazó la autenticación (401). Verificá que el Alias esté vinculado al servicio en el portal AFIP.'
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
