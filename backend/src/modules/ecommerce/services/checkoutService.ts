import Branch from '../../branches/models/Branch';
import { isBranchComplete } from '../../branches/utils/branchHelpers';
import { User } from '../../auth/models/User';
import * as salesService from '../../sales/services/salesService';
import * as settingsService from '../../settings/services/settingsService';
import Cart from '../models/Cart';
import Product from '../../inventory/models/Product';

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export const checkoutCart = async (input: {
  cartId: string;
  userId?: string;
  paymentMethod?: string;
  invoiceType?: string;
  clientName?: string;
  clientCuit?: string;
  clientAddress?: string;
  clientFiscalCondition?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  shippingMethod?: string;
  shippingCost?: number;
  paymentId?: string;
  paymentStatus?: string;
}) => {
  const settings = await settingsService.getSettings();
  if (!settings.enableEcommerce) {
    throw new Error('La tienda online no está habilitada');
  }
  if (settings.maintenanceMode) {
    throw new Error('La tienda se encuentra en mantenimiento');
  }

  const cart = await Cart.findById(input.cartId);
  if (!cart || !cart.items.length) {
    throw new Error('El carrito está vacío');
  }

  if (settings.minOrderAmount > 0 && cart.subtotal < settings.minOrderAmount) {
    throw new Error(`El monto mínimo de compra es $${settings.minOrderAmount}`);
  }

  let branchId = settings.defaultBranch;
  if (!branchId) {
    const mainBranch = await Branch.findOne({ isActive: true, isMain: true });
    branchId = mainBranch?._id;
  }
  if (!branchId) {
    const anyBranch = await Branch.findOne({ isActive: true });
    branchId = anyBranch?._id;
  }
  if (!branchId) {
    throw new Error('No hay sucursal configurada para procesar pedidos ecommerce');
  }

  const branch = await Branch.findById(branchId);
  if (!branch || !isBranchComplete(branch)) {
    throw new Error('La sucursal de despacho no tiene datos completos para ecommerce');
  }

  let sellerId = input.userId;
  if (sellerId) {
    const user = await User.findById(sellerId);
    if (!user) sellerId = undefined;
  }

  if (!sellerId) {
    const admin = await User.findOne({ roles: 'admin' }).select('_id');
    if (!admin) throw new Error('No hay usuario administrador para registrar el pedido');
    sellerId = String(admin._id);
  }

  const items = [];
  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.product);
    if (!product || !product.isActive || product.paused) {
      throw new Error(`Producto no disponible: ${cartItem.name}`);
    }

    items.push({
      product: String(cartItem.product),
      name: cartItem.name,
      quantity: cartItem.quantity,
      price: cartItem.price,
      ivaRate: product.iva ?? 21,
    });
  }

  const shippingCost = round2(Number(input.shippingCost || 0));
  const sale = await salesService.createSale(
    {
      items,
      paymentMethod: input.paymentMethod || 'mercadopago',
      invoiceType: input.invoiceType || 'B',
      clientName: input.clientName,
      clientCuit: input.clientCuit,
      clientAddress: input.clientAddress,
      clientFiscalCondition: input.clientFiscalCondition,
      source: 'ECOMMERCE',
      branchId: String(branchId),
      shippingAddress: input.shippingAddress,
      shippingMethod: input.shippingMethod,
      shippingCost,
      paymentId: input.paymentId,
      paymentStatus: input.paymentStatus,
    },
    sellerId,
    ['admin']
  );

  if (shippingCost > 0) {
    sale.total = round2(Number(sale.total) + shippingCost);
    await sale.save();
  }

  cart.items = [];
  cart.subtotal = 0;
  await cart.save();

  return sale;
};
