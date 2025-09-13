import React, { useState, useEffect, Suspense } from 'react';

// Hook pour charger paresseusement un composant
export function useLazyComponent(importFunc: () => Promise<any>, fallback: React.ReactNode = null) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadComponent = async () => {
      try {
        const module = await importFunc();
        if (isMounted) {
          // Récupère le composant par défaut ou le premier export nommé
          const Component = module.default || Object.values(module)[0];
          setComponent(() => Component);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du composant:', error);
      }
    };

    loadComponent();
    
    return () => {
      isMounted = false;
    };
  }, [importFunc]);

  // Renvoie un composant qui charge paresseusement le composant demandé
  const LazyComponent = (props: any) => {
    if (!Component) {
      return <>{fallback}</>;
    }

    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };

  return LazyComponent;
}