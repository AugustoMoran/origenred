import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getHome, HomeData } from '../../src/api/marketplace';
import { ListingCard } from '../../src/components/ListingCard';
import { colors } from '../../src/theme/colors';

export default function HomeScreen() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getHome()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const listings = data?.featured?.length ? data.featured : data?.newest || [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTag}>MARKETPLACE ARGENTINO</Text>
        <Text style={styles.heroTitle}>OrigenRed</Text>
        <Text style={styles.heroSub}>
          Comprá y vendé con confianza en toda Argentina.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recomendados</Text>
      <View style={styles.grid}>
        {listings.map((listing) => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.red, textAlign: 'center' },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  heroTag: { color: colors.red, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: '800' },
  heroSub: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.navy, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
});
