import React, { Suspense, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CharacterExportPayload } from '../types/characterCreator';

// IMPORTANT: adaptez la casse au fichier réel (characterCreationWizard.tsx vs CharacterCreationWizard.tsx)
const CharacterCreationWizard = React.lazy(() =>
  import('../features/character-creator/components/characterCreationWizard').then((m: any) => ({
    default: m.default ?? m.CharacterCreationWizard,
  }))
);

export interface CharacterCreatorModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (payload: CharacterExportPayload) => void;
  title?: string;
}

/**
 * Modal plein écran hébergeant le wizard de création de personnage.
 * - Overlay avec blur, fermable par clic à l’extérieur et touche ESC
 * - Contenu scrollable, body scroll-lock quand ouvert
 * - Animation d’apparition/disparition
 */
export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({
  open,
  onClose,
  onComplete,
  title = 'Assistant de création',
}) => {
  const [enter, setEnter] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Animate + focus + ESC + body scroll lock
  useEffect(() => {
    if (!open) return;

    // petite tempo pour déclencher la transition CSS
    const id = window.setTimeout(() => setEnter(true), 15);

    // focus panel
    const prevActive = document.activeElement as HTMLElement | null;
    panelRef.current?.focus?.();

    // scroll lock
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // ESC close
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(id);
      setEnter(false);
      document.body.style.overflow = prevOverflow || '';
      window.removeEventListener('keydown', onKey);
      // restaurer focus
      prevActive?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    setEnter(false);
    // laisser la transition se jouer
    window.setTimeout(() => onClose(), 180);
  };

  const onOverlayClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay click-to-close */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-150 ${
          enter ? 'opacity-100' : 'opacity-0'
        }`}
        onMouseDown={onOverlayClick}
      />

      {/* Scroll container */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          {/* Panel */}
          <div
            ref={panelRef}
            tabIndex={-1}
            className={`relative w-full max-w-[98vw] md:max-w-[1100px] max-h-[95vh] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl outline-none transform transition-all duration-200 ${
              enter ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
            }`}
            onMouseDown={(e) => {
              // empêcher la fermeture si clic à l'intérieur
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="text-base md:text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content area (scrollable) */}
            <div className="h-[80vh] md:h-[85vh] flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-gray-300 p-8">
                      Chargement de l’assistant de création...
                    </div>
                  }
                >
                  {/* Le wizard doit appeler onFinish(payload) pour remonter les données */}
                  <CharacterCreationWizard onFinish={onComplete} onCancel={handleClose} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreatorModal;