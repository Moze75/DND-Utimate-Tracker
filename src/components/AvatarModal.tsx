import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AvatarModalProps {
  url: string;
  onClose: () => void;
}

export function AvatarModal({ url, onClose }: AvatarModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalStyle;
      document.head.removeChild(meta);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black touch-none cursor-pointer" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors z-[9999]"
        aria-label="Fermer"
      >
        <X size={24} />
      </button>

      {/* Remplacement de w-screen h-screen par un conteneur qui remplit via inset-0 */}
      <div className="absolute inset-0 flex items-center justify-center" onClick={onClose}>
        <img
          src={url}
          alt="Avatar"
          className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}