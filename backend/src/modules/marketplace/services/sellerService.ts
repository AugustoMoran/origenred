import { SellerProfile, ISellerProfile } from '../models/SellerProfile';
import { User } from '../../auth/models/User';
import { MARKETPLACE_ROLES } from '../constants/roles';
import { register } from '../../auth/services/authService';
import { exchangeMercadoPagoConnectCode } from './marketplacePaymentService';
import { sendSellerApprovedEmail } from '../../../shared/services/emailService';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const getSellerByUserId = (userId: string) =>
  SellerProfile.findOne({ user: userId }).populate('user', 'name email');

export const updateSellerProfile = async (
  userId: string,
  input: {
    businessName?: string;
    description?: string;
    province?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    shipStreet?: string;
    shipCity?: string;
    shipProvince?: string;
    shipPostalCode?: string;
    envioPackDireccionEnvioId?: number | null;
  }
) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) throw new Error('Perfil de vendedor no encontrado');

  if (input.businessName?.trim()) {
    profile.businessName = input.businessName.trim();
  }
  if (input.description !== undefined) profile.description = input.description.trim();
  if (input.province !== undefined) profile.province = input.province.trim();
  if (input.city !== undefined) profile.city = input.city.trim();
  if (input.postalCode !== undefined) profile.postalCode = input.postalCode.trim();
  if (input.phone !== undefined) profile.phone = input.phone.trim();
  if (input.shipStreet !== undefined) profile.shipStreet = input.shipStreet.trim();
  if (input.shipCity !== undefined) profile.shipCity = input.shipCity.trim();
  if (input.shipProvince !== undefined) profile.shipProvince = input.shipProvince.trim();
  if (input.shipPostalCode !== undefined) profile.shipPostalCode = input.shipPostalCode.trim();
  if (input.envioPackDireccionEnvioId !== undefined) {
    profile.envioPackDireccionEnvioId =
      input.envioPackDireccionEnvioId === null ? undefined : Number(input.envioPackDireccionEnvioId);
  }

  await profile.save();
  return profile;
};

export const setSellerEnvioPackDireccionEnvioId = async (sellerId: string, direccionEnvioId: number | null) => {
  const profile = await SellerProfile.findById(sellerId);
  if (!profile) throw new Error('Vendedor no encontrado');
  profile.envioPackDireccionEnvioId =
    direccionEnvioId === null || direccionEnvioId === undefined ? undefined : Number(direccionEnvioId);
  if (profile.envioPackDireccionEnvioId !== undefined && !Number.isFinite(profile.envioPackDireccionEnvioId)) {
    throw new Error('ID de depósito EnvíoPack inválido');
  }
  await profile.save();
  return profile;
};

export const getApprovedSellerByUserId = async (userId: string) => {
  const profile = await SellerProfile.findOne({ user: userId, status: 'approved' });
  return profile;
};

