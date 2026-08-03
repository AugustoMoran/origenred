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
  listSellersAdminController,
  listPendingSellersController,
  approveSellerController,
  createCategoryController,
  listReportsController,
  toggleFavoriteController,
  getMyFavoritesController,
  createReportController,
  previewCheckoutController,
  createCheckoutController,
  marketplaceWebhookController,
  getOrderController,
  getMyOrdersController,
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

// Registro vendedor (público)
router.post('/sellers/register', registerSellerController);

// Vendedor
router.get('/seller/me', authenticate, requireSeller, getMySellerProfileController);
router.get('/seller/listings', authenticate, requireSeller, getMyListingsController);
router.post('/seller/listings', authenticate, requireSeller, uploadListingImagesMiddleware, createListingController);
router.patch('/seller/listings/:id', authenticate, requireSeller, updateListingController);
router.delete('/seller/listings/:id', authenticate, requireSeller, deleteListingController);
router.get('/seller/mercadopago/connect', authenticate, requireSeller, getMercadoPagoConnectController);

// Checkout — /orders debe ir ANTES de /orders/:orderNumber en el router de express... 
// actually my orders list uses GET /orders and single uses GET /orders/:orderNumber
router.get('/orders', authenticate, getMyOrdersController);
router.get('/orders/:orderNumber', getOrderController);
router.post('/checkout/preview', optionalAuthenticate, previewCheckoutController);
router.post('/checkout', optionalAuthenticate, createCheckoutController);
router.post('/checkout/webhook', marketplaceWebhookController);

// Comprador (auth)
router.post('/favorites/:listingId', authenticate, toggleFavoriteController);
router.get('/favorites', authenticate, getMyFavoritesController);
router.post('/reports', authenticate, createReportController);

// Admin marketplace
router.get('/admin/sellers', authenticate, requireAdmin, listSellersAdminController);
router.get('/admin/sellers/pending', authenticate, requireAdmin, listPendingSellersController);
router.patch('/admin/sellers/:id/status', authenticate, requireAdmin, approveSellerController);
router.post('/admin/categories', authenticate, requireAdmin, createCategoryController);
router.get('/admin/reports', authenticate, requireAdmin, listReportsController);

export default router;
