import React, { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'origenred-pwa-install-dismiss-until-v2';
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const isMobileUserAgent = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/android|iphone|ipad|ipod|mobile/i.test(ua)) return true;
  return window.matchMedia('(max-width: 768px)').matches;
};

const isStandalone = () => {
  if (typeof window === 'undefined') return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '');

const isDismissed = () => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until) || Date.now() > until) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const dismissBanner = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    // ignore
  }
};

export const shouldOfferPwaInstall = () =>
  typeof window !== 'undefined' && isMobileUserAgent() && !isStandalone() && !isDismissed();

export const PwaInstallBanner: React.FC = () => {
  const [visible, setVisible] = useState(() => shouldOfferPwaInstall());
  const [iosHints, setIosHints] = useState(false);
  const [androidHints, setAndroidHints] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!shouldOfferPwaInstall()) {
      setVisible(false);
      return;
    }
    setVisible(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const handleDismiss = useCallback(() => {
    dismissBanner();
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIos()) {
      setIosHints(true);
      return;
    }
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          dismissBanner();
          setVisible(false);
        }
      } catch {
        setAndroidHints(true);
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }
    setAndroidHints(true);
  }, [deferredPrompt]);

  if (!visible) return null;

  const onIos = isIos();
  const onAndroid = /android/i.test(navigator.userAgent || '');

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[200] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <img
            src="/origenred-logo.svg"
            alt=""
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-or-navy">Instalá OrigenRed</p>
            <p className="text-sm text-slate-600 mt-1 leading-snug">
              Accedé más rápido desde tu pantalla de inicio.
            </p>
            {iosHints && onIos && (
              <ol className="mt-3 text-sm text-slate-700 space-y-1.5 list-decimal list-inside">
                <li>En Safari: tocá <strong>Compartir</strong></li>
                <li>Elegí <strong>Agregar a inicio</strong></li>
              </ol>
            )}
            {(androidHints || (onAndroid && !deferredPrompt)) && onAndroid && (
              <p className="mt-3 text-sm text-slate-700">
                En Chrome: menú <strong>⋮</strong> (arriba a la derecha) →{' '}
                <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla de inicio</strong>.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={handleInstall}
            className="flex-1 py-3 px-4 rounded-xl bg-or-red text-white text-sm font-semibold"
          >
            {onIos ? 'Ver cómo instalar' : 'Instalar app'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};
