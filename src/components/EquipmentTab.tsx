import React, { useMemo, useState, useEffect } from 'react';
import {
  Backpack, Plus, Trash2, Shield, Sword, Settings,
  FlaskRound as Flask, Star, Coins, Search, X, Check
} from 'lucide-react';
import { Player, InventoryItem } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { attackService } from '../services/attackService';

/* ====================== Types & helpers méta ====================== */

interface Equipment {
  name: string;
  description: string;
  isTextArea?: boolean;

  // Id de la ligne d’inventaire dont provient l’équipement
  inventory_item_id?: string | null;

  // Armure: formule pour calculer la CA (remplace la CA de base)
  armor_formula?: {
    base: number;
    addDex: boolean;
    dexCap?: number | null;
    label?: string;
  } | null;

  // Bouclier: bonus simple
  shield_bonus?: number | null;
}

// Ajout du type 'tool' pour filtrer les outils dans le sac
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
  equipped?: boolean;     // pour armes; pour armures/boucliers, on synchronise quand même ce flag
  weapon?: WeaponMeta;
  armor?: ArmorMeta;
  shield?: ShieldMeta;
}

const META_PREFIX = '#meta:';

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

function stripPriceParentheses(name: string): string {
  return name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
}
function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}
function smartCapitalize(name: string): string {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const isAllUpper = base === base.toUpperCase();
  if (isAllUpper) {
    const lower = base.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return base.charAt(0).toUpperCase() + base.slice(1);
}
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/* ====================== Liste d’équipement: fetch + parsing ====================== */

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

const ULT_BASE = 'https://raw.githubusercontent.com/Moze75/Ultimate_Tracker/main/Equipements';
const URLS = {
  armors: `${ULT_BASE}/Armures.md`,
  shields: `${ULT_BASE}/Boucliers.md`,
  weapons: `${ULT_BASE}/Armes.md`,
  adventuring_gear: `${ULT_BASE}/Equipements_daventurier.md`,
  tools: `${ULT_BASE}/Outils.md`,
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch catalogue échoué: ${url}`);
  return await res.text();
}
function parseMarkdownTable(md: string): string[][] {
  const rows: string[][] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('|') && l.endsWith('|') && l.includes('|')) {
      const cells = l.substring(1, l.length - 1).split('|').map(c => c.trim());
      if (cells.every(c => /^[-:\s]+$/.test(c))) continue;
      rows.push(cells);
    }
  }
  return rows;
}
function parseArmors(md: string): CatalogItem[] {
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    const [nomRaw, ca] = row;
    if (!nomRaw || /armures/i.test(nomRaw)) continue;
    const nom = stripPriceParentheses(nomRaw);

    let base = 10, addDex = false, dexCap: number | null = null;
    const dexMatch = ca.match(/(\d+)\s*\+\s*modificateur de Dex(?:\s*\(max\s*(\d+)\))?/i);
    if (dexMatch) { base = +dexMatch[1]; addDex = true; dexCap = dexMatch[2] ? +dexMatch[2] : null; }
    else { const m = ca.match(/^\s*(\d+)\s*$/); if (m) { base = +m[1]; addDex = false; dexCap = null; } }

    items.push({
      id: `armor:${nom}`,
      kind: 'armors',
      name: nom,
      description: '',
      armor: { base, addDex, dexCap, label: ca },
    });
  }
  return items;
}
function parseShields(md: string): CatalogItem[] {
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    const [nomRaw, ca] = row;
    if (!nomRaw || /armures/i.test(nomRaw)) continue;
    const nom = stripPriceParentheses(nomRaw);
    const m = ca.match(/\+?\s*(\d+)/);
    const bonus = m ? +m[1] : 2;
    items.push({
      id: `shield:${nom}`,
      kind: 'shields',
      name: nom,
      description: '',
      shield: { bonus },
    });
  }
  return items;
}
function parseWeapons(md: string): CatalogItem[] {
  const rows = parseMarkdownTable(md);
  const items: CatalogItem[] = [];
  for (const row of rows) {
    if (row.length < 3) continue;
    const [nomRaw, degats, props] = row;
    if (!nomRaw || /^nom$/i.test(nomRaw)) continue;
    const nom = stripPriceParentheses(nomRaw);
    const dmgMatch = (degats || '').match(/(\d+d\d+)/i);
    const damageDice = dmgMatch ? dmgMatch[1] : '1d6';
    let damageType: 'Tranchant' | 'Perforant' | 'Contondant' = 'Tranchant';
    if (/contondant/i.test(degats)) damageType = 'Contondant';
    else if (/perforant/i.test(degats)) damageType = 'Perforant';
    else if (/tranchant/i.test(degats)) damageType = 'Tranchant';
    let range = 'Corps à corps';
    const pm = (props || '').match(/portée\s*([\d,\.\/\s]+)/i);
    if (pm) { const first = pm[1].trim().split(/[\/\s]/)[0]?.trim() || ''; if (first) range = `${first} m`; }
    items.push({
      id: `weapon:${nom}`,
      kind: 'weapons',
      name: nom,
      description: '',
      weapon: { damageDice, damageType, properties: props || '', range },
    });
  }
  return items;
}
function parseSectionedList(md: string, kind: CatalogKind): CatalogItem[] {
  const items: CatalogItem[] = [];
  const lines = md.split('\n');
  let current: { name: string; descLines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const name = stripPriceParentheses(current.name);
    items.push({ id: `${kind}:${name}`, kind, name, description: current.descLines.join('\n').trim() });
    current = null;
  };
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { if (current) flush(); current = { name: h[1].trim(), descLines: [] }; continue; }
    if (/^---\s*$/.test(line)) { if (current) { flush(); continue; } }
    if (current) current.descLines.push(line);
  }
  if (current) flush();
  return items;
}

/* ====================== Modal Liste d’équipement (plein écran) ====================== */

type FilterState = {
  weapons: boolean;
  armors: boolean;
  shields: boolean;
  adventuring_gear: boolean;
  tools: boolean;
};

function EquipmentListModal({
  onClose,
  onAddItem,
}: {
  onClose: () => void;
  onAddItem: (item: { name: string; description?: string; meta: ItemMeta }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<CatalogItem[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [filters, setFilters] = useState<FilterState>({
    weapons: true, armors: true, shields: true, adventuring_gear: true, tools: true
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Scroll-lock + couverture totale
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [armorsMd, shieldsMd, weaponsMd, gearMd, toolsMd] = await Promise.all([
          fetchText(URLS.armors),
          fetchText(URLS.shields),
          fetchText(URLS.weapons),
          fetchText(URLS.adventuring_gear),
          fetchText(URLS.tools),
        ]);
        setAll([
          ...parseArmors(armorsMd),
          ...parseShields(shieldsMd),
          ...parseWeapons(weaponsMd),
          ...parseSectionedList(gearMd, 'adventuring_gear'),
          ...parseSectionedList(toolsMd, 'tools'),
        ]);
      } catch (e) {
        console.error(e);
        toast.error('Erreur de chargement de la liste');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(ci => {
      if (!filters[ci.kind]) return false;     // filtre strict par type
      if (!q) return true;
      // match nom + (desc seulement pour gear/tools)
      if (ci.name.toLowerCase().includes(q)) return true;
      if ((ci.kind === 'adventuring_gear' || ci.kind === 'tools') && (ci.description || '').toLowerCase().includes(q)) return true;
      return false;
    });
  }, [all, query, filters]);

  const handlePick = (ci: CatalogItem) => {
    if (quantity <= 0) { toast.error('Quantité invalide'); return; }
    // meta.equipped=false par défaut
    let meta: ItemMeta = { type: 'equipment', quantity, equipped: false };
    if (ci.kind === 'armors' && ci.armor) meta = { type: 'armor', quantity, equipped: false, armor: ci.armor };
    if (ci.kind === 'shields' && ci.shield) meta = { type: 'shield', quantity, equipped: false, shield: ci.shield };
    if (ci.kind === 'weapons' && ci.weapon) meta = { type: 'weapon', quantity, equipped: false, weapon: ci.weapon };
    if (ci.kind === 'tools') meta = { type: 'tool', quantity, equipped: false };

    const description = (ci.kind === 'adventuring_gear' || ci.kind === 'tools') ? (ci.description || '').trim() : '';
    onAddItem({ name: ci.name, description, meta });
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900 flex flex-col" style={{ height: '100dvh' }}>
        {/* Header: recherche à gauche, filtres + Qté à droite */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-800 flex-wrap">
          <div className="flex items-center gap-2 min-w-[220px] flex-1">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="input-dark px-3 py-2 rounded-md w-full"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(['weapons','armors','shields','adventuring_gear','tools'] as CatalogKind[]).map(k => (
              <button
                key={k}
                onClick={() => setFilters(prev => ({ ...prev, [k]: !prev[k] }))}
                className={`px-2 py-1 rounded text-xs border ${
                  filters[k] ? 'border-red-500/40 text-red-300 bg-red-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-800/40'
                }`}
              >
                {k === 'weapons' ? 'Armes'
                  : k === 'armors' ? 'Armures'
                  : k === 'shields' ? 'Boucliers'
                  : k === 'adventuring_gear' ? 'Équipements'
                  : 'Outils'}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Qté</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="input-dark w-16 px-2 py-1 rounded-md" />
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
              <X />
            </button>
          </div>
        </div>

        {/* Liste défilable 100% */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-gray-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm">Aucun résultat</div>
          ) : (
            filtered.map(ci => {
              const isOpen = !!expanded[ci.id];
              return (
                <div key={ci.id} className="bg-gray-800/50 border border-gray-700/50 rounded-md">
                  <div className="flex items-start justify-between p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <button
                        className="text-gray-100 font-medium hover:underline break-words text-left"
                        onClick={() => toggleExpand(ci.id)}
                        title="Afficher le détail"
                      >
                        {smartCapitalize(ci.name)}
                      </button>
                      <div className="text-xs text-gray-400 mt-1">
                        {ci.kind === 'armors' && ci.armor && `CA: ${ci.armor.label}`}
                        {ci.kind === 'shields' && ci.shield && `Bonus de bouclier: +${ci.shield.bonus}`}
                        {ci.kind === 'weapons' && ci.weapon && `Dégâts: ${ci.weapon.damageDice} ${ci.weapon.damageType} • Props: ${ci.weapon.properties || '—'}`}
                        {(ci.kind === 'adventuring_gear' || ci.kind === 'tools') && (ci.description ? 'Voir le détail' : 'Équipement')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handlePick(ci)} className="btn-primary px-3 py-2 rounded-lg flex items-center gap-1">
                        <Check className="w-4 h-4" /> Ajouter
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      {(ci.kind === 'adventuring_gear' || ci.kind === 'tools')
                        ? <div className="text-sm text-gray-300 whitespace-pre-wrap">{(ci.description || '').trim()}</div>
                        : <div className="text-sm text-gray-400">Aucun détail supplémentaire</div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ====================== Modals Custom & Edit (plein écran) ====================== */

function CustomItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (payload: { name: string; description: string; meta: ItemMeta }) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<MetaType>('equipment');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [armBase, setArmBase] = useState<number>(12);
  const [armAddDex, setArmAddDex] = useState<boolean>(true);
  const [armDexCap, setArmDexCap] = useState<number | ''>(2);
  const [shieldBonus, setShieldBonus] = useState<number>(2);
  const [wDice, setWDice] = useState('1d6');
  const [wType, setWType] = useState<'Tranchant' | 'Perforant' | 'Contondant'>('Tranchant');
  const [wProps, setWProps] = useState('');
  const [wRange, setWRange] = useState('Corps à corps');

  useEffect(() => {
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
    } else if (type === 'shield') meta.shield = { bonus: shieldBonus };
    else if (type === 'weapon') meta.weapon = { damageDice: wDice, damageType: wType, properties: wProps, range: wRange };
    onAdd({ name: cleanName, description: description.trim(), meta });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 bg-gray-900/95 w-screen h-screen overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-100">Objet personnalisé</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Dés de dégâts</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wDice} onChange={e => setWDice(e.target.value)} placeholder="1d6" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Type de dégâts</label><select className="input-dark w-full px-3 py-2 rounded-md" value={wType} onChange={e => setWType(e.target.value as any)}><option>Tranchant</option><option>Perforant</option><option>Contondant</option></select></div>
            <div><label className="block text-sm text-gray-400 mb-1">Propriétés</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wProps} onChange={e => setWProps(e.target.value)} placeholder="Finesse, Polyvalente..." /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Portée</label><input className="input-dark w-full px-3 py-2 rounded-md" value={wRange} onChange={e => setWRange(e.target.value)} placeholder="Corps à corps, 6 m..." /></div>
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

function InventoryItemEditModal({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const meta = parseMeta(item.description) || { type: 'equipment', quantity: 1, equipped: false } as ItemMeta;
  const [name, setName] = useState(smartCapitalize(item.name));
  const [description, setDescription] = useState(visibleDescription(item.description));
  const [quantity, setQuantity] = useState<number>(meta.quantity ?? 1);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const save = async () => {
    try {
      const nextMeta: ItemMeta = { ...meta, quantity: Math.max(1, quantity) };
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
          <h3 className="text-lg font-semibold text-gray-100">Modifier l’objet</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X />
          </button>
        </div>

        <div className="space-y-3">
          <div><label className="block text-sm text-gray-400 mb-1">Nom</label><input className="input-dark w-full px-3 py-2 rounded-md" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea className="input-dark w-full px-3 py-2 rounded-md" rows={6} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="flex items-center gap-3"><label className="text-sm text-gray-400">Quantité</label><input type="number" min={1} className="input-dark w-24 px-3 py-2 rounded-md" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} /></div>
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={save} className="btn-primary px-4 py-2 rounded-lg">Sauvegarder</button>
            <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== Popup slot ====================== */

const getTitle = (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag') =>
  type === 'armor' ? 'Armure'
  : type === 'shield' ? 'Bouclier'
  : type === 'weapon' ? 'Armes'
  : type === 'potion' ? 'Potions'
  : type === 'jewelry' ? 'Bijoux'
  : 'Sac à dos';

interface InfoBubbleProps {
  equipment: Equipment | null;
  onClose: () => void;
  setIsEditing: (value: boolean) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onToggleEquip?: () => void;
  isEquipped?: boolean;
  onRequestOpenList?: () => void;
}

const InfoBubble = ({ equipment, onClose, setIsEditing, type, onToggleEquip, isEquipped, onRequestOpenList }: InfoBubbleProps) => (
  <div className="fixed inset-0 z-[9999]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="fixed inset-0 bg-black/50" onClick={onClose} />
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 text-sm text-gray-300 rounded-lg shadow-lg w-[min(32rem,95vw)] border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-100 text-lg">{getTitle(type)}</h4>
        <div className="flex items-center gap-1">
          {(type === 'armor' || type === 'shield') && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleEquip?.(); }}
              className={`px-2 py-1 rounded text-xs border ${isEquipped ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'}`}
            >
              {isEquipped ? 'Équipé' : 'Non équipé'}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg" title="Modifier">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {equipment ? (
        <div className="space-y-1">
          {equipment.name && <h5 className="font-medium text-gray-100 break-words">{smartCapitalize(equipment.name)}</h5>}
          {equipment.description && <p className="text-sm text-gray-400 whitespace-pre-wrap">{equipment.description}</p>}
          {type === 'armor' && equipment.armor_formula && (
            <div className="mt-2 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Formule</span>
              <span className="font-medium text-gray-100">{equipment.armor_formula.label || ''}</span>
            </div>
          )}
          {type === 'shield' && typeof equipment.shield_bonus === 'number' && (
            <div className="mt-2 text-sm text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">Bonus de bouclier</span>
              <span className="font-medium text-gray-100">+{equipment.shield_bonus}</span>
            </div>
          )}
        </div>
      ) : (
        (type === 'armor' || type === 'shield') && (
          <div className="text-sm text-gray-400">
            Aucun {type === 'armor' ? 'armure' : 'bouclier'} équipé.
            <div className="mt-3">
              <button onClick={() => onRequestOpenList?.()} className="btn-primary px-3 py-2 rounded-lg">Équiper depuis la liste</button>
            </div>
          </div>
        )
      )}
    </div>
  </div>
);

