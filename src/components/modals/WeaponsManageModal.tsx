import React from 'react';
import { X, Check, Sword } from 'lucide-react';
import { InventoryItem } from '../../types/dnd';

const META_PREFIX = '#meta:';

type WeaponMeta = {
  damageDice: string;
  damageType: 'Tranchant' | 'Perforant' | 'Contondant';
  properties: string;
  range: string;
};
type ItemMeta = {
  type: 'weapon' | string;
  equipped?: boolean;
  weapon?: WeaponMeta;
  quantity?: number;
};

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try { return JSON.parse(metaLine.slice(META_PREFIX.length)); } catch { return null; }
}
function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter(l => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}
function smartCapitalize(s: string) {
  const base = (s || '').trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function WeaponsManageModal({
  inventory,
  onClose,
  onEquip,
  onUnequip,
}: {
  inventory: InventoryItem[];
  onClose: () => void;
  onEquip: (item: InventoryItem) => Promise<void> | void;
  onUnequip: (item: InventoryItem) => Promise<void> | void;
}) {
  const [q, setQ] = React.useState('');
  const [pendingId, setPendingId] = React.useState<string | null>(null); // évite les doubles clics
  
  const weapons = React.useMemo(() => {
    return inventory
      .map(it => ({ it, meta: parseMeta(it.description) }))
      .filter(({ meta }) => (meta?.type === 'weapon'));
  }, [inventory]);

  const equipped = weapons.filter(w => w.meta?.equipped);
  const others = weapons.filter(w => !w.meta?.equipped);

  const filterByQuery = (arr: { it: InventoryItem; meta: ItemMeta | null }[]) => {
    const query = q.trim().toLowerCase();
    if (!query) return arr;
    return arr.filter(({ it, meta }) => {
      const name = (it.name || '').toLowerCase();
      const desc = visibleDescription(it.description).toLowerCase();
      const props = (meta?.weapon?.properties || '').toLowerCase();
      return name.includes(query) || desc.includes(query) || props.includes(query);
    });
  };

  const Section = ({ title, list }: { title: string; list: { it: InventoryItem; meta: ItemMeta | null }[] }) => (
    <div className="space-y-2">
      <h4 className="text-gray-200 font-semibold text-sm">{title}</h4>
      {list.length === 0 ? (
        <div className="text-sm text-gray-500">Aucune arme</div>
      ) : (
        list.map(({ it, meta }) => {
          const w = meta?.weapon;
          const isPending = pendingId === it.id;
          return (
            <div key={it.id} className="rounded-md border border-gray-700/50 bg-gray-800/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sword size={16} className="text-red-400 shrink-0" />
                    <div className="font-medium text-gray-100 truncate">{smartCapitalize(it.name)}</div>
                  </div>
                  {w && (
                    <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                      <div>Dés: {w.damageDice} {w.damageType}</div>
                      {w.properties && <div>Propriété: {w.properties}</div>}
                      {w.range && <div>Portée: {w.range}</div>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {meta?.equipped ? (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isPending) return;
                        setPendingId(it.id);
                        try { 
                          await onUnequip(it); 
                        } catch (error) {
                          console.error('Erreur déséquipement:', error);
                        } finally { 
                          setPendingId(null); 
                        }
                      }}
                      disabled={isPending}
                      className={`px-2 py-1 rounded text-xs border ${
                        isPending 
                          ? 'border-gray-500 text-gray-500 bg-gray-800/50 cursor-not-allowed'
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'
                      }`}
                      title={isPending ? "Traitement en cours..." : "Déséquiper"}
                    >
                      {isPending ? 'En cours...' : 'Déséquiper'}
                    </button>
                  ) : (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isPending) return;
                        setPendingId(it.id);
                        try { 
                          await onEquip(it); 
                        } catch (error) {
                          console.error('Erreur équipement:', error);
                        } finally { 
                          setPendingId(null); 
                        }
                      }}
                      disabled={isPending}
                      className={`px-2 py-1 rounded text-xs border ${
                        isPending 
                          ? 'border-gray-500 text-gray-500 bg-gray-800/50 cursor-not-allowed'
                          : 'border-green-500/40 text-green-300 bg-green-900/20 hover:border-green-400/60'
                      }`}
                      title={isPending ? "Traitement en cours..." : "Équiper"}
                    >
                      {isPending ? 'En cours...' : (
                        <>
                          <Check size={12} /> Équiper
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[10050]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fixed inset-0 bg-black/70" />
      {/* Conteneur centré */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 rounded-lg border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between p-3 border-b border-gray-800 sticky top-0 bg-gray-900/95">
          <h3 className="text-gray-100 font-semibold">Mes armes</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg" aria-label="Fermer">
            <X />
          </button>
        </div>

        <div className="p-3 space-y-4">
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une arme (nom, description, propriété)…"
              className="input-dark px-3 py-2 rounded-md w-full"
            />
          </div>

          <Section title="Armes équipées" list={filterByQuery(equipped)} />
          <Section title="Autres armes dans le sac" list={filterByQuery(others)} />
        </div>
      </div>
    </div>
  );
}