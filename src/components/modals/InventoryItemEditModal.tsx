import React from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { InventoryItem } from '../../types/dnd';

/* Types & utils alignés */
type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool';
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
  item, onClose, onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
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
  const [wRange, setWRange] = React.useState(existingMeta.weapon?.range || 'Corps à corps');

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const save = async () => {
    try {
      let nextMeta: ItemMeta = {
        ...(existingMeta || {} as ItemMeta),
        type,
        quantity: Math.max(1, quantity),
        // on ne modifie pas equipped ici
      };

      if (type === 'weapon') {
        nextMeta.weapon = {
          damageDice: wDice || '1d6',
          damageType: wType,
          properties: wProps || '',
          range: wRange || 'Corps à corps',
        };
      } else {
        delete (nextMeta as any).weapon;
      }

      const nextDesc = injectMetaIntoDescription(description, nextMeta);
      const { error } = await supabase.from('inventory_items').update({
        name: smartCapitalize(name.trim()),
        description: nextDesc
      }).eq('id', item.id);
      if (error) throw error;
      toast.success('Objet mis à jour');
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900/95 w-screen h-screen overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-100">Paramètres de l’objet</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"><X /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom</label>
              <input className="input-dark w-full px-3 py-2 rounded-md" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type d’objet</label>
              <select className="input-dark w-full px-3 py-2 rounded-md" value={type} onChange={e => setType(e.target.value as MetaType)}>
                <option value="equipment">Équipement</option>
                <option value="potion">Potion / Poison</option>
                <option value="weapon">Arme</option>
                <option value="armor">Armure</option>
                <option value="shield">Bouclier</option>
                <option value="jewelry">Bijoux</option>
                <option value="tool">Outils</option>
              </select>
            </div>
          </div>

          {type === 'weapon' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Dés de dégâts</label>
                <input className="input-dark w-full px-3 py-2 rounded-md" value={wDice} onChange={e => setWDice(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type de dégâts</label>
                <select className="input-dark w-full px-3 py-2 rounded-md" value={wType} onChange={e => setWType(e.target.value as any)}>
                  <option>Tranchant</option>
                  <option>Perforant</option>
                  <option>Contondant</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Propriété(s)</label>
                <input className="input-dark w-full px-3 py-2 rounded-md" value={wProps} onChange={e => setWProps(e.target.value)} placeholder="Finesse, Polyvalente..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Portée</label>
                <input className="input-dark w-full px-3 py-2 rounded-md" value={wRange} onChange={e => setWRange(e.target.value)} placeholder="Corps à corps, 6 m..." />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea className="input-dark w-full px-3 py-2 rounded-md" rows={6} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Quantité</label>
            <input type="number" min={1} className="input-dark w-24 px-3 py-2 rounded-md" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button onClick={save} className="btn-primary px-4 py-2 rounded-lg">Sauvegarder</button>
            <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
}