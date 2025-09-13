import { useState, useEffect } from 'react';

// Hook pour charger dynamiquement des modules
export function useModuleLoader<T>(modulePath: string): { 
  module: T | null; 
  loading: boolean; 
  error: Error | null 
} {
  const [module, setModule] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadModule = async () => {
      try {
        setLoading(true);
        // Utilisation de import() dynamique pour charger le module à la demande
        const importedModule = await import(`../modules/${modulePath}`);
        setModule(importedModule as T);
        setError(null);
      } catch (err) {
        console.error(`Erreur lors du chargement du module ${modulePath}:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadModule();
  }, [modulePath]);

  return { module, loading, error };
}