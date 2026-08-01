import React from 'react';

export const ProductCardSkeleton: React.FC = () => (
  <div className="card p-0 overflow-hidden animate-pulse">
    <div className="aspect-square bg-slate-800/80" />
    <div className="p-4 space-y-3">
      <div className="h-2 w-16 bg-slate-700 rounded" />
      <div className="h-4 w-full bg-slate-700 rounded" />
      <div className="h-4 w-2/3 bg-slate-700 rounded" />
      <div className="flex justify-between items-end pt-2">
        <div className="h-6 w-20 bg-slate-700 rounded" />
        <div className="h-8 w-20 bg-slate-700 rounded-lg" />
      </div>
    </div>
  </div>
);

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);
