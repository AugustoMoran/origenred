import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function SellerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.slate50 },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Panel vendedor' }} />
      <Stack.Screen name="listings" options={{ title: 'Mis productos' }} />
      <Stack.Screen name="orders" options={{ title: 'Mis ventas' }} />
    </Stack>
  );
}
