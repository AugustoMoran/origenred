import React, { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'origenred-pwa-install-dismiss-until';
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' };
}

const isStandalone = () => {
  if (typeof window === 'undefined') return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
};

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/android|iphone|ipad|ipod|mobile/i.test(ua)) return true;
  return window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window;
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

export const PwaInstallBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [iosHints, setIosHints] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mobileDevice = isMobileDevice();
    setMobile(mobileDevice);

    if (!mobileDevice || isStandalone() || isDismissed()) return;

    setVisible(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
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
        // ignore
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }
    setIosHints(false);
  }, [deferredPrompt]);

  if (!visible || !mobile) return null;

  const onIos = isIos();
  const onAndroid = /android/i.test(navigator.userAgent || '');
  const showPrimaryButton = onIos || canInstall;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="max-w-lg mx-auto pointer-events-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <img
            src="/logooficialdefinitivo.png"
            alt=""
            className="w-11 h-11 rounded-xl object-contain bg-slate-50 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-or-navy">Instalá OrigenRed en tu celular</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              Acceso rápido desde la pantalla de inicio, como una app.
            </p>
            {iosHints && onIos && (
              <ol className="mt-2 text-xs text-slate-700 space-y-1.5 list-decimal list-inside">
                <li>
                  Abrí esta página en <strong>Safari</strong> (si usás Chrome, copiá el link y abrilo en Safari)
                </li>
                <li>Tocá <strong>Compartir</strong> (cuadrado con flecha)</li>
                <li>Elegí <strong>Agregar a inicio</strong> y confirmá</li>
              </ol>
            )}
            {!iosHints && onAndroid && !canInstall && (
              <p className="mt-2 text-xs text-slate-600">
                En Chrome: menú <strong>⋮</strong> → <strong>Instalar aplicación</strong> o <strong>Agregar a
                inicio</strong>.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          {showPrimaryButton && (
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 py-2.5 px-4 rounded-xl bg-or-navy text-white text-sm font-semibold hover:opacity-95 transition-opacity"
            >
              {onIos ? 'Cómo instalar' : 'Instalar app'}
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className={`py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 ${
              showPrimaryButton ? '' : 'flex-1'
            }`}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};
