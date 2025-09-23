import React from 'react';

type Props = {
  index: number; // index courant (contrôlé)
  onIndexChange: (i: number) => void; // appelé quand un swipe valide veut changer d'onglet
  count: number; // nombre total de pages
  renderPage: (i: number) => React.ReactNode; // rend une page pour un index donné
  wrap?: boolean; // boucler premier/dernier (par défaut true)
  thresholdPx?: number; // distance min pour valider un swipe (par défaut 48)
  durationMs?: number; // durée de l’anim (par défaut 240)
  className?: string;
  style?: React.CSSProperties;
};

const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export function SwipePager({
  index,
  onIndexChange,
  count,
  renderPage,
  wrap = true,
  thresholdPx = 48,
  durationMs = 240,
  className,
  style,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const currentRef = React.useRef<HTMLDivElement | null>(null);
  const nextRef = React.useRef<HTMLDivElement | null>(null);

  const [displayIndex, setDisplayIndex] = React.useState(index);
  const prevIndexRef = React.useRef(index);
  const [width, setWidth] = React.useState(0);
  const [height, setHeight] = React.useState<number | 'auto'>('auto');

  const [dragX, setDragX] = React.useState(0);
  const [dir, setDir] = React.useState<0 | 1 | -1>(0);
  const [dragging, setDragging] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);
  const [animTargetX, setAnimTargetX] = React.useState<number | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);
  const startXRef = React.useRef<number | null>(null);
  const startYRef = React.useRef<number | null>(null);
  const decidedRef = React.useRef(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setWidth(w);
      if (!dragging && !animating) {
        setDragX(0);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [dragging, animating]);

  const neighborIndex = React.useMemo(() => {
    if (dir === 0) return null;
    const step = dir;
    if (wrap) {
      return (displayIndex + step + count) % count;
    }
    const raw = displayIndex + step;
    if (raw < 0 || raw > count - 1) return null;
    return raw;
  }, [dir, displayIndex, count, wrap]);

  const lockHeightToContent = React.useCallback(() => {
    const h1 = currentRef.current?.offsetHeight ?? 0;
    const h2 = nextRef.current?.offsetHeight ?? 0;
    const h = Math.max(h1, h2);
    setHeight(h);
  }, []);

  const unlockHeight = React.useCallback(() => setHeight('auto'), []);

  const animateTo = React.useCallback((targetX: number, onDone?: () => void) => {
    if (!trackRef.current) return;
    setAnimating(true);
    setAnimTargetX(targetX);
    lockHeightToContent();

    const handle = () => {
      setAnimating(false);
      setAnimTargetX(null);
      setDragX(0);
      setDir(0);
      unlockHeight();
      onDone?.();
    };

    const timer = window.setTimeout(handle, durationMs + 40);
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      clearTimeout(timer);
      handle();
    };
    trackRef.current.addEventListener('transitionend', onEnd, { once: true });
  }, [durationMs, lockHeightToContent, unlockHeight]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (count <= 1) return;
    if (!(e.isPrimary ?? true)) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    decidedRef.current = false;
    setDragging(true);
    setAnimTargetX(null);
    setAnimating(false);
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;

    const sx = startXRef.current;
    const sy = startYRef.current;
    if (sx == null || sy == null) return;

    const dx = e.clientX - sx;
    const dy = e.clientY - sy;

    if (!decidedRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decidedRef.current = true;
      if (Math.abs(dy) > Math.abs(dx)) {
        setDragging(false);
        startXRef.current = null;
        startYRef.current = null;
        pointerIdRef.current = null;
        return;
      }
      setDir(dx < 0 ? 1 : -1);
    }

    const hasNeighbor = neighborIndex != null;
    const effDx = hasNeighbor ? dx : dx * 0.2;
    setDragX(effDx);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const sx = startXRef.current ?? 0;
    const dx = e.clientX - sx;

    const commit = Math.abs(dx) >= thresholdPx && neighborIndex != null;
    const baseX = dir === -1 ? -width : 0;

    if (commit) {
      const targetX = dir === 1 ? -width : 0;
      animateTo(targetX, () => {
        const next = wrap
          ? (displayIndex + dir + count) % count
          : Math.max(0, Math.min(count - 1, displayIndex + dir));
        onIndexChange(next);
        setDisplayIndex(next);
      });
    } else {
      animateTo(baseX);
    }

    setDragging(false);
    startXRef.current = null;
    startYRef.current = null;
    pointerIdRef.current = null;
  };

  React.useEffect(() => {
    const prev = prevIndexRef.current;
    if (index === prev) return;
    if (dragging || animating) return;

    const forward = ((index - prev + count) % count);
    const backward = ((prev - index + count) % count);
    let sign: 1 | -1 = 1;
    if (forward === 0) return;
    if (forward <= backward) sign = 1;
    else sign = -1;

    setDir(sign);
    setDisplayIndex(prev);
    setDragX(0);

    const targetX = sign === 1 ? -width : 0;
    lockHeightToContent();
    requestAnimationFrame(() => {
      setAnimating(true);
      setAnimTargetX(targetX);
      const handleDone = () => {
        setAnimating(false);
        setAnimTargetX(null);
        setDragX(0);
        setDir(0);
        setDisplayIndex(index);
        unlockHeight();
      };
      const timer = window.setTimeout(handleDone, durationMs + 40);
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== 'transform') return;
        clearTimeout(timer);
        handleDone();
      };
      trackRef.current?.addEventListener('transitionend', onEnd, { once: true });
    });

    prevIndexRef.current = index;
  }, [index, count, width, dragging, animating, durationMs, lockHeightToContent, unlockHeight]);

  React.useEffect(() => {
    prevIndexRef.current = index;
  }, [index]);

  const baseX = dir === -1 ? -width : 0;
  const trackX = animTargetX != null ? animTargetX : baseX + (dragging ? dragX : 0);
  const trackTransition = animTargetX != null ? `transform ${durationMs}ms ${EASING}` : 'none';

  const currentSlide = (
    <div ref={currentRef} className="w-full shrink-0">
      {renderPage(displayIndex)}
    </div>
  );
  const neighborSlide =
    neighborIndex != null ? (
      <div ref={nextRef} className="w-full shrink-0">
        {renderPage(neighborIndex)}
      </div>
    ) : (
      <div ref={nextRef} className="w-full shrink-0" />
    );

  const slides =
    dir === -1 ? (
      <>
        {neighborSlide}
        {currentSlide}
      </>
    ) : (
      <>
        {currentSlide}
        {neighborSlide}
      </>
    );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: 'hidden',
        position: 'relative',
        height: typeof height === 'number' ? `${height}px` : height,
        transition: `height ${durationMs}ms ${EASING}`,
        touchAction: 'pan-y',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        ref={trackRef}
        className="flex"
        style={{
          width: width * 2,
          transform: `translate3d(${trackX}px, 0, 0)`,
          transition: trackTransition,
          userSelect: dragging ? 'none' : undefined,
          willChange: 'transform',
        }}
      >
        {slides}
      </div>
    </div>
  );
}