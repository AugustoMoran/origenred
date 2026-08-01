import { Request, Response } from 'express';
import * as cartService from '../services/cartService';

const getSessionId = (req: Request) =>
  String(req.headers['x-cart-session'] || req.body?.sessionId || '').trim() || undefined;

export const getCartController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = getSessionId(req);
    const cart = await cartService.getOrCreateCart(sessionId, userId);
    res.json(cart);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCartByIdController = async (req: Request, res: Response) => {
  try {
    const cart = await cartService.getCartById(req.params.cartId);
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });
    res.json(cart);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addCartItemController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const sessionId = getSessionId(req);
    const cart = await cartService.addCartItem(req.params.cartId, {
      productId: req.body.productId,
      quantity: req.body.quantity,
      sessionId,
      userId,
    });
    res.json(cart);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCartItemController = async (req: Request, res: Response) => {
  try {
    const cart = await cartService.updateCartItem(
      req.params.cartId,
      req.params.productId,
      Number(req.body.quantity)
    );
    res.json(cart);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removeCartItemController = async (req: Request, res: Response) => {
  try {
    const cart = await cartService.removeCartItem(req.params.cartId, req.params.productId);
    res.json(cart);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const clearCartController = async (req: Request, res: Response) => {
  try {
    const cart = await cartService.clearCart(req.params.cartId);
    res.json(cart);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
