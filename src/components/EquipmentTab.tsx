import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Backpack, Plus, Trash2, Shield as ShieldIcon, Sword, FlaskRound as Flask, Star,
  Coins, Search, X, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { attackService } from '../services/attackService';
import { Player, InventoryItem } from '../types/dnd';

import { EquipmentListModal } from './modals/EquipmentListModal';
import { CustomItemModal } from './modals/CustomItemModal';
import { InventoryItemEditModal } from './modals/InventoryItemEditModal';
import { WeaponsManageModal } from './modals/WeaponsManageModal';

/* ====================== Types & helpers ====================== */

interface Equipment {
  name: string;
  description: string;
  isTextArea?: boolean;

  inventory_item_id?: string | null;

  armor_formula?: {
    base: number;
    addDex: boolean;
    dexCap?: number | null;
    label?: string;
  } | null;

  shield_bonus?: number | null;

  weapon_meta?: {
    damageDice: string;
    damageType: 'Tranchant' | 'Perforant' | 'Contondant';
    properties: string;
    range: string;
  } | null;
}

type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry' | 'tool';

interface WeaponMeta {
  damageDice: string;
  damageType: 'Tranchant' | 'Perforant' | 'Contondant';
  properties: string;
  range: string;
}
interface ArmorMeta {
  base: number;
  addDex: boolean;
  dexCap?: number | null;
  label: string;
}
interface ShieldMeta {
  bonus: number;
}

interface ItemMeta {
  type: MetaType;
  quantity?: number;
  equipped?: boolean;
  weapon?: WeaponMeta;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
}

