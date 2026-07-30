import { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallBanner() {
  const { showBanner, isIOS, promptInstall, dismissBanner } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (showBanner) {
      // Pequeño delay para que aparezca después de cargar la página
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [showBanner]);

  if (!visible) return null;

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setVisible(false);
      setIsAnimatingOut(false);
      dismissBanner();
    }, 300);
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setVisible(false);
    }
  };

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto transition-all duration-300 ${
        isAnimatingOut ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 p-5">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-purple-100 rounded-xl p-2.5">
            <Smartphone className="w-6 h-6 text-purple-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">
              Instala BoulderHub
            </h3>

            {isIOS ? (
              <div className="mt-2">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Agrega BoulderHub a tu pantalla de inicio para usarlo como una app nativa:
                </p>
                <ol className="mt-2 space-y-1 text-xs text-gray-600 list-decimal list-inside">
                  <li>Toca el botón <strong>Compartir</strong> <span className="text-sm">⎙</span></li>
                  <li>Desplázate y selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
                  <li>Confirma tocando <strong>"Agregar"</strong></li>
                </ol>
                <button
                  onClick={handleDismiss}
                  className="mt-3 w-full py-2 px-4 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 active:bg-purple-800 transition-colors"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Instala la app en tu dispositivo para un acceso más rápido y una experiencia mejorada.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-3 w-full py-2.5 px-4 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-lg shadow-purple-200"
                >
                  Instalar app
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
