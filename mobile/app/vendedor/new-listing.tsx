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
import { router } from 'expo-router';
import { createSellerListing, getCategories, getSellerProfile } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

export default function NewListingScreen() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<Array<{ uri: string }>>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    stock: '1',
    category: '',
    brand: '',
    condition: 'new',
    freeShipping: 'false',
    status: 'active',
  });

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const profile = await getSellerProfile(accessToken);
        if (profile.status !== 'approved') {
          setError('Tu cuenta de vendedor debe estar aprobada');
        }
        const cats = await getCategories(true);
        setCategories(cats);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      setImages(result.assets.map((a) => ({ uri: a.uri })));
    }
  };

  const handleSubmit = async () => {
    if (!accessToken) return;
    setError('');

    if (!form.title || !form.description || !form.price || !form.category) {
      setError('Completá título, descripción, precio y categoría');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach((img, i) => {
        fd.append('images', {
          uri: img.uri,
          name: `photo-${i}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
      });

      await createSellerListing(fd, accessToken);
      router.replace('/vendedor/listings');
    } catch (e: any) {
      setError(e.message || 'Error al publicar');
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
      <Text style={styles.title}>Nueva publicación</Text>

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

      <Pressable style={styles.photoBtn} onPress={pickImages}>
        <Text style={styles.photoBtnText}>
          {images.length ? `${images.length} foto(s) seleccionada(s)` : 'Agregar fotos'}
        </Text>
      </Pressable>

      {images.length > 0 && (
        <ScrollView horizontal style={styles.previewRow}>
          {images.map((img, i) => (
            <Image key={i} source={{ uri: img.uri }} style={styles.preview} />
          ))}
        </ScrollView>
      )}

      <Pressable style={styles.submit} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.submitText}>Publicar producto</Text>
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
  photoBtn: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  photoBtnText: { color: colors.blue, fontWeight: '600' },
  previewRow: { flexGrow: 0 },
  preview: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
  submit: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
