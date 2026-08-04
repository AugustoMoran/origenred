import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getSellerProfile, getSellerListings, SellerProfile } from '../../src/api/marketplace';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de aprobación',
  approved: 'Aprobado',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
};

export default function SellerDashboardScreen() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const p = await getSellerProfile(accessToken);
        setProfile(p);
        const listings = await getSellerListings(accessToken);
        setActiveCount(listings.filter((l) => l.status === 'active').length);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

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
        <Pressable style={styles.cta} onPress={() => router.push('/')}>
          <Text style={styles.ctaText}>Volver al inicio</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.business}>{profile.businessName}</Text>
        <Text style={styles.status}>{STATUS_LABELS[profile.status] || profile.status}</Text>
      </View>

      <View style={styles.grid}>
        <StatCard label="Activos" value={activeCount} />
        <StatCard label="Ventas" value={profile.totalSales} />
        <StatCard label="Reputación" value={`${profile.reputationScore}/100`} />
        <StatCard
          label="Mercado Pago"
          value={profile.mercadoPagoConnected ? '✓' : '—'}
        />
      </View>

      <Pressable style={styles.navBtn} onPress={() => router.push('/vendedor/new-listing')}>
        <Text style={styles.navBtnText}>+ Nueva publicación</Text>
      </Pressable>
      <Pressable style={styles.navBtn} onPress={() => router.push('/vendedor/listings')}>
        <Text style={styles.navBtnText}>Ver mis productos →</Text>
      </Pressable>
      <Pressable style={styles.navBtn} onPress={() => router.push('/vendedor/orders')}>
        <Text style={styles.navBtnText}>Ver mis ventas →</Text>
      </Pressable>
    </ScrollView>
  );
}

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: colors.slate500 },
  cta: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: colors.white, fontWeight: '700' },
  header: { gap: 4 },
  business: { fontSize: 22, fontWeight: '800', color: colors.navy },
  status: { color: colors.slate500, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    width: '47%',
    gap: 4,
  },
  statLabel: { fontSize: 11, color: colors.slate400, fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.navy },
  navBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  navBtnText: { color: colors.blue, fontWeight: '600' },
});
