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
  /** Si el dispositivo es Android */
  isAndroid: boolean;
  /** Si debe mostrarse el banner */
  showBanner: boolean;
  /** Dispara el prompt de instalación (solo Android/Desktop) */
  promptInstall: () => Promise<void>;
}

function getIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getIsAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
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

  const isIOS = getIsIOS();
  const isAndroid = getIsAndroid();
  const isStandalone = getIsStandalone();

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onAppInstalled);

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

  // Mostrar banner si NO está instalada (en cualquier plataforma)
  const showBanner = !isInstalled;

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    showBanner,
    promptInstall,
  };
}
