import { Listing } from '../models/Listing';
import { SellerProfile } from '../models/SellerProfile';
import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { Conversation } from '../models/Chat';
import { initOrderFulfillmentOnPayment } from './marketplaceOrderService';
import { notifyUserPush } from '../../notifications/chatPushService';
import { marketplaceConfig } from '../../../config/features';
import { PUBLIC_LISTING_FILTER } from './listingService';
import { quoteShippingByPostalCode } from './marketplaceShippingService';
import { createMarketplacePreference, verifyMercadoPagoPayment, isMercadoPagoEnabled, isMercadoPagoConnectEnabled } from './marketplacePaymentService';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CheckoutItemInput {
  listingId: string;
  quantity: number;
}

const generateOrderNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OR-${ts}-${rand}`;
};

/** Resuelve items del carrito validando stock y vendedores aprobados */
export const resolveCheckoutItems = async (rawItems: CheckoutItemInput[]) => {
  if (!rawItems?.length) throw new Error('El carrito está vacío');

  const orderItems: Array<{
    listing: string;
    seller: string;
    sellerName: string;
    title: string;
    slug: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    subtotal: number;
    weight?: number;
    freeShipping: boolean;
  }> = [];

  for (const raw of rawItems) {
    const qty = Math.max(1, Number(raw.quantity) || 1);
    const listing = await Listing.findOne({ _id: raw.listingId, ...PUBLIC_LISTING_FILTER }).populate(
      'seller',
      'businessName status'
    );
    if (!listing) throw new Error('Un producto ya no está disponible');

    const seller = listing.seller as any;
    if (!seller || seller.status !== 'approved') {
      throw new Error(`El vendedor de "${listing.title}" no está disponible`);
    }
    if (listing.stock < qty) {
      throw new Error(`Stock insuficiente para "${listing.title}". Disponible: ${listing.stock}`);
    }

    orderItems.push({
      listing: String(listing._id),
      seller: String(seller._id),
      sellerName: seller.businessName,
      title: listing.title,
      slug: listing.slug,
      price: listing.price,
      quantity: qty,
      imageUrl: listing.images?.[0]?.url,
      subtotal: round2(listing.price * qty),
      weight: listing.weight,
      freeShipping: listing.freeShipping,
    });
  }

  return orderItems;
};

/** Agrupa por vendedor y cotiza envío por código postal */
export const previewCheckout = async (input: {
  items: CheckoutItemInput[];
  postalCode?: string;
  province?: string;
  shippingMethod?: 'delivery' | 'pickup';
}) => {
  const orderItems = await resolveCheckoutItems(input.items);
  const shippingMethod = input.shippingMethod || 'delivery';

  const bySellerMap = new Map<
    string,
    { sellerId: string; sellerName: string; items: typeof orderItems; productSubtotal: number; weightKg: number }
  >();

  for (const item of orderItems) {
    const group = bySellerMap.get(item.seller) || {
      sellerId: item.seller,
      sellerName: item.sellerName,
      items: [],
      productSubtotal: 0,
      weightKg: 0,
    };
    group.items.push(item);
    group.productSubtotal = round2(group.productSubtotal + item.subtotal);
    group.weightKg += (item.weight || 0.5) * item.quantity;
    bySellerMap.set(item.seller, group);
  }

  const bySeller = [];
  let shippingTotal = 0;

  for (const group of bySellerMap.values()) {
    let shippingCost = 0;
    let shippingQuotes: unknown[] = [];
    const allFreeShipping = group.items.every((i) => i.freeShipping);

    if (shippingMethod === 'delivery' && input.postalCode && !allFreeShipping) {
      const quote = await quoteShippingByPostalCode({
        postalCode: input.postalCode,
        province: input.province,
        weightKg: Math.max(group.weightKg, 0.5),
      });
      shippingQuotes = quote.quotes || [];
      // Tomar la cotización más barata si hay resultados
      if (Array.isArray(shippingQuotes) && shippingQuotes.length) {
        const costs = shippingQuotes
          .map((q: any) => Number(q?.precio ?? q?.cost ?? q?.price ?? 0))
          .filter((c) => c > 0);
        shippingCost = costs.length ? Math.min(...costs) : 0;
      }
    }

    shippingTotal = round2(shippingTotal + shippingCost);
    bySeller.push({
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      items: group.items,
      productSubtotal: group.productSubtotal,
      shippingCost,
      shippingQuotes,
      freeShipping: allFreeShipping,
    });
  }

  const subtotal = round2(orderItems.reduce((acc, i) => acc + i.subtotal, 0));
  const commissionPercent = marketplaceConfig.commissionPercent;
  const commissionTotal = round2(subtotal * (commissionPercent / 100));
  const total = round2(subtotal + shippingTotal);

  return {
    items: orderItems,
    bySeller,
    subtotal,
    shippingTotal,
    commissionTotal,
    commissionPercent,
    total,
    mercadoPagoEnabled: isMercadoPagoEnabled(),
  };
};

export const createMarketplaceCheckout = async (input: {
  items: CheckoutItemInput[];
  buyerId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    notes?: string;
  };
  shippingMethod?: 'delivery' | 'pickup';
  returnClient?: 'mobile' | 'web';
}) => {
  if (!input.buyerId && !input.guestEmail) {
    throw new Error('Se requiere iniciar sesión o proporcionar un email');
  }

  const preview = await previewCheckout({
    items: input.items,
    postalCode: input.shippingAddress.postalCode,
    province: input.shippingAddress.province,
    shippingMethod: input.shippingMethod,
  });

  const order = await MarketplaceOrder.create({
    orderNumber: generateOrderNumber(),
    buyer: input.buyerId || undefined,
    guestEmail: input.guestEmail,
    guestName: input.guestName || input.shippingAddress.fullName,
    guestPhone: input.guestPhone || input.shippingAddress.phone,
    items: preview.items.map((i) => ({
      listing: i.listing,
      seller: i.seller,
      title: i.title,
      slug: i.slug,
      price: i.price,
      quantity: i.quantity,
      imageUrl: i.imageUrl,
      subtotal: i.subtotal,
    })),
    subtotal: preview.subtotal,
    shippingTotal: preview.shippingTotal,
    commissionTotal: preview.commissionTotal,
    commissionPercent: preview.commissionPercent,
    total: preview.total,
    status: 'pending_payment',
    shippingAddress: input.shippingAddress,
    shippingMethod: input.shippingMethod || 'delivery',
    shippingBySeller: preview.bySeller.map((g) => ({
      seller: g.sellerId,
      sellerName: g.sellerName,
      shippingCost: g.shippingCost,
    })),
    chatEnabled: false,
  });

  let payment = null;
  if (isMercadoPagoEnabled()) {
    const sellerIds = [...new Set(preview.items.map((i) => i.seller))];
    let collectorId: string | undefined;

    if (isMercadoPagoConnectEnabled()) {
      const sellerProfiles = await SellerProfile.find({ _id: { $in: sellerIds } });
      for (const sp of sellerProfiles) {
        if (!sp.mercadoPagoConnected || !sp.mercadoPagoUserId) {
          throw new Error(
            `El vendedor "${sp.businessName}" debe vincular Mercado Pago antes de vender`
          );
        }
      }
      if (sellerIds.length === 1) {
        const single = sellerProfiles.find((sp) => String(sp._id) === sellerIds[0]);
        collectorId = single?.mercadoPagoUserId;
      }
    }

    const mpItems = [
      ...preview.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.price,
      })),
    ];
    if (preview.shippingTotal > 0) {
      mpItems.push({
        title: 'Envío',
        quantity: 1,
        unit_price: preview.shippingTotal,
      });
    }

    payment = await createMarketplacePreference({
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      items: mpItems,
      payerEmail: input.guestEmail,
      marketplaceFee: preview.commissionTotal,
      collectorId,
      returnClient: input.returnClient,
    });

    order.mercadoPagoPreferenceId = payment.id;
    order.paymentStatus = 'pending';
    await order.save();
  }

  return {
    order,
    payment,
    mercadoPagoEnabled: isMercadoPagoEnabled(),
  };
};

/** Confirmar pago y actualizar stock — llamado desde webhook */
export const fulfillMarketplaceOrder = async (orderId: string, paymentId?: string, paymentStatus?: string) => {
  const order = await MarketplaceOrder.findById(orderId);
  if (!order) throw new Error('Pedido no encontrado');
  if (order.status === 'paid') return order;

  for (const item of order.items) {
    const listing = await Listing.findById(item.listing);
    if (!listing) continue;
    listing.stock = Math.max(0, listing.stock - item.quantity);
    if (listing.stock === 0) listing.status = 'sold_out';
    listing.salesCount += item.quantity;
    await listing.save();

    await SellerProfile.findByIdAndUpdate(item.seller, {
      $inc: { totalSales: item.quantity },
    });
  }

  order.status = 'paid';
  order.paymentId = paymentId;
  order.paymentStatus = paymentStatus || 'approved';
  order.chatEnabled = true;
  initOrderFulfillmentOnPayment(order);
  await order.save();

  // Crear conversación post-compra (una por orden)
  const sellerId = order.items[0]?.seller;
  if (sellerId && order.buyer) {
    await Conversation.findOneAndUpdate(
      { order: order._id },
      {
        order: order._id,
        buyer: order.buyer,
        seller: sellerId,
        lastMessageAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const sellerProfile = await SellerProfile.findById(sellerId);
    if (sellerProfile?.user) {
      await notifyUserPush(
        String(sellerProfile.user),
        'Nueva venta en OrigenRed',
        `Pedido ${order.orderNumber} — ${formatCurrency(order.total)}`,
        { type: 'order', orderNumber: order.orderNumber }
      );
    }
  }

  return order;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const processMarketplacePaymentWebhook = async (paymentId: string) => {
  const payment = await verifyMercadoPagoPayment(paymentId);
  const orderId = payment.external_reference;
  if (!orderId) return { processed: false };

  if (payment.status === 'approved') {
    await fulfillMarketplaceOrder(orderId, paymentId, payment.status);
  } else {
    await MarketplaceOrder.findByIdAndUpdate(orderId, {
      paymentId,
      paymentStatus: payment.status,
    });
  }

  return { processed: true, orderId, status: payment.status };
};

export const getOrderByNumber = (orderNumber: string) =>
  MarketplaceOrder.findOne({ orderNumber })
    .populate('buyer', 'name email')
    .populate('items.listing', 'title slug images');

export const getBuyerOrders = (buyerId: string) =>
  MarketplaceOrder.find({ buyer: buyerId }).sort({ createdAt: -1 });
