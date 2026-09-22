import { Listing } from '../models/Listing';
import { SellerProfile } from '../models/SellerProfile';
import { User } from '../../auth/models/User';
import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { initOrderFulfillmentOnPayment } from './marketplaceOrderService';
import { notifyUserPush } from '../../notifications/chatPushService';
import {
  attachExistingBuyerFromGuestEmail,
  ensureConversationForOrder,
  generateGuestAccessToken,
  notifyAdminsNewMarketplaceOrder,
  sendGuestOrderConfirmationEmail,
} from './guestOrderService';
import { createMarketplaceNotification } from './marketplaceNotificationStoreService';
import { marketplaceConfig } from '../../../config/features';
import { PUBLIC_LISTING_FILTER } from './listingService';
import { applySelectedQuoteToShippingRow, quoteShippingByPostalCode } from './marketplaceShippingService';
import { quotePriceValue } from './envioPackQuoteUtils';
import {
  getShipFromForSeller,
  assertShipFromReadyForQuote,
  assertPickupLocationReady,
} from './sellerShipFromService';
import { createMarketplacePreference, verifyMercadoPagoPayment, isMercadoPagoEnabled, isMercadoPagoConnectEnabled } from './marketplacePaymentService';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ventas del admin en su propio perfil: sin comisión (la comisión es ingreso de plataforma en terceros). */
export const computeCommissionForSeller = async (sellerId: string, productSubtotal: number) => {
  const profile = await SellerProfile.findById(sellerId).select('user');
  if (!profile?.user) {
    return round2(productSubtotal * (marketplaceConfig.commissionPercent / 100));
  }
  const user = await User.findById(profile.user).select('roles');
  if (user?.roles?.includes('admin')) return 0;
  return round2(productSubtotal * (marketplaceConfig.commissionPercent / 100));
};

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
    allowPickup: boolean;
    supplierName?: string;
    supplierProductCode?: string;
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
      allowPickup: Boolean(listing.allowPickup),
      supplierName: listing.supplierName,
      supplierProductCode: listing.supplierProductCode,
    });
  }

  return orderItems;
};

const assertPickupAllowedForItems = (
  orderItems: Awaited<ReturnType<typeof resolveCheckoutItems>>
) => {
  const blocked = orderItems.filter((i) => !i.allowPickup);
  if (!blocked.length) return;
  const titles = blocked.map((i) => `"${i.title}"`).join(', ');
  throw new Error(
    `${titles} no permite retiro en persona. Elegí envío a domicilio o quitá esos productos del carrito.`
  );
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

  if (shippingMethod === 'pickup') {
    assertPickupAllowedForItems(orderItems);
  }

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
    let selectedQuote: unknown = null;
    let direccionEnvio: number | undefined;
    const allFreeShipping = group.items.every((i) => i.freeShipping);

    let shipFromSnapshot: Awaited<ReturnType<typeof getShipFromForSeller>> | undefined;

    if (shippingMethod === 'pickup') {
      shipFromSnapshot = await getShipFromForSeller(group.sellerId);
      assertPickupLocationReady(shipFromSnapshot);
    }

    if (shippingMethod === 'delivery' && input.postalCode && !allFreeShipping) {
      shipFromSnapshot = await getShipFromForSeller(group.sellerId);
      assertShipFromReadyForQuote(shipFromSnapshot);
      const quote = await quoteShippingByPostalCode({
        postalCode: input.postalCode,
        province: input.province,
        originPostalCode: shipFromSnapshot.postalCode,
        originProvince: shipFromSnapshot.province,
        weightKg: Math.max(group.weightKg, 0.5),
        sellerId: group.sellerId,
        shipFromSource: shipFromSnapshot.source,
      });
      shippingQuotes = quote.quotes || [];
      selectedQuote = quote.selectedQuote;
      direccionEnvio = quote.direccionEnvio;
      if (quote.selectedQuote) {
        shippingCost = round2(quotePriceValue(quote.selectedQuote as any));
      } else if (Array.isArray(shippingQuotes) && shippingQuotes.length) {
        const costs = shippingQuotes.map((q: any) => quotePriceValue(q)).filter((c) => c > 0);
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
      selectedQuote,
      direccionEnvio,
      freeShipping: allFreeShipping,
      shipFrom: shipFromSnapshot,
    });
  }

  const subtotal = round2(orderItems.reduce((acc, i) => acc + i.subtotal, 0));
  const commissionPercent = marketplaceConfig.commissionPercent;
  let commissionTotal = 0;
  for (const group of bySeller) {
    commissionTotal = round2(
      commissionTotal + (await computeCommissionForSeller(group.sellerId, group.productSubtotal))
    );
  }
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

