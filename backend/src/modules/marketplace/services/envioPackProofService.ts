import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';
import { getEnvioPackTransferInstructions } from '../../../config/envioPackTransferConfig';
import { processUploadedImages } from '../middleware/marketplaceUpload';

export const getEnvioPackTransferInfo = () => getEnvioPackTransferInstructions();

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

  return { order, transfer: getEnvioPackTransferInstructions() };
};

export const listEnvioPackProofsForAdmin = async () => {
  const orders = await MarketplaceOrder.find({
    'shippingBySeller.envioPackProofStatus': { $in: ['uploaded', 'confirmed'] },
    status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
  })
    .sort({ updatedAt: -1 })
    .limit(100);

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
  }> = [];

  for (const order of orders) {
    for (const row of order.shippingBySeller || []) {
      if (!row.envioPackProofStatus || row.envioPackProofStatus === 'pending_transfer') continue;
      rows.push({
        orderNumber: order.orderNumber,
        orderId: String(order._id),
        sellerName: row.sellerName,
        shippingCost: row.shippingCost ?? 0,
        proofUrl: row.envioPackProofUrl,
        proofFileName: row.envioPackProofFileName,
        proofStatus: row.envioPackProofStatus,
        uploadedAt: row.envioPackProofUploadedAt,
        createdAt: order.createdAt,
      });
    }
  }

  return rows;
};

export const confirmEnvioPackProofForAdmin = async (orderNumber: string) => {
  const order = await MarketplaceOrder.findOne({ orderNumber });
  if (!order) throw new Error('Pedido no encontrado');

  let updated = false;
  for (const row of order.shippingBySeller || []) {
    if (row.envioPackProofStatus === 'uploaded') {
      row.envioPackProofStatus = 'confirmed';
      row.envioPackProofConfirmedAt = new Date();
      updated = true;
    }
  }
  if (!updated) throw new Error('No hay comprobante pendiente de confirmar');
  await order.save();
  return order;
};
