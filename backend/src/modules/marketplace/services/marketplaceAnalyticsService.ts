import { MarketplaceOrder } from '../models/MarketplaceOrder';
import { SellerProfile } from '../models/SellerProfile';
import { Listing } from '../models/Listing';
import { Report } from '../models/Report';
import { ReturnRequest } from '../models/ReturnRequest';

export const getMarketplaceAdminAnalytics = async () => {
  const [
    orderStats,
    ordersByStatus,
    topSellers,
    pendingSellers,
    pendingReports,
    listingCounts,
    recentGmv,
  ] = await Promise.all([
    MarketplaceOrder.aggregate([
      {
        $match: { status: { $in: ['paid', 'processing', 'shipped', 'delivered'] } },
      },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          gmv: { $sum: '$total' },
          commissionTotal: { $sum: '$commissionTotal' },
        },
      },
    ]),
    MarketplaceOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    MarketplaceOrder.aggregate([
      { $match: { status: { $nin: ['pending_payment', 'cancelled'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.seller',
          sellerName: { $first: '$items.title' },
          revenue: { $sum: '$items.subtotal' },
          units: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    SellerProfile.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: { $in: ['pending', 'reviewing'] } }),
    Listing.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    MarketplaceOrder.aggregate([
      {
        $match: {
          status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const sellerIds = topSellers.map((s) => s._id).filter(Boolean);
  const sellerProfiles = await SellerProfile.find({ _id: { $in: sellerIds } }).select('businessName');
  const sellerNameMap = new Map(sellerProfiles.map((s) => [String(s._id), s.businessName]));

  const stats = orderStats[0] || { orderCount: 0, gmv: 0, commissionTotal: 0 };

  return {
    totals: {
      orderCount: stats.orderCount,
      gmv: stats.gmv,
      commissionTotal: stats.commissionTotal,
      activeSellers: await SellerProfile.countDocuments({ status: 'approved' }),
      pendingSellers,
    pendingReports,
    pendingReturns: await ReturnRequest.countDocuments({ status: { $in: ['pending', 'approved'] } }),
    activeListings: await Listing.countDocuments({ status: 'active' }),
    },
    ordersByStatus: ordersByStatus.map((r) => ({ status: r._id, count: r.count })),
    topSellers: topSellers.map((s) => ({
      sellerId: String(s._id),
      sellerName: sellerNameMap.get(String(s._id)) || 'Vendedor',
      revenue: s.revenue,
      units: s.units,
    })),
    listingsByStatus: listingCounts.map((l) => ({ status: l._id, count: l.count })),
    gmvLast30Days: recentGmv.map((d) => ({ date: d._id, total: d.total, count: d.count })),
  };
};