const META_PREFIX = '#meta:';
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
const visibleDescription = (desc: string | null | undefined) => {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
};
function smartCapitalize(name: string): string {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = (description || '').split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try {
    return JSON.parse(metaLine.slice(META_PREFIX.length));
  } catch {
    return null;
  }
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

/* ====================== Confirmation ====================== */
function ConfirmEquipModal({
  open, mode, itemName, onConfirm, onCancel
}: { open: boolean; mode: 'equip' | 'unequip'; itemName: string; onConfirm: () => void; onCancel: () => void; }) {
  if (!open) return null;
  const title = mode === 'equip' ? 'Équiper cet objet ?' : 'Déséquiper cet objet ?';
  const label = mode === 'equip' ? 'Équiper' : 'Déséquiper';
  return (
    <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fixed inset-0 bg-black/60" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-700 rounded-lg p-4 w-[min(28rem,95vw)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <button className="p-2 text-gray-400 hover:bg-gray-800 rounded" onClick={onCancel} aria-label="Fermer">
            <X />
          </button>
        </div>
        <p className="text-gray-300 mb-4 break-words">{smartCapitalize(itemName)}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
          <button onClick={onConfirm} className="btn-primary px-4 py-2 rounded-lg">{label}</button>
        </div>
      </div>
    </div>
  );
}

/* ====================== Info bubble / Slot ====================== */
const getTitle = (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag') =>
  type === 'armor' ? 'Armure'
  : type === 'shield' ? 'Bouclier'
  : type === 'weapon' ? 'Armes'
  : type === 'potion' ? 'Potions'
  : type === 'jewelry' ? 'Bijoux'
  : 'Sac à dos';

interface InfoBubbleProps {
  equipment: Equipment | null;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onClose: () => void;
  onToggleEquip?: () => void;
  isEquipped?: boolean;
  onRequestOpenList?: () => void;
  onOpenEditFromSlot?: () => void;
  onOpenWeaponsManage?: () => void;
}
const InfoBubble = ({ equipment, type, onClose, onToggleEquip, isEquipped, onRequestOpenList, onOpenEditFromSlot, onOpenWeaponsManage }: InfoBubbleProps) => (
  <div className="fixed inset-0 z-[9999]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="fixed inset-0 bg-black/50" onClick={onClose} />
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 text-sm text-gray-300 rounded-lg shadow-lg w-[min(32rem,95vw)] border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-100 text-lg">{getTitle(type)}</h4>
        <div className="flex items-center gap-1">
          {(type === 'armor' || type === 'shield' || type === 'weapon') && equipment && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleEquip?.(); }}
              className={`px-2 py-1 rounded text-xs border ${isEquipped ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'}`}
            >
              {isEquipped ? 'Équipé' : 'Non équipé'}
            </button>
          )}
          {type === 'weapon' && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenWeaponsManage?.(); }}
              className="px-2 py-1 rounded text-xs border border-red-500/40 text-red-300 bg-red-900/20 hover:border-red-400/60"
              title="Gérer mes armes"
            >
              Gérer
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenEditFromSlot?.(); }}
            className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg"
            title="Paramètres"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {equipment ? (
        <div className="space-y-2">
          {equipment.name && <h5 className="font-medium text-gray-100 break-words">{smartCapitalize(equipment.name)}</h5>}
          {equipment.description && <p className="text-sm text-gray-400 whitespace-pre-wrap">{equipment.description}</p>}

          {type === 'armor' && equipment.armor_formula && (
            <div className="mt-1 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Formule</span>
              <span className="font-medium text-gray-100">{equipment.armor_formula.label || ''}</span>
            </div>
          )}

          {type === 'shield' && typeof equipment.shield_bonus === 'number' && (
            <div className="mt-1 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Bonus de bouclier</span>
              <span className="font-medium text-gray-100">+{equipment.shield_bonus}</span>
            </div>
          )}

          {type === 'weapon' && equipment.weapon_meta && (
            <div className="mt-1 text-sm text-gray-300 space-y-1">
              <div className="flex items-center justify-between"><span className="text-gray-400">Dés</span><span className="font-medium text-gray-100">{equipment.weapon_meta.damageDice}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-400">Type</span><span className="font-medium text-gray-100">{equipment.weapon_meta.damageType}</span></div>
              {equipment.weapon_meta.properties && <div className="flex items-center justify-between"><span className="text-gray-400">Propriété</span><span className="font-medium text-gray-100">{equipment.weapon_meta.properties}</span></div>}
              {equipment.weapon_meta.range && <div className="flex items-center justify-between"><span className="text-gray-400">Portée</span><span className="font-medium text-gray-100">{equipment.weapon_meta.range}</span></div>}
            </div>
          )}
        </div>
      ) : (
        (type === 'armor' || type === 'shield' || type === 'weapon') && (
          <div className="text-sm text-gray-400">
            Aucun {type === 'armor' ? 'armure' : type === 'shield' ? 'bouclier' : 'arme'} équipé.
            <div className="mt-3 flex gap-2">
              <button onClick={() => onRequestOpenList?.()} className="btn-primary px-3 py-2 rounded-lg">Équiper depuis la liste</button>
              {type === 'weapon' && (
                <button onClick={() => onOpenWeaponsManage?.()} className="px-3 py-2 rounded-lg border border-red-500/40 text-red-300 bg-red-900/20 hover:border-red-400/60">Gérer mes armes</button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  </div>
);

interface EquipmentSlotProps {
  icon: React.ReactNode;
  position: string;
  equipment: Equipment | null;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onRequestOpenList: () => void;
  onToggleEquipFromSlot: () => void;
  onOpenEditFromSlot: () => void;
  onOpenWeaponsManage?: () => void;
  isEquipped: boolean;
}
const EquipmentSlot = ({
  icon, position, equipment, type, onRequestOpenList, onToggleEquipFromSlot, onOpenEditFromSlot, onOpenWeaponsManage, isEquipped
}: EquipmentSlotProps) => {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowInfo(v => !v)}
        className={`absolute ${position} ${type === 'bag' ? 'w-24 h-24' : 'w-12 h-12'} rounded-lg hover:bg-gray-700/20 border border-gray-600/50 flex items-center justify-center`}
        style={{ zIndex: showInfo ? 50 : 10 }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {type === 'bag' ? icon : React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
      </button>

      {showInfo && (
        <InfoBubble
          equipment={equipment}
          type={type}
          onClose={() => setShowInfo(false)}
          onToggleEquip={onToggleEquipFromSlot}
          isEquipped={isEquipped}
          onRequestOpenList={onRequestOpenList}
          onOpenEditFromSlot={onOpenEditFromSlot}
          onOpenWeaponsManage={onOpenWeaponsManage}
        />
      )}
    </>
  );
};

/* ====================== Composant principal ====================== */
interface EquipmentTabProps {
  player: Player;
  inventory: InventoryItem[];
  onPlayerUpdate: (player: Player) => void;
  onInventoryUpdate: (inventory: InventoryItem[]) => void;
}
type Currency = 'gold' | 'silver' | 'copper';

const CurrencyInput = ({ currency, value, onAdd, onSpend }: {
  currency: Currency;
  value: number;
  onAdd: (n: number) => void;
  onSpend: (n: number) => void;
}) => {
  const [amount, setAmount] = useState<string>('');
  const getColor = (c: Currency) => c === 'gold' ? 'text-yellow-500' : c === 'silver' ? 'text-gray-300' : 'text-orange-400';
  const getName = (c: Currency) => c === 'gold' ? 'Or' : c === 'silver' ? 'Argent' : 'Cuivre';
  const act = (add: boolean) => { const n = parseInt(amount) || 0; if (n > 0) { (add ? onAdd : onSpend)(n); setAmount(''); } };
  return (
    <div className="flex items-center gap-2 h-11 relative">
      <div className={`w-16 text-center font-medium ${getColor(currency)}`}>{getName(currency)}</div>
      <div className="w-16 h-full text-center bg-gray-800/50 rounded-md flex items-center justify-center font-bold">{value}</div>
      <div className="flex-1 flex items-center justify-end gap-1">
        <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-dark w-20 h-11 px-2 rounded-md text-center text-base" placeholder="0" />
        <button onClick={() => act(true)} className="h-11 w-[72px] text-base text-green-500 hover:bg-green-900/30 rounded-md border border-green-500/20 hover:border-green-500/40">Ajouter</button>
        <button onClick={() => act(false)} className="h-11 w-[72px] text-base text-red-500 hover:bg-red-900/30 rounded-md border border-red-500/20 hover:border-red-500/40">Dépenser</button>
      </div>
    </div>
  );
};

export function EquipmentTab({
  player, inventory, onPlayerUpdate, onInventoryUpdate
}: EquipmentTabProps) {
  // États locaux “sources de vérité”
  const [armor, setArmor] = useState<Equipment | null>(player.equipment?.armor || null);
  const [weapon, setWeapon] = useState<Equipment | null>(player.equipment?.weapon || null); // “principale” pour l’aperçu
  const [shield, setShield] = useState<Equipment | null>(player.equipment?.shield || null);
  const [bag, setBag] = useState<Equipment | null>(player.equipment?.bag || null);
  const stableEquipmentRef = useRef<{ armor: Equipment | null; weapon: Equipment | null; shield: Equipment | null; bag: Equipment | null; } | null>(null);

  const [showList, setShowList] = useState(false);
  const [allowedKinds, setAllowedKinds] = useState<('armors' | 'shields' | 'weapons' | 'adventuring_gear' | 'tools')[] | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showWeaponsModal, setShowWeaponsModal] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ mode: 'equip' | 'unequip'; item: InventoryItem } | null>(null);

  useEffect(() => {
    stableEquipmentRef.current = { armor, weapon, shield, bag };
  }, [armor, weapon, shield, bag]);

  useEffect(() => {
    if (!armor && player.equipment?.armor) setArmor(player.equipment.armor);
    if (!shield && player.equipment?.shield) setShield(player.equipment.shield);
    if (!weapon && player.equipment?.weapon) setWeapon(player.equipment.weapon);
    if (!bag && player.equipment?.bag) setBag(player.equipment.bag);
  }, [player.equipment]); // eslint-disable-line react-hooks/exhaustive-deps

  const jewelryItems = useMemo(() => inventory.filter(i => parseMeta(i.description)?.type === 'jewelry'), [inventory]);
  const potionItems = useMemo(() => inventory.filter(i => parseMeta(i.description)?.type === 'potion'), [inventory]);

  const buildEquipmentSnapshot = (override?: Partial<{ armor: Equipment | null; weapon: Equipment | null; shield: Equipment | null; bag: Equipment | null }>) => {
    const base = stableEquipmentRef.current || { armor, weapon, shield, bag };
    return {
      armor: override?.armor !== undefined ? override.armor : base.armor,
      weapon: override?.weapon !== undefined ? override.weapon : base.weapon,
      shield: override?.shield !== undefined ? override.shield : base.shield,
      bag: override?.bag !== undefined ? override.bag : base.bag,
      potion: (player.equipment as any)?.potion ?? null,
      jewelry: (player.equipment as any)?.jewelry ?? null
    } as any;
  };

  const saveEquipment = async (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'bag' | 'jewelry', equipment: Equipment | null) => {
    try {
      const snapshot = buildEquipmentSnapshot({ [type]: equipment } as any);
      const { error } = await supabase.from('players').update({ equipment: snapshot }).eq('id', player.id);
      if (error) throw error;
      if (type === 'armor') setArmor(equipment);
      if (type === 'weapon') setWeapon(equipment);
      if (type === 'shield') setShield(equipment);
      if (type === 'bag') setBag(equipment);
      onPlayerUpdate({ ...player, equipment: snapshot });
    } catch (error) {
      console.error('Erreur équipement:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const refreshInventory = async () => {
    const { data, error } = await supabase.from('inventory_items').select('*').eq('player_id', player.id);
    if (!error && data) {
      onInventoryUpdate(data);
      if (!stableEquipmentRef.current?.weapon) {
        const firstEquippedWeapon = data.find((it) => (parseMeta(it.description)?.type === 'weapon') && parseMeta(it.description)?.equipped);
        if (firstEquippedWeapon) {
          const meta = parseMeta(firstEquippedWeapon.description)!;
          const eq: Equipment = {
            name: firstEquippedWeapon.name,
            description: visibleDescription(firstEquippedWeapon.description),
            inventory_item_id: firstEquippedWeapon.id,
            armor_formula: null,
            shield_bonus: null,
            weapon_meta: meta.weapon ? {
              damageDice: meta.weapon.damageDice || '1d6',
              damageType: meta.weapon.damageType || 'Tranchant',
              properties: meta.weapon.properties || '',
              range: meta.weapon.range || 'Corps à corps',
            } : { damageDice: '1d6', damageType: 'Tranchant', properties: '', range: 'Corps à corps' }
          };
          await saveEquipment('weapon', eq);
        }
      }
    }
  };

  const notifyAttacksChanged = () => {
    try { window.dispatchEvent(new CustomEvent('attacks:changed', { detail: { playerId: player.id } })); } catch {}
  };
  const createOrUpdateWeaponAttack = async (name: string, w?: WeaponMeta | null) => {
    try {
      const attacks = await attackService.getPlayerAttacks(player.id);
      const existing = attacks.find(a => norm(a.name) === norm(name));
      const payload = {
        player_id: player.id,
        name,
        damage_dice: w?.damageDice || '1d6',
        damage_type: w?.damageType || 'Tranchant',
        range: w?.range || 'Corps à corps',
        properties: w?.properties || '',
        manual_attack_bonus: null,
        manual_damage_bonus: null,
        expertise: false,
        attack_type: 'physical' as const,
        spell_level: null as any,
        ammo_count: (existing as any)?.ammo_count ?? 0
      };
      if (existing) { await attackService.updateAttack({ ...payload, id: existing.id }); }
      else { await attackService.addAttack(payload); }
      notifyAttacksChanged();
    } catch (err) { console.error('Création/mise à jour attaque échouée', err); }
  };
  const removeWeaponAttacksByName = async (name: string) => {
    try {
      const attacks = await attackService.getPlayerAttacks(player.id);
      const toDelete = attacks.filter(a => norm(a.name) === norm(name));
      if (toDelete.length === 0) return;
      await Promise.allSettled(toDelete.map(a => attackService.removeAttack(a.id)));
      notifyAttacksChanged();
    } catch (e) { console.error('Suppression attaques (déséquipement) échouée', e); }
  };

  const applyInventoryMetaLocal = (itemId: string, nextMeta: ItemMeta) => {
    const next = inventory.map(it => it.id === itemId
      ? { ...it, description: injectMetaIntoDescription(visibleDescription(it.description), nextMeta) }
      : it
    );
    onInventoryUpdate(next);
  };
  const updateItemMeta = async (item: InventoryItem, nextMeta: ItemMeta) => {
    applyInventoryMetaLocal(item.id, nextMeta);
    const nextDesc = injectMetaIntoDescription(visibleDescription(item.description), nextMeta);
    const { error } = await supabase.from('inventory_items').update({ description: nextDesc }).eq('id', item.id);
    if (error) throw error;
  };

  const unequipOthersOfType = async (type: 'armor' | 'shield', keepItemId?: string) => {
    const updates: Promise<any>[] = [];
    for (const it of inventory) {
      const meta = parseMeta(it.description);
      if (!meta) continue;
      if ((type === 'armor' && meta.type === 'armor') || (type === 'shield' && meta.type === 'shield')) {
        if (it.id !== keepItemId && meta.equipped) {
          const next = { ...meta, equipped: false };
          applyInventoryMetaLocal(it.id, next);
          updates.push(supabase.from('inventory_items').update({ description: injectMetaIntoDescription(visibleDescription(it.description), next) }).eq('id', it.id));
        }
      }
    }
    if (updates.length) await Promise.allSettled(updates);
  };

  // Equip/Unequip à partir d’un item (conserve multi-armes)
  const performToggle = async (item: InventoryItem, mode: 'equip' | 'unequip') => {
    const meta = parseMeta(item.description);
    if (!meta) return;

    try {
      if (meta.type === 'armor') {
        if (mode === 'unequip' && armor?.inventory_item_id === item.id) {
          await updateItemMeta(item, { ...meta, equipped: false });
          await saveEquipment('armor', null);
          toast.success('Armure déséquipée');
        } else if (mode === 'equip') {
          await unequipOthersOfType('armor', item.id);
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            inventory_item_id: item.id,
            armor_formula: meta.armor ? { base: meta.armor.base, addDex: meta.armor.addDex, dexCap: meta.armor.dexCap ?? null, label: meta.armor.label } : null,
            shield_bonus: null,
            weapon_meta: null,
          };
          await updateItemMeta(item, { ...meta, equipped: true });
          await saveEquipment('armor', eq);
          toast.success('Armure équipée');
        }
      } else if (meta.type === 'shield') {
        if (mode === 'unequip' && shield?.inventory_item_id === item.id) {
          await updateItemMeta(item, { ...meta, equipped: false });
          await saveEquipment('shield', null);
          toast.success('Bouclier déséquipé');
        } else if (mode === 'equip') {
          await unequipOthersOfType('shield', item.id);
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            inventory_item_id: item.id,
            shield_bonus: meta.shield?.bonus ?? null,
            armor_formula: null,
            weapon_meta: null,
          };
          await updateItemMeta(item, { ...meta, equipped: true });
          await saveEquipment('shield', eq);
          toast.success('Bouclier équipé');
        }
      } else if (meta.type === 'weapon') {
        if (mode === 'unequip') {
          await updateItemMeta(item, { ...meta, equipped: false });
          if (weapon?.inventory_item_id === item.id) {
            await saveEquipment('weapon', null);
          }
          await removeWeaponAttacksByName(item.name);
          toast.success('Arme déséquipée');
        } else if (mode === 'equip') {
          await updateItemMeta(item, { ...meta, equipped: true });

          // S’il n’y a pas d’arme “principale” dans le slot, projeter celle-ci
          if (!stableEquipmentRef.current?.weapon) {
            const eq: Equipment = {
              name: item.name,
              description: visibleDescription(item.description),
              inventory_item_id: item.id,
              armor_formula: null,
              shield_bonus: null,
              weapon_meta: meta.weapon ? {
                damageDice: meta.weapon.damageDice || '1d6',
                damageType: meta.weapon.damageType || 'Tranchant',
                properties: meta.weapon.properties || '',
                range: meta.weapon.range || 'Corps à corps',
              } : { damageDice: '1d6', damageType: 'Tranchant', properties: '', range: 'Corps à corps' }
            };
            await saveEquipment('weapon', eq);
          }

          await createOrUpdateWeaponAttack(item.name, meta.weapon);
          toast.success('Arme équipée');
        }
      }

      await refreshInventory();
    } catch (e) {
      console.error(e);
      toast.error('Erreur bascule équiper');
    }
  };

  const requestToggleWithConfirm = (item: InventoryItem) => {
    const meta = parseMeta(item.description);
    if (!meta) return toast.error("Objet sans métadonnées. Ouvrez Paramètres et précisez sa nature.");
    const isArmor = meta.type === 'armor';
    const isShield = meta.type === 'shield';
    const isWeapon = meta.type === 'weapon';
    const equipped =
      (isArmor && armor?.inventory_item_id === item.id) ||
      (isShield && shield?.inventory_item_id === item.id) ||
      (isWeapon && (meta.equipped === true || weapon?.inventory_item_id === item.id));
    setConfirmPayload({ mode: equipped ? 'unequip' : 'equip', item });
    setConfirmOpen(true);
  };

  // Paramètres depuis slot
  const openEditFromSlot = (slot: 'armor' | 'shield' | 'weapon') => {
    const eq = slot === 'armor' ? armor : slot === 'shield' ? shield : weapon;
    if (!eq?.inventory_item_id) return;
    const item = inventory.find(i => i.id === eq.inventory_item_id);
    if (item) setEditingItem(item);
  };
  const toggleFromSlot = (slot: 'armor' | 'shield' | 'weapon') => {
    const eq = slot === 'armor' ? armor : slot === 'shield' ? shield : weapon;
    if (!eq) return;
    const item = eq.inventory_item_id ? inventory.find(i => i.id === eq.inventory_item_id) : undefined;
    if (!item) return;
    setConfirmPayload({ mode: 'unequip', item });
    setConfirmOpen(true);
  };

  // Définir l’arme principale (slot) depuis le modal “Armes”
  const setPrimaryWeaponFromItem = async (it: InventoryItem) => {
    const meta = parseMeta(it.description);
    if (!meta) return;
    const eq: Equipment = {
      name: it.name,
      description: visibleDescription(it.description),
      inventory_item_id: it.id,
      armor_formula: null,
      shield_bonus: null,
      weapon_meta: meta.weapon ? {
        damageDice: meta.weapon.damageDice || '1d6',
        damageType: meta.weapon.damageType || 'Tranchant',
        properties: meta.weapon.properties || '',
        range: meta.weapon.range || 'Corps à corps',
      } : { damageDice: '1d6', damageType: 'Tranchant', properties: '', range: 'Corps à corps' }
    };
    await saveEquipment('weapon', eq);
    await refreshInventory();
  };

  /* Sac: filtres + recherche (liste à coches) */
  const [bagFilter, setBagFilter] = useState('');
  const [bagKinds, setBagKinds] = useState<Record<MetaType, boolean>>({
    armor: true, shield: true, weapon: true, equipment: true, potion: true, jewelry: true, tool: true
  });
  const filteredInventory = useMemo(() => {
    const q = bagFilter.trim().toLowerCase();
    return inventory.filter(i => {
      const meta = parseMeta(i.description);
      const kind: MetaType = (meta?.type || 'equipment') as MetaType;
      if (!bagKinds[kind]) return false;
      if (!q) return true;
      const name = stripPriceParentheses(i.name).toLowerCase();
      const desc = visibleDescription(i.description).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [inventory, bagFilter, bagKinds]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // Synthèses modales bijoux/potions
  const jewelryText = jewelryItems.length ? jewelryItems.map(i => `• ${smartCapitalize(i.name)}`).join('\n') : 'Aucun bijou dans le sac.';
  const potionText = potionItems.length ? potionItems.map(i => `• ${smartCapitalize(i.name)}`).join('\n') : 'Aucune potion/poison dans le sac.';

  return (
    <div className="space-y-6">
      {/* Carte silhouette + slots */}
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Inventaire</h2>
        </div>
        <div className="p-4">
          <div className="relative w-full mx-auto aspect-[2/3] bg-gray-800/50 rounded-lg overflow-hidden">
            <img
              src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//Silouete.png"
              alt="Character silhouette"
              className="absolute inset-0 w-full h-full object-contain opacity-30"
              style={{ mixBlendMode: 'luminosity' }}
            />

            <EquipmentSlot
              icon={<ShieldIcon size={24} className="text-purple-500" />}
              position="top-[27%] left-1/2 -translate-x-1/2"
              equipment={armor || null}
              type="armor"
              onRequestOpenList={() => { setAllowedKinds(['armors']); setShowList(true); }}
              onToggleEquipFromSlot={() => toggleFromSlot('armor')}
              onOpenEditFromSlot={() => openEditFromSlot('armor')}
              isEquipped={!!armor}
            />

            <EquipmentSlot
              icon={<ShieldIcon size={24} className="text-blue-500" />}
              position="top-[50%] left-[15%]"
              equipment={shield || null}
              type="shield"
              onRequestOpenList={() => { setAllowedKinds(['shields']); setShowList(true); }}
              onToggleEquipFromSlot={() => toggleFromSlot('shield')}
              onOpenEditFromSlot={() => openEditFromSlot('shield')}
              isEquipped={!!shield}
            />

            <EquipmentSlot
              icon={<Sword size={24} className="text-red-500" />}
              position="top-[50%] right-[15%]"
              equipment={weapon || null}
              type="weapon"
              onRequestOpenList={() => { setAllowedKinds(['weapons']); setShowList(true); }}
              onToggleEquipFromSlot={() => toggleFromSlot('weapon')}
              onOpenEditFromSlot={() => openEditFromSlot('weapon')}
              onOpenWeaponsManage={() => setShowWeaponsModal(true)}
              isEquipped={!!weapon}
            />

            <EquipmentSlot
              icon={<Flask size={24} className="text-green-500" />}
              position="top-[5%] right-[5%]"
              equipment={{ name: 'Potions et poisons', description: potionText, isTextArea: true }}
              type="potion"
              onRequestOpenList={() => { setAllowedKinds(null); setShowList(true); }}
              onToggleEquipFromSlot={() => {}}
              onOpenEditFromSlot={() => {}}
              isEquipped={false}
            />

            <EquipmentSlot
              icon={<Star size={24} className="text-yellow-500" />}
              position="top-[15%] right-[5%]"
              equipment={{ name: 'Bijoux', description: jewelryText, isTextArea: true }}
              type="jewelry"
              onRequestOpenList={() => { setAllowedKinds(null); setShowList(true); }}
              onToggleEquipFromSlot={() => {}}
              onOpenEditFromSlot={() => {}}
              isEquipped={false}
            />

            <EquipmentSlot
              icon={<img src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//8-2-backpack-png-pic.png" alt="Backpack" className="w-24 h-24 object-contain" />}
              position="bottom-[5%] right-[2%]"
              equipment={bag || { name: 'Sac à dos', description: '', isTextArea: true }}
              type="bag"
              onRequestOpenList={() => { setAllowedKinds(null); setShowList(true); }}
              onToggleEquipFromSlot={() => {}}
              onOpenEditFromSlot={() => {}}
              isEquipped={false}
            />
          </div>
        </div>
      </div>

      {/* Argent */}
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Coins className="text-green-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Mon argent</h2>
        </div>
        <div className="p-4 space-y-2">
          {(['gold','silver','copper'] as Currency[]).map(curr => (
            <CurrencyInput
              key={curr}
              currency={curr}
              value={player[curr] as number}
              onAdd={async (n) => {
                const newAmount = Math.max(0, (player[curr] as number) + n);
                try {
                  const { error } = await supabase.from('players').update({ [curr]: newAmount }).eq('id', player.id);
                  if (error) throw error;
                  onPlayerUpdate({ ...player, [curr]: newAmount } as any);
                  toast.success(`Ajout de ${n} ${curr}`);
                } catch (e) { toast.error('Erreur lors de la mise à jour'); }
              }}
              onSpend={async (n) => {
                const newAmount = Math.max(0, (player[curr] as number) - n);
                try {
                  const { error } = await supabase.from('players').update({ [curr]: newAmount }).eq('id', player.id);
                  if (error) throw error;
                  onPlayerUpdate({ ...player, [curr]: newAmount } as any);
                  toast.success(`Retrait de ${n} ${curr}`);
                } catch (e) { toast.error('Erreur lors de la mise à jour'); }
              }}
            />
          ))}
        </div>
      </div>

      {/* Sac */}
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Sac</h2>
        </div>

        <div className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setAllowedKinds(null); setShowList(true); }} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20} /> Liste d’équipement</button>
              <button onClick={() => setShowCustom(true)} className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2"><Plus size={18} /> Objet personnalisé</button>
            </div>

            {/* Liste à coches des catégories */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {(['armor','shield','weapon','equipment','potion','jewelry','tool'] as MetaType[]).map(k => (
                <label key={k} className="inline-flex items-center gap-2 text-xs text-gray-300 bg-gray-800/30 rounded px-2 py-1 border border-gray-700/50 hover:bg-gray-800/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bagKinds[k]}
                    onChange={() => setBagKinds(prev => ({ ...prev, [k]: !prev[k] }))}
                    className="accent-red-500"
                  />
                  <span>
                    {k === 'armor' ? 'Armure'
                      : k === 'shield' ? 'Bouclier'
                      : k === 'weapon' ? 'Arme'
                      : k === 'potion' ? 'Potion/Poison'
                      : k === 'jewelry' ? 'Bijoux'
                      : k === 'tool' ? 'Outils' : 'Équipement'}
                  </span>
                </label>
              ))}
            </div>

            <div className="ml-auto min-w-[220px] flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={bagFilter} onChange={(e) => setBagFilter(e.target.value)} placeholder="Filtrer le sac…" className="input-dark px-3 py-2 rounded-md w-full" />
            </div>
          </div>

          <div className="space-y-2">
            {filteredInventory.map(item => {
              const meta = parseMeta(item.description);
              const qty = meta?.quantity ?? 1;
              const isArmor = meta?.type === 'armor';
              const isShield = meta?.type === 'shield';
              const isWeapon = meta?.type === 'weapon';
              const isEquipped =
                (isArmor && armor?.inventory_item_id === item.id) ||
                (isShield && shield?.inventory_item_id === item.id) ||
                (isWeapon && (meta?.equipped === true || weapon?.inventory_item_id === item.id));

              return (
                <div key={item.id} className="bg-gray-800/40 border border-gray-700/40 rounded-md">
                  <div className="flex items-start justify-between p-2">
                    <div className="flex-1 mr-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleExpand(item.id)} className="text-left text-gray-100 font-medium hover:underline break-words">{smartCapitalize(item.name)}</button>
                        {qty > 1 && <span className="text-xs px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">x{qty}</span>}
                        {isArmor && <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">Armure</span>}
                        {isShield && <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300">Bouclier</span>}
                        {isWeapon && <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300">Arme</span>}
                        {meta?.type === 'tool' && <span className="text-xs px-2 py-0.5 rounded bg-teal-900/30 text-teal-300">Outil</span>}
                        {meta?.type === 'jewelry' && <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-300">Bijou</span>}
                        {meta?.type === 'potion' && <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-300">Potion/Poison</span>}
                      </div>

                      {expanded[item.id] && (isArmor || isShield || isWeapon) && (
                        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                          {isArmor && meta?.armor && <div>CA: {meta.armor.label}</div>}
                          {isShield && meta?.shield && <div>Bonus de bouclier: +{meta.shield.bonus}</div>}
                          {isWeapon && meta?.weapon && (
                            <>
                              <div>Dégâts: {meta.weapon.damageDice} {meta.weapon.damageType}</div>
                              {meta.weapon.properties && <div>Propriété: {meta.weapon.properties}</div>}
                              {meta.weapon.range && <div>Portée: {meta.weapon.range}</div>}
                            </>
                          )}
                        </div>
                      )}
                      {expanded[item.id] && !(isArmor || isShield || isWeapon) && (
                        <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{visibleDescription(item.description)}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(isArmor || isShield || isWeapon) && (
                        <button
                          onClick={() => requestToggleWithConfirm(item)}
                          className={`px-2 py-1 rounded text-xs border ${isEquipped ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'}`}
                          title={isEquipped ? 'Cliquer pour déséquiper' : 'Cliquer pour équiper'}
                        >
                          {isEquipped ? 'Équipé' : 'Non équipé'}
                        </button>
                      )}
                      <button onClick={() => setEditingItem(item)} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/40 rounded-full" title="Paramètres">
                        <Settings size={16} />
                      </button>
                      <button onClick={() => {
                        if (!window.confirm('Supprimer cet objet ?')) return;
                        (async () => {
                          try {
                            const { error } = await supabase.from('inventory_items').delete().eq('id', item.id);
                            if (error) throw error;
                            onInventoryUpdate(inventory.filter(i => i.id !== item.id));
                            toast.success('Objet supprimé');
                          } catch (e) {
                            console.error(e);
                            toast.error('Erreur suppression');
                          }
                        })();
                      }} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full" title="Supprimer l'objet">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showList && (
        <EquipmentListModal
          onClose={() => { setShowList(false); setAllowedKinds(null); }}
          onAddItem={async (payload) => {
            try {
              const meta: ItemMeta = { ...(payload.meta as any), equipped: false };
              const finalDesc = injectMetaIntoDescription(payload.description || '', meta);
              const { error } = await supabase.from('inventory_items').insert([{ player_id: player.id, name: smartCapitalize(payload.name), description: finalDesc }]);
              if (error) throw error;
              await refreshInventory();
              toast.success('Équipement ajouté');
            } catch (e) {
              console.error(e);
              toast.error('Erreur ajout équipement');
            } finally {
              setShowList(false);
              setAllowedKinds(null);
            }
          }}
          allowedKinds={allowedKinds}
        />
      )}
      {showCustom && (
        <CustomItemModal
          onClose={() => setShowCustom(false)}
          onAdd={async (payload) => {
            try {
              const finalDesc = injectMetaIntoDescription(payload.description || '', { ...payload.meta, equipped: false });
              const { error } = await supabase.from('inventory_items').insert([{ player_id: player.id, name: smartCapitalize(payload.name), description: finalDesc }]);
              if (error) throw error;
              await refreshInventory();
              toast.success('Objet personnalisé ajouté');
            } catch (e) {
              console.error(e);
              toast.error('Erreur ajout objet');
            } finally {
              setShowCustom(false);
            }
          }}
        />
      )}
      {editingItem && (
        <InventoryItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={refreshInventory}
        />
      )}
      {showWeaponsModal && (
        <WeaponsManageModal
          inventory={inventory}
          primaryWeaponItemId={weapon?.inventory_item_id || null}
          onClose={() => setShowWeaponsModal(false)}
          onEquip={async (it) => { await performToggle(it, 'equip'); }}
          onUnequip={async (it) => { await performToggle(it, 'unequip'); }}
          onSetPrimary={async (it) => { await setPrimaryWeaponFromItem(it); }}
        />
      )}

      <ConfirmEquipModal
        open={confirmOpen}
        mode={confirmPayload?.mode || 'equip'}
        itemName={confirmPayload?.item?.name || ''}
        onCancel={() => { setConfirmOpen(false); setConfirmPayload(null); }}
        onConfirm={async () => {
          if (!confirmPayload) return;
          setConfirmOpen(false);
          await performToggle(confirmPayload.item, confirmPayload.mode);
          setConfirmPayload(null);
        }}
      />
    </div>
  );
}