import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getSellerBySlug, PublicSellerProfile, searchListings, Listing } from '../../src/api/marketplace';
import { ListingCard } from '../../src/components/ListingCard';
import { colors } from '../../src/theme/colors';

export default function StorefrontScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [seller, setSeller] = useState<PublicSellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const profile = await getSellerBySlug(slug);
        setSeller(profile);
        const result = await searchListings({ seller: profile._id, limit: '24' });
        setListings(result.items);
      } catch (e: any) {
        setError(e.message || 'Vendedor no encontrado');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (error || !seller) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error || 'Vendedor no encontrado'}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{seller.businessName}</Text>
        {seller.description ? (
          <Text style={styles.description}>{seller.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          {seller.city && seller.province && (
            <Text style={styles.meta}>{seller.city}, {seller.province}</Text>
          )}
          <Text style={styles.meta}>Reputación {seller.reputationScore}/100</Text>
          <Text style={styles.meta}>{seller.totalSales} ventas · {seller.listingCount} productos</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Productos</Text>
      {listings.length === 0 ? (
        <Text style={styles.muted}>Este vendedor no tiene productos activos</Text>
      ) : (
        <View style={styles.grid}>
          {listings.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.slate500, textAlign: 'center' },
  header: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 8,
  },
  name: { fontSize: 22, fontWeight: '800', color: colors.navy },
  description: { fontSize: 14, color: colors.slate600, lineHeight: 20 },
  metaRow: { gap: 4 },
  meta: { fontSize: 13, color: colors.slate500 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.navy, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
});
