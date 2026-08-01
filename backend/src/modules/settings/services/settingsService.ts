import StoreSettings, { IStoreSettings } from '../models/StoreSettings';

const SETTINGS_ID = 'store-settings';

const getSettingsDoc = async () => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }
  return settings;
};

export const getPublicSettings = async () => {
  const settings = await getSettingsDoc();
  return {
    storeName: settings.storeName,
    storeDescription: settings.storeDescription,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    enableEcommerce: settings.enableEcommerce,
    maintenanceMode: settings.maintenanceMode,
    minOrderAmount: settings.minOrderAmount,
    freeShippingThreshold: settings.freeShippingThreshold,
    defaultShippingCost: settings.defaultShippingCost,
    mercadopagoEnabled: settings.mercadopagoEnabled,
    envioPackEnabled: settings.envioPackEnabled,
    socialLinks: settings.socialLinks,
    bannerImages: settings.bannerImages,
  };
};

export const getSettings = async () => {
  return await getSettingsDoc();
};

export const updateSettings = async (payload: Partial<IStoreSettings>) => {
  const settings = await getSettingsDoc();
  const allowed = [
    'storeName', 'storeDescription', 'contactEmail', 'contactPhone',
    'enableEcommerce', 'maintenanceMode', 'minOrderAmount', 'freeShippingThreshold',
    'defaultShippingCost', 'mercadopagoEnabled', 'envioPackEnabled', 'defaultBranch',
    'socialLinks', 'bannerImages',
  ];

  for (const key of allowed) {
    if (payload[key as keyof IStoreSettings] !== undefined) {
      (settings as any)[key] = payload[key as keyof IStoreSettings];
    }
  }

  await settings.save();
  return settings;
};

export const SETTINGS_SINGLETON_ID = SETTINGS_ID;