/* ====================== Slot ====================== */

interface EquipmentSlotProps {
  icon: React.ReactNode;
  position: string;
  equipment: Equipment | null;
  onEquip: (equipment: Equipment | null) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onRequestOpenList: () => void;
  onToggleEquipFromSlot: () => void;
  isEquipped: boolean;
}

const EquipmentSlot = ({
  icon, position, equipment, onEquip, type, onRequestOpenList, onToggleEquipFromSlot, isEquipped
}: EquipmentSlotProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
          onClose={() => setShowInfo(false)}
          setIsEditing={setIsEditing}
          type={type}
          onToggleEquip={onToggleEquipFromSlot}
          isEquipped={isEquipped}
          onRequestOpenList={onRequestOpenList}
        />
      )}
      {isEditing && <div /> /* édition via sac */}
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
  currency: Currency; value: number; onAdd: (n: number) => void; onSpend: (n: number) => void;
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
  player,
  inventory,
  onPlayerUpdate,
  onInventoryUpdate
}: EquipmentTabProps) {
  const [showList, setShowList] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Slots (avec id d’inventaire)
  const [armor, setArmor] = useState<Equipment | null>(player.equipment?.armor || null);
  const [weapon, setWeapon] = useState<Equipment | null>(player.equipment?.weapon || null);
  const [shield, setShield] = useState<Equipment | null>(player.equipment?.shield || null);
  const [potion, setPotion] = useState<Equipment | null>(player.equipment?.potion || null);
  const [bag, setBag] = useState<Equipment | null>(player.equipment?.bag || null);
  const [jewelry, setJewelry] = useState<Equipment | null>(player.equipment?.jewelry || null);

  const saveEquipment = async (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'bag' | 'jewelry', equipment: Equipment | null) => {
    try {
      const nextEquipment = { ...player.equipment, [type]: equipment };
      const { error } = await supabase.from('players').update({ equipment: nextEquipment }).eq('id', player.id);
      if (error) throw error;
      onPlayerUpdate({ ...player, equipment: nextEquipment });
    } catch (error) {
      console.error('Erreur équipement:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const updatePlayerMoney = async (currency: Currency, amount: number, isAdding: boolean) => {
    const newAmount = Math.max(0, (player[currency] as number) + (isAdding ? amount : -amount));
    try {
      const { error } = await supabase.from('players').update({ [currency]: newAmount }).eq('id', player.id);
      if (error) throw error;
      onPlayerUpdate({ ...player, [currency]: newAmount } as any);
      toast.success(`${isAdding ? 'Ajout' : 'Retrait'} de ${amount} ${currency}`);
    } catch (error) {
      console.error('Erreur argent:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const refreshInventory = async () => {
    const { data } = await supabase.from('inventory_items').select('*').eq('player_id', player.id);
    if (data) onInventoryUpdate(data);
  };

  // Mise à jour optimiste de l’inventaire après modification du meta
  const applyInventoryMetaLocal = (itemId: string, nextMeta: ItemMeta) => {
    const next = inventory.map(it => it.id === itemId
      ? { ...it, description: injectMetaIntoDescription(visibleDescription(it.description), nextMeta) }
      : it
    );
    onInventoryUpdate(next);
  };

  const addFromList = async (payload: { name: string; description?: string; meta: ItemMeta }) => {
    try {
      const meta: ItemMeta = { ...payload.meta, equipped: false }; // par défaut non équipé
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
    }
  };

  const addCustom = async (payload: { name: string; description: string; meta: ItemMeta }) => {
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
  };

  const removeItemFromInventory = async (itemId: string) => {
    if (!window.confirm('Supprimer cet objet ?')) return;
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) throw error;
      onInventoryUpdate(inventory.filter(i => i.id !== itemId));
      toast.success('Objet supprimé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur suppression');
    }
  };

  const updateItemMeta = async (item: InventoryItem, nextMeta: ItemMeta) => {
    // Optimiste
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
          updates.push(
            supabase.from('inventory_items').update({ description: injectMetaIntoDescription(visibleDescription(it.description), next) }).eq('id', it.id)
          );
        }
      }
    }
    if (updates.length) {
      await Promise.allSettled(updates);
    }
  };

  // Bascule Équipé/Non équipé (depuis le sac)
  const toggleEquip = async (item: InventoryItem) => {
    const meta = parseMeta(item.description);
    if (!meta) {
      toast.error("Objet sans métadonnées. Ouvrez Paramètres et précisez sa nature.");
      return;
    }

    try {
      if (meta.type === 'armor') {
        const isEquippedSlot = armor?.inventory_item_id === item.id;
        if (isEquippedSlot) {
          // Déséquiper
          setArmor(null);
          await saveEquipment('armor', null);
          await updateItemMeta(item, { ...meta, equipped: false });
        } else {
          // Équiper (unicité)
          await unequipOthersOfType('armor', item.id);
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            inventory_item_id: item.id,
            armor_formula: meta.armor ? { base: meta.armor.base, addDex: meta.armor.addDex, dexCap: meta.armor.dexCap ?? null, label: meta.armor.label } : null,
          };
          setArmor(eq);
          await saveEquipment('armor', eq);
          await updateItemMeta(item, { ...meta, equipped: true });
        }
      } else if (meta.type === 'shield') {
        const isEquippedSlot = shield?.inventory_item_id === item.id;
        if (isEquippedSlot) {
          setShield(null);
          await saveEquipment('shield', null);
          await updateItemMeta(item, { ...meta, equipped: false });
        } else {
          await unequipOthersOfType('shield', item.id);
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            inventory_item_id: item.id,
            shield_bonus: meta.shield?.bonus ?? null,
          };
          setShield(eq);
          await saveEquipment('shield', eq);
          await updateItemMeta(item, { ...meta, equipped: true });
        }
      } else if (meta.type === 'weapon') {
        const nextEquipped = !meta.equipped;
        await updateItemMeta(item, { ...meta, equipped: nextEquipped });
        // Tentative de création d'attaque à l’équipement
        if (nextEquipped && meta.weapon) {
          try {
            await attackService.addAttack({
              player_id: player.id,
              name: item.name,
              damage_dice: meta.weapon.damageDice,
              damage_type: meta.weapon.damageType,
              range: meta.weapon.range || 'Corps à corps',
              properties: meta.weapon.properties || '',
              manual_attack_bonus: null,
              manual_damage_bonus: null,
              expertise: false,
              attack_type: 'physical',
              spell_level: null,
              ammo_count: 0
            });
          } catch (_) {
            // On ne bloque pas la bascule si l’insert échoue (RLS, etc.)
          }
        }
      }
      // On recharge pour consolider l’état
      await refreshInventory();
    } catch (e) {
      console.error(e);
      toast.error('Erreur bascule équiper');
    }
  };

  const toggleFromSlot = async (slot: 'armor' | 'shield') => {
    const eq = slot === 'armor' ? armor : shield;
    if (!eq) { setShowList(true); return; }
    // Priorité à l’id d’inventaire
    const item = eq.inventory_item_id
      ? inventory.find(i => i.id === eq.inventory_item_id)
      : inventory.find(i => norm(stripPriceParentheses(i.name)) === norm(stripPriceParentheses(eq.name)));
    if (!item) {
      if (slot === 'armor') { setArmor(null); await saveEquipment('armor', null); }
      else { setShield(null); await saveEquipment('shield', null); }
      return;
    }
    const meta = parseMeta(item.description) || { type: slot, equipped: true } as ItemMeta;
    await updateItemMeta(item, { ...meta, equipped: false });
    if (slot === 'armor') { setArmor(null); await saveEquipment('armor', null); }
    else { setShield(null); await saveEquipment('shield', null); }
    await refreshInventory();
  };

  // Filtres du sac (inclut Outils)
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

  // Expansion items
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      {/* Carte avec slots */}
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
              icon={<Shield size={24} className="text-purple-500" />}
              position="top-[25%] left-1/2 -translate-x-1/2"
              equipment={armor || null}
              onEquip={(eq) => { setArmor(eq); saveEquipment('armor', eq); }}
              type="armor"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => toggleFromSlot('armor')}
              isEquipped={!!armor}
            />

            <EquipmentSlot
              icon={<Shield size={24} className="text-blue-500" />}
              position="top-[45%] left-[15%]"
              equipment={shield || null}
              onEquip={(eq) => { setShield(eq as any); saveEquipment('shield', eq as any); }}
              type="shield"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => toggleFromSlot('shield')}
              isEquipped={!!shield}
            />

            <EquipmentSlot
              icon={<Sword size={24} className="text-red-500" />}
              position="top-[45%] right-[15%]"
              equipment={weapon || { name: 'Armes', description: 'Gérées dans Attaques', isTextArea: true }}
              onEquip={(eq) => { setWeapon(eq as any); saveEquipment('weapon', eq as any); }}
              type="weapon"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => {}}
              isEquipped={false}
            />

            <EquipmentSlot
              icon={<Flask size={24} className="text-green-500" />}
              position="top-[5%] right-[5%]"
              equipment={potion || { name: 'Potions et poisons', description: '', isTextArea: true }}
              onEquip={(eq) => { setPotion(eq as any); saveEquipment('potion', eq as any); }}
              type="potion"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => {}}
              isEquipped={false}
            />

            <EquipmentSlot
              icon={<Star size={24} className="text-yellow-500" />}
              position="top-[15%] right-[5%]"
              equipment={jewelry || { name: 'Bijoux', description: '', isTextArea: true }}
              onEquip={(eq) => { setJewelry(eq as any); saveEquipment('jewelry', eq as any); }}
              type="jewelry"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => {}}
              isEquipped={false}
            />

            <EquipmentSlot
              icon={<img src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//8-2-backpack-png-pic.png" alt="Backpack" className="w-24 h-24 object-contain" />}
              position="bottom-[5%] right-[2%]"
              equipment={bag || { name: 'Sac à dos', description: '', isTextArea: true }}
              onEquip={(eq) => { setBag(eq as any); saveEquipment('bag', eq as any); }}
              type="bag"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => {}}
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
              onAdd={(n) => updatePlayerMoney(curr, n, true)}
              onSpend={(n) => updatePlayerMoney(curr, n, false)}
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
          {/* Actions + filtre: recherche à gauche, types à droite (inclut Outils) */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => setShowList(true)} className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={20} /> Liste d’équipement</button>
            <button onClick={() => setShowCustom(true)} className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2"><Plus size={18} /> Objet personnalisé</button>

            <div className="flex-1 min-w-[220px] flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={bagFilter} onChange={(e) => setBagFilter(e.target.value)} placeholder="Filtrer le sac…" className="input-dark px-3 py-2 rounded-md w-full" />
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {(['armor','shield','weapon','equipment','potion','jewelry','tool'] as MetaType[]).map(k => (
                <button
                  key={k}
                  onClick={() => setBagKinds(prev => ({ ...prev, [k]: !prev[k] }))}
                  className={`px-2 py-1 rounded text-xs border ${bagKinds[k] ? 'border-red-500/40 text-red-300 bg-red-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-800/40'}`}
                >
                  {k === 'armor' ? 'Armure'
                    : k === 'shield' ? 'Bouclier'
                    : k === 'weapon' ? 'Arme'
                    : k === 'potion' ? 'Potion/Poison'
                    : k === 'jewelry' ? 'Bijoux'
                    : k === 'tool' ? 'Outils' : 'Équipement'}
                </button>
              ))}
            </div>
          </div>

          {/* Liste inventaire */}
          <div className="space-y-2">
            {filteredInventory.map(item => {
              const meta = parseMeta(item.description);
              const qty = meta?.quantity ?? 1;
              const isArmor = meta?.type === 'armor';
              const isShield = meta?.type === 'shield';
              const isWeapon = meta?.type === 'weapon';

              // Armure/Bouclier: état basé EXCLUSIVEMENT sur l’id d’inventaire du slot
              const isEquipped =
                (isArmor && armor?.inventory_item_id === item.id) ||
                (isShield && shield?.inventory_item_id === item.id) ||
                (isWeapon && !!meta?.equipped);

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
                      </div>

                      {/* Détails techniques quand déplié (sans redondance de description) */}
                      {expanded[item.id] && (isArmor || isShield || isWeapon) && (
                        <div className="text-xs text-gray-400 mt-2">
                          {isArmor && meta?.armor && <>CA: {meta.armor.label}</>}
                          {isShield && meta?.shield && <>Bonus de bouclier: +{meta.shield.bonus}</>}
                          {isWeapon && meta?.weapon && <>Dégâts: {meta.weapon.damageDice} {meta.weapon.damageType}{meta.weapon.properties ? ` • Props: ${meta.weapon.properties}` : ''}{meta.weapon.range ? ` • Portée: ${meta.weapon.range}` : ''}</>}
                        </div>
                      )}
                      {expanded[item.id] && !(isArmor || isShield || isWeapon) && (
                        <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{visibleDescription(item.description)}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(isArmor || isShield || isWeapon) && (
                        <button
                          onClick={() => toggleEquip(item)}
                          className={`px-2 py-1 rounded text-xs border ${isEquipped ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'}`}
                          title={isEquipped ? 'Cliquer pour déséquiper' : 'Cliquer pour équiper'}
                        >
                          {isEquipped ? 'Équipé' : 'Non équipé'}
                        </button>
                      )}
                      <button onClick={() => setEditingItem(item)} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/40 rounded-full" title="Paramètres">
                        <Settings size={16} />
                      </button>
                      <button onClick={() => removeItemFromInventory(item.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full" title="Supprimer l'objet">
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

      {showList && <EquipmentListModal onClose={() => setShowList(false)} onAddItem={addFromList} />}
      {showCustom && <CustomItemModal onClose={() => setShowCustom(false)} onAdd={addCustom} />}
      {editingItem && <InventoryItemEditModal item={editingItem} onClose={() => setEditingItem(null)} onSaved={refreshInventory} />}
    </div>
  );
}