export const registerSeller = async (input: {
  email: string;
  password: string;
  name: string;
  businessName: string;
  province?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  description?: string;
}) => {
  const existingUser = await User.findOne({ email: input.email.trim().toLowerCase() });
  if (existingUser) {
    throw new Error('El email ya está registrado');
  }

  const user = await register(
    input.email,
    input.password,
    [MARKETPLACE_ROLES.SELLER, MARKETPLACE_ROLES.BUYER],
    {},
    input.name
  );

  let baseSlug = slugify(input.businessName);
  if (!baseSlug) baseSlug = `vendedor-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;
  while (await SellerProfile.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const profile = await SellerProfile.create({
    user: user._id,
    businessName: input.businessName.trim(),
    slug,
    description: input.description,
    province: input.province,
    city: input.city,
    postalCode: input.postalCode,
    phone: input.phone,
    status: 'pending',
  });

  return { user, profile };
};

/** Usuario ya registrado solicita perfil de vendedor (sin crear cuenta nueva). */
export const applySellerAsExistingUser = async (
  userId: string,
  input: {
    businessName: string;
    province?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    description?: string;
  }
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  if (!input.businessName?.trim()) throw new Error('El nombre del negocio es obligatorio');

  const existingProfile = await SellerProfile.findOne({ user: userId });
  if (existingProfile) {
    if (existingProfile.status === 'pending') {
      throw new Error('Ya tenés una solicitud de vendedor en revisión');
    }
    if (existingProfile.status === 'approved') {
      throw new Error('Ya tenés un perfil de vendedor activo');
    }
    if (existingProfile.status === 'rejected') {
      existingProfile.businessName = input.businessName.trim();
      existingProfile.description = input.description;
      existingProfile.province = input.province;
      existingProfile.city = input.city;
      existingProfile.postalCode = input.postalCode;
      existingProfile.phone = input.phone;
      existingProfile.status = 'pending';
      existingProfile.rejectionReason = undefined;
      await existingProfile.save();
      await ensureSellerRole(user);
      return { user, profile: existingProfile };
    }
    throw new Error('Ya tenés un perfil de vendedor');
  }

  let baseSlug = slugify(input.businessName);
  if (!baseSlug) baseSlug = `vendedor-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;
  while (await SellerProfile.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const profile = await SellerProfile.create({
    user: user._id,
    businessName: input.businessName.trim(),
    slug,
    description: input.description,
    province: input.province,
    city: input.city,
    postalCode: input.postalCode,
    phone: input.phone,
    status: 'pending',
  });

  await ensureSellerRole(user);

  return { user, profile };
};

async function ensureSellerRole(user: { _id: unknown; roles: string[]; save: () => Promise<unknown> }) {
  if (!user.roles.includes(MARKETPLACE_ROLES.SELLER)) {
    user.roles = [...user.roles, MARKETPLACE_ROLES.SELLER];
    await user.save();
  }
}

export const listPendingSellers = () =>
  SellerProfile.find({ status: 'pending' })
    .populate('user', 'name email')
    .sort({ createdAt: 1 });

export const listAllSellers = (query: { status?: string } = {}) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  return SellerProfile.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
};

export const updateSellerStatus = async (
  sellerId: string,
  status: ISellerProfile['status'],
  adminId: string,
  rejectionReason?: string
) => {
  const profile = await SellerProfile.findById(sellerId);
  if (!profile) throw new Error('Vendedor no encontrado');

  profile.status = status;
  if (status === 'approved') {
    profile.approvedAt = new Date();
    profile.approvedBy = adminId as any;
    profile.rejectionReason = undefined;
  }
  if (status === 'rejected') {
    profile.rejectionReason = rejectionReason;
  }

  await profile.save();

  if (status === 'approved') {
    const user = await User.findById(profile.user);
    if (user) {
      await ensureSellerRole(user);
      if (user.email) {
        sendSellerApprovedEmail({
          email: user.email,
          name: user.name || profile.businessName,
          businessName: profile.businessName,
        }).catch((err) => console.error('[seller-approved-email]', err));
      }
    }
  }

  return profile;
};

export const getSellerPublicProfile = (slug: string) =>
  SellerProfile.findOne({ slug, status: 'approved' }).select(
    '-mercadoPagoUserId -approvedBy -rejectionReason'
  );

export const connectMercadoPagoForSeller = async (
  sellerProfileId: string,
  userId: string,
  code: string,
  state?: string,
  returnClient?: 'mobile' | 'web'
) => {
  const profile = await SellerProfile.findOne({ _id: sellerProfileId, user: userId });
  if (!profile) throw new Error('Perfil de vendedor no encontrado');
  if (state && state !== String(profile._id)) {
    throw new Error('La vinculación no coincide con tu cuenta de vendedor');
  }

  const { userId: mpUserId } = await exchangeMercadoPagoConnectCode(code, returnClient);
  profile.mercadoPagoUserId = mpUserId;
  profile.mercadoPagoConnected = true;
  await profile.save();
  return profile;
};
