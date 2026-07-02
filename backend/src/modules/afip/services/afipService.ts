import Afip from '@afipsdk/afip.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const decodePem = (value?: string) => {
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
    throw new Error(`No se pudo leer ${pathEnvName} en ${filePath}: ${error?.message || error}`);
  }
};

class AfipService {
  private afip: any;

  constructor() {
    const cert = resolveSecretContent('AFIP_CERT_PEM', 'AFIP_CERT_PATH');
    const key = resolveSecretContent('AFIP_KEY_PEM', 'AFIP_KEY_PATH');

    if (!cert || !key) {
      this.afip = null;
      console.warn('[AFIP] Certificado/clave no configurados. Configure AFIP_CERT_PATH+AFIP_KEY_PATH o AFIP_CERT_PEM+AFIP_KEY_PEM.');
      return;
    }

    this.afip = new Afip({
      CUIT: process.env.COMPANY_CUIT || '20123456789',
      production: process.env.NODE_ENV === 'production',
      cert,
      key,
      access_token: '', // requerido por tipos del SDK al inicializar con cert/key
    });
  }

  /**
   * Genera una factura electrónica (WSFE)
   */
  async createInvoice(data: any) {
    if (!this.afip) {
      throw new Error('AFIP no configurado: faltan certificado/clave');
    }

    try {
      const lastVoucher = await this.afip.ElectronicBilling.getLastVoucher(data.PtoVta, data.CbteTipo);
      const nextNumber = lastVoucher + 1;

      const voucherData: any = {
        CantReg: 1,
        PtoVta: data.PtoVta,
        CbteTipo: data.CbteTipo,
        Concepto: data.Concepto || 1, // 1: Productos
        DocTipo: data.DocTipo,
        DocNro: data.DocNro,
        CbteDesde: nextNumber,
        CbteHasta: nextNumber,
        CbteFch: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        ImpTotal: data.ImpTotal,
        ImpTotConc: 0,
        ImpNeto: data.ImpNeto,
        ImpOpEx: 0,
        ImpIVA: data.ImpIVA,
        ImpTrib: 0,
        MonId: 'PES',
        MonCotiz: 1,
        Iva: data.IvaDetails, // Array de { Id, BaseImp, Importe }
      };

      if (Array.isArray(data.CbtesAsoc) && data.CbtesAsoc.length > 0) {
        voucherData.CbtesAsoc = data.CbtesAsoc;
      }

      const result = await this.afip.ElectronicBilling.createVoucher(voucherData);
      
      return {
        cae: result.CAE,
        caeFchVto: result.CAEFchVto || result.CAEAfterVTo,
        voucherNumber: nextNumber,
        fullResult: result
      };
    } catch (error: any) {
      console.error('AFIP Error:', error.message);
      throw new Error(`AFIP: ${error.message}`);
    }
  }

  /**
   * Obtiene puntos de venta configurados
   */
  async getPointsOfSale() {
    if (!this.afip) throw new Error('AFIP no configurado');
    return await this.afip.ElectronicBilling.getSalesPoints();
  }

  /**
   * Obtiene tipos de comprobantes disponibles
   */
  async getVoucherTypes() {
    if (!this.afip) throw new Error('AFIP no configurado');
    return await this.afip.ElectronicBilling.getVoucherTypes();
  }

  /**
   * Obtiene datos del contribuyente por CUIT
   */
  async getTaxpayerDetails(cuit: string) {
    if (!this.afip) throw new Error('AFIP no configurado');
    
    const cleanCuit = cuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) {
      throw new Error('CUIT inválido: debe tener 11 dígitos');
    }

    try {
      console.log(`[AFIP] Consultando padrón para CUIT: ${cleanCuit}`);
      
      let details: any = null;
      let source = '';

      // Tactic 1: Padron A5 (Active taxpayers)
      try {
        details = await this.afip.RegisterScopeFive.getTaxpayerDetails(cleanCuit);
        if (details) source = 'A5';
      } catch (e) {}

      // Tactic 2: Padron A4
      if (!details) {
        try {
          details = await this.afip.RegisterScopeFour.getTaxpayerDetails(cleanCuit);
          if (details) source = 'A4';
        } catch (e) {}
      }

      // Tactic 3: Padron A10 (Physical persons - VERY common for CUILs)
      if (!details) {
        try {
          console.log(`[AFIP] Probando A10 para ${cleanCuit}...`);
          // @ts-ignore
          details = await this.afip.RegisterScopeTen.getTaxpayerDetails(cleanCuit);
          if (details) {
            source = 'A10';
            console.log(`[AFIP] Encontrado en A10`);
          }
        } catch (e: any) {
          console.log(`[AFIP] Error A10: ${e.message}`);
        }
      }

      // Tactic 5: RegisterInscriptionProof (Último recurso para obtener el nombre)
      if (!details) {
        try {
          console.log(`[AFIP] Probando Constancia de Inscripción para ${cleanCuit}...`);
          // @ts-ignore
          details = await this.afip.RegisterInscriptionProof.getTaxpayerDetails(cleanCuit);
          if (details) {
            source = 'Proof';
            console.log(`[AFIP] Encontrado en Constancia de Inscripción`);
          }
        } catch (e: any) {
          console.log(`[AFIP] Error Constancia: ${e.message}`);
        }
      }

      // Tactic 6: SIEMPRE devolver algo si AFIP no responde pero el formato es válido
      if (!details) {
        console.log(`[AFIP] No se encontró información pública para ${cleanCuit}. Devolviendo objeto vacío para permitir edición manual.`);
        return {
          nombre: '',
          razonSocial: '',
          cuit: cleanCuit,
          _notFound: true
        };
      }
      if (!details) {
        try {
          details = await this.afip.RegisterScopeThirteen.getTaxpayerDetails(cleanCuit);
          if (details) source = 'A13';
        } catch (e) {}
      }

      if (!details) return null;

      // NORMALIZACIÓN DE NOMBRE PARA PERSONAS FÍSICAS (CUIL)
      // AFIP suele devolver apellido y nombre por separado para personas
      let fullName = details.nombre || details.razonSocial || '';
      
      if (!fullName && details.apellido) {
        fullName = `${details.apellido}${details.nombre ? ' ' + details.nombre : ''}`;
      }
      
      // Si aún no hay nombre (algunos padrones lo traen en 'personaReturn.datosGenerales')
      if (!fullName && details.datosGenerales) {
        fullName = details.datosGenerales.razonSocial || 
                   `${details.datosGenerales.apellido || ''} ${details.datosGenerales.nombre || ''}`.trim();
      }

      return {
        ...details,
        nombre: fullName, // Aseguramos que el campo 'nombre' tenga algo
        razonSocial: fullName, // Aseguramos que 'razonSocial' también esté
        _source: source
      };
    } catch (error: any) {
      console.error(`[AFIP] Error crítico buscando CUIT ${cleanCuit}:`, error.message);
      return null;
    }
  }
}

export default new AfipService();