import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Backpack, Plus, Trash2, Shield as ShieldIcon, Sword, FlaskRound as Flask, Star,
  Coins, Search, X, Settings, Filter as FilterIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { attackService } from '../services/attackService';
import { Player, InventoryItem } from '../types/dnd';

import { EquipmentListModal } from './modals/EquipmentListModal';
import { CustomItemModal } from './modals/CustomItemModal';
import { InventoryItemEditModal } from './modals/InventoryItemEditModal';
import { WeaponsManageModal } from './modals/WeaponsManageModal';

/* Types alignés */
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

interface Equipment {
  name: string;
  description: string;
  isTextArea?: boolean;
  inventory_item_id?: string | null;
  armor_formula?: ArmorMeta | null;
  shield_bonus?: number | null;
  weapon_meta?: WeaponMeta | null;
}

/* Helpers */
const META_PREFIX = '#meta:';
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
const visibleDescription = (desc: string | null | undefined) => {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
};
const smartCapitalize = (name: string): string => {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
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
  const noOldMeta = base.split('\n').filter(l => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
  const metaLine = `${META_PREFIX}${JSON.stringify(meta)}`;
  return (noOldMeta ? `${noOldMeta}\n` : '') + metaLine;
}

/* UI: bulle infos (slots) */
const InfoBubble = ({
  equipment, type, onClose, onToggleEquip, isEquipped, onRequestOpenList, onOpenEditFromSlot, onOpenWeaponsManage
}: {
  equipment: Equipment | null;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onClose: () => void;
  onToggleEquip?: () => void;
  isEquipped?: boolean;
  onRequestOpenList?: () => void;
  onOpenEditFromSlot?: () => void;
  onOpenWeaponsManage?: () => void;
}) => (
  <div className="fixed inset-0 z-[9999]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="fixed inset-0 bg-black/50" onClick={onClose} />
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 text-sm text-gray-300 rounded-lg shadow-lg w-[min(32rem,95vw)] border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-100 text-lg">
          {type === 'armor' ? 'Armure' : type === 'shield' ? 'Bouclier' : type === 'weapon' ? 'Armes' : type === 'potion' ? 'Potions' : type === 'jewelry' ? 'Bijoux' : 'Sac à dos'}
        </h4>
        <div className="flex items-center gap-1">
          {(type === 'armor' || type === 'shield') && equipment && (
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
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg"
              title="Gérer mes armes"
            >
              <Sword size={18} />
            </button>
          )}
          {(type === 'armor' || type === 'shield') && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenEditFromSlot?.(); }}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg"
              title="Paramètres"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {equipment ? (
        <div className="space-y-2">
          {equipment.name && <h5 className="font-medium text-gray-100 break-words">{smartCapitalize(equipment.name)}</h5>}
          {equipment.description && <p className="text-sm text-gray-400 whitespace-pre-wrap">{equipment.description}</p>}

          {type === 'armor' && (equipment as any).armor_formula && (
            <div className="mt-1 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Formule</span>
              <span className="font-medium text-gray-100">{(equipment as any).armor_formula.label || ''}</span>
            </div>
          )}

          {type === 'shield' && typeof (equipment as any).shield_bonus === 'number' && (
            <div className="mt-1 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Bonus de bouclier</span>
              <span className="font-medium text-gray-100">+{(equipment as any).shield_bonus}</span>
            </div>
          )}
        </div>
      ) : (
        (type === 'armor' || type === 'shield' || type === 'weapon') && (
          <div className="text-sm text-gray-400">
            {type === 'weapon' ? (
              <div className="mt-3">
                <button onClick={() => onOpenWeaponsManage?.()} className="btn-primary px-3 py-2 rounded-lg">Gérer mes armes</button>
              </div>
            ) : (
              <>
                Aucun {type === 'armor' ? 'armure' : 'bouclier'} équipé.
                <div className="mt-3">
                  <button onClick={() => onRequestOpenList?.()} className="btn-primary px-3 py-2 rounded-lg">Équiper depuis la liste</button>
                </div>
              </>
            )}
          </div>
        )
      )}
    </div>
  </div>
);

