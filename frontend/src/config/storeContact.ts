export const STORE_WHATSAPP_NUMBER = '5491128802698';
export const STORE_INSTAGRAM_HANDLE = 'ososoundmoron';
export const STORE_WHATSAPP_GREETING =
  'Hola! Vi su página y quiero atención personalizada.';

export const buildWhatsAppUrl = (message: string) =>
  `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const buildInstagramUrl = () =>
  `https://instagram.com/${STORE_INSTAGRAM_HANDLE}`;
