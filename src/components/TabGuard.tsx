import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * TabGuard empêche tout débordement horizontal de l'onglet.
 * - Force min-width:0 et max-width:100% pour autoriser la réduction
 * - Coupe le débordement horizontal (overflow-x:hidden)
 * - Isole la mise en page pour éviter les effets de bords
 */
export default function TabGuard({ children, className, style }: Props) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        contain: 'layout paint',
        ...style,
      }}
    >
      <div
        className="min-w-0 w-full max-w-full overflow-x-hidden"
        style={{ boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </div>
  );
}