import { MarketplaceOrder, IMarketplaceOrder, IShippingBySellerRow } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';
import { User } from '../../auth/models/User';
import { getEnvioPackTransferInstructions } from '../../../config/envioPackTransferConfig';
import { processUploadedImages } from '../middleware/marketplaceUpload';
import { createMarketplaceNotification } from './marketplaceNotificationStoreService';

const ADMIN_ENVIOPACK_HREF = '/dashboard/admin/enviopack-proofs';

async function notifyAllAdmins(input: {
  title: string;
  body: string;
  orderNumber: string;
  referenceKey: string;
}) {
  const admins = await User.find({ roles: { $in: ['admin'] } }).select('_id');
  for (const admin of admins) {
    await createMarketplaceNotification({
      userId: String(admin._id),
      type: 'enviopack',
      title: input.title,
      body: input.body,
      href: ADMIN_ENVIOPACK_HREF,
      orderNumber: input.orderNumber,
      referenceKey: input.referenceKey,
    });
  }
}

export const getEnvioPackTransferInfo = () => getEnvioPackTransferInstructions();

export async function notifyAdminsEnvioPackOnOrderPaid(order: IMarketplaceOrder) {
  for (const row of order.shippingBySeller || []) {
    if (row.shipFromSource === 'platform') continue;
    if (row.envioPackProofStatus !== 'pending_transfer' || (row.shippingCost ?? 0) <= 0) continue;
    await notifyAllAdmins({
      title: 'Envío EnvíoPack pendiente',
      body: `Pedido ${order.orderNumber} (${row.sellerName}): el vendedor debe transferir ${row.shippingCost} y subir comprobante.`,
      orderNumber: order.orderNumber,
      referenceKey: `enviopack-pending-${order.orderNumber}-${row.seller}`,
    });
  }
}

export const uploadEnvioPackProofForOrder = async (
  userId: string,
  orderNumber: string,
  file: Express.Multer.File
) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) throw new Error('Perfil de vendedor no encontrado');

  const order = await MarketplaceOrder.findOne({ orderNumber });
  if (!order) throw new Error('Pedido no encontrado');

  const sellerId = String(profile._id);
  const hasItems = order.items.some((i) => String(i.seller) === sellerId);
  if (!hasItems) throw new Error('Este pedido no es tuyo');

  const entry = order.shippingBySeller?.find((s) => String(s.seller) === sellerId);
  if (!entry) throw new Error('Datos de envío no encontrados');
  if ((entry.shippingCost ?? 0) <= 0) {
    throw new Error('Este pedido no tiene envío a abonar en EnvíoPack');
  }

  const [uploaded] = await processUploadedImages([file], 'enviopack-proofs');
  if (!uploaded?.url) throw new Error('No se pudo guardar el comprobante');

  entry.envioPackProofUrl = uploaded.url;
  entry.envioPackProofKey = uploaded.key;
  entry.envioPackProofFileName = file.originalname;
  entry.envioPackProofStatus = 'uploaded';
  entry.envioPackProofUploadedAt = new Date();
  await order.save();

  await notifyAllAdmins({
    title: 'Comprobante EnvíoPack subido',
    body: `${entry.sellerName} subió el comprobante del pedido ${order.orderNumber}. Cargalo en EnvíoPack.`,
    orderNumber: order.orderNumber,
    referenceKey: `enviopack-uploaded-${order.orderNumber}-${sellerId}`,
  });

  return { order, transfer: getEnvioPackTransferInstructions() };
};

export const listEnvioPackProofsForAdmin = async () => {
  const orders = await MarketplaceOrder.find({
    status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
    'shippingBySeller.shippingCost': { $gt: 0 },
  })
    .sort({ updatedAt: -1 })
    .limit(150);

  const rows: Array<{
    orderNumber: string;
    orderId: string;
    sellerName: string;
    shippingCost: number;
    proofUrl?: string;
    proofFileName?: string;
    proofStatus?: string;
    uploadedAt?: Date;
    createdAt: Date;
    shipFromLabel?: string;
    shipFromStreet?: string;
    shipFromCity?: string;
    shipFromProvince?: string;
    shipFromPostalCode?: string;
    shipFromSource?: string;
    orderStatus: string;
    envioPackEnvioId?: number;
    envioPackLastError?: string;
  }> = [];

  for (const order of orders) {
    for (const row of order.shippingBySeller || []) {
      if ((row.shippingCost ?? 0) <= 0) continue;
      const status =
        row.envioPackProofStatus ||
        (row.shipFromSource === 'platform' ? 'platform_ship' : 'pending_transfer');
      rows.push({
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        sellerName: row.sellerName,
        shippingCost: row.shippingCost ?? 0,
        proofUrl: row.envioPackProofUrl,
        proofFileName: row.envioPackProofFileName,
        proofStatus: status,
        uploadedAt: row.envioPackProofUploadedAt,
        createdAt: order.createdAt,
        shipFromLabel: row.shipFromLabel,
        shipFromStreet: row.shipFromStreet,
        shipFromCity: row.shipFromCity,
        shipFromProvince: row.shipFromProvince,
        shipFromPostalCode: row.shipFromPostalCode,
        shipFromSource: row.shipFromSource,
        orderStatus: order.status,
        envioPackEnvioId: row.envioPackEnvioId,
        envioPackLastError: row.envioPackLastError,
      });
    }
  }

  return rows.sort((a, b) => {
    const priority = (s: string) =>
      s === 'uploaded' ? 0 : s === 'pending_transfer' ? 1 : 2;
    return priority(a.proofStatus || '') - priority(b.proofStatus || '');
  });
};

export const confirmEnvioPackProofForAdmin = async (orderNumber: string) => {
  const order = await MarketplaceOrder.findOne({ orderNumber });
  if (!order) throw new Error('Pedido no encontrado');

  const rowsToShip: IShippingBySellerRow[] = [];
  for (const row of order.shippingBySeller || []) {
    if (row.envioPackProofStatus === 'uploaded') {
      rowsToShip.push(row);
    }
  }
  if (!rowsToShip.length) throw new Error('No hay comprobante pendiente de confirmar');

  const { createEnvioPackShipmentForSellerRow } = await import('./marketplaceEnvioPackShipmentService');

  for (const row of rowsToShip) {
    row.envioPackProofStatus = 'confirmed';
    row.envioPackProofConfirmedAt = new Date();
  }

  try {
    for (const row of rowsToShip) {
      await createEnvioPackShipmentForSellerRow(order, row);
    }
    await order.save();
  } catch (err) {
    for (const row of rowsToShip) {
      row.envioPackProofStatus = 'uploaded';
      row.envioPackProofConfirmedAt = undefined;
    }
    await order.save();
    throw err;
  }

  return order;
};
