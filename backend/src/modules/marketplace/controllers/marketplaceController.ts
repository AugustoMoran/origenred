import { Request, Response } from 'express';
import {
  registerSeller,
  getSellerByUserId,
  listPendingSellers,
  listAllSellers,
  updateSellerStatus,
  getSellerPublicProfile,
} from '../services/sellerService';
import {
  createListing,
  updateListing,
  getPublicListings,
  getPublicListingBySlug,
  getSellerListings,
  deleteListing,
} from '../services/listingService';
import { parseListingBody } from '../utils/parseListingBody';
import { MarketplaceCategory } from '../models/MarketplaceCategory';
import { Favorite } from '../models/Favorite';
import { getMercadoPagoPublicConfig, getMercadoPagoConnectUrl } from '../services/marketplacePaymentService';
import { quoteShippingByPostalCode, getEnvioPackConfig } from '../services/marketplaceShippingService';
import { processUploadedImages, marketplaceUpload } from '../middleware/marketplaceUpload';
import { features } from '../../../config/features';
import {
  previewCheckout,
  createMarketplaceCheckout,
  processMarketplacePaymentWebhook,
  getOrderByNumber,
  getBuyerOrders,
} from '../services/marketplaceCheckoutService';
import {
  getBuyerConversations,
  getSellerConversations,
  getConversationMessages,
  sendMessage,
  getConversationByOrder,
  getSellerOrders,
} from '../services/chatService';
import {
  createReport,
  listPendingReports,
  listAllReports,
  updateReportStatus,
  REPORT_REASON_LABELS,
} from '../services/reportService';
import { reindexAllListings } from '../services/meilisearchService';
import { updateSellerOrderFulfillment, canViewFullOrder, toPublicOrderSummary } from '../services/marketplaceOrderService';
import { buildMarketplaceSitemap } from '../services/sitemapService';
import { io } from '../../../app';
import { emitChatMessage } from '../../../socket/marketplaceChatSocket';
import { notifyChatRecipient } from '../../../modules/notifications/chatPushService';

// ── Público ──────────────────────────────────────────────

export async function getHomeDataController(_req: Request, res: Response) {
  const [featured, newest, bestsellers, categories] = await Promise.all([
    getPublicListings({ sort: 'origenrank', limit: 8 }),
    getPublicListings({ sort: 'newest', limit: 8 }),
    getPublicListings({ sort: 'bestseller', limit: 8 }),
    MarketplaceCategory.find({ isActive: true, listingCount: { $gt: 0 } })
      .sort({ displayOrder: 1, name: 1 })
      .limit(20),
  ]);

  res.json({
    featured: featured.items,
    newest: newest.items,
    bestsellers: bestsellers.items,
    categories,
    integrations: {
      r2: features.r2,
      meilisearch: features.meilisearch,
      mercadoPago: features.mercadoPago,
      envioPack: features.envioPack,
    },
  });
}

export async function listPublicListingsController(req: Request, res: Response) {
  const result = await getPublicListings(req.query as Record<string, unknown>);
  res.json(result);
}

export async function getPublicListingController(req: Request, res: Response) {
  const listing = await getPublicListingBySlug(String(req.params.slug));
  if (!listing) return res.status(404).json({ message: 'Producto no encontrado' });
  res.json(listing);
}

export async function listPublicCategoriesController(req: Request, res: Response) {
  const showAll = req.query.all === 'true';
  const filter: Record<string, unknown> = { isActive: true };
  if (!showAll) filter.listingCount = { $gt: 0 };

  const categories = await MarketplaceCategory.find(filter)
    .sort({ displayOrder: 1, name: 1 });
  res.json(categories);
}

export async function getSellerPublicController(req: Request, res: Response) {
  const profile = await getSellerPublicProfile(String(req.params.slug));
  if (!profile) return res.status(404).json({ message: 'Vendedor no encontrado' });
  res.json(profile);
}

export async function quoteShippingController(req: Request, res: Response) {
  const { postalCode, province, weightKg, length, width, height } = req.body;
  if (!postalCode) return res.status(400).json({ message: 'Código postal requerido' });

  const result = await quoteShippingByPostalCode({
    postalCode: String(postalCode),
    province,
    weightKg: Number(weightKg) || 1,
    dimensions: length && width && height ? { length, width, height } : undefined,
  });

  res.json(result);
}

