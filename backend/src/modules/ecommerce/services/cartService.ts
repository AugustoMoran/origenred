import Cart from '../models/Cart';
import Product from '../../inventory/models/Product';
import { CATALOG_PUBLIC_FILTER } from './catalogService';

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const recalculateCart = (cart: any) => {
  cart.subtotal = round2(
    (cart.items || []).reduce((acc: number, item: any) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0)
  );
  return cart;
};

const resolveCartQuery = (cartId?: string, sessionId?: string, userId?: string) => {
  if (cartId) return { _id: cartId };
  if (userId) return { user: userId };
  if (sessionId) return { sessionId };
  return null;
};

export const getOrCreateCart = async (sessionId?: string, userId?: string) => {
  let cart = null;

  if (userId) {
    cart = await Cart.findOne({ user: userId });
  }

  if (!cart && sessionId) {
    cart = await Cart.findOne({ sessionId });
    if (cart && userId && !cart.user) {
      cart.user = userId as any;
      await cart.save();
    }
  }

  if (!cart) {
    cart = await Cart.create({
      sessionId: sessionId || undefined,
      user: userId || undefined,
      items: [],
      subtotal: 0,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  return cart;
};

export const getCartById = async (cartId: string) => {
  return await Cart.findById(cartId);
};

export const addCartItem = async (cartId: string | undefined, payload: {
  productId: string;
  quantity: number;
  sessionId?: string;
  userId?: string;
}) => {
  const quantity = Math.max(1, Number(payload.quantity) || 1);
  const product = await Product.findOne({ _id: payload.productId, ...CATALOG_PUBLIC_FILTER });
  if (!product) throw new Error('Producto no disponible en catálogo');

  const cart = cartId
    ? await Cart.findById(cartId)
    : await getOrCreateCart(payload.sessionId, payload.userId);

  if (!cart) throw new Error('Carrito no encontrado');

  const existing = cart.items.find((item) => String(item.product) === String(product._id));
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      product: product._id as any,
      name: product.name,
      slug: product.slug,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
    });
  }

  recalculateCart(cart);
  await cart.save();
  return cart;
};

export const updateCartItem = async (cartId: string, productId: string, quantity: number) => {
  const cart = await Cart.findById(cartId);
  if (!cart) throw new Error('Carrito no encontrado');

  const item = cart.items.find((row) => String(row.product) === String(productId));
  if (!item) throw new Error('Producto no encontrado en el carrito');

  if (quantity <= 0) {
    cart.items = cart.items.filter((row) => String(row.product) !== String(productId));
  } else {
    item.quantity = quantity;
  }

  recalculateCart(cart);
  await cart.save();
  return cart;
};

export const removeCartItem = async (cartId: string, productId: string) => {
  return await updateCartItem(cartId, productId, 0);
};

export const clearCart = async (cartId: string) => {
  const cart = await Cart.findById(cartId);
  if (!cart) throw new Error('Carrito no encontrado');
  cart.items = [];
  cart.subtotal = 0;
  await cart.save();
  return cart;
};
