import React, { useRef, useCallback } from 'react';

type Props = {
  index: number;
  setIndex: (i: number) => void;
  count: number;
  wrap?: boolean; // true pour boucler (par défaut)
  thresholdPx?: number; // distance min horizontale pour valider le swipe (par défaut 48px)
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function SwipeNavigator({
  index,
  setIndex,
  count,
  wrap = true,
  thresholdPx = 48,
  children,
  className,
  style,
}: Props) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const goto = useCallback((next: number) => {
    if (wrap) {
      const n = (next + count) % count;
      setIndex(n);
    } else {
      const n = Math.max(0, Math.min(count - 1, next));
      if (n !== index) setIndex(n);
    }
  }, [count, index, setIndex, wrap]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Uniquement le pointeur primaire pour éviter conflits multitouch
    if (!(e.isPrimary ?? true)) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    isSwiping.current = false;
    // Capture pour continuer à recevoir les events même si on sort du conteneur
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Si le mouvement vertical domine, on laisse défiler la page
    if (Math.abs(dy) > Math.abs(dx)) return;

    // Dès qu'on identifie un glissé horizontal, on peut empêcher le scroll horizontal côté navigateur
    if (Math.abs(dx) > 10) {
      isSwiping.current = true;
      // Optionnel: e.preventDefault(); // à activer si des scrolls horizontaux perturbent
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current == null || startY.current == null) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    const horizontal = Math.abs(dx) > Math.abs(dy);
    const passed = Math.abs(dx) >= thresholdPx;

    if (horizontal && passed) {
      if (dx < 0) {
        // swipe vers la gauche → onglet suivant
        goto(index + 1);
      } else {
        // swipe vers la droite → onglet précédent
        goto(index - 1);
      }
    }

    startX.current = null;
    startY.current = null;
    isSwiping.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goto(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goto(index + 1);
    }
  };

  return (
    <div
      // Important: autorise le scroll vertical natif, bloque le zoom-pan horizontal
      style={{ touchAction: 'pan-y', ...style }}
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      role="region"
      tabIndex={0} // permet la navigation clavier si le conteneur a le focus
      aria-label="Navigation par glissement entre onglets"
    >
      {children}
    </div>
  );
}