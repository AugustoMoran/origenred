# OrigenRed Mobile (Expo)

App React Native + Expo Router. Consume la misma API que la web (`/api/marketplace`).

## Setup local

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

### Variables

| Variable | Ejemplo |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:4000/api` |
| En dispositivo físico | `http://192.168.x.x:4000/api` (IP de tu PC) |

## Pantallas

| Ruta | Descripción |
|------|-------------|
| `(tabs)/index` | Home, categorías, destacados |
| `(tabs)/search` | Búsqueda y filtro por categoría |
| `(tabs)/cart` | Carrito |
| `(tabs)/orders` | Mis compras |
| `(tabs)/profile` | Cuenta, favoritos, vendedor |
| `product/[slug]` | Detalle de producto |
| `tienda/[slug]` | Tienda pública del vendedor |
| `order/[orderNumber]` | Detalle de pedido |
| `checkout` | Checkout + Mercado Pago |
| `favorites` | Mis favoritos |
| `vender` | Registro como vendedor |
| `login` / `register` | Auth comprador |
| `vendedor/*` | Panel vendedor (productos, ventas, chat) |
| `chat/[orderNumber]` | Chat post-compra |
| `payment-return` | Deep link retorno MP |

## Auth

Login con `X-OrigenRed-Client: mobile` → tokens en body → SecureStore.

## Deep links (Mercado Pago)

Scheme: `origenred://`

- `origenred://payment-return?status=success&orderNumber=OR-XXX`
- El backend genera `back_urls` con este scheme cuando el checkout viene desde la app.

## EAS Build (producción)

1. Instalar EAS CLI: `npm i -g eas-cli`
2. Login: `eas login`
3. Vincular proyecto (genera `projectId` real): `eas init`
4. Configurar secret de API en EAS:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://tu-api.onrender.com/api
   ```
5. Build:
   ```bash
   eas build --profile preview --platform android   # APK interno
   eas build --profile production --platform all    # stores
   ```

Perfiles en `eas.json`: `development`, `preview`, `production`.

**Nota:** El `projectId` en `app.json` debe ser el de tu cuenta Expo (`eas init` lo actualiza).

## Push notifications

Registro automático al login (`POST /api/auth/push-token`). Requiere dispositivo físico.
