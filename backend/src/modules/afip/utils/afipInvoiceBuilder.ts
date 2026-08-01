export type AfipInvoiceType = 'A' | 'B' | 'C';

export interface AfipIvaDetail {
  Id: number;
  BaseImp: number;
  Importe: number;
}

export interface AfipAssociatedVoucher {
  Tipo: number;
  PtoVta: number;
  Nro: number;
}

export interface AfipInvoiceInput {
  PtoVta: number;
  CbteTipo: number;
  DocTipo: number;
  DocNro: number;
  ImpTotal: number;
  ImpNeto: number;
  ImpIVA: number;
  IvaDetails?: AfipIvaDetail[];
  CbtesAsoc?: AfipAssociatedVoucher[];
  Concepto?: number;
  invoiceType?: AfipInvoiceType | string;
}

export interface AfipWsfePayload {
  CantReg: number;
  PtoVta: number;
  CbteTipo: number;
  Concepto: number;
  DocTipo: number;
  DocNro: number;
  CbteDesde: number;
  CbteHasta: number;
  CbteFch: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpIVA: number;
  ImpTrib: number;
  MonId: string;
  MonCotiz: number;
  Iva?: AfipIvaDetail[];
  CbtesAsoc?: AfipAssociatedVoucher[];
}

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export const mapInvoiceTypeToAfipCode = (invoiceType: AfipInvoiceType | string): number => {
  const normalized = String(invoiceType || 'B').toUpperCase();
  if (normalized === 'A') return 1;
  if (normalized === 'C') return 11;
  return 6;
};

export const resolveInvoiceTypeFromCbteTipo = (cbteTipo: number): AfipInvoiceType => {
  if (cbteTipo === 1) return 'A';
  if (cbteTipo === 11) return 'C';
  return 'B';
};

export const isFacturaC = (input: AfipInvoiceInput): boolean => {
  const invoiceType = String(input.invoiceType || '').toUpperCase();
  if (invoiceType === 'C') return true;
  return Number(input.CbteTipo) === 11;
};

export const buildAfipWsfePayload = (
  input: AfipInvoiceInput,
  nextVoucherNumber: number,
  cbteFch?: string
): AfipWsfePayload => {
  const invoiceType = resolveInvoiceTypeFromCbteTipo(Number(input.CbteTipo));
  const facturaC = isFacturaC({ ...input, invoiceType });

  const impTotal = round2(input.ImpTotal);
  const impNeto = facturaC ? impTotal : round2(input.ImpNeto);
  const impIva = facturaC ? 0 : round2(input.ImpIVA);

  const payload: AfipWsfePayload = {
    CantReg: 1,
    PtoVta: Number(input.PtoVta),
    CbteTipo: Number(input.CbteTipo),
    Concepto: Number(input.Concepto || 1),
    DocTipo: Number(input.DocTipo),
    DocNro: Number(input.DocNro),
    CbteDesde: nextVoucherNumber,
    CbteHasta: nextVoucherNumber,
    CbteFch: cbteFch || new Date().toISOString().split('T')[0].replace(/-/g, ''),
    ImpTotal: impTotal,
    ImpTotConc: 0,
    ImpNeto: impNeto,
    ImpOpEx: 0,
    ImpIVA: impIva,
    ImpTrib: 0,
    MonId: 'PES',
    MonCotiz: 1,
  };

  if (!facturaC && impIva > 0) {
    payload.Iva = input.IvaDetails?.length
      ? input.IvaDetails.map((row) => ({
          Id: Number(row.Id),
          BaseImp: round2(row.BaseImp),
          Importe: round2(row.Importe),
        }))
      : [{ Id: 5, BaseImp: impNeto, Importe: impIva }];
  }

  if (input.CbtesAsoc?.length) {
    payload.CbtesAsoc = input.CbtesAsoc;
  }

  return payload;
};

export const buildSaleInvoiceData = (sale: {
  invoiceType?: string;
  total?: number;
  totalNeto?: number;
  totalIva?: number;
  clientCuit?: string;
}, ptoVta: number) => {
  const invoiceType = String(sale.invoiceType || 'B').toUpperCase() as AfipInvoiceType;
  const cbteTipo = mapInvoiceTypeToAfipCode(invoiceType);
  const docTipo = sale.clientCuit ? 80 : 99;
  const docNro = sale.clientCuit ? Number(String(sale.clientCuit).replace(/\D/g, '')) : 0;

  return {
    PtoVta: ptoVta,
    CbteTipo: cbteTipo,
    DocTipo: docTipo,
    DocNro: docNro,
    ImpTotal: round2(Number(sale.total || 0)),
    ImpNeto: round2(Number(sale.totalNeto || 0)),
    ImpIVA: round2(Number(sale.totalIva || 0)),
    invoiceType,
    IvaDetails: invoiceType === 'C'
      ? []
      : [{ Id: 5, BaseImp: round2(Number(sale.totalNeto || 0)), Importe: round2(Number(sale.totalIva || 0)) }],
  };
};
