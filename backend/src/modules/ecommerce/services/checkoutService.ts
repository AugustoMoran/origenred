import Branch from '../../branches/models/Branch';
import { isBranchComplete } from '../../branches/utils/branchHelpers';
import { User } from '../../auth/models/User';
import * as salesService from '../../sales/services/salesService';
import * as settingsService from '../../settings/services/settingsService';
import Cart from '../models/Cart';
import Product from '../../inventory/models/Product';

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const resolveBranchAndSeller = async (userId?: string) => {
  const settings = await settingsService.getSettings();
  if (!settings.enableEcommerce) {
    throw new Error('La tienda online no está habilitada');
  }
  if (settings.maintenanceMode) {
    throw new Error('La tienda se encuentra en mantenimiento');
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
    throw new Error(
      'La sucursal de despacho no tiene datos completos (ciudad, provincia, código postal). Completalos en Cat. y Sucursales.'
    );
  }

  let sellerId = userId;
  if (sellerId) {
    const user = await User.findById(sellerId);
    if (!user) sellerId = undefined;
  }

  if (!sellerId) {
    const admin = await User.findOne({ roles: 'admin' }).select('_id');
    if (!admin) throw new Error('No hay usuario administrador para registrar el pedido');
    sellerId = String(admin._id);
  }

  return { settings, branchId: String(branchId), sellerId };
};

const buildSaleItems = async (rawItems: Array<{ productId?: string; product?: string; quantity: number }>) => {
  const items = [];
  for (const raw of rawItems) {
    const productId = String(raw.productId || raw.product || '');
    const product = await Product.findById(productId);
    if (!product || !product.isActive || product.paused) {
      throw new Error(`Producto no disponible: ${product?.name || productId}`);
    }
    if (product.stock < raw.quantity) {
      throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
    }
    items.push({
      product: productId,
      name: product.name,
      quantity: raw.quantity,
      price: product.price,
      ivaRate: product.iva ?? 21,
    });
  }
  return items;
};

export const checkoutDirect = async (input: {
  items: Array<{ productId: string; quantity: number }>;
  userId?: string;
  paymentMethod?: string;
  invoiceType?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  clientName?: string;
  clientAddress?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  shippingMethod?: string;
  shippingCost?: number;
  notes?: string;
  paymentId?: string;
  paymentStatus?: string;
}) => {
  const { settings, branchId, sellerId } = await resolveBranchAndSeller(input.userId);

  if (!input.items?.length) {
    throw new Error('El carrito está vacío');
  }

  const items = await buildSaleItems(input.items);

  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  if (settings.minOrderAmount > 0 && subtotal < settings.minOrderAmount) {
    throw new Error(`El monto mínimo de compra es $${settings.minOrderAmount}`);
  }

  const clientName = input.clientName || input.customerName;
  const shipping = input.shippingAddress;
  const clientAddress = input.clientAddress || (
    shipping
      ? [shipping.street, shipping.city, shipping.province, shipping.postalCode, shipping.country]
          .filter(Boolean)
          .join(', ')
      : undefined
  );

  const shippingCost = round2(Number(input.shippingCost || 0));
  const sale = await salesService.createSale(
    {
      items,
      paymentMethod: input.paymentMethod || 'mercadopago',
      invoiceType: input.invoiceType || 'NONE',
      clientName,
      clientAddress,
      source: 'ECOMMERCE',
      branchId,
      shippingAddress: shipping,
      shippingMethod: input.shippingMethod,
      shippingCost,
      paymentId: input.paymentId,
      paymentStatus: input.paymentStatus || 'pending',
      notes: input.notes,
    },
    sellerId,
    ['admin']
  );

  if (shippingCost > 0) {
    sale.total = round2(Number(sale.total) + shippingCost);
    await sale.save();
  }

  return sale;
};

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
  const cart = await Cart.findById(input.cartId);
  if (!cart || !cart.items.length) {
    throw new Error('El carrito está vacío');
  }

  const sale = await checkoutDirect({
    items: cart.items.map((i) => ({ productId: String(i.product), quantity: i.quantity })),
    userId: input.userId,
    paymentMethod: input.paymentMethod,
    invoiceType: input.invoiceType,
    clientName: input.clientName,
    clientAddress: input.clientAddress,
    shippingAddress: input.shippingAddress,
    shippingMethod: input.shippingMethod,
    shippingCost: input.shippingCost,
    paymentId: input.paymentId,
    paymentStatus: input.paymentStatus,
  });

  cart.items = [];
  cart.subtotal = 0;
  await cart.save();

  return sale;
};
