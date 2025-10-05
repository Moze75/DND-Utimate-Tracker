import React from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { InventoryItem } from '../../types/dnd';

/* Types & utils alignés */
type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool' | 'other';
type WeaponCategory = 'Armes courantes' | 'Armes de guerre' | 'Armes de guerre dotées de la propriété Légère' | 'Armes de guerre présentant la propriété Finesse ou Légère';
interface WeaponMeta { damageDice: string; damageType: 'Tranchant' | 'Perforant' | 'Contondant'; properties: string; range: string; category?: WeaponCategory; }
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
function injectMetaIntoDescription(desc: string | null | undefined, meta: ItemMeta): string {
  const base = (desc || '').trim();
  const noOldMeta = base
    .split('\n')
    .filter(l => !l.trim().startsWith(META_PREFIX))
    .join('\n')
    .trim();
  const metaLine = `${META_PREFIX}${JSON.stringify(meta)}`;
  return (noOldMeta ? `${noOldMeta}\n` : '') + metaLine;
}

export function InventoryItemEditModal({
  item, onClose, onSaved, lockType = false, onInventoryUpdate, inventory
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
  lockType?: boolean;
  onInventoryUpdate?: (inventory: InventoryItem[]) => void;
  inventory?: InventoryItem[];
}) {
  const existingMeta = parseMeta(item.description) || { type: 'equipment', quantity: 1, equipped: false } as ItemMeta;

  const [name, setName] = React.useState(smartCapitalize(item.name));
  const [description, setDescription] = React.useState(visibleDescription(item.description));
  const [quantity, setQuantity] = React.useState<number>(existingMeta.quantity ?? 1);
  const [type, setType] = React.useState<MetaType>((existingMeta.type as MetaType) || 'equipment');

  // Weapon fields
  const [wDice, setWDice] = React.useState(existingMeta.weapon?.damageDice || '1d6');
  const [wType, setWType] = React.useState<'Tranchant' | 'Perforant' | 'Contondant'>(existingMeta.weapon?.damageType || 'Tranchant');
  const [wProps, setWProps] = React.useState(existingMeta.weapon?.properties || '');
  const [wRange, setWRange] = React.useState(existingMeta.weapon?.range || '');
  const [wCategory, setWCategory] = React.useState<WeaponCategory>(existingMeta.weapon?.category || 'Armes courantes');

  // Armor fields
  const [aBase, setABase] = React.useState<number>(existingMeta.armor?.base || 10);
  const [aAddDex, setAAddDex] = React.useState<boolean>(existingMeta.armor?.addDex || false);
  const [aDexCap, setADexCap] = React.useState<number | null>(existingMeta.armor?.dexCap || null);
  const [aLabel, setALabel] = React.useState(existingMeta.armor?.label || '');

  // Shield fields
  const [sBonus, setSBonus] = React.useState<number>(existingMeta.shield?.bonus || 2);

  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      // Construire les nouvelles métadonnées
      const newMeta: ItemMeta = {
        type,
        quantity,
        equipped: existingMeta.equipped || false,
      };

      // Ajouter les métadonnées spécifiques selon le type
      if (type === 'weapon') {
        newMeta.weapon = {
          damageDice: wDice,
          damageType: wType,
          properties: wProps,
          range: wRange,
          category: wCategory,
        };
      } else if (type === 'armor') {
        newMeta.armor = {
          base: aBase,
          addDex: aAddDex,
          dexCap: aDexCap,
          label: aLabel,
        };
      } else if (type === 'shield') {
        newMeta.shield = {
          bonus: sBonus,
        };
      }

      // Injecter les métadonnées dans la description
      const finalDescription = injectMetaIntoDescription(description, newMeta);

      // MISE À JOUR OPTIMISTE IMMEDIATE de l'état local AVANT la DB
      if (onInventoryUpdate && inventory) {
        const updatedItem: InventoryItem = {
          ...item,
          name: name.trim(),
          description: finalDescription,
        };
        
        const updatedInventory = inventory.map(it => 
          it.id === item.id ? updatedItem : it
        );
        onInventoryUpdate(updatedInventory);
      }

      // Sauvegarder en base de données
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: name.trim(),
          description: finalDescription,
        })
        .eq('id', item.id);

      if (error) {
        // En cas d'erreur, restaurer l'état précédent
        if (onInventoryUpdate && inventory) {
          onInventoryUpdate(inventory);
        }
        throw error;
      }

      toast.success('Objet modifié avec succès');
      onSaved();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (t: MetaType) => {
    switch (t) {
      case 'armor': return 'Armure';
      case 'shield': return 'Bouclier';
      case 'weapon': return 'Arme';
      case 'potion': return 'Potion/Poison';
      case 'jewelry': return 'Bijoux';
      case 'tool': return 'Outils';
      case 'other': return 'Autre';
      case 'equipment': return 'Équipement';
      default: return 'Équipement';
    }
  };

  // Réinitialiser les champs spécifiques quand le type change
  React.useEffect(() => {
    if (type === 'weapon' && !existingMeta.weapon) {
      setWDice('1d6');
      setWType('Tranchant');
      setWProps('');
      setWRange('Corps à corps');
      setWCategory('Armes courantes');
    } else if (type === 'armor' && !existingMeta.armor) {
      setABase(10);
      setAAddDex(false);
      setADexCap(null);
      setALabel('');
    } else if (type === 'shield' && !existingMeta.shield) {
      setSBonus(2);
    }
  }, [type, existingMeta]);

  return (
    <div className="fixed inset-0 z-[12000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(32rem,95vw)] max-h-[90vh] overflow-y-auto bg-gray-900/95 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100">Modifier l'objet</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              placeholder="Nom de l'objet"
            />
          </div>

          {/* Type de catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MetaType)}
              disabled={lockType}
              className="input-dark w-full px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="equipment">Équipement</option>
              <option value="armor">Armure</option>
              <option value="shield">Bouclier</option>
              <option value="weapon">Arme</option>
              <option value="potion">Potion/Poison</option>
              <option value="jewelry">Bijoux</option>
              <option value="tool">Outils</option>
              <option value="other">Autre</option>
            </select>
            {lockType && (
              <p className="text-xs text-gray-500 mt-1">
                Type verrouillé car l'objet est actuellement équipé
              </p>
            )}
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Quantité</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="input-dark w-full px-3 py-2 rounded-md"
            />
          </div>

          {/* Champs spécifiques selon le type */}
          {type === 'weapon' && (
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300">Propriétés d'arme</h4>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Catégorie d'arme</label>
                <select
                  value={wCategory}
                  onChange={(e) => setWCategory(e.target.value as WeaponCategory)}
                  className="input-dark w-full px-2 py-1 text-sm rounded"
                >
                  <option value="Armes courantes">Armes courantes</option>
                  <option value="Armes de guerre">Armes de guerre</option>
                  <option value="Armes de guerre dotées de la propriété Légère">Armes de guerre dotées de la propriété Légère</option>
                  <option value="Armes de guerre présentant la propriété Finesse ou Légère">Armes de guerre présentant la propriété Finesse ou Légère</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Cette catégorie détermine si votre bonus de maîtrise s'applique aux jets d'attaque</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Dés de dégâts</label>
                  <input
                    type="text"
                    value={wDice}
                    onChange={(e) => setWDice(e.target.value)}
                    className="input-dark w-full px-2 py-1 text-sm rounded"
                    placeholder="1d6"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type de dégâts</label>
                  <select
                    value={wType}
                    onChange={(e) => setWType(e.target.value as any)}
                    className="input-dark w-full px-2 py-1 text-sm rounded"
                  >
                    <option value="Tranchant">Tranchant</option>
                    <option value="Perforant">Perforant</option>
                    <option value="Contondant">Contondant</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Propriétés</label>
                <input
                  type="text"
                  value={wProps}
                  onChange={(e) => setWProps(e.target.value)}
                  className="input-dark w-full px-2 py-1 text-sm rounded"
                  placeholder="Légère, Finesse..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Portée</label>
                <input
                  type="text"
                  value={wRange}
                  onChange={(e) => setWRange(e.target.value)}
                  className="input-dark w-full px-2 py-1 text-sm rounded"
                  placeholder="Corps à corps, 6/18 m..."
                />
              </div>
            </div>
          )}

          {type === 'armor' && (
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300">Propriétés d'armure</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">CA de base</label>
                  <input
                    type="number"
                    min="10"
                    max="20"
                    value={aBase}
                    onChange={(e) => setABase(parseInt(e.target.value) || 10)}
                    className="input-dark w-full px-2 py-1 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cap de Dex</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={aDexCap || ''}
                    onChange={(e) => setADexCap(e.target.value ? parseInt(e.target.value) : null)}
                    className="input-dark w-full px-2 py-1 text-sm rounded"
                    placeholder="Aucun"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={aAddDex}
                    onChange={(e) => setAAddDex(e.target.checked)}
                    className="accent-red-500"
                  />
                  Ajouter le modificateur de Dextérité
                </label>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Libellé de formule</label>
                <input
                  type="text"
                  value={aLabel}
                  onChange={(e) => setALabel(e.target.value)}
                  className="input-dark w-full px-2 py-1 text-sm rounded"
                  placeholder="ex: 11 + Mod. Dex (max 2)"
                />
              </div>
            </div>
          )}

          {type === 'shield' && (
            <div className="space-y-3 border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300">Propriétés de bouclier</h4>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Bonus à la CA</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={sBonus}
                  onChange={(e) => setSBonus(parseInt(e.target.value) || 2)}
                  className="input-dark w-full px-2 py-1 text-sm rounded"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-md"
              rows={4}
              placeholder="Description de l'objet"
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-lg"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}