import { features } from '../../../config/features';
import { envioPackGet, isEnvioPackApiConfigured } from './envioPackApiClient';
import { provinceToEnvioPackId } from './envioPackProvinceMap';
import { resolveEnvioPackDireccionEnvioId } from './envioPackDireccionService';
import {
  effectivePackageDimensions,
  effectivePackageWeightKg,
  MIN_PACKAGE_WEIGHT_KG,
} from '../constants/packageShippingDefaults';
import {
  buildPaquetesString,
  pickEnvioPackQuoteForCheckout,
  type EnvioPackCostQuote,
} from './envioPackQuoteUtils';

export const isEnvioPackEnabled = () => features.envioPack;

export const getEnvioPackConfig = () => ({
  enabled: features.envioPack,
});

export type QuoteShippingInput = {
  postalCode: string;
  province?: string;
  originPostalCode?: string;
  originProvince?: string;
  weightKg: number;
  dimensions?: { length: number; width: number; height: number };
  sellerId?: string;
  shipFromSource?: 'platform' | 'seller';
};

/** Cotización EnvíoPack GET /cotizar/costo (retiro en depósito según direccion_envio). */
export const quoteShippingByPostalCode = async (input: QuoteShippingInput) => {
  if (!isEnvioPackApiConfigured()) {
    return {
      enabled: false,
      quotes: [] as EnvioPackCostQuote[],
      selectedQuote: null as EnvioPackCostQuote | null,
      message: 'EnvíoPack no configurado. Completá ENVIOPACK_API_KEY y ENVIOPACK_SECRET en .env',
    };
  }

  try {
    const destProvince = provinceToEnvioPackId(input.province);
    const paquetes = buildPaquetesString(effectivePackageDimensions(input.dimensions));
    const peso = Math.max(MIN_PACKAGE_WEIGHT_KG, effectivePackageWeightKg(input.weightKg));

    let direccionEnvio: number | undefined;
    if (input.sellerId && input.shipFromSource) {
      direccionEnvio = await resolveEnvioPackDireccionEnvioId({
        sellerId: input.sellerId,
        shipFromSource: input.shipFromSource,
        shipFromPostalCode: input.originPostalCode,
      });
    } else if (process.env.ENVIOPACK_PLATFORM_DIRECCION_ENVIO_ID) {
      direccionEnvio = Number(process.env.ENVIOPACK_PLATFORM_DIRECCION_ENVIO_ID);
    }

    const quotes = await envioPackGet<EnvioPackCostQuote[]>('/cotizar/costo', {
      provincia: destProvince,
      codigo_postal: Number(String(input.postalCode).replace(/\D/g, '').slice(0, 4)),
      peso,
      paquetes,
      despacho: 'D',
      modalidad: 'D',
      direccion_envio: direccionEnvio,
    });

    const list = Array.isArray(quotes) ? quotes : [];
    const selectedQuote = pickEnvioPackQuoteForCheckout(list);

    return {
      enabled: true,
      quotes: list,
      selectedQuote,
      direccionEnvio,
    };
  } catch (error: any) {
    return {
      enabled: true,
      quotes: [] as EnvioPackCostQuote[],
      selectedQuote: null as EnvioPackCostQuote | null,
      message: error?.response?.data?.message || error?.message || 'Error cotizando envío',
    };
  }
};

export function applySelectedQuoteToShippingRow(
  row: Record<string, unknown>,
  quote: EnvioPackCostQuote | null,
  direccionEnvio?: number
) {
  if (!quote) return;
  row.envioPackCorreo = quote.correo?.id;
  row.envioPackServicio = quote.servicio;
  row.envioPackModalidad = quote.modalidad || 'D';
  row.envioPackDespacho = quote.despacho || 'D';
  row.envioPackSelectedQuote = quote;
  if (direccionEnvio) row.envioPackDireccionEnvioId = direccionEnvio;
}
