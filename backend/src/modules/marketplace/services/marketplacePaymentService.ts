import axios from 'axios';
import { features, marketplaceConfig } from '../../../config/features';
import {
  mercadoPagoEnv,
  isMercadoPagoConnectConfigured,
  getMercadoPagoOAuthRedirectUri,
} from '../../../config/mercadoPagoEnv';

const MP_API_BASE = 'https://api.mercadopago.com';

export const isMercadoPagoEnabled = () => features.mercadoPago;
export const isMercadoPagoConnectEnabled = () => features.mercadoPagoConnect;

export const getMercadoPagoPublicConfig = () => ({
  enabled: features.mercadoPago,
  connectEnabled: isMercadoPagoConnectConfigured(),
  publicKey: mercadoPagoEnv.publicKey,
  commissionPercent: marketplaceConfig.commissionPercent,
});

/** OAuth Connect — URL de vinculación (requiere MERCADOPAGO_CLIENT_ID = App ID numérico) */
export const getMercadoPagoConnectUrl = (sellerId: string, returnClient?: 'mobile' | 'web') => {
  const clientId = mercadoPagoEnv.clientId;
  const redirectUri = getMercadoPagoOAuthRedirectUri(returnClient);
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    state: sellerId,
    redirect_uri: redirectUri,
  });

  return `https://auth.mercadopago.com/authorization?${params.toString()}`;
};

export const getMercadoPagoConnectRedirectUri = (returnClient?: 'mobile' | 'web') =>
  getMercadoPagoOAuthRedirectUri(returnClient);

/** Intercambia el código OAuth por credenciales del vendedor en MP */
export const exchangeMercadoPagoConnectCode = async (
  code: string,
  returnClient?: 'mobile' | 'web'
) => {
  const clientId = mercadoPagoEnv.clientId;
  const clientSecret = mercadoPagoEnv.clientSecret;
  const redirectUri = getMercadoPagoOAuthRedirectUri(returnClient);

  if (!clientId || !clientSecret) {
    throw new Error('Mercado Pago Connect no configurado en el servidor');
  }

  const response = await axios.post(
    `${MP_API_BASE}/oauth/token`,
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const mpUserId = response.data?.user_id;
  if (!mpUserId) {
    throw new Error('Mercado Pago no devolvió el ID del vendedor');
  }

  return { userId: String(mpUserId) };
};

export const createMarketplacePreference = async (input: {
  orderId: string;
  orderNumber: string;
  items: Array<{ title: string; quantity: number; unit_price: number }>;
  payerEmail?: string;
  marketplaceFee?: number;
  collectorId?: string;
  returnClient?: 'mobile' | 'web';
}) => {
  const accessToken = mercadoPagoEnv.accessToken;
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
          success: `${frontendUrl}/compras/exito?orderNumber=${encodeURIComponent(input.orderNumber)}`,
          failure: `${frontendUrl}/compras/error?orderNumber=${encodeURIComponent(input.orderNumber)}`,
          pending: `${frontendUrl}/compras/pendiente?orderNumber=${encodeURIComponent(input.orderNumber)}`,
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
  if (features.mercadoPagoConnect && input.collectorId) {
    payload.collector_id = Number(input.collectorId);
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
  const accessToken = mercadoPagoEnv.accessToken;
  if (!accessToken) throw new Error('Mercado Pago no configurado');

  const response = await axios.get(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data;
};

export type MercadoPagoRefundResult = {
  refund?: unknown;
  alreadyRefunded?: boolean;
  payment?: unknown;
};

/** Reembolso total o parcial de un pago MP (marketplace / Connect split usa token de la aplicación) */
export const refundMercadoPagoPayment = async (
  paymentId: string,
  amount?: number
): Promise<MercadoPagoRefundResult> => {
  const accessToken = mercadoPagoEnv.accessToken;
  if (!accessToken) throw new Error('Mercado Pago no configurado');

  const payment = await verifyMercadoPagoPayment(paymentId);
  const status = String(payment?.status || '');
  const transactionAmount = Number(payment?.transaction_amount || 0);
  const refundedAmount = Number(payment?.transaction_amount_refunded || 0);

  if (status === 'refunded' || (transactionAmount > 0 && refundedAmount >= transactionAmount)) {
    return { alreadyRefunded: true, payment };
  }

  if (status !== 'approved') {
    throw new Error(`El pago no está aprobado (estado: ${status || 'desconocido'})`);
  }

  const refundAmount = amount != null ? Number(amount) : transactionAmount;
  if (refundAmount <= 0) {
    throw new Error('Importe de reembolso inválido');
  }

  const body = amount != null ? { amount: refundAmount } : {};
  const idempotencyKey = `refund-${paymentId}-${amount ?? 'full'}`;

  try {
    const response = await axios.post(`${MP_API_BASE}/v1/payments/${paymentId}/refunds`, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
    });
    return { refund: response.data, payment };
  } catch (error: any) {
    const mpMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Error desconocido';

    if (/already refunded|ya fue reembolsado/i.test(mpMessage)) {
      return { alreadyRefunded: true, payment };
    }

    const connectHint =
      features.mercadoPagoConnect
        ? ' En pagos con split (Connect), el reembolso debe procesarse con el token de la aplicación marketplace.'
        : '';

    throw new Error(`Mercado Pago rechazó el reembolso: ${mpMessage}.${connectHint}`);
  }
};