type PreviewSlice = {
  items: Awaited<ReturnType<typeof resolveCheckoutItems>>;
  subtotal: number;
  shippingTotal: number;
  commissionTotal: number;
  commissionPercent: number;
  total: number;
  bySeller: Array<{
    sellerId: string;
    sellerName: string;
    items: Awaited<ReturnType<typeof resolveCheckoutItems>>;
    productSubtotal: number;
    shippingCost: number;
    shippingQuotes?: unknown[];
    selectedQuote?: unknown;
    direccionEnvio?: number;
    freeShipping?: boolean;
    shipFrom?: Awaited<ReturnType<typeof getShipFromForSeller>>;
  }>;
};

const createOneCheckoutOrder = async (
  slice: PreviewSlice,
  input: {
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
  },
  sellerProfile?: { mercadoPagoUserId?: string; mercadoPagoConnected?: boolean; businessName?: string } | null
) => {
  const group = slice.bySeller[0];
  const shipFrom = group.shipFrom || (await getShipFromForSeller(group.sellerId));

  const isGuest = !input.buyerId && Boolean(input.guestEmail);
  const order = await MarketplaceOrder.create({
    orderNumber: generateOrderNumber(),
    buyer: input.buyerId || undefined,
    guestEmail: input.guestEmail,
    guestName: input.guestName || input.shippingAddress.fullName,
    guestPhone: input.guestPhone || input.shippingAddress.phone,
    guestAccessToken: isGuest ? generateGuestAccessToken() : undefined,
    items: slice.items.map((i) => ({
      listing: i.listing,
      seller: i.seller,
      title: i.title,
      slug: i.slug,
      price: i.price,
      quantity: i.quantity,
      imageUrl: i.imageUrl,
      subtotal: i.subtotal,
      supplierName: i.supplierName,
      supplierProductCode: i.supplierProductCode,
    })),
    subtotal: slice.subtotal,
    shippingTotal: slice.shippingTotal,
    commissionTotal: slice.commissionTotal,
    commissionPercent: slice.commissionPercent,
    total: slice.total,
    status: 'pending_payment',
    shippingAddress: input.shippingAddress,
    shippingMethod: input.shippingMethod || 'delivery',
    shippingBySeller: [
      (() => {
        const shippingRow: Record<string, unknown> = {
          seller: group.sellerId,
          sellerName: group.sellerName,
          shippingCost: group.shippingCost,
          envioPackProofStatus:
            (input.shippingMethod || 'delivery') === 'delivery' &&
            group.shippingCost > 0 &&
            shipFrom.source === 'seller'
              ? 'pending_transfer'
              : undefined,
          shipFromStreet: shipFrom.street,
          shipFromCity: shipFrom.city,
          shipFromProvince: shipFrom.province,
          shipFromPostalCode: shipFrom.postalCode,
          shipFromLabel: shipFrom.label,
          shipFromSource: shipFrom.source,
        };
        applySelectedQuoteToShippingRow(
          shippingRow,
          group.selectedQuote as any,
          group.direccionEnvio
        );
        return shippingRow;
      })(),
    ],
    chatEnabled: false,
  });

  let payment = null;
  if (isMercadoPagoEnabled()) {
    if (isMercadoPagoConnectEnabled() && sellerProfile) {
      if (!sellerProfile.mercadoPagoConnected || !sellerProfile.mercadoPagoUserId) {
        throw new Error(
          `El vendedor "${sellerProfile.businessName || group.sellerName}" debe vincular Mercado Pago antes de vender`
        );
      }
    }

    const mpItems = slice.items.map((i) => ({
      title: i.title,
      quantity: i.quantity,
      unit_price: i.price,
    }));
    if (slice.shippingTotal > 0) {
      mpItems.push({
        title: 'Envío',
        quantity: 1,
        unit_price: slice.shippingTotal,
      });
    }

    payment = await createMarketplacePreference({
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      items: mpItems,
      payerEmail: input.guestEmail,
      marketplaceFee: slice.commissionTotal,
      collectorId: sellerProfile?.mercadoPagoUserId,
      returnClient: input.returnClient,
    });

    order.mercadoPagoPreferenceId = payment.id;
    order.paymentStatus = 'pending';
    await order.save();
  }

  return { order, payment };
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

  const fullPreview = await previewCheckout({
    items: input.items,
    postalCode: input.shippingAddress.postalCode,
    province: input.shippingAddress.province,
    shippingMethod: input.shippingMethod,
  });

  const sellerIds = [...new Set(fullPreview.items.map((i) => i.seller))];
  const orderResults: Array<{ order: typeof MarketplaceOrder.prototype; payment: any }> = [];

  if (sellerIds.length <= 1) {
    const sellerProfile = sellerIds[0] ? await SellerProfile.findById(sellerIds[0]) : null;
    const single = await createOneCheckoutOrder(fullPreview as PreviewSlice, input, sellerProfile);
    orderResults.push(single);
  } else {
    for (const group of fullPreview.bySeller) {
      const groupItems = fullPreview.items.filter((i) => i.seller === group.sellerId);
      const subtotal = group.productSubtotal;
      const shippingTotal = group.shippingCost;
      const commissionTotal = await computeCommissionForSeller(group.sellerId, subtotal);
      const total = round2(subtotal + shippingTotal);
      const slice: PreviewSlice = {
        items: groupItems,
        subtotal,
        shippingTotal,
        commissionTotal,
        commissionPercent: fullPreview.commissionPercent,
        total,
        bySeller: [group],
      };
      const sellerProfile = await SellerProfile.findById(group.sellerId);
      orderResults.push(await createOneCheckoutOrder(slice, input, sellerProfile));
    }
  }

  const orders = orderResults.map((r) => r.order);
  const payments = orderResults.map((r) => r.payment).filter(Boolean);

  return {
    order: orders[0],
    payment: payments[0] || null,
    orders,
    payments,
    multiOrder: orders.length > 1,
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

  const { notifyAdminsEnvioPackOnOrderPaid } = await import('./envioPackProofService');
  await notifyAdminsEnvioPackOnOrderPaid(order).catch((err) =>
    console.error('[enviopack-notify-paid]', err)
  );

  const { tryCreateEnvioPackShipmentsForOrder } = await import('./marketplaceEnvioPackShipmentService');
  await tryCreateEnvioPackShipmentsForOrder(order).catch((err) =>
    console.error('[enviopack-auto-ship]', err)
  );

  await attachExistingBuyerFromGuestEmail(order);
  if (!order.buyer && order.guestEmail) {
    const withToken = await MarketplaceOrder.findById(order._id).select('+guestAccessToken');
    if (withToken && !withToken.guestAccessToken) {
      withToken.guestAccessToken = generateGuestAccessToken();
      await withToken.save();
    }
  }
  await ensureConversationForOrder(order);

  if (!order.buyer && order.guestEmail) {
    await sendGuestOrderConfirmationEmail(order).catch((err) =>
      console.error('[order-email-guest]', err)
    );
  }

  await notifyAdminsNewMarketplaceOrder(order).catch((err) =>
    console.error('[order-notify-admin]', err)
  );

  const sellerId = order.items[0]?.seller;
  if (sellerId) {
    const sellerProfile = await SellerProfile.findById(sellerId);
    if (sellerProfile?.user) {
      await notifyUserPush(
        String(sellerProfile.user),
        'Nueva venta en OrigenRed',
        `Pedido ${order.orderNumber} — ${formatCurrency(order.total)}`,
        { type: 'order', orderNumber: order.orderNumber, role: 'seller' }
      );
      await createMarketplaceNotification({
        userId: String(sellerProfile.user),
        type: 'order',
        title: 'Nueva venta',
        body: `Pedido ${order.orderNumber}`,
        href: '/vendedor/ventas',
        orderNumber: order.orderNumber,
        referenceKey: `seller-order-${order._id}`,
      });
    }
    if (order.buyer) {
      await createMarketplaceNotification({
        userId: String(order.buyer),
        type: 'order',
        title: 'Pago confirmado',
        body: `Pedido ${order.orderNumber}`,
        href: `/cuenta/compras/${order.orderNumber}`,
        orderNumber: order.orderNumber,
        referenceKey: `buyer-order-paid-${order._id}`,
      });
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
