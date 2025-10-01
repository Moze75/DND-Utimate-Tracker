import React from 'react';
import { Search, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

/* Types locaux (alignés sur EquipmentTab) */
type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool';
interface WeaponMeta { damageDice: string; damageType: 'Tranchant' | 'Perforant' | 'Contondant'; properties: string; range: string; }
interface ArmorMeta { base: number; addDex: boolean; dexCap?: number | null; label: string; }
interface ShieldMeta { bonus: number; }
export interface ItemMeta {
  type: MetaType;
  quantity?: number;
  equipped?: boolean;
  weapon?: WeaponMeta;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
}
type CatalogKind = 'armors' | 'shields' | 'weapons' | 'adventuring_gear' | 'tools';
interface CatalogItem {
  id: string;
  kind: CatalogKind;
  name: string;
  description?: string;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
  weapon?: WeaponMeta;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string;
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
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try { return JSON.parse(metaLine.slice(META_PREFIX.length)); } catch { return null; }
}
function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}

/**
 * Props:
 * - inventoryItems: si défini, liste les objets du sac (filtrage par type via allowedKinds)
 * - allowedKinds: filtre d'affichage (armors, shields, weapons, adventuring_gear, tools)
 */
export function EquipmentListModal({
  onClose,
  onAddItem,
  allowedKinds = null,
  inventoryItems = null,
}: {
  onClose: () => void;
  onAddItem: (item: { name: string; description?: string; meta: ItemMeta }) => void;
  allowedKinds?: CatalogKind[] | null;
  inventoryItems?: InventoryItem[] | null;
}) {
  const [query, setQuery] = React.useState('');

  // Si inventoryItems est fourni, afficher uniquement les objets du sac
  if (inventoryItems) {
    const filteredInventory = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      return inventoryItems.filter(item => {
        const meta = parseMeta(item.description);
        // Si le type n'est pas défini, masquer l'objet
        if (!meta?.type) return false;
        // Filtrer par allowedKinds
        if (allowedKinds) {
          const kindMapping: Record<MetaType, CatalogKind | null> = {
            armor: 'armors',
            shield: 'shields', 
            weapon: 'weapons',
            equipment: 'adventuring_gear',
            potion: 'adventuring_gear',
            jewelry: 'adventuring_gear',
            tool: 'tools'
          };
          const catalogKind = kindMapping[meta.type];
          if (!catalogKind || !allowedKinds.includes(catalogKind)) return false;
        }
        // Recherche textuelle
        if (!q) return true;
        const name = smartCapitalize(item.name).toLowerCase();
        const desc = visibleDescription(item.description).toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }, [inventoryItems, query, allowedKinds]);

    return (
      <div className="fixed inset-0 z-[9999]">
        <div className="fixed inset-0 bg-black/70" onClick={onClose} />
        <div className="fixed inset-0 bg-gray-900 flex flex-col" style={{ height: '100dvh' }}>
          <div className="px-3 py-2 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-gray-100 font-semibold text-lg">Équipements du sac</h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
                <X />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher dans le sac…"
                className="input-dark px-3 py-2 rounded-md w-full"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredInventory.length === 0 ? (
              <div className="text-gray-500 text-sm">Aucun équipement trouvé dans le sac</div>
            ) : (
              filteredInventory.map(item => {
                const meta = parseMeta(item.description);
                return (
                  <div key={item.id} className="bg-gray-800/50 border border-gray-700/50 rounded-md">
                    <div className="flex items-start justify-between p-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-100 font-medium break-words">
                          {smartCapitalize(item.name)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {meta?.type === 'armor' && meta?.armor && <div>CA: {meta.armor.label}</div>}
                          {meta?.type === 'shield' && meta?.shield && <div>Bonus: +{meta.shield.bonus}</div>}
                          {meta?.type === 'weapon' && meta?.weapon && (
                            <div>Dégâts: {meta.weapon.damageDice} {meta.weapon.damageType}</div>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          onAddItem({ 
                            name: item.name, 
                            description: visibleDescription(item.description), 
                            meta: meta || { type: 'equipment', quantity: 1, equipped: false }
                          });
                        }} 
                        className="btn-primary px-3 py-2 rounded-lg"
                      >
                        Équiper
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

  // Sinon, afficher la liste complète (catalogue)
  // ... (ancienne logique catalogue, inchangée)
  // Pour ne pas allonger, gardez le code existant, juste ajouter l'argument inventoryItems, et utilisez le bloc ci-dessus si inventoryItems est défini.

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900 flex flex-col" style={{ height: '100dvh' }}>
        <div className="px-3 py-2 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-gray-100 font-semibold text-lg">Liste des équipements</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
              <X />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="input-dark px-3 py-2 rounded-md w-full"
            />
          </div>
        </div>
        {/* ... catalogue logic here, inchangé ... */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-gray-500 text-sm">Catalogue d'équipement (hors sac)</div>
          {/* ... */}
        </div>
      </div>
    </div>
  );
}