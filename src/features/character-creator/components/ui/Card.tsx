import React from 'react';
import clsx from 'clsx';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean;
};

export default function Card({ selected = false, className, children, ...rest }: CardProps) {
  return (
    <div className={clsx('relative rounded-xl', className)} {...rest}>
      {/* Liseré magique animé quand sélectionné */}
      {selected && (
        <>
          {/* Anneau externe animé (conic-gradient) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              padding: '2px',
              background:
                'conic-gradient(from 0deg, rgba(239,68,68,0.9), rgba(190,18,60,0.8), rgba(127,29,29,0.9), rgba(239,68,68,0.9))',
              WebkitMask:
                'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor' as any,
              maskComposite: 'exclude' as any,
              animation: 'card-ring-spin 6s linear infinite',
              boxShadow: '0 0 10px rgba(239,68,68,0.25), 0 0 20px rgba(127,29,29,0.25)',
            }}
          />
          {/* Halo doux intérieur pour renforcer l’effet sans masquer le contenu */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl ring-1"
            style={{
              boxShadow:
                'inset 0 0 30px rgba(239,68,68,0.15), inset 0 0 60px rgba(127,29,29,0.12)',
              borderColor: 'rgba(239,68,68,0.35)',
            }}
          />
        </>
      )}

      {/* Contenu de la card */}
      <div
        className={clsx(
          'relative z-10 rounded-xl border transition-colors',
          selected
            ? 'border-red-600/50 bg-gray-900/60'
            : 'border-gray-700/60 bg-gray-900/40 hover:border-gray-600/70'
        )}
      >
        {children}
      </div>

      {/* Keyframes injectées une seule fois par page (le navigateur de-dup) */}
      <style>{`
        @keyframes card-ring-spin {
          0% { transform: rotate(0deg); filter: hue-rotate(0deg); }
          100% { transform: rotate(360deg); filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-4 border-b border-gray-700/50', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-4', className)} {...rest} />;
}