import React, { useRef } from 'react';

type Props = {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  // Optionnel: ajuster le seuil si besoin
  threshold?: number; // en px
};

export const SwipeNavigator: React.FC<Props> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}) => {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    isSwiping.current = false;
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (startX.current == null || startY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    // On ne considère swipe que si l'horizontal domine le vertical
    if (!isSwiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.current = true;
    }

    // Si on a reconnu un swipe horizontal, on peut empêcher le scroll horizontal parasite
    if (isSwiping.current) {
      e.preventDefault();
    }
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (startX.current == null || startY.current == null) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX.current;
    const adx = Math.abs(dx);

    if (isSwiping.current && adx >= threshold) {
      if (dx < 0) {
        // vers la gauche => onglet suivant
        onSwipeLeft?.();
      } else {
        // vers la droite => onglet précédent
        onSwipeRight?.();
      }
    }

    startX.current = null;
    startY.current = null;
    isSwiping.current = false;
  };

  // Bonus: support souris (drag) sur desktop via Pointer Events
  const pStartX = useRef<number | null>(null);
  const pStartY = useRef<number | null>(null);
  const pSwiping = useRef(false);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.pointerType === 'mouse' && e.buttons !== 1) return;
    pStartX.current = e.clientX;
    pStartY.current = e.clientY;
    pSwiping.current = false;
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (pStartX.current == null || pStartY.current == null) return;
    const dx = e.clientX - pStartX.current;
    const dy = e.clientY - pStartY.current;
    if (!pSwiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      pSwiping.current = true;
    }
    if (pSwiping.current) {
      e.preventDefault();
    }
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (pStartX.current == null || pStartY.current == null) return;
    const dx = e.clientX - pStartX.current;
    if (pSwiping.current && Math.abs(dx) >= threshold) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
    pStartX.current = null;
    pStartY.current = null;
    pSwiping.current = false;
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      // Important pour ne pas interférer avec le scroll vertical
      style={{ touchAction: 'pan-y' }}
    >
      {children}
    </div>
  );
};