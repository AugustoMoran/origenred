import { SellerProfile } from '../models/SellerProfile';
import { User } from '../../auth/models/User';

export type ShipFromAddress = {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  label: string;
  source: 'platform' | 'seller';
};

/** Depósito por defecto (ventas del admin / OrigenRed oficial). */
export function getPlatformShipFrom(): ShipFromAddress {
  return {
    street: (process.env.ENVIOPACK_ORIGIN_STREET || '').trim(),
    city: (process.env.ENVIOPACK_ORIGIN_CITY || 'CABA').trim(),
    province: (process.env.ENVIOPACK_ORIGIN_PROVINCE || 'Buenos Aires').trim(),
    postalCode: (process.env.ENVIOPACK_ORIGIN_POSTAL_CODE || '1425').trim(),
    label: (process.env.ENVIOPACK_ORIGIN_LABEL || 'Depósito OrigenRed').trim(),
    source: 'platform',
  };
}

export async function getShipFromForSeller(sellerId: string): Promise<ShipFromAddress> {
  const profile = await SellerProfile.findById(sellerId);
  if (!profile) throw new Error('Vendedor no encontrado');

  const user = await User.findById(profile.user).select('roles');
  const isAdminSeller = user?.roles?.includes('admin');

  if (isAdminSeller) {
    const platform = getPlatformShipFrom();
    if (platform.street && platform.postalCode) return platform;
  }

  const street = (profile.shipStreet || '').trim();
  const city = (profile.shipCity || profile.city || '').trim();
  const province = (profile.shipProvince || profile.province || '').trim();
  const postalCode = (profile.shipPostalCode || profile.postalCode || '').trim();

  return {
    street,
    city,
    province,
    postalCode,
    label: profile.businessName,
    source: 'seller',
  };
}

export function assertShipFromReadyForQuote(shipFrom: ShipFromAddress) {
  if (!shipFrom.postalCode || shipFrom.postalCode.length < 4) {
    throw new Error(
      'El vendedor debe completar la dirección de despacho (código postal) en Mi perfil antes de cotizar envío.'
    );
  }
}
