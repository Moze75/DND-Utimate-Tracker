import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownLite, type MarkdownCtx } from '../../../lib/markdownLite';
import { AbilitySection, slug, sentenceCase } from './ClassUtilsModal';

/* ===========================================================
   UI: cartes & rendu
   =========================================================== */

export function AbilityCard({
  section,
  defaultOpen,
  ctx,
  disableContentWhileLoading,
}: {
  section: AbilitySection;
  defaultOpen?: boolean;
  ctx: MarkdownCtx;
  disableContentWhileLoading?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const contentId = `ability-${section.origin}-${section.level ?? 'x'}-${slug(section.title)}`;

  // Mesure dynamique pour supprimer toute limite de hauteur lorsqu'ouvert
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(0);

  // Met à jour la hauteur max quand on ouvre/ferme ou quand le contenu change
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (open) {
      // Mesure immédiate
      setMaxHeight(el.scrollHeight);

      // Observe les changements de taille du contenu (Markdown long, images, etc.)
      const ro = new ResizeObserver(() => {
        setMaxHeight(el.scrollHeight);
      });
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      setMaxHeight(0);
    }
  }, [open, section.content]);

  return (
    <article
      className={[
        'rounded-xl border ring-1 ring-black/5 shadow-lg shadow-black/20',
        'border-gray-700/30',
        'bg-gray-800/50', 
      ].join(' ')}
    >
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={contentId} className="w-full text-left">
        <div className="flex items-start gap-3 p-4">
          {/* Étiquette de niveau supprimée pour éviter le doublon */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-base sm:text-lg truncate">{sentenceCase(section.title)}</h3>
              <OriginPill origin={section.origin} />
            </div>
          </div>

          <div className="ml-2 mt-0.5 text-white/80">
            {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Transition sans limite: on anime max-height (en px mesurés) au lieu d'une classe tailwind fixe */}
      <div
        id={contentId}
        className="overflow-hidden transition-[max-height,opacity] duration-300"
        style={{ maxHeight: open ? maxHeight : 0, opacity: open ? 1 : 0 }}
      >
        <div ref={innerRef} className="px-4 pt-1 pb-4">
          {disableContentWhileLoading ? (
            <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
          ) : (
            <div className="text-sm text-white/90 leading-relaxed space-y-2">
              <MarkdownLite
                text={section.content}
                ctx={{
                  ...ctx,
                  section: { level: Number(section.level) || 0, origin: section.origin, title: section.title },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function OriginPill({ origin }: { origin: 'class' | 'subclass' }) {
  const isClass = origin === 'class';
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset',
        isClass ? 'bg-violet-500/15 text-violet-200 ring-violet-400/25' : 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
      ].join(' ')}
    >
      {isClass ? 'Classe' : 'Sous-classe'}
    </span>
  );
}