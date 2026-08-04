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
import { ReportModal } from '../../src/components/ReportModal';
import { colors } from '../../src/theme/colors';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [favBusy, setFavBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getListing(slug)
      .then((data) => {
        setListing(data);
        setSelectedImage(0);
      })
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

  const images = listing.images?.length ? listing.images : [];
  const mainImage = images[selectedImage]?.url;
  const hasDiscount =
    listing.compareAtPrice != null && listing.compareAtPrice > listing.price;
  const categoryName =
    typeof listing.category === 'object' ? listing.category?.name : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mainImage ? (
        <Image source={{ uri: mainImage }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>Sin imagen</Text>
        </View>
      )}

      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
          {images.map((img, i) => (
            <Pressable key={i} onPress={() => setSelectedImage(i)}>
              <Image
                source={{ uri: img.url }}
                style={[styles.thumb, selectedImage === i && styles.thumbActive]}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {listing.seller && (
        <Pressable onPress={() => router.push(`/tienda/${listing.seller!.slug}`)}>
          <Text style={styles.sellerLink}>
            {listing.seller.businessName}
            {listing.seller.reputationScore != null
              ? ` · ⭐ ${listing.seller.reputationScore}`
              : ''}
            {' →'}
          </Text>
        </Pressable>
      )}

      <View style={styles.titleRow}>
        <Text style={styles.title}>{listing.title}</Text>
        <Pressable style={styles.favBtn} onPress={handleToggleFavorite} disabled={favBusy}>
          <Text style={styles.favBtnText}>
            {isFavorite(listing._id) ? '♥' : '♡'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(listing.price)}</Text>
        {hasDiscount && (
          <Text style={styles.comparePrice}>{formatPrice(listing.compareAtPrice!)}</Text>
        )}
      </View>

      {listing.freeShipping && <Text style={styles.badge}>Envío gratis</Text>}

      {listing.shortDescription ? (
        <Text style={styles.shortDesc}>{listing.shortDescription}</Text>
      ) : null}

      {listing.description ? (
        <Text style={styles.description}>{listing.description}</Text>
      ) : null}

      <View style={styles.chips}>
        {categoryName && <Text style={styles.chip}>{categoryName}</Text>}
        {listing.brand && <Text style={styles.chip}>Marca: {listing.brand}</Text>}
        {listing.color && <Text style={styles.chip}>Color: {listing.color}</Text>}
        {listing.size && <Text style={styles.chip}>Talle: {listing.size}</Text>}
        <Text style={styles.chip}>
          Stock: {listing.stock > 0 ? listing.stock : 'Agotado'}
        </Text>
      </View>

      <Text style={styles.meta}>
        OrigenRank™ {listing.origenRankScore} · {listing.salesCount} ventas
      </Text>

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

      {user && (
        <Pressable onPress={() => setShowReport(true)}>
          <Text style={styles.reportLink}>Denunciar este producto</Text>
        </Pressable>
      )}

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        title={listing.title}
        listingId={listing._id}
      />
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
  thumbRow: { flexGrow: 0, marginTop: 4 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: colors.blue },
  sellerLink: { fontSize: 14, color: colors.blue, fontWeight: '600' },
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
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  price: { fontSize: 26, fontWeight: '800', color: colors.navy },
  comparePrice: { fontSize: 18, color: colors.slate400, textDecorationLine: 'line-through' },
  badge: { color: colors.blue, fontWeight: '600' },
  shortDesc: { fontSize: 15, color: colors.slate600, fontWeight: '500' },
  description: { fontSize: 14, color: colors.slate600, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    fontSize: 12,
    color: colors.slate600,
    backgroundColor: colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  meta: { fontSize: 12, color: colors.slate400 },
  stock: { fontSize: 14, color: colors.slate600 },
  buyBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  cartLink: { alignItems: 'center', paddingVertical: 8 },
  cartLinkText: { color: colors.blue, fontWeight: '600' },
  reportLink: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.slate400,
    paddingVertical: 8,
  },
});
