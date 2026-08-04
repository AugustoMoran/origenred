import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getFavorites, toggleFavorite as apiToggleFavorite } from '../api/marketplace';
import { useAuth } from './AuthContext';

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  loading: boolean;
  isFavorite: (listingId: string) => boolean;
  refreshFavorites: () => Promise<void>;
  toggleFavorite: (listingId: string) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshFavorites = useCallback(async () => {
    if (!accessToken) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const favorites = await getFavorites(accessToken);
      const ids = new Set(
        favorites.map((f) => f.listing?._id).filter(Boolean) as string[]
      );
      setFavoriteIds(ids);
    } catch {
      setFavoriteIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback(
    (listingId: string) => favoriteIds.has(listingId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!accessToken) throw new Error('Iniciá sesión para guardar favoritos');
      const result = await apiToggleFavorite(listingId, accessToken);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (result.favorited) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
      return result.favorited;
    },
    [accessToken]
  );

  const value = useMemo(
    () => ({ favoriteIds, loading, isFavorite, refreshFavorites, toggleFavorite }),
    [favoriteIds, loading, isFavorite, refreshFavorites, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};
