import { CartItem } from '../store/cartSlice';
import { buildWhatsAppUrl } from '../config/storeContact';

interface MercadoPagoCustomerInfo {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  notes?: string;
}

export interface WhatsAppQuickCustomerInfo {
  customerName: string;
  customerPhone: string;
  notes?: string;
}

const formatMoney = (value: number) =>
  value.toLocaleString('es-AR', { minimumFractionDigits: 2 });

const buildProductLines = (items: CartItem[]) =>
  items.map(
    (item) =>
      `• ${item.name} x${item.quantity} - $${formatMoney(item.price * item.quantity)}`
  );

export const buildWhatsAppOrderMessage = (
  items: CartItem[],
  total: number,
  customer: MercadoPagoCustomerInfo
) => {
  const lines = [
    'Hola! Quiero confirmar un pedido desde la tienda online:',
    '',
    ...buildProductLines(items),
    '',
    `*Total: $${formatMoney(total)}*`,
    '',
    `Nombre: ${customer.customerName}`,
    `Email: ${customer.customerEmail}`,
  ];

  if (customer.customerPhone?.trim()) {
    lines.push(`Teléfono: ${customer.customerPhone.trim()}`);
  }

  lines.push(
    `Dirección: ${customer.street}, ${customer.city}, ${customer.province} (${customer.postalCode})`,
    `País: ${customer.country || 'Argentina'}`
  );

  if (customer.notes?.trim()) {
    lines.push('', `Notas: ${customer.notes.trim()}`);
  }

  return lines.join('\n');
};

export const buildWhatsAppQuickOrderMessage = (
  items: CartItem[],
  total: number,
  customer: WhatsAppQuickCustomerInfo
) => {
  const lines = [
    'Hola! Quiero consultar un pedido desde la tienda online:',
    '',
    ...buildProductLines(items),
    '',
    `*Total estimado: $${formatMoney(total)}*`,
    '',
    `Nombre: ${customer.customerName}`,
    `Teléfono: ${customer.customerPhone}`,
  ];

  if (customer.notes?.trim()) {
    lines.push('', `Consulta: ${customer.notes.trim()}`);
  }

  lines.push('', 'Quedo atento/a para coordinar pago y envío. Gracias!');

  return lines.join('\n');
};

export const buildWhatsAppQuickOrderUrl = (
  items: CartItem[],
  total: number,
  customer: WhatsAppQuickCustomerInfo
) => buildWhatsAppUrl(buildWhatsAppQuickOrderMessage(items, total, customer));

export const buildWhatsAppOrderUrl = (
  items: CartItem[],
  total: number,
  customer: MercadoPagoCustomerInfo
) => buildWhatsAppUrl(buildWhatsAppOrderMessage(items, total, customer));
