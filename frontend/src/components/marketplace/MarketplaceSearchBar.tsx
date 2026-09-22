import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';

type Props = {
  className?: string;
  autoFocus?: boolean;
};

export const MarketplaceSearchBar: React.FC<Props> = ({ className = '', autoFocus = false }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [value, setValue] = useState('');
  const reduce = useReducedMotion();
  const onSearchPage = pathname === '/buscar';

  useEffect(() => {
    if (onSearchPage) setValue(params.get('q') || '');
  }, [onSearchPage, params]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/buscar?q=${encodeURIComponent(q)}` : '/buscar');
  };

  const inputClass =
    'w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base text-or-navy placeholder-slate-400 focus:outline-none focus:border-or-blue focus:ring-2 focus:ring-or-blue/15 transition-[border-color,box-shadow]';

  return (
    <form onSubmit={submit} className={`relative w-full max-w-3xl mx-auto ${className}`}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      {reduce ? (
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar productos, marcas..."
          className={inputClass}
          autoFocus={autoFocus}
          enterKeyHint="search"
        />
      ) : (
        <motion.input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar productos, marcas..."
          className={inputClass}
          autoFocus={autoFocus}
          enterKeyHint="search"
          whileFocus={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </form>
  );
};