export async function getIntegrationsStatusController(_req: Request, res: Response) {
  res.json({
    mercadoPago: getMercadoPagoPublicConfig(),
    envioPack: getEnvioPackConfig(),
    r2: { enabled: features.r2 },
    meilisearch: { enabled: features.meilisearch },
  });
}

export async function getSitemapController(_req: Request, res: Response) {
  try {
    const xml = await buildMarketplaceSitemap();
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al generar sitemap' });
  }
}

// ── Vendedor ─────────────────────────────────────────────

export async function registerSellerController(req: Request, res: Response) {
  try {
    const result = await registerSeller(req.body);
    res.status(201).json({
      message: 'Solicitud enviada. Un administrador revisará tu cuenta.',
      seller: result.profile,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getMySellerProfileController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const profile = await getSellerByUserId(userId);
  if (!profile) return res.status(404).json({ message: 'Perfil de vendedor no encontrado' });
  res.json(profile);
}

export async function createListingController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const profile = await getSellerByUserId(userId);
    if (!profile) return res.status(404).json({ message: 'Perfil de vendedor no encontrado' });

    const parsed = parseListingBody(req.body);
    let images = parsed.images || [];
    if (req.files && Array.isArray(req.files) && req.files.length) {
      const uploaded = await processUploadedImages(req.files as Express.Multer.File[]);
      images = [...images, ...uploaded.map((u) => ({ url: u.url, key: u.key }))];
    }

    const listing = await createListing(String(profile._id), { ...parsed, images } as any);
    res.status(201).json(listing);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export const uploadListingImagesMiddleware = marketplaceUpload.array('images', 10);

export async function updateListingController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const profile = await getSellerByUserId(userId);
    if (!profile) return res.status(404).json({ message: 'Perfil de vendedor no encontrado' });

    const parsed = parseListingBody(req.body);
    const listing = await updateListing(String(req.params.id), String(profile._id), parsed as any);
    res.json(listing);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getMyListingsController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const profile = await getSellerByUserId(userId);
  if (!profile) return res.status(404).json({ message: 'Perfil de vendedor no encontrado' });

  const listings = await getSellerListings(String(profile._id));
  res.json(listings);
}

export async function deleteListingController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const profile = await getSellerByUserId(userId);
    if (!profile) return res.status(404).json({ message: 'Perfil de vendedor no encontrado' });

    const result = await deleteListing(String(req.params.id), String(profile._id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getMercadoPagoConnectController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const profile = await getSellerByUserId(userId);
  if (!profile) return res.status(404).json({ message: 'Perfil de vendedor no encontrado' });

  const url = getMercadoPagoConnectUrl(String(profile._id));
  res.json({ url, enabled: Boolean(url) });
}

// ── Admin marketplace ──────────────────────────────────────

export async function listSellersAdminController(req: Request, res: Response) {
  const sellers = await listAllSellers({ status: req.query.status as string });
  res.json(sellers);
}

export async function listPendingSellersController(_req: Request, res: Response) {
  const sellers = await listPendingSellers();
  res.json(sellers);
}

export async function approveSellerController(req: Request, res: Response) {
  try {
    const adminId = String((req as any).user._id);
    const profile = await updateSellerStatus(
      String(req.params.id),
      req.body.status || 'approved',
      adminId,
      req.body.rejectionReason
    );
    res.json(profile);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function createCategoryController(req: Request, res: Response) {
  const category = await MarketplaceCategory.create(req.body);
  res.status(201).json(category);
}

export async function reindexListingsController(_req: Request, res: Response) {
  try {
    const result = await reindexAllListings();
    if (!result.enabled) {
      return res.status(400).json({
        message: 'Meilisearch no configurado. Agrega MEILISEARCH_HOST y MEILISEARCH_API_KEY al .env',
      });
    }
    res.json({
      message: `Índice actualizado: ${result.indexed} productos activos indexados`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al reindexar' });
  }
}

export async function listReportsController(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const reports = status
    ? await listAllReports(status)
    : await listPendingReports();
  res.json({ reports, reasonLabels: REPORT_REASON_LABELS });
}

export async function resolveReportController(req: Request, res: Response) {
  try {
    const adminId = String((req as any).user._id);
    const report = await updateReportStatus(
      String(req.params.id),
      req.body.status || 'resolved',
      adminId,
      req.body.resolution
    );
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

// ── Comprador ──────────────────────────────────────────────

export async function toggleFavoriteController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const listingId = String(req.params.listingId);

  const existing = await Favorite.findOne({ user: userId, listing: listingId });
  if (existing) {
    await existing.deleteOne();
    return res.json({ favorited: false });
  }

  await Favorite.create({ user: userId, listing: listingId });
  res.json({ favorited: true });
}

export async function getMyFavoritesController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const favorites = await Favorite.find({ user: userId })
    .populate({
      path: 'listing',
      match: { status: 'active' },
      populate: { path: 'seller', select: 'businessName slug' },
    })
    .sort({ createdAt: -1 });

  res.json(favorites.filter((f) => f.listing));
}

export async function createReportController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const report = await createReport({
      reporterId: userId,
      listingId: req.body.listingId,
      sellerId: req.body.sellerId,
      orderId: req.body.orderId,
      reason: req.body.reason,
      description: req.body.description,
    });
    res.status(201).json({ message: 'Denuncia enviada. Un administrador la revisará.', report });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

// ── Checkout ───────────────────────────────────────────────

export async function previewCheckoutController(req: Request, res: Response) {
  try {
    const result = await previewCheckout(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function createCheckoutController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const clientHeader = String(req.headers['x-origenred-client'] || '').toLowerCase();
    const returnClient = clientHeader === 'mobile' ? 'mobile' : 'web';
    const result = await createMarketplaceCheckout({
      ...req.body,
      buyerId: user?._id ? String(user._id) : undefined,
      returnClient,
    });
    res.status(201).json({
      order: result.order,
      payment: result.payment,
      mercadoPagoEnabled: result.mercadoPagoEnabled,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function marketplaceWebhookController(req: Request, res: Response) {
  try {
    const paymentId = req.body?.data?.id || req.query?.['data.id'] || req.body?.id;
    if (!paymentId) return res.status(200).json({ ok: true, processed: false });

    const result = await processMarketplacePaymentWebhook(String(paymentId));
    res.status(200).json({ ok: true, ...result });
  } catch (error: any) {
    res.status(200).json({ ok: false, message: error.message });
  }
}

export async function getOrderController(req: Request, res: Response) {
  const order = await getOrderByNumber(String(req.params.orderNumber));
  if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

  const user = (req as any).user;
  const fullAccess = await canViewFullOrder(order, user);
  res.json(fullAccess ? order : toPublicOrderSummary(order));
}

export async function getMyOrdersController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const orders = await getBuyerOrders(userId);
  res.json(orders);
}

// ── Chat post-compra ───────────────────────────────────────

export async function getMyConversationsController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const user = (req as any).user;
  const isSeller = user.roles?.includes('vendedor_marketplace');

  const conversations = isSeller
    ? await getSellerConversations(userId)
    : await getBuyerConversations(userId);

  res.json(conversations);
}

export async function getConversationMessagesController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const result = await getConversationMessages(String(req.params.id), userId);
    res.json(result);
  } catch (error: any) {
    res.status(error.message === 'Acceso denegado' ? 403 : 400).json({ message: error.message });
  }
}

export async function sendMessageController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const conversationId = String(req.params.id);
    const message = await sendMessage(conversationId, userId, req.body.body);
    emitChatMessage(io, conversationId, message);
    await notifyChatRecipient(conversationId, userId, req.body.body || '');
    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getChatByOrderController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const result = await getConversationByOrder(String(req.params.orderNumber), userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export async function getSellerOrdersController(req: Request, res: Response) {
  const userId = String((req as any).user._id);
  const orders = await getSellerOrders(userId);
  res.json(orders);
}

export async function updateSellerOrderController(req: Request, res: Response) {
  try {
    const userId = String((req as any).user._id);
    const order = await updateSellerOrderFulfillment(
      userId,
      String(req.params.orderNumber),
      {
        status: req.body.status,
        trackingCode: req.body.trackingCode,
      }
    );
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}
