import { IMarketplaceOrder, IShippingBySellerRow } from '../models/MarketplaceOrder';
import { Listing } from '../models/Listing';
import { envioPackPost, isEnvioPackApiConfigured } from './envioPackApiClient';
import { resolveEnvioPackDireccionEnvioId } from './envioPackDireccionService';
import { provinceToEnvioPackId } from './envioPackProvinceMap';
import {
  buildPaquetesString,
  splitFullName,
  splitStreetNumber,
  type EnvioPackCostQuote,
} from './envioPackQuoteUtils';
import { createMarketplaceNotification } from './marketplaceNotificationStoreService';
import { User } from '../../auth/models/User';

const formatFechaAlta = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

async function notifyAdminsShipmentResult(orderNumber: string, ok: boolean, detail: string) {
  const admins = await User.find({ roles: { $in: ['admin'] } }).select('_id');
  for (const admin of admins) {
    await createMarketplaceNotification({
      userId: String(admin._id),
      type: 'enviopack',
      title: ok ? 'Envío creado en EnvíoPack' : 'Error al crear envío EnvíoPack',
      body: `Pedido ${orderNumber}: ${detail}`,
      href: '/dashboard/admin/enviopack-proofs',
      orderNumber,
      referenceKey: `enviopack-ship-${ok ? 'ok' : 'err'}-${orderNumber}-${Date.now()}`,
    });
  }
}

async function aggregatePackageForOrder(order: IMarketplaceOrder, sellerId: string) {
  const items = order.items.filter((i) => String(i.seller) === sellerId);
  let weightKg = 0;
  let maxH = 30;
  let maxW = 20;
  let maxL = 10;

  for (const item of items) {
    const listing = await Listing.findById(item.listing).select('weight dimensions title');
    const w = (listing?.weight || 0.5) * item.quantity;
    weightKg += w;
    const dim = listing?.dimensions;
    if (dim?.height) maxH = Math.max(maxH, dim.height);
    if (dim?.width) maxW = Math.max(maxW, dim.width);
    if (dim?.length) maxL = Math.max(maxL, dim.length);
  }

  return {
    weightKg: Math.max(0.5, Math.round(weightKg * 100) / 100),
    paquetes: buildPaquetesString({ height: maxH, width: maxW, length: maxL }),
    descripcion: items.map((i) => i.title).join(', ').slice(0, 50) || 'Productos OrigenRed',
  };
}

export async function createEnvioPackShipmentForSellerRow(
  order: IMarketplaceOrder,
  row: IShippingBySellerRow
): Promise<IMarketplaceOrder> {
  if (!isEnvioPackApiConfigured()) {
    throw new Error('EnvíoPack no está configurado en el servidor');
  }
  if ((row.shippingCost ?? 0) <= 0 || order.shippingMethod === 'pickup') {
    throw new Error('El pedido no tiene envío EnvíoPack');
  }
  if (row.envioPackEnvioId) {
    return order;
  }

  const sellerId = String(row.seller);
  const shipFromSource = row.shipFromSource || 'seller';
  const direccionEnvio = await resolveEnvioPackDireccionEnvioId({
    sellerId,
    shipFromSource,
    shipFromPostalCode: row.shipFromPostalCode,
  });

  const addr = order.shippingAddress;
  if (!addr?.postalCode) throw new Error('Falta dirección de entrega del comprador');

  const { weightKg, paquetes, descripcion } = await aggregatePackageForOrder(order, sellerId);
  const destProvince = provinceToEnvioPackId(addr.province);
  const { calle, numero } = splitStreetNumber(addr.street);
  const buyerName = addr.fullName || order.guestName || 'Comprador';
  const { nombre, apellido } = splitFullName(buyerName);
  const email = order.guestEmail || 'comprador@origenred.com';

  const idExterno = order.orderNumber.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30);

  const pedido = await envioPackPost<{ id: number }>('/pedidos', {
    id_externo: idExterno,
    nombre,
    apellido,
    email,
    telefono: addr.phone || order.guestPhone || '',
    monto: order.total,
    fecha_alta: formatFechaAlta(order.createdAt || new Date()),
    pagado: true,
    provincia: destProvince,
    localidad: (addr.city || '').slice(0, 50),
  });

  const pedidoId = Number(pedido?.id);
  if (!pedidoId) throw new Error('EnvíoPack no devolvió ID de pedido');

  const quote = row.envioPackSelectedQuote as EnvioPackCostQuote | undefined;
  const correo = row.envioPackCorreo || quote?.correo?.id;
  const servicio = row.envioPackServicio || quote?.servicio || 'N';
  const modalidad = row.envioPackModalidad || quote?.modalidad || 'D';
  const despacho = row.envioPackDespacho || quote?.despacho || 'D';

  const envioBody: Record<string, unknown> = {
    pedido: pedidoId,
    direccion_envio: direccionEnvio,
    destinatario: buyerName.slice(0, 50),
    observaciones: (addr.notes || '').slice(0, 200),
    modalidad,
    despacho,
    confirmado: Boolean(correo && servicio),
    paquetes: [
      {
        alto: Number(paquetes.split('x')[0]) || 30,
        ancho: Number(paquetes.split('x')[1]) || 20,
        largo: Number(paquetes.split('x')[2]) || 10,
        peso: weightKg,
        descripcion_primera_linea: descripcion,
        descripcion_segunda_linea: order.orderNumber,
      },
    ],
    calle,
    numero,
    codigo_postal: Number(String(addr.postalCode).replace(/\D/g, '').slice(0, 4)),
    provincia: destProvince,
    localidad: (addr.city || '').slice(0, 50),
  };

  if (correo) envioBody.correo = correo;
  if (servicio) envioBody.servicio = servicio;

  const envio = await envioPackPost<{
    id: number;
    estado?: string;
    tracking_number?: string | null;
  }>('/envios', envioBody);

  row.envioPackPedidoId = pedidoId;
  row.envioPackEnvioId = Number(envio?.id);
  row.envioPackDireccionEnvioId = direccionEnvio;
  row.envioPackEnvioEstado = envio?.estado;
  row.envioPackPaquetes = paquetes;
  if (envio?.tracking_number) {
    row.trackingCode = envio.tracking_number;
    row.envioPackTrackingNumber = envio.tracking_number;
  }
  row.envioPackLastError = undefined;
  row.status = row.trackingCode ? 'shipped' : 'processing';

  await order.save();

  await notifyAdminsShipmentResult(
    order.orderNumber,
    true,
    `Envío #${row.envioPackEnvioId} — retiro depósito ${direccionEnvio} (${shipFromSource === 'platform' ? 'OrigenRed' : row.sellerName}).`
  );

  return order;
}

export async function tryCreateEnvioPackShipmentsForOrder(order: IMarketplaceOrder) {
  if (!isEnvioPackApiConfigured()) return order;
  if (order.shippingMethod === 'pickup') return order;

  for (const row of order.shippingBySeller || []) {
    if ((row.shippingCost ?? 0) <= 0 || row.envioPackEnvioId) continue;

    const needsProof = row.envioPackProofStatus && row.shipFromSource !== 'platform';
    if (needsProof && row.envioPackProofStatus !== 'confirmed') continue;

    if (row.shipFromSource === 'platform') {
      await createEnvioPackShipmentForSellerRow(order, row).catch(async (err) => {
        const message = err?.message || String(err);
        row.envioPackLastError = message;
        await order.save();
        await notifyAdminsShipmentResult(order.orderNumber, false, message);
        throw err;
      });
    }
  }
  return order;
}
