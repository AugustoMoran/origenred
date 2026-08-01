import { Router } from 'express';
import {
  getCatalogController,
  getCatalogProductController,
  getCatalogCategoriesController,
  getFeaturedProductsController,
} from '../controllers/catalogController';
import {
  getCartController,
  getCartByIdController,
  addCartItemController,
  updateCartItemController,
  removeCartItemController,
  clearCartController,
} from '../controllers/cartController';
import { checkoutController } from '../controllers/checkoutController';
import { authenticate } from '../../../middleware/authMiddleware';

const router = Router();

router.get('/catalog', getCatalogController);
router.get('/catalog/categories', getCatalogCategoriesController);
router.get('/catalog/featured', getFeaturedProductsController);
router.get('/catalog/:slug', getCatalogProductController);

router.get('/cart', getCartController);
router.get('/cart/:cartId', getCartByIdController);
router.post('/cart/items', addCartItemController);
router.post('/cart/:cartId/items', addCartItemController);
router.put('/cart/:cartId/items/:productId', updateCartItemController);
router.delete('/cart/:cartId/items/:productId', removeCartItemController);
router.delete('/cart/:cartId', clearCartController);

router.post('/checkout', authenticate, checkoutController);

export default router;
