import { SellerProfile } from '../models/SellerProfile';
import { Listing } from '../models/Listing';
import { ReturnRequest } from '../models/ReturnRequest';
import { LEARNING_ARTICLES } from '../constants/learning';

export interface SellerRecommendation {
  id: string;
  message: string;
  href?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SellerAccountHealth {
  score: number;
  label: string;
  factors: Array<{ key: string; label: string; ok: boolean; weight: number }>;
}

const healthLabel = (score: number) => {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Buena';
  if (score >= 50) return 'En progreso';
  return 'Necesita atención';
};

export const getSellerDashboardInsights = async (userId: string) => {
  const profile = await SellerProfile.findOne({ user: userId });
  if (!profile) throw new Error('Perfil de vendedor no encontrado');

  const listings = await Listing.find({ seller: profile._id });
  const active = listings.filter((l) => l.status === 'active');
  const activeCount = active.length;

  const withImages = active.filter((l) => l.images?.length > 0).length;
  const withWeight = active.filter((l) => l.weight != null && l.weight > 0).length;
  const withGoodDesc = active.filter((l) => (l.description?.length || 0) >= 100).length;
  const zeroStock = active.filter((l) => l.stock <= 0).length;

  const pendingReturns = await ReturnRequest.countDocuments({
    seller: profile._id,
    status: 'pending',
  });

  const factors: SellerAccountHealth['factors'] = [];
  let score = 0;

  const mpOk = profile.mercadoPagoConnected;
  factors.push({ key: 'mp', label: 'Mercado Pago vinculado', ok: mpOk, weight: 15 });
  if (mpOk) score += 15;

  const profileOk =
    Boolean(profile.description?.trim()) &&
    Boolean(profile.phone?.trim()) &&
    Boolean(profile.city?.trim());
  factors.push({ key: 'profile', label: 'Perfil completo', ok: profileOk, weight: 10 });
  if (profileOk) score += 10;

  const hasListings = activeCount > 0;
  factors.push({ key: 'listings', label: 'Publicaciones activas', ok: hasListings, weight: 10 });
  if (hasListings) score += 10;

  if (activeCount > 0) {
    const imgPct = withImages / activeCount;
    const imgOk = imgPct >= 0.9;
    factors.push({
      key: 'images',
      label: 'Fotos en publicaciones',
      ok: imgOk,
      weight: 15,
    });
    score += Math.round(imgPct * 15);

    const weightPct = withWeight / activeCount;
    const weightOk = weightPct >= 0.7;
    factors.push({
      key: 'weight',
      label: 'Peso cargado (envíos)',
      ok: weightOk,
      weight: 10,
    });
    score += Math.round(weightPct * 10);

    const descPct = withGoodDesc / activeCount;
    const descOk = descPct >= 0.8;
    factors.push({
      key: 'descriptions',
      label: 'Descripciones completas',
      ok: descOk,
      weight: 15,
    });
    score += Math.round(descPct * 15);

    const stockOk = zeroStock === 0;
    factors.push({
      key: 'stock',
      label: 'Stock actualizado',
      ok: stockOk,
      weight: 10,
    });
    if (stockOk) score += 10;
  }

  const repContribution = Math.round((profile.reputationScore / 100) * 10);
  score += repContribution;
  factors.push({
    key: 'reputation',
    label: 'Reputación',
    ok: profile.reputationScore >= 60,
    weight: 10,
  });

  const returnsOk = pendingReturns === 0;
  factors.push({
    key: 'returns',
    label: 'Sin devoluciones pendientes',
    ok: returnsOk,
    weight: 10,
  });
  if (returnsOk) score += 10;

  score = Math.min(100, Math.max(0, score));

  const recommendations: SellerRecommendation[] = [];

  if (!mpOk) {
    recommendations.push({
      id: 'connect-mp',
      message: 'Vinculá Mercado Pago para cobrar con split 95/5.',
      href: '/vendedor/mercadopago',
      priority: 'high',
    });
  }
  if (!profileOk) {
    recommendations.push({
      id: 'complete-profile',
      message: 'Completá descripción, teléfono y ciudad en tu perfil.',
      href: '/vendedor/perfil',
      priority: 'medium',
    });
  }
  if (activeCount > 0 && withWeight < activeCount) {
    const missing = activeCount - withWeight;
    recommendations.push({
      id: 'missing-weight',
      message: `Tenés ${missing} publicación${missing > 1 ? 'es' : ''} sin peso cargado.`,
      href: '/vendedor/productos',
      priority: 'medium',
    });
  }
  if (zeroStock > 0) {
    recommendations.push({
      id: 'zero-stock',
      message: `${zeroStock} publicación${zeroStock > 1 ? 'es' : ''} activa${zeroStock > 1 ? 's' : ''} sin stock.`,
      href: '/vendedor/productos',
      priority: 'high',
    });
  }
  if (pendingReturns > 0) {
    recommendations.push({
      id: 'pending-returns',
      message: `Hay ${pendingReturns} devolución${pendingReturns > 1 ? 'es' : ''} pendiente${pendingReturns > 1 ? 's' : ''}.`,
      href: '/vendedor/devoluciones',
      priority: 'high',
    });
  }
  if (activeCount === 0 && profile.status === 'approved') {
    recommendations.push({
      id: 'first-listing',
      message: 'Publicá tu primer producto para empezar a vender.',
      href: '/vendedor/productos/nuevo',
      priority: 'high',
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'learning',
      message: 'Revisá el centro de aprendizaje para seguir mejorando.',
      href: '/vendedor/aprendizaje',
      priority: 'low',
    });
  }

  const health: SellerAccountHealth = {
    score,
    label: healthLabel(score),
    factors,
  };

  return {
    health,
    recommendations: recommendations.slice(0, 5),
    learningArticles: LEARNING_ARTICLES,
  };
};
