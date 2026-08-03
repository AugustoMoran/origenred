import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MarketplaceCartItem {
  listingId: string;
  slug: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sellerId: string;
  sellerName: string;
  maxStock: number;
}

interface MarketplaceCartState {
  items: MarketplaceCartItem[];
  isOpen: boolean;
}

const STORAGE_KEY = 'origenred_marketplace_cart';

const loadCart = (): MarketplaceCartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (items: MarketplaceCartItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // no-op
  }
};

const marketplaceCartSlice = createSlice({
  name: 'marketplaceCart',
  initialState: {
    items: loadCart(),
    isOpen: false,
  } as MarketplaceCartState,
  reducers: {
    addMarketplaceItem: (state, action: PayloadAction<MarketplaceCartItem>) => {
      const existing = state.items.find((i) => i.listingId === action.payload.listingId);
      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + action.payload.quantity,
          action.payload.maxStock
        );
      } else {
        state.items.push({ ...action.payload });
      }
      persist(state.items);
    },
    removeMarketplaceItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.listingId !== action.payload);
      persist(state.items);
    },
    updateMarketplaceQuantity: (
      state,
      action: PayloadAction<{ listingId: string; quantity: number }>
    ) => {
      const item = state.items.find((i) => i.listingId === action.payload.listingId);
      if (!item) return;
      if (action.payload.quantity <= 0) {
        state.items = state.items.filter((i) => i.listingId !== action.payload.listingId);
      } else {
        item.quantity = Math.min(action.payload.quantity, item.maxStock);
      }
      persist(state.items);
    },
    clearMarketplaceCart: (state) => {
      state.items = [];
      persist(state.items);
    },
    setMarketplaceCartOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
    toggleMarketplaceCart: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

export const {
  addMarketplaceItem,
  removeMarketplaceItem,
  updateMarketplaceQuantity,
  clearMarketplaceCart,
  setMarketplaceCartOpen,
  toggleMarketplaceCart,
} = marketplaceCartSlice.actions;

export const selectMarketplaceCartItems = (state: { marketplaceCart: MarketplaceCartState }) =>
  state.marketplaceCart.items;
export const selectMarketplaceCartCount = (state: { marketplaceCart: MarketplaceCartState }) =>
  state.marketplaceCart.items.reduce((acc, i) => acc + i.quantity, 0);
export const selectMarketplaceCartTotal = (state: { marketplaceCart: MarketplaceCartState }) =>
  state.marketplaceCart.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
export const selectMarketplaceCartOpen = (state: { marketplaceCart: MarketplaceCartState }) =>
  state.marketplaceCart.isOpen;

export default marketplaceCartSlice.reducer;
