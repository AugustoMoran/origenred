import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../../middleware/authMiddleware';
import { requireAdmin, requireSeller } from '../../../middleware/marketplaceMiddleware';
import {
  getHomeDataController,
  listPublicListingsController,
  getPublicListingController,
  listPublicCategoriesController,
  getSellerPublicController,
  quoteShippingController,
  getIntegrationsStatusController,
  registerSellerController,
  getMySellerProfileController,
  createListingController,
  uploadListingImagesMiddleware,
  updateListingController,
  getMyListingsController,
  deleteListingController,
  getMercadoPagoConnectController,
  mercadoPagoCallbackController,
  listSellersAdminController,
  listPendingSellersController,
  approveSellerController,
  createCategoryController,
  listAdminCategoriesController,
  updateCategoryController,
  deleteCategoryController,
  getNotificationSummaryController,
  reindexListingsController,
  listReportsController,
  resolveReportController,
  toggleFavoriteController,
  getMyFavoritesController,
  createReportController,
  previewCheckoutController,
  createCheckoutController,
  marketplaceWebhookController,
  getOrderController,
  getMyOrdersController,
  cancelOrderController,
  getMyConversationsController,
  getConversationMessagesController,
  sendMessageController,
  getChatByOrderController,
  getSellerOrdersController,
  updateSellerOrderController,
  getSitemapController,
  getMarketplaceAnalyticsController,
  createReturnRequestController,
  getMyReturnRequestsController,
  getReturnForOrderController,
  listSellerReturnRequestsController,
  updateSellerReturnController,
  listAdminReturnRequestsController,
  updateAdminReturnController,
} from '../controllers/marketplaceController';

const router = Router();

// Público
router.get('/home', getHomeDataController);
router.get('/listings', listPublicListingsController);
router.get('/listings/:slug', getPublicListingController);
router.get('/categories', listPublicCategoriesController);
router.get('/sellers/:slug', getSellerPublicController);
router.post('/shipping/quote', quoteShippingController);
router.get('/integrations', getIntegrationsStatusController);
router.get('/sitemap.xml', getSitemapController);

// Registro vendedor (público)
router.post('/sellers/register', registerSellerController);

// Vendedor
router.get('/seller/me', authenticate, requireSeller, getMySellerProfileController);
router.get('/seller/listings', authenticate, requireSeller, getMyListingsController);
router.post('/seller/listings', authenticate, requireSeller, uploadListingImagesMiddleware, createListingController);
router.patch('/seller/listings/:id', authenticate, requireSeller, uploadListingImagesMiddleware, updateListingController);
router.delete('/seller/listings/:id', authenticate, requireSeller, deleteListingController);
router.get('/seller/mercadopago/connect', authenticate, requireSeller, getMercadoPagoConnectController);
router.post('/seller/mercadopago/callback', authenticate, requireSeller, mercadoPagoCallbackController);

// Checkout — /orders debe ir ANTES de /orders/:orderNumber en el router de express... 
// actually my orders list uses GET /orders and single uses GET /orders/:orderNumber
router.get('/orders', authenticate, getMyOrdersController);
router.post('/orders/:orderNumber/cancel', authenticate, cancelOrderController);
router.get('/orders/:orderNumber', optionalAuthenticate, getOrderController);

// Chat post-compra
router.get('/chat/conversations', authenticate, getMyConversationsController);
router.get('/chat/conversations/:id/messages', authenticate, getConversationMessagesController);
router.post('/chat/conversations/:id/messages', authenticate, sendMessageController);
router.get('/chat/order/:orderNumber', authenticate, getChatByOrderController);

// Vendedor — ventas
router.get('/seller/orders', authenticate, requireSeller, getSellerOrdersController);
router.patch('/seller/orders/:orderNumber', authenticate, requireSeller, updateSellerOrderController);

// Checkout
router.post('/checkout/preview', optionalAuthenticate, previewCheckoutController);
router.post('/checkout', optionalAuthenticate, createCheckoutController);
router.post('/checkout/webhook', marketplaceWebhookController);

// Comprador (auth)
router.get('/notifications/summary', authenticate, getNotificationSummaryController);
router.post('/favorites/:listingId', authenticate, toggleFavoriteController);
router.get('/favorites', authenticate, getMyFavoritesController);
router.post('/reports', authenticate, createReportController);

router.post('/returns', authenticate, createReturnRequestController);
router.get('/returns', authenticate, getMyReturnRequestsController);
router.get('/returns/order/:orderNumber', authenticate, getReturnForOrderController);
router.get('/seller/returns', authenticate, requireSeller, listSellerReturnRequestsController);
router.patch('/seller/returns/:id', authenticate, requireSeller, updateSellerReturnController);

// Admin marketplace
router.get('/admin/sellers', authenticate, requireAdmin, listSellersAdminController);
router.get('/admin/sellers/pending', authenticate, requireAdmin, listPendingSellersController);
router.patch('/admin/sellers/:id/status', authenticate, requireAdmin, approveSellerController);
router.post('/admin/categories', authenticate, requireAdmin, createCategoryController);
router.get('/admin/categories', authenticate, requireAdmin, listAdminCategoriesController);
router.patch('/admin/categories/:id', authenticate, requireAdmin, updateCategoryController);
router.delete('/admin/categories/:id', authenticate, requireAdmin, deleteCategoryController);
router.post('/admin/search/reindex', authenticate, requireAdmin, reindexListingsController);
router.get('/admin/reports', authenticate, requireAdmin, listReportsController);
router.patch('/admin/reports/:id', authenticate, requireAdmin, resolveReportController);
router.get('/admin/analytics', authenticate, requireAdmin, getMarketplaceAnalyticsController);
router.get('/admin/returns', authenticate, requireAdmin, listAdminReturnRequestsController);
router.patch('/admin/returns/:id', authenticate, requireAdmin, updateAdminReturnController);

export default router;
