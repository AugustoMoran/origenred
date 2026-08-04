import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { PushNotificationBootstrap } from '../src/components/PushNotificationBootstrap';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
        <PushNotificationBootstrap />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.navy },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.slate50 },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Iniciar sesión', presentation: 'modal' }} />
          <Stack.Screen name="register" options={{ title: 'Crear cuenta', presentation: 'modal' }} />
          <Stack.Screen name="vender" options={{ title: 'Vender en OrigenRed' }} />
          <Stack.Screen name="favorites" options={{ title: 'Mis favoritos' }} />
          <Stack.Screen name="product/[slug]" options={{ title: 'Producto' }} />
          <Stack.Screen name="tienda/[slug]" options={{ title: 'Tienda' }} />
          <Stack.Screen name="order/[orderNumber]" options={{ title: 'Pedido' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="chat/[orderNumber]" options={{ title: 'Chat' }} />
          <Stack.Screen name="payment-return" options={{ title: 'Pago', headerShown: false }} />
          <Stack.Screen name="vendedor" options={{ headerShown: false }} />
        </Stack>
      </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
