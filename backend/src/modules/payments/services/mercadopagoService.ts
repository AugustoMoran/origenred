import axios from 'axios';

const MP_API_BASE = 'https://api.mercadopago.com';

const getAccessToken = () => process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const getPublicKey = () => process.env.MERCADOPAGO_PUBLIC_KEY || '';

export const getMercadoPagoConfig = () => ({
  publicKey: getPublicKey(),
  enabled: Boolean(getAccessToken() && getPublicKey()),
});

export const createPaymentPreference = async (input: {
  saleId: string;
  title: string;
  total: number;
  items: Array<{ title: string; quantity: number; unit_price: number }>;
  payerEmail?: string;
  backUrls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
}) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('MercadoPago no configurado (MERCADOPAGO_ACCESS_TOKEN ausente)');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const payload = {
    items: input.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: 'ARS',
    })),
    payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    external_reference: input.saleId,
    back_urls: {
      success: input.backUrls?.success || `${frontendUrl}/checkout/success`,
      failure: input.backUrls?.failure || `${frontendUrl}/checkout/failure`,
      pending: input.backUrls?.pending || `${frontendUrl}/checkout/pending`,
    },
    auto_return: 'approved',
    notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
  };

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

export const getPaymentById = async (paymentId: string) => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('MercadoPago no configurado');
  }

  const response = await axios.get(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data;
};

export const processWebhookNotification = async (payload: any) => {
  if (!payload) return { processed: false };

  const topic = payload.type || payload.topic;
  const paymentId = payload.data?.id || payload.id;

  if (topic === 'payment' && paymentId) {
    const payment = await getPaymentById(String(paymentId));
    return {
      processed: true,
      paymentId: String(paymentId),
      status: payment.status,
      externalReference: payment.external_reference,
      amount: payment.transaction_amount,
    };
  }

  return { processed: false, payload };
};
