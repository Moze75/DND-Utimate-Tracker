import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AvatarModalProps {
  url: string;
  onClose: () => void;
}

export function AvatarModal({ url, onClose }: AvatarModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    // Empêche le défilement et le zoom sur mobile
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    // Désactive le zoom sur mobile
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);
    
    // Ajoute l'écouteur d'événement pour la touche Escape
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      // Restaure les paramètres originaux
      document.body.style.overflow = originalStyle;
      document.head.removeChild(meta);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] bg-black touch-none cursor-pointer"
      onClick={onClose}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors z-[9999]"
        aria-label="Fermer"
      >
        <X size={24} />
      </button>

      <div className="w-screen h-screen flex items-center justify-center p-4 md:p-8" onClick={onClose}>
        <img
          src={url}
          alt="Avatar"
          className="w-auto h-auto object-contain select-none max-w-[min(92vw,500px)] max-h-[min(85vh,500px)]"
          draggable={false}
        />
      </div>
    </div>
  );

  // Utilise un portail pour monter le modal directement sous body
  return createPortal(modalContent, document.body);
}