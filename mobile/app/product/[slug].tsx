import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getListing, Listing } from '../../src/api/marketplace';
import { colors } from '../../src/theme/colors';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    getListing(slug)
      .then(setListing)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

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

      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>{formatPrice(listing.price)}</Text>

      {listing.freeShipping && <Text style={styles.badge}>Envío gratis</Text>}

      <Text style={styles.meta}>
        OrigenRank™ {listing.origenRankScore} · {listing.salesCount} ventas
      </Text>

      {listing.seller && (
        <Text style={styles.seller}>Vendedor: {listing.seller.businessName}</Text>
      )}

      <Text style={styles.stock}>
        {listing.stock > 0 ? `${listing.stock} disponibles` : 'Sin stock'}
      </Text>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Para comprar, visitá origenred.com.ar o usa la web desde el navegador del celular.
          Checkout en la app llegará en una próxima versión.
        </Text>
      </View>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  price: { fontSize: 26, fontWeight: '800', color: colors.navy },
  badge: { color: colors.blue, fontWeight: '600' },
  meta: { fontSize: 12, color: colors.slate400 },
  seller: { fontSize: 14, color: colors.slate600 },
  stock: { fontSize: 14, color: colors.slate600 },
  note: {
    marginTop: 12,
    backgroundColor: colors.slate100,
    borderRadius: 12,
    padding: 14,
  },
  noteText: { fontSize: 13, color: colors.slate600, lineHeight: 20 },
});
