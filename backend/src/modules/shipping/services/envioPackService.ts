import * as settingsService from '../../settings/services/settingsService';

export interface ShippingQuoteInput {
  postalCode: string;
  city?: string;
  province?: string;
  weight?: number;
  subtotal?: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  cost: number;
  estimatedDays: number;
}

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export const getShippingMethods = async (): Promise<ShippingMethod[]> => {
  const settings = await settingsService.getPublicSettings();

  const methods: ShippingMethod[] = [
    {
      id: 'standard',
      name: 'Envío estándar',
      carrier: 'EnvioPack (stub)',
      cost: round2(settings.defaultShippingCost || 0),
      estimatedDays: 5,
    },
  ];

  if (settings.envioPackEnabled) {
    methods.push({
      id: 'enviopack-express',
      name: 'EnvioPack Express (stub)',
      carrier: 'EnvioPack',
      cost: round2((settings.defaultShippingCost || 0) + 1500),
      estimatedDays: 2,
    });
  }

  return methods;
};

export const quoteShipping = async (input: ShippingQuoteInput) => {
  const settings = await settingsService.getPublicSettings();
  const methods = await getShippingMethods();

  const subtotal = round2(Number(input.subtotal || 0));
  const freeShipping = settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold;

  const quotes = methods.map((method) => ({
    ...method,
    cost: freeShipping ? 0 : method.cost,
    freeShippingApplied: freeShipping,
  }));

  return {
    provider: 'EnvioPack (stub)',
    postalCode: input.postalCode,
    city: input.city,
    province: input.province,
    weight: input.weight,
    quotes,
  };
};
