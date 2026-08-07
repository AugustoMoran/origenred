import axios from 'axios';
import { refundMercadoPagoPayment } from '../marketplacePaymentService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('refundMercadoPagoPayment', () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'test-token';
    jest.clearAllMocks();
  });

  it('skips refund when payment is already fully refunded', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        status: 'approved',
        transaction_amount: 5000,
        transaction_amount_refunded: 5000,
      },
    });

    const result = await refundMercadoPagoPayment('12345', 5000);
    expect(result.alreadyRefunded).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('calls MP refund API for approved payment', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        status: 'approved',
        transaction_amount: 5000,
        transaction_amount_refunded: 0,
      },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 'refund-1' } });

    const result = await refundMercadoPagoPayment('12345', 5000);
    expect(result.refund).toEqual({ id: 'refund-1' });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/payments/12345/refunds'),
      { amount: 5000 },
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Idempotency-Key': 'refund-12345-5000',
        }),
      })
    );
  });
});
