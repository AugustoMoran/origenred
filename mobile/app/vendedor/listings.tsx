import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getSellerListings, Listing } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const format = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function SellerListingsScreen() {
  const { accessToken } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    getSellerListings(accessToken)
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

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
        <Text style={styles.muted}>No tenés productos publicados</Text>
      ) : (
        listings.map((item) => (
          <Pressable
            key={item._id}
            style={styles.card}
            onPress={() => router.push(`/vendedor/edit/${item._id}`)}
          >
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <View style={styles.row}>
              <Text style={styles.price}>{format(item.price)}</Text>
              <Text style={styles.status}>{item.status || 'active'}</Text>
            </View>
            <Text style={styles.stock}>Stock: {item.stock}</Text>
            <Text style={styles.editHint}>Tocá para editar</Text>
          </Pressable>
        ))
      )}
      <Pressable style={styles.fab} onPress={() => router.push('/vendedor/new-listing')}>
        <Text style={styles.fabText}>+ Nueva publicación</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.slate500, textAlign: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 4,
  },
  title: { fontWeight: '600', color: colors.navy },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  price: { fontWeight: '700', color: colors.navy },
  status: { fontSize: 12, color: colors.slate500 },
  stock: { fontSize: 12, color: colors.slate400 },
  editHint: { fontSize: 11, color: colors.blue, marginTop: 4 },
  fab: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  fabText: { color: colors.white, fontWeight: '700' },
});
