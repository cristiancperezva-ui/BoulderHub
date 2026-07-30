import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Smartphone, X, Download } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallBanner() {
  const { user } = useAuth();
  const { isInstalled, isInstallable, isIOS, isAndroid, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Mostrar banner cuando el usuario inicia sesión (si no está instalada)
  useEffect(() => {
    if (user && !isInstalled) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    if (isInstalled) {
      setVisible(false);
    }
  }, [user, isInstalled]);

  // Si no hay usuario logueado o ya está instalada, no mostrar nada
  if (!user || isInstalled || !visible) return null;

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setVisible(false);
      setIsAnimatingOut(false);
    }, 300);
  };

  const handleInstall = async () => {
    await promptInstall();
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
            <p className="mt-1 text-xs text-gray-600 leading-relaxed">
              Accede más rápido desde tu pantalla de inicio con una experiencia tipo app nativa.
            </p>

            {isIOS ? (
              /* ── iOS: solo instructivo manual ── */
              <div className="mt-3">
                <ol className="space-y-1.5 text-xs text-gray-600 list-decimal list-inside">
                  <li>Toca el botón <strong>Compartir</strong> <span className="text-sm">⎙</span> en Safari</li>
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
            ) : isInstallable ? (
              /* ── Android/Desktop: botón de instalación nativo ── */
              <div className="mt-3">
                <button
                  onClick={handleInstall}
                  className="w-full py-2.5 px-4 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-lg shadow-purple-200"
                >
                  <Download size={16} className="inline mr-1.5" style={{ verticalAlign: 'middle' }} />
                  Instalar app
                </button>
                <p className="mt-1.5 text-xs text-gray-400 text-center">
                  También puedes instalarla desde el menú del navegador
                </p>
              </div>
            ) : (
              /* ── Android/Desktop sin beforeinstallprompt: instructivo manual ── */
              <div className="mt-3">
                <p className="text-xs text-gray-600 leading-relaxed mb-2">
                  {isAndroid ? (
                    <>Abre Chrome, toca los tres puntos <strong>⁝</strong> y selecciona <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>.</>
                  ) : (
                    <>En Chrome o Edge, haz clic en el icono de instalación <Download size={12} className="inline" /> en la barra de direcciones o en el menú <strong>⋮</strong> → <strong>"Instalar BoulderHub"</strong>.</>
                  )}
                </p>
                <button
                  onClick={handleDismiss}
                  className="w-full py-2 px-4 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 active:bg-purple-800 transition-colors"
                >
                  Entendido
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
