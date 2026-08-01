import AfipModule from '@afipsdk/afip.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { X509Certificate, createPrivateKey, createPublicKey } from 'crypto';
import { buildAfipWsfePayload } from '../utils/afipInvoiceBuilder';

dotenv.config();

const Afip = AfipModule as any;

// v1.x de @afipsdk/afip.js exige access_token de pago y bloquea v0.8.x en producción.
// Usamos WSAA/SOAP local (0.8.1) sin depender del proxy cloud de AfipSDK.
if (!Afip.__localWsaaPatched) {
  Afip.prototype.TrackUsage = async function trackUsageNoop() {};
  Afip.__localWsaaPatched = true;
}

/**
 * PATH DE TOKENS: Forzamos una carpeta específica para evitar conflictos de permisos
 */
const TOKENS_DIR = path.join(process.cwd(), 'uploads', '.afip_tokens');
const SECRETS_DIR = path.join(process.cwd(), 'uploads', '.afip_secrets');
for (const dir of [TOKENS_DIR, SECRETS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const CERT_FILE = 'cert.crt';
const KEY_FILE = 'private.key';

const REQUIRED_AFIP_SERVICES = [
  { id: 'ws_sr_constancia_inscripcion', label: 'Constancia de Inscripción (padrón / búsqueda CUIT)' },
  { id: 'wsfe', label: 'Facturación electrónica (WSFE)' },
  { id: 'ws_sr_padron_a5', label: 'Padrón A5 (fallback consulta CUIT)' },
];

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

const writeSecretsToDisk = (certPem: string, keyPem: string) => {
  fs.writeFileSync(path.join(SECRETS_DIR, CERT_FILE), certPem, { mode: 0o600 });
  fs.writeFileSync(path.join(SECRETS_DIR, KEY_FILE), keyPem, { mode: 0o600 });
};

const getAfipAuthErrorMessage = () =>
  'ARCA rechazó la autenticación. Verificá en el portal AFIP que el alias OsoNueva tenga delegados los servicios ws_sr_constancia_inscripcion y wsfe para el CUIT 20202042644.';

const resolveFiscalCondition = (details: any): string => {
  const candidates = [
    details?.datosRegimenGeneral?.impuesto?.descripcionImpuesto,
    details?.datosMonotributo?.categoriaMonotributo?.descripcionCategoria,
    details?.datosGenerales?.estadoClave,
    details?.estadoClave,
    details?.tipoPersona,
    details?.tipoClave,
  ];

  for (const value of candidates) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }

  if (details?.datosMonotributo) return 'Monotributo';
  if (details?.datosRegimenGeneral) return 'Responsable Inscripto';
  return 'Consumidor Final';
};

const resolveSuggestedInvoiceType = (fiscalCondition: string): 'A' | 'B' | 'C' => {
  const normalized = String(fiscalCondition || '').toLowerCase();
  if (normalized.includes('monotribut')) return 'C';
  if (normalized.includes('responsable inscripto') || normalized.includes('inscripto')) return 'A';
  return 'B';
};

const resolveDomicilioFiscal = (details: any) => {
  const domicilio =
    details?.domicilioFiscal ||
    details?.datosGenerales?.domicilioFiscal ||
    details?.domicilio ||
    details?.datosGenerales?.domicilio ||
    {};

  const addressParts = [
    domicilio.direccion || domicilio.calle || domicilio.address,
    domicilio.numero,
    domicilio.localidad || domicilio.ciudad || domicilio.city,
    domicilio.descripcionProvincia || domicilio.provincia || domicilio.state,
    domicilio.codPostal || domicilio.postalCode,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  return {
    street: domicilio.direccion || domicilio.calle || domicilio.address || '',
    number: domicilio.numero || '',
    city: domicilio.localidad || domicilio.ciudad || domicilio.city || '',
    province: domicilio.descripcionProvincia || domicilio.provincia || domicilio.state || '',
    postalCode: domicilio.codPostal || domicilio.postalCode || '',
    country: domicilio.descripcionPais || domicilio.pais || 'Argentina',
    formatted: addressParts.join(', '),
  };
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
      writeSecretsToDisk(normalizedCert, normalizedKey);

      const options: any = {
        CUIT: Number(companyCuit),
        production,
        cert: CERT_FILE,
        key: KEY_FILE,
        res_folder: SECRETS_DIR,
        ta_folder: TOKENS_DIR,
      };

      this.afip = new Afip(options);
      this.currentProduction = production;
      console.log(`[AFIP] OK -> ENTORNO: ${production ? 'PRODUCCIÓN (ARCA local WSAA)' : 'HOMOLOGACIÓN (TESTING)'}`);
      console.log(`[AFIP] CUIT Emisor: ${companyCuit} | Alias cert: OsoNueva`);

      this.clearTokensSync();
    } catch (e: any) {
      this.afip = null;
      console.error('[AFIP] Error al inicializar SDK:', e.message);
    }
  }

  private clearTokensSync() {
    try {
      if (fs.existsSync(path.join(TOKENS_DIR))) {
        const files = fs.readdirSync(TOKENS_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(TOKENS_DIR, file));
        }
        console.log('[AFIP] Tokens locales eliminados satisfactoriamente.');
      }
    } catch (err) {
      console.error('[AFIP] No se pudieron limpiar los tokens:', err);
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
          _message: getAfipAuthErrorMessage()
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

    const fiscalCondition = resolveFiscalCondition(details);
    const suggestedInvoiceType = resolveSuggestedInvoiceType(fiscalCondition);
    const domicilioFiscal = resolveDomicilioFiscal(details);

    const result = {
      ...details,
      nombre: finalName.trim(),
      razonSocial: finalName.trim(),
      fiscalCondition,
      suggestedInvoiceType,
      domicilioFiscal,
      _source: usedMethod,
      _notFound: false,
    };

    console.log('[AFIP] Resultado normalizado:', result.nombre);
    return result;
  }

  async createInvoice(data: any) {
    if (!this.afip) throw new Error('AFIP no configurado');
    try {
      const lastVoucher = await this.afip.ElectronicBilling.getLastVoucher(data.PtoVta, data.CbteTipo);
      const nextNumber = lastVoucher + 1;
      const voucherData = buildAfipWsfePayload(
        {
          ...data,
          invoiceType: data.invoiceType,
          Concepto: data.Concepto || 1,
        },
        nextNumber
      );
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

  getConfigSnapshot() {
    const cert = resolveSecretContent('AFIP_CERT_PEM', 'AFIP_CERT_PATH');
    const key = resolveSecretContent('AFIP_KEY_PEM', 'AFIP_KEY_PATH');
    const companyCuit = parseCuit(process.env.COMPANY_CUIT);
    const production = parseBooleanEnv(process.env.AFIP_PRODUCTION, false);
    const normalizedCert = cert ? normalizePemContent(cert) : '';
    const certCuit = normalizedCert ? extractCuitFromCert(normalizedCert) : undefined;
    const validity = normalizedCert ? getCertValidity(normalizedCert) : undefined;

    const issues: string[] = [];
    if (!cert || !key) issues.push('Faltan AFIP_CERT_PEM y/o AFIP_KEY_PEM.');
    if (companyCuit.length !== 11) issues.push('COMPANY_CUIT debe tener 11 dígitos.');
    if (normalizedCert && key && !isMatchingCertAndKey(normalizedCert, normalizePemContent(key))) {
      issues.push('El certificado y la clave privada no coinciden.');
    }
    if (validity?.isExpired) issues.push('El certificado AFIP está vencido.');
    if (certCuit && companyCuit && certCuit !== companyCuit) {
      issues.push(`COMPANY_CUIT=${companyCuit} no coincide con el CUIT del certificado (${certCuit}).`);
    }
    if (process.env.AFIP_ACCESS_TOKEN) {
      issues.push('AFIP_ACCESS_TOKEN no es necesario: el backend usa WSAA local (no requiere AfipSDK cloud).');
    }
    if (process.env.ENABLE_AFIP_QUEUE !== 'true') {
      issues.push('ENABLE_AFIP_QUEUE no está en true (facturación async deshabilitada).');
    }
    if (!process.env.REDIS_URL) {
      issues.push('REDIS_URL no configurado (requerido para facturación async).');
    }

    return {
      configured: Boolean(this.afip),
      production,
      companyCuit: companyCuit || null,
      certCuit: certCuit || null,
      certAlias: 'OsoNueva',
      certValidTo: validity?.validTo || null,
      certExpired: validity?.isExpired ?? null,
      certKeyMatch: normalizedCert && key ? isMatchingCertAndKey(normalizedCert, normalizePemContent(key)) : null,
      puntoVenta: Number(process.env.AFIP_PTO_VTA || 1),
      enableQueue: process.env.ENABLE_AFIP_QUEUE === 'true',
      hasRedis: Boolean(process.env.REDIS_URL),
      authMode: 'local-wsaa',
      issues,
    };
  }

  async runDiagnostics(sampleCuit = '20394100359') {
    const config = this.getConfigSnapshot();
    if (!this.afip) {
      return {
        ok: false,
        config,
        services: [],
        sampleLookup: null,
        message: 'AFIP no inicializado. Revisá variables de entorno y logs de Render.',
      };
    }

    const services: Array<{ id: string; label: string; ok: boolean; error?: string }> = [];

    for (const service of REQUIRED_AFIP_SERVICES) {
      try {
        await this.afip.GetServiceTA(service.id);
        services.push({ id: service.id, label: service.label, ok: true });
      } catch (error: any) {
        services.push({
          id: service.id,
          label: service.label,
          ok: false,
          error: String(error?.message || error),
        });
      }
    }

    let sampleLookup: any = null;
    if (services.some((s) => s.id === 'ws_sr_constancia_inscripcion' && s.ok)) {
      try {
        const details = await this.getTaxpayerDetails(sampleCuit);
        sampleLookup = {
          cuit: sampleCuit,
          found: !details?._notFound,
          nombre: details?.nombre || details?.razonSocial || '',
          authError: Boolean((details as any)?._afipAuthError),
        };
      } catch (error: any) {
        sampleLookup = {
          cuit: sampleCuit,
          found: false,
          error: String(error?.message || error),
        };
      }
    }

    const ok = services.every((s) => s.ok) && Boolean(sampleLookup?.found || sampleLookup === null);

    return {
      ok,
      config,
      services,
      sampleLookup,
      requiredPortalServices: REQUIRED_AFIP_SERVICES.map((s) => s.id),
      message: ok
        ? 'AFIP operativo: autenticación WSAA y consulta de padrón OK.'
        : 'Hay fallas de autenticación o consulta. Revisá servicios delegados al alias OsoNueva en el portal AFIP.',
    };
  }
}

export default new AfipService();
