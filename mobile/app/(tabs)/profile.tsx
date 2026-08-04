import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cargando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Tu cuenta OrigenRed</Text>
        <Text style={styles.muted}>Iniciá sesión para comprar y chatear con vendedores</Text>
        <Link href="/login" asChild>
          <Pressable style={styles.cta}>
            <Text style={styles.ctaText}>Iniciar sesión</Text>
          </Pressable>
        </Link>
        <Link href="/register" asChild>
          <Pressable style={styles.ctaOutline}>
            <Text style={styles.ctaOutlineText}>Crear cuenta</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.roles}>{user.roles?.join(', ')}</Text>
      </View>

      {(user.roles?.includes('vendedor_marketplace') || user.roles?.includes('admin')) && (
        <Link href="/vendedor" asChild>
          <Pressable style={styles.sellerBtn}>
            <Text style={styles.sellerBtnText}>Panel vendedor →</Text>
          </Pressable>
        </Link>
      )}

      <Link href="/favorites" asChild>
        <Pressable style={styles.menuBtn}>
          <Text style={styles.menuBtnText}>Mis favoritos</Text>
        </Pressable>
      </Link>

      <Pressable style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy },
  muted: { color: colors.slate500, textAlign: 'center' },
  cta: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: colors.white, fontWeight: '700' },
  ctaOutline: {
    borderWidth: 1,
    borderColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaOutlineText: { color: colors.red, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 4,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.navy },
  email: { color: colors.slate600 },
  roles: { fontSize: 12, color: colors.slate400, marginTop: 4 },
  sellerBtn: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sellerBtnText: { color: colors.white, fontWeight: '700' },
  menuBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  menuBtnText: { color: colors.navy, fontWeight: '600' },
  logout: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.red, fontWeight: '600' },
});
