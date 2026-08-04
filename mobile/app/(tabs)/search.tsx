import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { searchListings, Listing } from '../../src/api/marketplace';
import { ListingCard } from '../../src/components/ListingCard';
import { colors } from '../../src/theme/colors';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ category?: string; categoryName?: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (searchParams: Record<string, string>) => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchListings({ ...searchParams, limit: '24' });
      setResults(data.items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    const searchParams: Record<string, string> = { limit: '24' };
    if (query.trim()) searchParams.search = query.trim();
    if (params.category) searchParams.category = String(params.category);
    runSearch(searchParams);
  };

  useEffect(() => {
    if (params.category) {
      runSearch({ category: String(params.category), limit: '24' });
    }
  }, [params.category, runSearch]);

  const categoryLabel = params.categoryName ? String(params.categoryName) : null;

  return (
    <View style={styles.container}>
      {categoryLabel && (
        <View style={styles.categoryBanner}>
          <Text style={styles.categoryBannerText}>Categoría: {categoryLabel}</Text>
        </View>
      )}

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Buscar productos..."
          placeholderTextColor={colors.slate400}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Buscar</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {searched && results.length === 0 && (
            <Text style={styles.empty}>No se encontraron productos</Text>
          )}
          {results.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  categoryBanner: {
    backgroundColor: colors.slate100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  categoryBannerText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.white, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 32,
  },
  empty: { color: colors.slate500, textAlign: 'center', marginTop: 24 },
});
