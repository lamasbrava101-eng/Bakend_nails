import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isSafari = /safari/i.test(ua);
  const isOther = /crios|fxios|chrome|chromium|edg|opr|android/i.test(ua);
  return isSafari && !isOther;
}

export function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [iosEligible, setIosEligible] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIosEligible(isIOSDevice() && isSafariBrowser() && !isStandalone());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => {
      if (media.matches) setInstalled(true);
    };
    media.addEventListener?.('change', onChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      media.removeEventListener?.('change', onChange);
    };
  }, []);

  if (installed) return null;

  const canPrompt = !!deferredPrompt;
  const showButton = canPrompt || iosEligible;
  if (!showButton) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        // ignore
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }
    if (iosEligible) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full bg-[#F2DFD8] border border-[#C59B76] text-[#3E2723] font-semibold text-sm hover:bg-[#E8D0C8] transition-colors"
        aria-label="Instalar App"
      >
        <span aria-hidden="true">📲</span>
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setShowIOSModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Instrucciones para instalar"
        >
          <div
            className="w-full max-w-md bg-[#FAF5F0] rounded-2xl shadow-soft border border-[#C59B76]/40 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#5D4742] font-serif">Instalar Nb_nails</h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-[#3E2723] hover:text-[#C59B76] text-xl px-2 min-h-[44px]"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-[#5D4742]">
              Agrega la app a tu pantalla de inicio en iPhone/iPad:
            </p>
            <ol className="space-y-3 text-sm text-[#5D4742]">
              <li className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#C59B76] text-white font-semibold flex items-center justify-center">1</span>
                <span>
                  Toca el ícono <strong>Compartir</strong>{' '}
                  <span className="inline-block align-middle" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span>{' '}
                  en la barra de Safari.
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#C59B76] text-white font-semibold flex items-center justify-center">2</span>
                <span>Desliza y elige <strong>“Agregar a pantalla de inicio”</strong>.</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-[#C59B76] text-white font-semibold py-2.5 rounded-lg min-h-[44px] hover:bg-[#B8895E] transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}