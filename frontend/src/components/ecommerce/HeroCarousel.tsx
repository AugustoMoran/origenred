import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface HeroCarouselProps {
  images: string[];
  storeName: string;
  storeDescription?: string;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ images, storeName, storeDescription }) => {
  const slides = images.length > 0 ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const goTo = (index: number) => setActiveIndex(index);
  const prev = () => setActiveIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setActiveIndex((i) => (i + 1) % slides.length);

  return (
    <section className="relative overflow-hidden rounded-3xl card-lg aspect-[21/9] min-h-[280px] sm:min-h-[360px]">
      {slides.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <img
            src={url}
            alt={`${storeName} — slide ${index + 1}`}
            className="w-full h-full object-cover"
            loading={index === 0 ? 'eager' : 'lazy'}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 via-[#030712]/50 to-transparent" />
        </div>
      ))}

      <div className="relative z-10 h-full flex flex-col justify-center p-8 sm:p-12 max-w-2xl">
        <p className="text-brand-400 text-sm font-semibold mb-2 tracking-wide uppercase">Bienvenido</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
          {storeName}
        </h1>
        <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed line-clamp-3">
          {storeDescription || 'Instrumentos, audio y accesorios para músicos de todos los niveles.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/products" className="btn-primary">
            Ver catálogo
          </Link>
          <a href="#destacados" className="btn-secondary">
            Destacados
          </a>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur transition-colors"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur transition-colors"
            aria-label="Siguiente"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-brand-400' : 'w-2 bg-white/40 hover:bg-white/70'}`}
                aria-label={`Ir al slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
