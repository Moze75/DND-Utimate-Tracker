import React, { useEffect, useMemo, useRef, useState } from 'react';

type Direction = -1 | 1; // -1 = vers gauche (précédent), 1 = vers droite (suivant)

type Props<Key extends string> = {
  activeKey: Key;
  prevKey: Key | null;
  nextKey: Key | null;
  renderPane: (key: Key) => React.ReactNode;
  thresholdRatio?: number;
  onCommit: (nextKey: Key) => void;
};

function freezeScroll(): number {
  const y = window.scrollY || window.pageYOffset || 0;
  const body = document.body;
  (body as any).__scrollY = y;
  body.style.position = 'fixed';
  body.style.top = `-${y}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflowY = 'scroll';
  return y;
}
function unfreezeScroll() {
  const body = document.body;
  const y = (body as any).__scrollY || 0;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflowY = '';
  window.scrollTo(0, y);
  delete (body as any).__scrollY;
}
function stabilizeScroll(y: number, durationMs = 350) {
  const start = performance.now();
  const tick = (now: number) => {
    window.scrollTo(0, y);
    if (now - start < durationMs) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function SwipeTabsOverlay<Key extends string>({
  activeKey,
  prevKey,
  nextKey,
  renderPane,
  onCommit,
  thresholdRatio = 0.25,
}: Props<Key>) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const neighborRef = useRef<HTMLDivElement | null>(null);

  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [containerH, setContainerH] = useState<number | undefined>(undefined);

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const swipingRef = useRef(false);
  const widthRef = useRef(0);
  const dragStartScrollYRef = useRef(0);

  // Nouveau: on “verrouille” le voisin visible pendant l’animation
  const [latchedNeighbor, setLatchedNeighbor] = useState<'prev' | 'next' | null>(null);

  const measureCurrentHeight = () => {
    const h = currentRef.current?.offsetHeight ?? 0;
    if (h) setContainerH(h);
  };

  useEffect(() => {
    measureCurrentHeight();
    const onRz = () => {
      widthRef.current = viewportRef.current?.clientWidth ?? widthRef.current;
      measureCurrentHeight();
    };
    window.addEventListener('resize', onRz);
    const id = window.setTimeout(measureCurrentHeight, 0);
    return () => {
      window.removeEventListener('resize', onRz);
      window.clearTimeout(id);
    };
  }, [activeKey]);

  useEffect(() => {
    if (!neighborRef.current || !currentRef.current) return;
    const ch = currentRef.current.offsetHeight ?? 0;
    const nh = neighborRef.current.offsetHeight ?? 0;
    if (ch && nh) {
      setContainerH(Math.max(ch, nh));
    }
  }, [dragX]);

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.pointerType === 'mouse' && e.buttons !== 1) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    swipingRef.current = false;
    setAnimating(false);
    setLatchedNeighbor(null);
    viewportRef.current?.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (startXRef.current == null || startYRef.current == null) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!swipingRef.current && Math.abs(dx) > 10 && Math.abs(Math.abs(dx) - Math.abs(dy)) > 4) {
      swipingRef.current = true;
      dragStartScrollYRef.current = freezeScroll();
      widthRef.current = viewportRef.current?.clientWidth ?? widthRef.current;
    }
    if (!swipingRef.current) return;

    e.preventDefault();

    let clamped = dx;
    if (!prevKey && clamped > 0) clamped = 0;
    if (!nextKey && clamped < 0) clamped = 0;

    // Mémorise le voisin en vue pour l’animation
    if (clamped > 0 && prevKey) {
      if (latchedNeighbor !== 'prev') setLatchedNeighbor('prev');
    } else if (clamped < 0 && nextKey) {
      if (latchedNeighbor !== 'next') setLatchedNeighbor('next');
    }

    setDragX(clamped);
  };

  const animateTo = (toPx: number, cb?: () => void) => {
    setAnimating(true);      // activer l’anim AVANT de changer dragX
    setDragX(toPx);
    window.setTimeout(() => {
      setAnimating(false);
      cb?.();
      setLatchedNeighbor(null); // libérer le voisin après l’anim
    }, 310);
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    if (startXRef.current == null || startYRef.current == null) return;

    if (swipingRef.current) {
      const width = widthRef.current || (viewportRef.current?.clientWidth ?? 0);
      const threshold = Math.max(48, width * thresholdRatio);

      const commit = (dir: Direction) => {
        const toPx = dir === 1 ? -width : width;
        animateTo(toPx, () => {
          const next = dir === 1 ? nextKey : prevKey;
          if (next) onCommit(next);
          setDragX(0);
          unfreezeScroll();
          stabilizeScroll(dragStartScrollYRef.current, 400);
        });
      };

      const cancel = () => {
        animateTo(0, () => {
          unfreezeScroll();
          stabilizeScroll(dragStartScrollYRef.current, 300);
        });
      };

      if (dragX <= -threshold && nextKey) {
        commit(1);
      } else if (dragX >= threshold && prevKey) {
        commit(-1);
      } else {
        cancel();
      }
    }

    startXRef.current = null;
    startYRef.current = null;
    swipingRef.current = false;
  };

  // Pendant le drag: selon dragX ; pendant l’animation: garder latchedNeighbor
  const neighborType: 'prev' | 'next' | null = useMemo(() => {
    if (dragX > 0 && prevKey) return 'prev';
    if (dragX < 0 && nextKey) return 'next';
    if (animating) return latchedNeighbor;
    return null;
  }, [dragX, prevKey, nextKey, animating, latchedNeighbor]);

  const currentTransform = `translate3d(${dragX}px, 0, 0)`;
  const neighborTransform =
    neighborType === 'next'
      ? `translate3d(calc(100% + ${dragX}px), 0, 0)`
      : neighborType === 'prev'
      ? `translate3d(calc(-100% + ${dragX}px), 0, 0)`
      : undefined;

  const classAnim = animating ? 'sv-anim' : '';

  return (
    <div
      ref={viewportRef}
      className="sv-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ height: containerH }}
    >
      <div
        ref={currentRef}
        className={`sv-pane ${classAnim}`}
        style={{ transform: currentTransform }}
      >
        {renderPane(activeKey)}
      </div>

      {neighborType && (
        <div
          ref={neighborRef}
          className={`sv-pane ${classAnim} sv-neighbor`}
          style={{ transform: neighborTransform }}
        >
          {neighborType === 'next' && nextKey ? renderPane(nextKey) : null}
          {neighborType === 'prev' && prevKey ? renderPane(prevKey) : null}
        </div>
      )}
    </div>
  );
}