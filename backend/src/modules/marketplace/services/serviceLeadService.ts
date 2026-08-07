import { SellerProfile } from '../models/SellerProfile';
import { ServiceLead, ServiceLeadStatus, ServiceLeadType } from '../models/ServiceLead';
import { ORIGENRED_SERVICES, SERVICE_TYPE_LABELS } from '../constants/services';
import { sendEmail } from '../../../shared/services/emailService';

const VALID_TYPES = ORIGENRED_SERVICES.map((s) => s.type);

export const getOrigenRedServicesCatalog = () => ({
  services: ORIGENRED_SERVICES,
  labels: SERVICE_TYPE_LABELS,
});

export const createServiceLead = async (input: {
  userId: string;
  serviceType: string;
  message?: string;
}) => {
  if (!VALID_TYPES.includes(input.serviceType as ServiceLeadType)) {
    throw new Error('Tipo de servicio inválido');
  }

  const profile = await SellerProfile.findOne({ user: input.userId });
  if (!profile) throw new Error('Perfil de vendedor no encontrado');

  const existing = await ServiceLead.findOne({
    seller: profile._id,
    serviceType: input.serviceType,
    status: { $in: ['new', 'contacted'] },
  });
  if (existing) {
    throw new Error('Ya tenés una solicitud activa para este servicio');
  }

  const lead = await ServiceLead.create({
    seller: profile._id,
    user: input.userId,
    serviceType: input.serviceType,
    message: input.message?.trim(),
    status: 'new',
  });

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    const label = SERVICE_TYPE_LABELS[input.serviceType as ServiceLeadType];
    await sendEmail({
      to: adminEmail,
      subject: `Nueva solicitud de servicio: ${label}`,
      html: `
        <p><strong>${profile.businessName}</strong> solicitó asesoramiento sobre <strong>${label}</strong>.</p>
        ${input.message ? `<p>${input.message}</p>` : ''}
        <p>Revisá el panel admin de OrigenRed.</p>
      `,
      text: `${profile.businessName} solicitó ${label}. ${input.message || ''}`,
    });
  }

  return lead;
};

export const listMyServiceLeads = async (userId: string) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) return [];
  return ServiceLead.find({ seller: profile._id }).sort({ createdAt: -1 });
};

export const listAdminServiceLeads = (status?: string) => {
  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') filter.status = status;
  return ServiceLead.find(filter)
    .populate('seller', 'businessName slug phone')
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
};

export const updateAdminServiceLead = async (
  leadId: string,
  status: ServiceLeadStatus,
  adminNote?: string
) => {
  const lead = await ServiceLead.findById(leadId);
  if (!lead) throw new Error('Solicitud no encontrada');
  lead.status = status;
  if (adminNote?.trim()) lead.adminNote = adminNote.trim();
  await lead.save();
  return lead;
};
