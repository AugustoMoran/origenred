import axios from 'axios';
import { features } from '../../../config/features';

const ENVIOPACK_API = 'https://api.enviopack.com';

export const isEnvioPackEnabled = () => features.envioPack;

export const getEnvioPackConfig = () => ({
  enabled: features.envioPack,
});

/** Cotización por código postal — activa automáticamente con ENVIOPACK_* en .env */
export const quoteShippingByPostalCode = async (input: {
  postalCode: string;
  province?: string;
  weightKg: number;
  dimensions?: { length: number; width: number; height: number };
}) => {
  const apiKey = process.env.ENVIOPACK_API_KEY;
  const secret = process.env.ENVIOPACK_SECRET;

  if (!apiKey || !secret) {
    return {
      enabled: false,
      quotes: [],
      message: 'EnvíoPack no configurado. Completá ENVIOPACK_* en .env',
    };
  }

  try {
    const response = await axios.post(
      `${ENVIOPACK_API}/cotizar`,
      {
        codigo_postal: input.postalCode,
        provincia: input.province,
        peso: input.weightKg,
        dimensiones: input.dimensions,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Secret': secret,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return {
      enabled: true,
      quotes: response.data?.cotizaciones || response.data || [],
    };
  } catch (error: any) {
    return {
      enabled: true,
      quotes: [],
      message: error?.response?.data?.message || error.message || 'Error cotizando envío',
    };
  }
};
