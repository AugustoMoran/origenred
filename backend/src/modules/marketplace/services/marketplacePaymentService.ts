import axios from 'axios';
import { features, marketplaceConfig } from '../../../config/features';

const MP_API_BASE = 'https://api.mercadopago.com';

export const isMercadoPagoEnabled = () => features.mercadoPago;
export const isMercadoPagoConnectEnabled = () => features.mercadoPagoConnect;

export const getMercadoPagoPublicConfig = () => ({
  enabled: features.mercadoPago,
  connectEnabled: features.mercadoPagoConnect,
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
  commissionPercent: marketplaceConfig.commissionPercent,
});

/** OAuth Connect — URL de vinculación (requiere MERCADOPAGO_CLIENT_ID) */
export const getMercadoPagoConnectUrl = (sellerId: string) => {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/vendedor/mercadopago/callback`;
  if (!clientId) return null;

  return `https://auth.mercadopago.com.ar/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${sellerId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
};

export const createMarketplacePreference = async (input: {
  orderId: string;
  orderNumber: string;
  items: Array<{ title: string; quantity: number; unit_price: number; seller_mp_user_id?: string }>;
  payerEmail?: string;
  marketplaceFee?: number;
  returnClient?: 'mobile' | 'web';
}) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Mercado Pago no configurado. Completá MERCADOPAGO_* en .env');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const mobileScheme = process.env.MOBILE_APP_SCHEME || 'origenred';
  const mobileReturnBase = `${mobileScheme}://payment-return`;

  const back_urls =
    input.returnClient === 'mobile'
      ? {
          success: `${mobileReturnBase}?status=success&orderNumber=${encodeURIComponent(input.orderNumber)}`,
          failure: `${mobileReturnBase}?status=failure&orderNumber=${encodeURIComponent(input.orderNumber)}`,
          pending: `${mobileReturnBase}?status=pending&orderNumber=${encodeURIComponent(input.orderNumber)}`,
        }
      : {
          success: `${frontendUrl}/compras/exito`,
          failure: `${frontendUrl}/compras/error`,
          pending: `${frontendUrl}/compras/pendiente`,
        };

  const payload: Record<string, unknown> = {
    items: input.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: 'ARS',
    })),
    payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    external_reference: input.orderId,
    metadata: { order_number: input.orderNumber },
    back_urls,
    auto_return: 'approved',
    notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
  };

  // Split / marketplace fee cuando Connect esté activo
  if (features.mercadoPagoConnect && input.marketplaceFee) {
    payload.marketplace_fee = input.marketplaceFee;
  }

  const response = await axios.post(`${MP_API_BASE}/checkout/preferences`, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    id: response.data.id,
    initPoint: response.data.init_point,
    sandboxInitPoint: response.data.sandbox_init_point,
  };
};

export const verifyMercadoPagoPayment = async (paymentId: string) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Mercado Pago no configurado');

  const response = await axios.get(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data;
};
