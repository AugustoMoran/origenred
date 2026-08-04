import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getCategories,
  getSellerListings,
  updateSellerListing,
  updateSellerListingFormData,
} from '../../../src/api/marketplace';
import { useAuth } from '../../../src/context/AuthContext';
import { colors } from '../../../src/theme/colors';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingImages, setExistingImages] = useState<Array<{ url: string }>>([]);
  const [newImages, setNewImages] = useState<Array<{ uri: string }>>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    stock: '1',
    category: '',
    brand: '',
    status: 'active',
  });

  useEffect(() => {
    if (!accessToken || !id) return;
    (async () => {
      try {
        const [listings, cats] = await Promise.all([
          getSellerListings(accessToken),
          getCategories(true),
        ]);
        setCategories(cats);
        const listing = listings.find((l) => l._id === id);
        if (!listing) {
          setError('Producto no encontrado');
          return;
        }
        const categoryId =
          typeof listing.category === 'object'
            ? listing.category?._id
            : listing.category || '';
        setForm({
          title: listing.title || '',
          description: listing.description || '',
          price: String(listing.price || ''),
          stock: String(listing.stock ?? 1),
          category: categoryId,
          brand: listing.brand || '',
          status: listing.status || 'active',
        });
        setExistingImages(listing.images || []);
      } catch (e: any) {
        setError(e.message || 'Error al cargar el producto');
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, id]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setNewImages(result.assets.map((a) => ({ uri: a.uri })));
    }
  };

  const handleSubmit = async () => {
    if (!accessToken || !id) return;
    setError('');

    if (!form.title || !form.description || !form.price || !form.category) {
      setError('Completá título, descripción, precio y categoría');
      return;
    }

    setSubmitting(true);
    try {
      if (newImages.length > 0) {
        const fd = new FormData();
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('price', String(Number(form.price)));
        fd.append('stock', String(Number(form.stock) || 0));
        fd.append('category', form.category);
        fd.append('brand', form.brand.trim());
        fd.append('status', form.status);
        newImages.forEach((img, i) => {
          fd.append('images', {
            uri: img.uri,
            name: `photo-${i}.jpg`,
            type: 'image/jpeg',
          } as unknown as Blob);
        });
        await updateSellerListingFormData(id, fd, accessToken);
      } else {
        await updateSellerListing(
          id,
          {
            title: form.title.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            stock: Number(form.stock) || 0,
            category: form.category,
            brand: form.brand.trim(),
            status: form.status,
          },
          accessToken
        );
      }
      router.replace('/vendedor/listings');
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar publicación</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Título *"
        value={form.title}
        onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Descripción *"
        multiline
        numberOfLines={4}
        value={form.description}
        onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Precio (ARS) *"
        keyboardType="numeric"
        value={form.price}
        onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Stock"
        keyboardType="numeric"
        value={form.stock}
        onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Marca (opcional)"
        value={form.brand}
        onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))}
      />

      <Text style={styles.label}>Categoría *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
        {categories.map((cat) => (
          <Pressable
            key={cat._id}
            style={[styles.catChip, form.category === cat._id && styles.catChipActive]}
            onPress={() => setForm((f) => ({ ...f, category: cat._id }))}
          >
            <Text
              style={[
                styles.catChipText,
                form.category === cat._id && styles.catChipTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Estado</Text>
      <View style={styles.statusRow}>
        {(['active', 'draft', 'paused'] as const).map((status) => (
          <Pressable
            key={status}
            style={[styles.statusChip, form.status === status && styles.statusChipActive]}
            onPress={() => setForm((f) => ({ ...f, status }))}
          >
            <Text
              style={[
                styles.statusChipText,
                form.status === status && styles.statusChipTextActive,
              ]}
            >
              {status === 'active' ? 'Activo' : status === 'draft' ? 'Borrador' : 'Pausado'}
            </Text>
          </Pressable>
        ))}
      </View>

      {existingImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {existingImages.map((img) => (
            <Image key={img.url} source={{ uri: img.url }} style={styles.thumb} />
          ))}
        </ScrollView>
      )}
      <Pressable style={styles.imageBtn} onPress={pickImages}>
        <Text style={styles.imageBtnText}>
          {newImages.length > 0 ? `${newImages.length} nueva(s) imagen(es)` : 'Agregar imágenes'}
        </Text>
      </Pressable>

      <Pressable style={styles.submit} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.submitText}>Guardar cambios</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  error: { color: colors.red, fontSize: 13 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  catRow: { flexGrow: 0 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    marginRight: 8,
  },
  catChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  catChipText: { fontSize: 13, color: colors.slate600 },
  catChipTextActive: { color: colors.white, fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  statusChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  statusChipText: { fontSize: 12, color: colors.slate600 },
  statusChipTextActive: { color: colors.white, fontWeight: '600' },
  submit: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  thumb: { width: 64, height: 64, borderRadius: 8, marginRight: 8 },
  imageBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
  },
  imageBtnText: { color: colors.blue, fontWeight: '600' },
});