/* Composant principal */
export function EquipmentTab({
  player, inventory, onPlayerUpdate, onInventoryUpdate
}: {
  player: Player;
  inventory: InventoryItem[];
  onPlayerUpdate: (player: Player) => void;
  onInventoryUpdate: (inventory: InventoryItem[]) => void;
}) {
  const [armor, setArmor] = useState<Equipment | null>(player.equipment?.armor || null);
  const [shield, setShield] = useState<Equipment | null>(player.equipment?.shield || null);
  const [bag, setBag] = useState<Equipment | null>(player.equipment?.bag || null);
  const stableEquipmentRef = useRef<{ armor: Equipment | null; shield: Equipment | null; bag: Equipment | null; } | null>(null);

  const refreshSeqRef = useRef(0);
  const refreshSoon = useRef<number | null>(null);

  const [showList, setShowList] = useState(false);
  const [allowedKinds, setAllowedKinds] = useState<('armors' | 'shields' | 'weapons' | 'adventuring_gear' | 'tools')[] | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showWeaponsModal, setShowWeaponsModal] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ mode: 'equip' | 'unequip'; itemId: string; itemName: string } | null>(null);

  useEffect(() => { stableEquipmentRef.current = { armor, shield, bag }; }, [armor, shield, bag]);

  useEffect(() => {
    if (!armor && player.equipment?.armor) setArmor(player.equipment.armor);
    if (!shield && player.equipment?.shield) setShield(player.equipment.shield);
    if (!bag && player.equipment?.bag) setBag(player.equipment.bag);
  }, [player.equipment]); // eslint-disable-line react-hooks/exhaustive-deps

  const equippedWeapons = useMemo(() => {
    return inventory
      .map(it => ({ it, meta: parseMeta(it.description) }))
      .filter(({ meta }) => meta?.type === 'weapon' && meta?.equipped)
      .map(({ it, meta }) => ({ it, w: meta?.weapon }));
  }, [inventory]);

  const weaponsSummary: Equipment = useMemo(() => {
    const lines = equippedWeapons.map(({ it, w }) => {
      const parts: string[] = [smartCapitalize(it.name)];
      const sub = [w?.damageDice, w?.damageType].filter(Boolean).join(' ');
      if (sub) parts.push(`(${sub})`);
      return `• ${parts.join(' ')}`;
    });
    return { name: 'Armes équipées', description: lines.length ? lines.join('\n') : 'Aucune arme équipée.', isTextArea: true };
  }, [equippedWeapons]);

  const buildEquipmentSnapshot = (override?: Partial<{ armor: Equipment | null; shield: Equipment | null; bag: Equipment | null }>) => {
    const base = stableEquipmentRef.current || { armor, shield, bag };
    return {
      armor: override?.armor !== undefined ? override.armor : base.armor,
      shield: override?.shield !== undefined ? override.shield : base.shield,
      bag: override?.bag !== undefined ? override.bag : base.bag,
      potion: (player.equipment as any)?.potion ?? null,
      jewelry: (player.equipment as any)?.jewelry ?? null,
      // On ne gère plus "weapon" ici
      weapon: (player.equipment as any)?.weapon ?? null
    } as any;
  };

  const safeRefreshInventory = async (delayMs = 350) => {
    if (refreshSoon.current) window.clearTimeout(refreshSoon.current);
    refreshSoon.current = window.setTimeout(async () => {
      const seq = ++refreshSeqRef.current;
      const { data, error } = await supabase.from('inventory_items').select('*').eq('player_id', player.id);
      if (seq !== refreshSeqRef.current) return;
      if (!error && data) onInventoryUpdate(data);
    }, delayMs);
  };

  const saveEquipment = async (type: 'armor' | 'shield' | 'potion' | 'bag' | 'jewelry', equipment: Equipment | null) => {
    try {
      const snapshot = buildEquipmentSnapshot({ [type]: equipment } as any);
      const { error } = await supabase.from('players').update({ equipment: snapshot }).eq('id', player.id);
      if (error) throw error;
      if (type === 'armor') setArmor(equipment);
      if (type === 'shield') setShield(equipment);
      if (type === 'bag') setBag(equipment);
      onPlayerUpdate({ ...player, equipment: snapshot });
    } catch (error) {
      console.error('Erreur équipement:', error);
      toast.error('Erreur lors de la mise à jour');
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
      if (existing) await attackService.updateAttack({ ...payload, id: existing.id });
      else await attackService.addAttack(payload);
      notifyAttacksChanged();
    } catch (err) {
      console.error('Création/mise à jour attaque échouée', err);
    }
  };
  const removeWeaponAttacksByName = async (name: string) => {
    try {
      const attacks = await attackService.getPlayerAttacks(player.id);
      const toDelete = attacks.filter(a => norm(a.name) === norm(name));
      if (toDelete.length === 0) return;
      await Promise.allSettled(toDelete.map(a => attackService.removeAttack(a.id)));
      notifyAttacksChanged();
    } catch (e) {
      console.error('Suppression attaques (déséquipement) échouée', e);
    }
  };

  const applyInventoryMetaLocal = (itemId: string, nextMeta: ItemMeta) => {
    const next = inventory.map(it => it.id === itemId
      ? { ...it, description: injectMetaIntoDescription(visibleDescription(it.description), nextMeta) }
      : it
    );
    onInventoryUpdate(next);
  };

  // Lire FRAIS l’item, puis setter meta.equipped; éviter refresh immédiat
  const fetchInventoryItem = async (id: string): Promise<InventoryItem | null> => {
    const { data, error } = await supabase.from('inventory_items').select('*').eq('id', id).maybeSingle();
    if (error) { console.error('fetchInventoryItem error', error); return null; }
    return data as any;
  };
  const setWeaponEquipped = async (itemId: string, enabled: boolean) => {
    const fresh = await fetchInventoryItem(itemId);
    const currentDesc = fresh?.description ?? inventory.find(i => i.id === itemId)?.description ?? '';
    const currentMeta = parseMeta(currentDesc) || { type: 'weapon', quantity: 1, equipped: false } as ItemMeta;
    const prevMeta = currentMeta;
    const nextMeta: ItemMeta = { ...currentMeta, equipped: enabled };

    // Optimiste
    applyInventoryMetaLocal(itemId, nextMeta);

    try {
      const nextDesc = injectMetaIntoDescription(visibleDescription(currentDesc), nextMeta);
      const { error } = await supabase.from('inventory_items').update({ description: nextDesc }).eq('id', itemId);
      if (error) throw error;
      // Refresh différé pour laisser la base refléter l’update
      await safeRefreshInventory(400);
    } catch (e) {
      console.error('setWeaponEquipped failed, revert', e);
      applyInventoryMetaLocal(itemId, prevMeta);
      toast.error('Échec de mise à jour de l’arme');
    }
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
    await safeRefreshInventory(400);
  };

  // Equip/Unequip
  const performToggle = async (item: InventoryItem, mode: 'equip' | 'unequip') => {
    const meta = parseMeta(item.description);
    if (!meta) return;

    try {
      if (meta.type === 'armor') {
        if (mode === 'unequip' && armor?.inventory_item_id === item.id) {
          const next = { ...meta, equipped: false } as ItemMeta;
          applyInventoryMetaLocal(item.id, next);
          await supabase.from('inventory_items').update({ description: injectMetaIntoDescription(visibleDescription(item.description), next) }).eq('id', item.id);
          await saveEquipment('armor', null);
          toast.success('Armure déséquipée');
          await safeRefreshInventory(300);
        } else if (mode === 'equip') {
          await unequipOthersOfType('armor', item.id);
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            inventory_item_id: item.id,
            armor_formula: meta.armor ? { ...meta.armor } : null,
            shield_bonus: null,
            weapon_meta: null,
          };
          const next = { ...meta, equipped: true } as ItemMeta;
          applyInventoryMetaLocal(item.id, next);
          await supabase.from('inventory_items').update({ description: injectMetaIntoDescription(visibleDescription(item.description), next) }).eq('id', item.id);
          await saveEquipment('armor', eq);
          toast.success('Armure équipée');
          await safeRefreshInventory(300);
        }
      } else if (meta.type === 'shield') {
        if (mode === 'unequip' && shield?.inventory_item_id === item.id) {
          const next = { ...meta, equipped: false } as ItemMeta;
          applyInventoryMetaLocal(item.id, next);
          await supabase.from('inventory_items').update({ description: injectMetaIntoDescription(visibleDescription(item.description), next) }).eq('id', item.id);
          await saveEquipment('shield', null);
          toast.success('Bouclier déséquipé');
          await safeRefreshInventory(300);
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
          const next = { ...meta, equipped: true } as ItemMeta;
          applyInventoryMetaLocal(item.id, next);
          await supabase.from('inventory_items').update({ description: injectMetaIntoDescription(visibleDescription(item.description), next) }).eq('id', item.id);
          await saveEquipment('shield', eq);
          toast.success('Bouclier équipé');
          await safeRefreshInventory(300);
        }
      } else if (meta.type === 'weapon') {
        if (mode === 'unequip') {
          await setWeaponEquipped(item.id, false);
          await removeWeaponAttacksByName(item.name);
          toast.success('Arme déséquipée');
        } else if (mode === 'equip') {
          await setWeaponEquipped(item.id, true);
          await createOrUpdateWeaponAttack(item.name, meta.weapon);
          toast.success('Arme équipée');
        }
      }
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
      (isWeapon && meta.equipped === true);
    setConfirmPayload({ mode: equipped ? 'unequip' : 'equip', itemId: item.id, itemName: item.name });
    setConfirmOpen(true);
  };

  const openEditFromSlot = (slot: 'armor' | 'shield') => {
    const eq = slot === 'armor' ? armor : shield;
    if (!eq?.inventory_item_id) return;
    const item = inventory.find(i => i.id === eq.inventory_item_id);
    if (item) setEditingItem(item);
  };
  const toggleFromSlot = (slot: 'armor' | 'shield') => {
    const eq = slot === 'armor' ? armor : shield;
    if (!eq) return;
    const item = eq.inventory_item_id ? inventory.find(i => i.id === eq.inventory_item_id) : undefined;
    if (!item) return;
    setConfirmPayload({ mode: 'unequip', itemId: item.id, itemName: item.name });
    setConfirmOpen(true);
  };

  /* Sac: recherche + filtres */
  const [bagFilter, setBagFilter] = useState('');
  const [bagKinds, setBagKinds] = useState<Record<MetaType, boolean>>({
    armor: true, shield: true, weapon: true, equipment: true, potion: true, jewelry: true, tool: true
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const jewelryItems = useMemo(() => inventory.filter(i => parseMeta(i.description)?.type === 'jewelry'), [inventory]);
  const potionItems = useMemo(() => inventory.filter(i => parseMeta(i.description)?.type === 'potion'), [inventory]);
  const jewelryText = jewelryItems.length ? jewelryItems.map(i => `• ${smartCapitalize(i.name)}`).join('\n') : 'Aucun bijou dans le sac.';
  const potionText = potionItems.length ? potionItems.map(i => `• ${smartCapitalize(i.name)}`).join('\n') : 'Aucune potion/poison dans le sac.';

  return (
    <div className="space-y-6">
      {/* ... silhouette + slots identiques ... */}
      {/* Sac */}
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <Backpack className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Sac</h2>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => { setAllowedKinds(null); setShowList(true); }} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20} /> Liste d’équipement</button>
            <button onClick={() => setShowCustom(true)} className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2"><Plus size={18} /> Objet personnalisé</button>

            <div className="ml-auto flex items-center gap-2 min-w-[240px] flex-1">
              <button onClick={() => setFiltersOpen(true)} className="px-3 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2">
                <FilterIcon size={16} /> Filtres
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400" />
                <input value={bagFilter} onChange={(e) => setBagFilter(e.target.value)} placeholder="Filtrer le sac…" className="input-dark px-3 py-2 rounded-md w-full" />
              </div>
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
                (isWeapon && meta?.equipped === true);

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
                          onClick={() => setConfirmPayload({
                            mode: (isArmor && armor?.inventory_item_id === item.id) || (isShield && shield?.inventory_item_id === item.id) || (isWeapon && meta?.equipped === true) ? 'unequip' : 'equip',
                            itemId: item.id,
                            itemName: item.name
                          })}
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
              await safeRefreshInventory(300);
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
              await safeRefreshInventory(300);
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
        <InventoryItemEditModal item={editingItem} onClose={() => setEditingItem(null)} onSaved={() => safeRefreshInventory(200)} />
      )}

      {showWeaponsModal && (
        <WeaponsManageModal
          inventory={inventory}
          onClose={() => setShowWeaponsModal(false)}
          onEquip={async (it) => { await performToggle(it, 'equip'); }}
          onUnequip={async (it) => { await performToggle(it, 'unequip'); }}
        />
      )}

      {/* Confirmation */}
      {confirmOpen && confirmPayload && (
        <div className="fixed inset-0 z-[10000]" onClick={(e) => { if (e.target === e.currentTarget) { setConfirmOpen(false); setConfirmPayload(null); } }}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 border border-gray-700 rounded-lg p-4 w-[min(28rem,95vw)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-100">{confirmPayload.mode === 'equip' ? 'Équiper cet objet ?' : 'Déséquiper cet objet ?'}</h3>
              <button className="p-2 text-gray-400 hover:bg-gray-800 rounded" onClick={() => { setConfirmOpen(false); setConfirmPayload(null); }}><X /></button>
            </div>
            <p className="text-gray-300 mb-4 break-words">{smartCapitalize(confirmPayload.itemName)}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setConfirmOpen(false); setConfirmPayload(null); }} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
              <button
                onClick={async () => {
                  const latest = inventory.find(i => i.id === confirmPayload.itemId);
                  setConfirmOpen(false);
                  if (!latest) { toast.error("Objet introuvable"); setConfirmPayload(null); return; }
                  await performToggle(latest, confirmPayload.mode);
                  setConfirmPayload(null);
                }}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                {confirmPayload.mode === 'equip' ? 'Équiper' : 'Déséquiper'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtres modale centrée */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[11000]" onClick={(e) => { if (e.target === e.currentTarget) setFiltersOpen(false); }}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(22rem,92vw)] bg-gray-900/95 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-gray-100 font-semibold">Filtres du sac</h4>
              <button onClick={() => setFiltersOpen(false)} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"><X /></button>
            </div>
            <div className="space-y-1">
              {(['armor','shield','weapon','equipment','potion','jewelry','tool'] as MetaType[]).map(k => (
                <label key={k} className="flex items-center justify-between text-sm text-gray-200 px-2 py-1 rounded hover:bg-gray-800/60 cursor-pointer">
                  <span>
                    {k === 'armor' ? 'Armure'
                      : k === 'shield' ? 'Bouclier'
                      : k === 'weapon' ? 'Arme'
                      : k === 'potion' ? 'Potion/Poison'
                      : k === 'jewelry' ? 'Bijoux'
                      : k === 'tool' ? 'Outils' : 'Équipement'}
                  </span>
                  <input type="checkbox" className="accent-red-500" checked={bagKinds[k]} onChange={() => setBagKinds(prev => ({ ...prev, [k]: !prev[k] }))} />
                </label>
              ))}
            </div>
            <div className="mt-3 text-right">
              <button onClick={() => setFiltersOpen(false)} className="btn-primary px-3 py-2 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
