import { CartItem } from '../store/cartSlice';
import { buildWhatsAppUrl } from '../config/storeContact';

interface OrderCustomerInfo {
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

export const buildWhatsAppOrderMessage = (
  items: CartItem[],
  total: number,
  customer: OrderCustomerInfo
) => {
  const lines = [
    'Hola! Quiero confirmar un pedido desde la tienda online:',
    '',
    ...items.map(
      (item) =>
        `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    ),
    '',
    `*Total: $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}*`,
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

export const buildWhatsAppOrderUrl = (
  items: CartItem[],
  total: number,
  customer: OrderCustomerInfo
) => buildWhatsAppUrl(buildWhatsAppOrderMessage(items, total, customer));
