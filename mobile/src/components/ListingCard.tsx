import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Listing } from '../api/marketplace';
import { colors } from '../theme/colors';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const ListingCard: React.FC<{ listing: Listing }> = ({ listing }) => {
  const imageUrl = listing.images?.[0]?.url;

  return (
    <Link href={`/product/${listing.slug}`} asChild>
      <Pressable style={styles.card}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>Sin foto</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          {listing.freeShipping && <Text style={styles.badge}>Envío gratis</Text>}
        </View>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    overflow: 'hidden',
    flex: 1,
    minWidth: '46%',
    maxWidth: '48%',
  },
  image: { width: '100%', height: 140 },
  imagePlaceholder: {
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: colors.slate400, fontSize: 12 },
  body: { padding: 10, gap: 4 },
  title: { fontSize: 13, fontWeight: '600', color: colors.navy },
  price: { fontSize: 15, fontWeight: '700', color: colors.navy },
  badge: { fontSize: 11, color: colors.blue },
});
