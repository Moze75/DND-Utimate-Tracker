import React from 'react';

type Props = {
  index: number;
  onIndexChange: (i: number) => void;
  count: number;
  renderPage: (i: number) => React.ReactNode;
  wrap?: boolean;
  thresholdPx?: number;
  durationMs?: number;
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
  const touchIdRef = React.useRef<number | null>(null);
  const startXRef = React.useRef<number | null>(null);
  const startYRef = React.useRef<number | null>(null);
  const decidedRef = React.useRef(false);

  const SUPPORTS_POINTER = typeof window !== 'undefined' && 'PointerEvent' in window;

  // Init width at mount to avoid 0px first paint
  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) {
      setWidth(el.clientWidth || window.innerWidth);
    }
  }, []);

  // Keep width in sync on resize
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

  const animateTo = React.useCallback(
    (targetX: number, onDone?: () => void) => {
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
    },
    [durationMs, lockHeightToContent, unlockHeight]
  );

  // Unified drag helpers
  const startDrag = React.useCallback((x: number, y: number) => {
    if (count <= 1) return;
    startXRef.current = x;
    startYRef.current = y;
    decidedRef.current = false;
    setDragging(true);
    setAnimTargetX(null);
    setAnimating(false);
  }, [count]);

  const moveDrag = React.useCallback((x: number, y: number) => {
    if (!dragging) return;

    const sx = startXRef.current;
    const sy = startYRef.current;
    if (sx == null || sy == null) return;

    const dx = x - sx;
    const dy = y - sy;

    if (!decidedRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decidedRef.current = true;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical scroll: abort drag
        setDragging(false);
        startXRef.current = null;
        startYRef.current = null;
        pointerIdRef.current = null;
        touchIdRef.current = null;
        return;
      }
      setDir(dx < 0 ? 1 : -1);
    }

    const hasNeighbor = neighborIndex != null;
    const effDx = hasNeighbor ? dx : dx * 0.2;
    setDragX(effDx);
  }, [dragging, neighborIndex]);

  const endDrag = React.useCallback((x: number) => {
    if (!dragging) return;
    const sx = startXRef.current ?? 0;
    const dx = x - sx;

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
    touchIdRef.current = null;
  }, [dragging, thresholdPx, neighborIndex, dir, width, animateTo, wrap, displayIndex, count, onIndexChange]);

  // Pointer events
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!SUPPORTS_POINTER) return;
    if (count <= 1) return;
    if (!(e.isPrimary ?? true)) return;
    pointerIdRef.current = e.pointerId;
    startDrag(e.clientX, e.clientY);
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!SUPPORTS_POINTER) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    moveDrag(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!SUPPORTS_POINTER) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    endDrag(e.clientX);
  };

  // Mouse fallback
  React.useEffect(() => {
    if (SUPPORTS_POINTER) return;
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = (e: MouseEvent) => endDrag(e.clientX);
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp, { once: true });
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [dragging, moveDrag, endDrag, SUPPORTS_POINTER]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (SUPPORTS_POINTER) return;
    if (count <= 1) return;
    startDrag(e.clientX, e.clientY);
  };

  // Touch fallback
  React.useEffect(() => {
    if (SUPPORTS_POINTER) return;
    const onTouchMove = (e: TouchEvent) => {
      if (touchIdRef.current == null) return;
      const t = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      const anyT = t ?? e.changedTouches[0];
      if (!anyT) return;
      moveDrag(anyT.clientX, anyT.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchIdRef.current == null) return;
      const t = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      const anyT = t ?? e.changedTouches[0];
      endDrag(anyT?.clientX ?? 0);
    };
    if (dragging) {
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd, { once: true });
      window.addEventListener('touchcancel', onTouchEnd, { once: true });
      return () => {
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
      };
    }
  }, [dragging, moveDrag, endDrag, SUPPORTS_POINTER]);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (SUPPORTS_POINTER) return;
    if (count <= 1) return;
    const t = e.changedTouches[0];
    if (!t) return;
    touchIdRef.current = t.identifier;
    startDrag(t.clientX, t.clientY);
  };

  // React to external index changes (clicks on tabs)
  React.useEffect(() => {
    const prev = prevIndexRef.current;
    if (index === prev) return;
    if (dragging || animating) return;

    const forward = (index - prev + count) % count;
    const backward = (prev - index + count) % count;
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

  // Update prevIndexRef when index changes
  React.useEffect(() => {
    prevIndexRef.current = index;
  }, [index]);

  // Styles de sécurité pour éviter tout débordement
  const slideStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 0,            // autorise le contenu à rétrécir dans un flex
    overflow: 'hidden',     // coupe tout débordement horizontal
    boxSizing: 'border-box' // inclut padding/border dans la largeur
  };

  const pageWrapperStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    overflowX: 'hidden'
  };

  const baseX = dir === -1 ? -width : 0;
  const trackX = animTargetX != null ? animTargetX : baseX + (dragging ? dragX : 0);
  const trackTransition = animTargetX != null ? `transform ${durationMs}ms ${EASING}` : 'none';

  const currentSlide = (
    <div ref={currentRef} style={slideStyle} className="w-full shrink-0 min-w-0 overflow-hidden">
      <div style={pageWrapperStyle} className="min-w-0 max-w-full overflow-x-hidden">
        {renderPage(displayIndex)}
      </div>
    </div>
  );
  const neighborSlide =
    neighborIndex != null ? (
      <div ref={nextRef} style={slideStyle} className="w-full shrink-0 min-w-0 overflow-hidden">
        <div style={pageWrapperStyle} className="min-w-0 max-w-full overflow-x-hidden">
          {renderPage(neighborIndex)}
        </div>
      </div>
    ) : (
      <div ref={nextRef} style={slideStyle} className="w-full shrink-0 min-w-0 overflow-hidden" />
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
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        transition: `height ${durationMs}ms ${EASING}`,
        touchAction: 'pan-y',
        boxSizing: 'border-box',
        contain: 'layout paint',
        cursor: dragging ? 'grabbing' : undefined,
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <div
        ref={trackRef}
        className="flex"
        style={{
          width: '200%',                   // 2 slides côte à côte
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

export default SwipePager;