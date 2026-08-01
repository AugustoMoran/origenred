import Sale from '../../sales/models/Sale';
import Product from '../../inventory/models/Product';
import Cart from '../../ecommerce/models/Cart';
import { User } from '../../auth/models/User';

const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

const buildDateRange = (from?: Date, to?: Date) => {
  const now = new Date();
  const start = from || new Date(now.getFullYear(), now.getMonth(), 1);
  const end = to || now;
  return { start, end };
};

export const getOverviewAnalytics = async (from?: Date, to?: Date) => {
  const { start, end } = buildDateRange(from, to);

  const productStatsPipeline = [
    {
      $match: {
        status: 'COMPLETED',
        createdAt: { $gte: start, $lte: end },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        cost: {
          $sum: {
            $multiply: [{ $ifNull: ['$items.costPrice', 0] }, '$items.quantity'],
          },
        },
      },
    },
    {
      $addFields: {
        profit: { $subtract: ['$revenue', '$cost'] },
      },
    },
  ];

  const [salesSummary, ecommerceSummary, productStatsRaw, userCount, activeProducts, openCarts] = await Promise.all([
    Sale.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgTicket: { $avg: '$total' },
        },
      },
    ]),
    Sale.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          source: 'ECOMMERCE',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]),
    Sale.aggregate(productStatsPipeline),
    User.countDocuments(),
    Product.countDocuments({ isActive: true, paused: { $ne: true } }),
    Cart.countDocuments({ 'items.0': { $exists: true } }),
  ]);

  const posSummary = await Sale.aggregate([
    {
      $match: {
        status: 'COMPLETED',
        source: { $ne: 'ECOMMERCE' },
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
  ]);

  const mapProductRow = (row: any) => ({
    productId: row._id,
    name: row.name,
    quantity: row.quantity,
    revenue: round2(row.revenue),
    cost: round2(row.cost),
    profit: round2(row.profit),
  });

  const productStats = productStatsRaw.map(mapProductRow);
  const topByQuantity = [...productStats].sort((a, b) => b.quantity - a.quantity).slice(0, 8);
  const topByProfit = [...productStats].sort((a, b) => b.profit - a.profit).slice(0, 8);

  return {
    range: { from: start, to: end },
    sales: {
      totalCount: salesSummary[0]?.count || 0,
      totalRevenue: round2(salesSummary[0]?.revenue || 0),
      avgTicket: round2(salesSummary[0]?.avgTicket || 0),
    },
    ecommerce: {
      count: ecommerceSummary[0]?.count || 0,
      revenue: round2(ecommerceSummary[0]?.revenue || 0),
    },
    pos: {
      count: posSummary[0]?.count || 0,
      revenue: round2(posSummary[0]?.revenue || 0),
    },
    catalog: {
      activeProducts,
      openCarts,
    },
    users: {
      total: userCount,
    },
    topProducts: topByQuantity,
    topByQuantity,
    topByProfit,
  };
};

export const getEcommerceAnalytics = async (from?: Date, to?: Date) => {
  const { start, end } = buildDateRange(from, to);

  const [byDay, byPaymentMethod, notInvoiced] = await Promise.all([
    Sale.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          source: 'ECOMMERCE',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          source: 'ECOMMERCE',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]),
    Sale.countDocuments({
      source: 'ECOMMERCE',
      billingStatus: 'NOT_INVOICED',
      status: 'COMPLETED',
    }),
  ]);

  return {
    range: { from: start, to: end },
    byDay: byDay.map((row) => ({
      date: row._id,
      orders: row.orders,
      revenue: round2(row.revenue),
    })),
    byPaymentMethod: byPaymentMethod.map((row) => ({
      method: row._id || 'unknown',
      count: row.count,
      revenue: round2(row.revenue),
    })),
    pendingInvoicing: notInvoiced,
  };
};
