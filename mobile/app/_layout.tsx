import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { PushNotificationBootstrap } from '../src/components/PushNotificationBootstrap';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <AuthProvider>
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
          <Stack.Screen name="product/[slug]" options={{ title: 'Producto' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="chat/[orderNumber]" options={{ title: 'Chat' }} />
          <Stack.Screen name="payment-return" options={{ title: 'Pago', headerShown: false }} />
          <Stack.Screen name="vendedor" options={{ headerShown: false }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
