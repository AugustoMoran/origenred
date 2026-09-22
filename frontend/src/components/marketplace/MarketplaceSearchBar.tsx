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
    'w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 sm:py-4 text-base sm:text-lg text-or-navy placeholder-slate-400 shadow-sm focus:outline-none focus:border-or-blue focus:ring-4 focus:ring-or-blue/15 transition-[border-color,box-shadow]';

  return (
    <form onSubmit={submit} className={`relative w-full ${className}`}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      {reduce ? (
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="¿Qué estás buscando?"
          className={inputClass}
          autoFocus={autoFocus}
          enterKeyHint="search"
        />
      ) : (
        <motion.input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="¿Qué estás buscando?"
          className={inputClass}
          autoFocus={autoFocus}
          enterKeyHint="search"
          whileFocus={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        />
      )}
    </form>
  );
};
