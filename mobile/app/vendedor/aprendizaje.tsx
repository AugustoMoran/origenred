import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { getSellerDashboard } from '../../src/api/marketplace';
import { colors } from '../../src/theme/colors';

export default function SellerLearningScreen() {
  const { accessToken } = useAuth();
  const [articles, setArticles] = useState<
    Array<{ id: string; title: string; summary: string; tips: string[] }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const data = await getSellerDashboard(accessToken);
        setArticles(data.learningArticles);
      } catch {
        setArticles([]);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Centro de aprendizaje</Text>
      <Text style={styles.subtitle}>Consejos para vender mejor en OrigenRed.</Text>

      {articles.map((article) => (
        <View key={article.id} style={styles.card}>
          <Text style={styles.cardTitle}>{article.title}</Text>
          <Text style={styles.summary}>{article.summary}</Text>
          {article.tips.map((tip) => (
            <Text key={tip} style={styles.tip}>• {tip}</Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  subtitle: { color: colors.slate500, fontSize: 14, marginBottom: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate100,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  summary: { fontSize: 14, color: colors.slate500 },
  tip: { fontSize: 13, color: colors.slate600, lineHeight: 20 },
});
