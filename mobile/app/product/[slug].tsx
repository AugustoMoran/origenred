import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getListing, Listing } from '../../src/api/marketplace';
import { useCart } from '../../src/context/CartContext';
import { useAuth } from '../../src/context/AuthContext';
import { useFavorites } from '../../src/context/FavoritesContext';
import { colors } from '../../src/theme/colors';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [favBusy, setFavBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getListing(slug)
      .then(setListing)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleToggleFavorite = async () => {
    if (!listing) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setFavBusy(true);
    try {
      await toggleFavorite(listing._id);
    } catch {
      // ignore
    } finally {
      setFavBusy(false);
    }
  };

  const handleAddToCart = () => {
    if (!listing || listing.stock <= 0) return;
    addItem({
      listingId: listing._id,
      slug: listing.slug,
      title: listing.title,
      price: listing.price,
      imageUrl: listing.images?.[0]?.url,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Producto no encontrado'}</Text>
      </View>
    );
  }

  const imageUrl = listing.images?.[0]?.url;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>Sin imagen</Text>
        </View>
      )}

      <View style={styles.titleRow}>
        <Text style={styles.title}>{listing.title}</Text>
        <Pressable style={styles.favBtn} onPress={handleToggleFavorite} disabled={favBusy}>
          <Text style={styles.favBtnText}>
            {isFavorite(listing._id) ? '♥' : '♡'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.price}>{formatPrice(listing.price)}</Text>

      {listing.freeShipping && <Text style={styles.badge}>Envío gratis</Text>}

      <Text style={styles.meta}>
        OrigenRank™ {listing.origenRankScore} · {listing.salesCount} ventas
      </Text>

      {listing.seller && (
        <Pressable onPress={() => router.push(`/tienda/${listing.seller!.slug}`)}>
          <Text style={styles.sellerLink}>
            Vendedor: {listing.seller.businessName} →
          </Text>
        </Pressable>
      )}

      <Text style={styles.stock}>
        {listing.stock > 0 ? `${listing.stock} disponibles` : 'Sin stock'}
      </Text>

      <Pressable
        style={[styles.buyBtn, listing.stock <= 0 && styles.buyBtnDisabled]}
        onPress={handleAddToCart}
        disabled={listing.stock <= 0}
      >
        <Text style={styles.buyBtnText}>
          {listing.stock <= 0 ? 'Sin stock' : added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
        </Text>
      </Pressable>

      <Pressable style={styles.cartLink} onPress={() => router.push('/cart')}>
        <Text style={styles.cartLinkText}>Ver carrito →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.red },
  image: { width: '100%', height: 280, borderRadius: 16 },
  placeholder: {
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: colors.slate400 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnText: { fontSize: 22, color: colors.red },
  price: { fontSize: 26, fontWeight: '800', color: colors.navy },
  badge: { color: colors.blue, fontWeight: '600' },
  meta: { fontSize: 12, color: colors.slate400 },
  sellerLink: { fontSize: 14, color: colors.blue, fontWeight: '600' },
  stock: { fontSize: 14, color: colors.slate600 },
  buyBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  cartLink: { alignItems: 'center', paddingVertical: 8 },
  cartLinkText: { color: colors.blue, fontWeight: '600' },
});
