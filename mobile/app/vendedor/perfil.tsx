import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { getSellerProfile, SellerProfile } from '../../src/api/marketplace';
import { apiFetch } from '../../src/api/client';
import { colors } from '../../src/theme/colors';

export default function SellerProfileScreen() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    description: '',
    phone: '',
    city: '',
    province: '',
    postalCode: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const p = await getSellerProfile(accessToken);
        setProfile(p);
        setForm({
          businessName: p.businessName || '',
          description: p.description || '',
          phone: p.phone || '',
          city: p.city || '',
          province: p.province || '',
          postalCode: p.postalCode || '',
        });
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    try {
      await apiFetch<SellerProfile>('/marketplace/seller/me', {
        method: 'PATCH',
        body: JSON.stringify(form),
        token: accessToken,
        mobile: false,
      });
      Alert.alert('Listo', 'Perfil actualizado.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No tenés perfil de vendedor</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mi perfil</Text>
      <Text style={styles.subtitle}>Un perfil completo mejora tu salud de cuenta.</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre de tienda"
        value={form.businessName}
        onChangeText={(v) => setForm({ ...form, businessName: v })}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Descripción"
        value={form.description}
        onChangeText={(v) => setForm({ ...form, description: v })}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        value={form.phone}
        onChangeText={(v) => setForm({ ...form, phone: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Ciudad"
        value={form.city}
        onChangeText={(v) => setForm({ ...form, city: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Provincia"
        value={form.province}
        onChangeText={(v) => setForm({ ...form, province: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Código postal"
        value={form.postalCode}
        onChangeText={(v) => setForm({ ...form, postalCode: v })}
      />

      <Pressable style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.btnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.slate500 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  subtitle: { color: colors.slate500, fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate100,
    borderRadius: 12,
    padding: 12,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  btn: {
    backgroundColor: colors.red,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontWeight: '700' },
});
