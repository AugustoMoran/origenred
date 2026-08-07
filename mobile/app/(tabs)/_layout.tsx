import { Tabs } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.slate400,
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarLabel: 'Inicio' }} />
      <Tabs.Screen name="search" options={{ title: 'Buscar', tabBarLabel: 'Buscar' }} />
      <Tabs.Screen name="cart" options={{ title: 'Carrito', tabBarLabel: 'Carrito' }} />
      <Tabs.Screen name="orders" options={{ title: 'Compras', tabBarLabel: 'Compras' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarLabel: 'Perfil' }} />
    </Tabs>
  );
}
