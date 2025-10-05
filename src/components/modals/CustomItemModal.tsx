import React from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

/* Types locaux alignés */
type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool' | 'other';
type WeaponCategory = 'Armes courantes' | 'Armes de guerre' | 'Armes de guerre dotées de la propriété Légère' | 'Armes de guerre présentant la propriété Finesse ou Légère';
interface WeaponMeta { damageDice: string; damageType: 'Tranchant' | 'Perforant' | 'Contondant'; properties: string; range: string; category?: WeaponCategory; }
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

const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
const smartCapitalize = (name: string) => {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export function CustomItemModal({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (payload: { name: string; description: string; meta: ItemMeta }) => void;
}) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<MetaType>('equipment');
  const [description, setDescription] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);

  const [armBase, setArmBase] = React.useState<number>(12);
  const [armAddDex, setArmAddDex] = React.useState<boolean>(true);
  const [armDexCap, setArmDexCap] = React.useState<number | ''>(2);
  const [shieldBonus, setShieldBonus] = React.useState<number>(2);

  const [wDice, setWDice] = React.useState('1d6');
  const [wType, setWType] = React.useState<'Tranchant' | 'Perforant' | 'Contondant'>('Tranchant');
  const [wProps, setWProps] = React.useState('');
  const [wRange, setWRange] = React.useState('Corps à corps');
  const [wCategory, setWCategory] = React.useState<WeaponCategory>('Armes courantes');

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const add = () => {
    const cleanNameRaw = name.trim();
    if (!cleanNameRaw) return toast.error('Nom requis');
    if (quantity <= 0) return toast.error('Quantité invalide');
    const cleanName = smartCapitalize(cleanNameRaw);
    let meta: ItemMeta = { type, quantity, equipped: false };
    if (type === 'armor') {
      const cap = armDexCap === '' ? null : Number(armDexCap);
      meta.armor = { base: armBase, addDex: armAddDex, dexCap: cap, label: `${armBase}${armAddDex ? ` + modificateur de Dex${cap != null ? ` (max ${cap})` : ''}` : ''}` };
    } else if (type === 'shield') {
      meta.shield = { bonus: shieldBonus };
    } else if (type === 'weapon') {
      meta.weapon = { damageDice: wDice, damageType: wType, properties: wProps, range: wRange, category: wCategory };
    }
    onAdd({ name: cleanName, description: description.trim(), meta });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900/95 w-screen h-screen overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-100">Objet personnalisé</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"><X /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom</label>
            <input className="input-dark w-full px-3 py-2 rounded-md" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select className="input-dark w-full px-3 py-2 rounded-md" value={type} onChange={e => setType(e.target.value as MetaType)}>
              <option value="equipment">Équipement</option>
              <option value="potion">Potion / Poison</option>
              <option value="weapon">Arme</option>
              <option value="armor">Armure</option>
              <option value="shield">Bouclier</option>
              <option value="jewelry">Bijoux</option>
              <option value="tool">Outils</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>

        {type === 'armor' && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Base CA</label><input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={armBase} onChange={e => setArmBase(parseInt(e.target.value) || 10)} /></div>
            <div className="flex items-center gap-2"><input id="addDex" type="checkbox" checked={armAddDex} onChange={e => setArmAddDex(e.target.checked)} /><label htmlFor="addDex" className="text-sm text-gray-300">Ajoute mod DEX</label></div>
            <div><label className="block text-sm text-gray-400 mb-1">Cap DEX (vide = illimité)</label><input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={armDexCap} onChange={e => setArmDexCap(e.target.value === '' ? '' : parseInt(e.target.value))} /></div>
          </div>
        )}
        {type === 'shield' && (<div className="mt-3"><label className="block text-sm text-gray-400 mb-1">Bonus de bouclier</label><input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={shieldBonus} onChange={e => setShieldBonus(parseInt(e.target.value) || 0)} /></div>)}
        {type === 'weapon' && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm text-gray-400 mb-1">Dés de dégâts</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wDice} onChange={e => setWDice(e.target.value)} placeholder="1d6" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Type de dégâts</label><select className="input-dark w-full px-3 py-2 rounded-md" value={wType} onChange={e => setWType(e.target.value as any)}><option>Tranchant</option><option>Perforant</option><option>Contondant</option></select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Propriété(s)</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wProps} onChange={e => setWProps(e.target.value)} placeholder="Finesse, Polyvalente..." /></div>
              <div><label className="block text-sm text-gray-400 mb-1">Portée</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wRange} onChange={e => setWRange(e.target.value)} placeholder="Corps à corps, 6 m..." /></div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Catégorie d'arme</label>
              <select className="input-dark w-full px-3 py-2 rounded-md" value={wCategory} onChange={e => setWCategory(e.target.value as WeaponCategory)}>
                <option value="Armes courantes">Armes courantes</option>
                <option value="Armes de guerre">Armes de guerre</option>
                <option value="Armes de guerre dotées de la propriété Légère">Armes de guerre dotées de la propriété Légère</option>
                <option value="Armes de guerre présentant la propriété Finesse ou Légère">Armes de guerre présentant la propriété Finesse ou Légère</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Cette catégorie détermine si votre bonus de maîtrise s'applique aux jets d'attaque</p>
            </div>
          </div>
        )}

        <div className="mt-3">
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea className="input-dark w-full px-3 py-2 rounded-md" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="text-sm text-gray-400">Quantité</label>
          <input type="number" min={1} className="input-dark w-24 px-3 py-2 rounded-md" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={add} className="btn-primary px-4 py-2 rounded-lg">Ajouter</button>
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
        </div>
      </div>
    </div>
  );
}