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
    const user = await User.findById(profile.user).select('name email');
    if (user?.email) {
      sendSellerApprovedEmail({
        email: user.email,
        name: user.name || profile.businessName,
        businessName: profile.businessName,
      }).catch((err) => console.error('[seller-approved-email]', err));
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
