import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getHome, HomeData } from '../../src/api/marketplace';
import { ListingCard } from '../../src/components/ListingCard';
import { colors } from '../../src/theme/colors';

function ProductSection({
  title,
  subtitle,
  listings,
}: {
  title: string;
  subtitle?: string;
  listings: HomeData['featured'];
}) {
  if (!listings?.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      <View style={styles.grid}>
        {listings.slice(0, 8).map((listing) => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </View>
    </View>
  );
}

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

  const featured = data?.featured?.length ? data.featured : data?.newest || [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTag}>MARKETPLACE ARGENTINO</Text>
        <Text style={styles.heroTitle}>OrigenRed</Text>
        <Text style={styles.heroSub}>
          Comprá y vendé con confianza en toda Argentina.
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.heroBtnPrimary} onPress={() => router.push('/search')}>
            <Text style={styles.heroBtnPrimaryText}>Explorar productos</Text>
          </Pressable>
          <Pressable style={styles.heroBtnSecondary} onPress={() => router.push('/vender')}>
            <Text style={styles.heroBtnSecondaryText}>Empezar a vender</Text>
          </Pressable>
        </View>
      </View>

      {data?.categories && data.categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {data.categories.map((cat) => (
              <Pressable
                key={cat._id}
                style={styles.catChip}
                onPress={() =>
                  router.push({
                    pathname: '/search',
                    params: { category: cat._id, categoryName: cat.name },
                  })
                }
              >
                <Text style={styles.catChipText}>
                  {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                </Text>
                <Text style={styles.catCount}>{cat.listingCount}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <ProductSection
        title="Recomendados"
        subtitle="Seleccionados por OrigenRank™"
        listings={featured}
      />

      <ProductSection
        title="Lo más vendido"
        subtitle="Favoritos de la comunidad"
        listings={data?.bestsellers || []}
      />

      <ProductSection
        title="Recién publicados"
        subtitle="Últimas novedades"
        listings={data?.newest || []}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 32 },
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
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  heroBtnPrimary: {
    backgroundColor: colors.red,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroBtnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  heroBtnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroBtnSecondaryText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  sectionSub: { fontSize: 13, color: colors.slate500 },
  catScroll: { flexGrow: 0 },
  catChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    gap: 2,
  },
  catChipText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  catCount: { fontSize: 11, color: colors.slate400 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
});
