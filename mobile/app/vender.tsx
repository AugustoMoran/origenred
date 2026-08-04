import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { registerSeller } from '../src/api/marketplace';
import { colors } from '../src/theme/colors';

export default function SellerRegisterScreen() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    province: '',
    city: '',
    postalCode: '',
    phone: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field: string) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.email || !form.password || !form.businessName) {
      setError('Completá nombre, email, contraseña y nombre del negocio');
      return;
    }
    setLoading(true);
    try {
      await registerSeller({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        businessName: form.businessName.trim(),
        province: form.province.trim() || undefined,
        city: form.city.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        phone: form.phone.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.center}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
        <Text style={styles.muted}>
          Un administrador revisará tu cuenta. Te avisaremos por email cuando estés aprobado.
        </Text>
        <Pressable style={styles.cta} onPress={() => router.replace('/')}>
          <Text style={styles.ctaText}>Volver al inicio</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Vendé en OrigenRed</Text>
        <Text style={styles.sub}>100 publicaciones gratis · Comisión 5% solo al vender</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput style={styles.input} placeholder="Tu nombre *" value={form.name} onChangeText={set('name')} />
        <TextInput
          style={styles.input}
          placeholder="Email *"
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={set('email')}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña *"
          secureTextEntry
          value={form.password}
          onChangeText={set('password')}
        />
        <TextInput
          style={styles.input}
          placeholder="Nombre del negocio *"
          value={form.businessName}
          onChangeText={set('businessName')}
        />
        <TextInput style={styles.input} placeholder="Provincia" value={form.province} onChangeText={set('province')} />
        <TextInput style={styles.input} placeholder="Ciudad" value={form.city} onChangeText={set('city')} />
        <TextInput style={styles.input} placeholder="Código postal" value={form.postalCode} onChangeText={set('postalCode')} />
        <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descripción del negocio (opcional)"
          multiline
          numberOfLines={3}
          value={form.description}
          onChangeText={set('description')}
          textAlignVertical="top"
        />

        <Pressable style={styles.cta} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.ctaText}>Enviar solicitud</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },
  sub: { color: colors.slate500, marginBottom: 8 },
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
  textArea: { minHeight: 88 },
  cta: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  successEmoji: { fontSize: 48 },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.navy },
  muted: { color: colors.slate500, textAlign: 'center', lineHeight: 20 },
});
