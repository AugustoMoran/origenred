export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const READY_EVENT = 'origenred-pwa-install-ready';

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const capturePwaInstallPromptEarly = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(READY_EVENT));
  });
};

export const getDeferredPwaPrompt = () => deferredPrompt;

export const clearDeferredPwaPrompt = () => {
  deferredPrompt = null;
};

export const onPwaInstallReady = (handler: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(READY_EVENT, handler);
  return () => window.removeEventListener(READY_EVENT, handler);
};
