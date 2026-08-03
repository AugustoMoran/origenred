# OrigenRed Mobile (Expo)

App móvil React Native + Expo que consume la misma API que la web.

## Setup

1. Copiar `.env.example` → `.env`
2. `npm install`
3. `npx expo start`

### Variables

- `EXPO_PUBLIC_API_URL` — URL del backend, ej. `http://localhost:4000/api`
- En dispositivo físico usa la IP de tu PC, ej. `http://192.168.1.10:4000/api`

## Pantallas

- **Inicio** — productos destacados
- **Buscar** — catálogo marketplace
- **Compras** — pedidos del usuario (requiere login)
- **Perfil** — sesión con SecureStore + tokens Bearer

## Auth móvil

El login envía `X-OrigenRed-Client: mobile` y recibe `accessToken` + `refreshToken` en el body.
Los tokens se guardan en Expo Secure Store.

## Próximos pasos

- Checkout nativo con Mercado Pago
- Chat post-compra con Socket.io
- Push notifications (Expo Notifications)
