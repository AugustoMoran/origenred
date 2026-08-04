import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Listing } from '../api/marketplace';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { colors } from '../theme/colors';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const ListingCard: React.FC<{ listing: Listing; showFavorite?: boolean }> = ({
  listing,
  showFavorite = true,
}) => {
  const imageUrl = listing.images?.[0]?.url;
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const handleFavorite = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      await toggleFavorite(listing._id);
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.card} onPress={() => router.push(`/product/${listing.slug}`)}>
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
      {showFavorite && user && (
        <Pressable style={styles.heartBtn} onPress={handleFavorite} hitSlop={8}>
          <Text style={styles.heartText}>{isFavorite(listing._id) ? '♥' : '♡'}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: '46%',
    maxWidth: '48%',
    position: 'relative',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    overflow: 'hidden',
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
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartText: { fontSize: 16, color: colors.red },
});
