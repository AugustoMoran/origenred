import React, { useCallback, useEffect, useState } from 'react';
import {
  clearDeferredPwaPrompt,
  getDeferredPwaPrompt,
  onPwaInstallReady,
} from '../utils/pwaInstallCapture';

const DISMISS_KEY = 'origenred-pwa-install-dismiss-until-v2';
const DISMISS_DAYS = 7;

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
  const [canNativeInstall, setCanNativeInstall] = useState(() => Boolean(getDeferredPwaPrompt()));
  const [installTried, setInstallTried] = useState(false);

  useEffect(() => {
    if (!shouldOfferPwaInstall()) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setCanNativeInstall(Boolean(getDeferredPwaPrompt()));

    return onPwaInstallReady(() => {
      setCanNativeInstall(true);
      setVisible(true);
    });
  }, []);

  const handleDismiss = useCallback(() => {
    dismissBanner();
    setVisible(false);
  }, []);

  const handleInstall = useCallback(() => {
    setInstallTried(true);

    if (isIos()) {
      setIosHints(true);
      return;
    }

    const promptEvent = getDeferredPwaPrompt();
    if (promptEvent) {
      try {
        // Debe ejecutarse en el mismo gesto del usuario (sin await antes de prompt).
        void promptEvent.prompt();
        void promptEvent.userChoice
          .then((choice) => {
            if (choice.outcome === 'accepted') {
              dismissBanner();
              setVisible(false);
            } else {
              setAndroidHints(true);
            }
          })
          .catch(() => setAndroidHints(true))
          .finally(() => {
            clearDeferredPwaPrompt();
            setCanNativeInstall(false);
          });
      } catch {
        clearDeferredPwaPrompt();
        setCanNativeInstall(false);
        setAndroidHints(true);
      }
      return;
    }

    setAndroidHints(true);
  }, []);

  if (!visible) return null;

  const onIos = isIos();
  const onAndroid = /android/i.test(navigator.userAgent || '');
  const showAndroidSteps = onAndroid && (androidHints || installTried || !canNativeInstall);

  const installLabel = onIos
    ? 'Ver cómo instalar'
    : canNativeInstall
      ? 'Instalar ahora'
      : 'Ver pasos en Chrome';

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[200] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <img src="/origenred-icon.png" alt="" className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-or-navy">Instalá OrigenRed</p>
            <p className="text-sm text-slate-600 mt-1 leading-snug">
              {canNativeInstall
                ? 'Chrome puede instalarla en un toque.'
                : 'Seguí los pasos para agregarla a tu pantalla de inicio.'}
            </p>
            {iosHints && onIos && (
              <ol className="mt-3 text-sm text-slate-700 space-y-1.5 list-decimal list-inside bg-slate-50 rounded-xl p-3">
                <li>En Safari: tocá <strong>Compartir</strong> (cuadrado con flecha)</li>
                <li>Elegí <strong>Agregar a inicio</strong> y confirmá</li>
              </ol>
            )}
            {showAndroidSteps && (
              <ol className="mt-3 text-sm text-slate-700 space-y-1.5 list-decimal list-inside bg-amber-50 border border-amber-100 rounded-xl p-3">
                <li>Abrí el menú <strong>⋮</strong> arriba a la derecha en Chrome</li>
                <li>
                  Tocá <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla de inicio</strong>
                </li>
                <li>Confirmá con <strong>Instalar</strong></li>
              </ol>
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
            className="flex-1 py-3 px-4 rounded-xl bg-or-red text-white text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            {installLabel}
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
