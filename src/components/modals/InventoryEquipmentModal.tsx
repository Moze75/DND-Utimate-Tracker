import React, { useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { InventoryItem } from '../../types/dnd';

/* Types & utils alignés */
type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool' | 'other';
interface WeaponMeta { damageDice: string; damageType: 'Tranchant' | 'Perforant' | 'Contondant'; properties: string; range: string; }
interface ArmorMeta { base: number; addDex: boolean; dexCap?: number | null; label: string; }
interface ShieldMeta { bonus: number; }
interface ItemMeta {
  type: MetaType;
  quantity?: number;
  equipped?: boolean;
  weapon?: WeaponMeta;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
}

const META_PREFIX = '#meta:';
const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
const smartCapitalize = (name: string) => {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
const visibleDescription = (desc: string | null | undefined) => {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
};
function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try { return JSON.parse(metaLine.slice(META_PREFIX.length)); } catch { return null; }
}

export function InventoryEquipmentModal({
  onClose,
  onEquipItem,
  inventory,
  equipmentType,
}: {
  onClose: () => void;
  onEquipItem: (item: InventoryItem) => void;
  inventory: InventoryItem[];
  equipmentType: 'armor' | 'shield';
}) {
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Filtrer les objets du bon type dans l'inventaire
  const availableItems = useMemo(() => {
    return inventory.filter(item => {
      const meta = parseMeta(item.description);
      return meta?.type === equipmentType;
    });
  }, [inventory, equipmentType]);

  // Filtrer par recherche
  const filteredItems = useMemo(() => {
    if (!query.trim()) return availableItems;
    const q = query.trim().toLowerCase();
    return availableItems.filter(item => {
      const name = smartCapitalize(item.name).toLowerCase();
      const desc = visibleDescription(item.description).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [availableItems, query]);

  const getTypeLabel = () => {
    return equipmentType === 'armor' ? 'Armures' : 'Boucliers';
  };

  const getEmptyMessage = () => {
    return equipmentType === 'armor' 
      ? 'Aucune armure dans votre sac' 
      : 'Aucun bouclier dans votre sac';
  };

  const renderItemPreview = (item: InventoryItem) => {
    const meta = parseMeta(item.description);
    if (!meta) return null;

    if (equipmentType === 'armor' && meta.armor) {
      return <div className="text-xs text-gray-400">CA: {meta.armor.label}</div>;
    }
    
    if (equipmentType === 'shield' && meta.shield) {
      return <div className="text-xs text-gray-400">Bonus de bouclier: +{meta.shield.bonus}</div>;
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900 flex flex-col" style={{ height: '100dvh' }}>
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-100 font-semibold text-lg">
              {getTypeLabel()} dans votre sac
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg" aria-label="Fermer">
              <X />
            </button>
          </div>
          
          {availableItems.length > 0 && (
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="input-dark px-3 py-2 rounded-md w-full"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {availableItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm mb-4">{getEmptyMessage()}</div>
              <div className="text-xs text-gray-600">
                Ajoutez des {equipmentType === 'armor' ? 'armures' : 'boucliers'} depuis le sac principal
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-gray-500 text-sm">Aucun résultat pour "{query}"</div>
          ) : (
            filteredItems.map(item => {
              const meta = parseMeta(item.description);
              const qty = meta?.quantity ?? 1;
              const isEquipped = meta?.equipped === true;
              
              return (
                <div key={item.id} className="bg-gray-800/50 border border-gray-700/50 rounded-md">
                  <div className="flex items-start justify-between p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-gray-100 font-medium break-words">
                          {smartCapitalize(item.name)}
                        </h3>
                        {qty > 1 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">
                            x{qty}
                          </span>
                        )}
                        {isEquipped && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-300 border border-green-500/40">
                            Équipé
                          </span>
                        )}
                      </div>
                      {renderItemPreview(item)}
                      {visibleDescription(item.description) && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {visibleDescription(item.description)}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => onEquipItem(item)} 
                      disabled={isEquipped}
                      className={`px-3 py-2 rounded-lg flex items-center gap-1 ${
                        isEquipped 
                          ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                          : 'btn-primary'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {isEquipped ? 'Équipé' : 'Équiper'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}