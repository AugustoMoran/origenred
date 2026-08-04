import React, { createContext, useContext, useMemo, useState } from 'react';

export interface CartItem {
  listingId: string;
  slug: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.listingId === item.listingId);
      if (existing) {
        return prev.map((i) =>
          i.listingId === item.listingId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const removeItem = (listingId: string) => {
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));
  };

  const updateQuantity = (listingId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(listingId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.listingId === listingId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  const count = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const value = useMemo(
    () => ({ items, count, subtotal, addItem, removeItem, updateQuantity, clearCart }),
    [items, count, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
