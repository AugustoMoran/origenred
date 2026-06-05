import Afip from '@afipsdk/afip.js';
import path from 'path';

export class AfipService {
  private afip: any;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Si no hay certificados, la app no debería crashear sino operar en modo mock (opcional)
        if (process.env.AFIP_CERT_PATH && process.env.AFIP_KEY_PATH) {
            this.afip = new Afip({
                CUIT: Number(process.env.COMPANY_CUIT?.replace(/-/g, '')),
                cert: process.env.AFIP_CERT_PATH,
                key: process.env.AFIP_KEY_PATH,
                production: isProd,
                access_token: '' // Satisfy TS, though not used with cert/key
            } as any);
        }
  }

  /**
   * Obtiene el último número de comprobante autorizado
   */
  async getLastVoucher(puntoVenta: number, tipoComprobante: number): Promise<number> {
    if (!this.afip) return 0;
    return await this.afip.ElectronicBilling.getLastVoucher(puntoVenta, tipoComprobante);
  }

  /**
   * Solicita el CAE a AFIP
   */
  async createInvoice(data: {
    puntoVenta: number;
    tipoComprobante: number;
    concepto: number; // 1: Productos, 2: Servicios, 3: Ambos
    tipoDocumento: number; // 80: CUIT, 99: Consumidor Final
    numeroDocumento: number;
    importeTotal: number;
    importeNeto: number;
    importeIva: number;
  }) {
    if (!this.afip) {
      // Retornar mock si no está configurado (Solo para desarrollo)
      return {
        cae: Math.floor(Math.random() * 10000000000000).toString(),
        caeExpiration: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        voucherNumber: 1
      };
    }

    const lastVoucher = await this.getLastVoucher(data.puntoVenta, data.tipoComprobante);
    const nextVoucher = lastVoucher + 1;

    const invoiceData = {
      'CantReg': 1,
      'PtoVta': data.puntoVenta,
      'CbteTipo': data.tipoComprobante,
      'Concepto': data.concepto,
      'DocTipo': data.tipoDocumento,
      'DocNro': data.numeroDocumento,
      'CbteDesde': nextVoucher,
      'CbteHasta': nextVoucher,
      'CbteFch': new Date().toISOString().split('T')[0].replace(/-/g, ''),
      'ImpTotal': data.importeTotal,
      'ImpTotConc': 0,
      'ImpNeto': data.importeNeto,
      'ImpOpEx': 0,
      'ImpIVA': data.importeIva,
      'ImpTrib': 0,
      'MonId': 'PES',
      'MonCotiz': 1,
      'Iva': [
        {
          'Id': 5, // 21%
          'BaseImp': data.importeNeto,
          'Importe': data.importeIva
        }
      ]
    };

    const res = await this.afip.ElectronicBilling.createVoucher(invoiceData);
    
    return {
      cae: res.CAE,
      caeExpiration: res.CAEFchVto,
      voucherNumber: nextVoucher
    };
  }
}

export const afipService = new AfipService();
