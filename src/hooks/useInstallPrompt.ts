import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallPromptState {
  /** Si el navegador soporta el prompt de instalación (Android/Desktop) */
  isInstallable: boolean;
  /** Si la app ya está instalada */
  isInstalled: boolean;
  /** Si es iOS/Safari (no tiene beforeinstallprompt) */
  isIOS: boolean;
  /** Si debe mostrarse el banner (no está instalado y es instalable o iOS) */
  showBanner: boolean;
  /** Dispara el prompt de instalación (solo Android/Desktop) */
  promptInstall: () => Promise<boolean>;
  /** Descarta el banner para no volver a mostrarlo en esta sesión */
  dismissBanner: () => void;
}

function getIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(userAgent);
}

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isIOS = getIsIOS();
  const isStandalone = getIsStandalone();

  useEffect(() => {
    // Si ya está en modo standalone, está instalada
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar si se instaló después
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    // Detectar cambios en display-mode (instalación desde iOS)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };
    mediaQuery.addEventListener('change', onChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onAppInstalled);
      mediaQuery.removeEventListener('change', onChange);
    };
  }, [isStandalone]);

  const isInstallable = deferredPrompt !== null;
  const showBanner = !isInstalled && !dismissed && (isInstallable || isIOS);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    showBanner,
    promptInstall,
    dismissBanner,
  };
}
