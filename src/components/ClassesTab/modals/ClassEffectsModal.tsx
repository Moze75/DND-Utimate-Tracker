import React, { useEffect, useRef } from 'react';

/* ===========================================================
   Overlay ripple plein écran (effet visuel)
   =========================================================== */

export function ScreenRipple({
  x,
  y,
  onDone,
  duration = 750,
  color = 'rgba(168,85,247,0.28)', // violet 500 ~ #a855f7 avec alpha
  blur = 2,
}: {
  x: number;
  y: number;
  onDone: () => void;
  duration?: number;
  color?: string;
  blur?: number;
}) {
  const circleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // distance max jusqu'à un coin (pour couvrir tout l'écran)
    const dTopLeft = Math.hypot(x - 0, y - 0);
    const dTopRight = Math.hypot(x - w, y - 0);
    const dBottomLeft = Math.hypot(x - 0, y - h);
    const dBottomRight = Math.hypot(x - w, y - h);
    const maxR = Math.max(dTopLeft, dTopRight, dBottomLeft, dBottomRight);

    const finalDiameter = Math.ceil(maxR * 2) + 2 * blur;

    // Position/size fixes, animée via scale
    circle.style.width = `${finalDiameter}px`;
    circle.style.height = `${finalDiameter}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.style.transform = 'translate(-50%, -50%) scale(0.01)';
    circle.style.opacity = '0.75';

    // Déclenche l'animation (scale vers 1 + fadeout)
    const raf = requestAnimationFrame(() => {
      circle.style.transition = `transform ${duration}ms ease-out, opacity ${duration + 100}ms ease-in`;
      circle.style.transform = 'translate(-50%, -50%) scale(1)';
      circle.style.opacity = '0';
    });

    const to = window.setTimeout(() => {
      onDone();
    }, duration + 140);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(to);
    };
  }, [x, y, onDone, duration, blur]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 70, // au-dessus de l'UI
      }}
    >
      {/* Cercle expansif */}
      <div
        ref={circleRef}
        style={{
          position: 'fixed',
          borderRadius: '9999px',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%) scale(0.01)',
          willChange: 'transform, opacity',
          background: `radial-gradient(closest-side, ${color}, rgba(168,85,247,0.18), rgba(168,85,247,0.0))`,
          boxShadow: `0 0 ${blur * 4}px ${color}`,
          opacity: 0,
        }}
      />
    </div>
  );
}

// Helper pour déclencher l'effet ripple depuis un événement
export function createScreenRippleHandler(
  setScreenRipple: (ripple: { x: number; y: number; key: number } | null) => void
) {
  return (ev: React.MouseEvent<HTMLElement>) => {
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    setScreenRipple({ x, y, key: Date.now() });
  };
}