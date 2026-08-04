import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { getFavorites, Listing } from '../src/api/marketplace';
import { ListingCard } from '../src/components/ListingCard';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

export default function FavoritesScreen() {
  const { user, accessToken } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const favorites = await getFavorites(accessToken);
      setListings(favorites.map((f) => f.listing).filter(Boolean));
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Iniciá sesión para ver tus favoritos</Text>
        <Link href="/login" asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>Iniciar sesión</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {listings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>No tenés favoritos guardados</Text>
          <Link href="/search" asChild>
            <Pressable>
              <Text style={styles.link}>Explorar productos →</Text>
            </Pressable>
          </Link>
        </View>
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
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: colors.slate500, textAlign: 'center' },
  cta: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: colors.white, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  link: { color: colors.red, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
});
