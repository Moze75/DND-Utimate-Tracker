import React, { useMemo, useState } from 'react';
import {
  Backpack, Plus, Trash2, Shield, Sword, Settings,
  FlaskRound as Flask, Star, Coins, Search, X, Check, Filter
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

  // Armure: calcul par formule (remplace la CA de base)
  armor_formula?: {
    base: number;
    addDex: boolean;
    dexCap?: number | null;
    stealthDisadvantage?: boolean;
    strengthReq?: number | null;
    kind?: 'light' | 'medium' | 'heavy';
    label?: string;
  } | null;

  // Bouclier: simple bonus
  shield_bonus?: number | null;
}

type MetaType = 'armor' | 'shield' | 'weapon' | 'potion' | 'equipment' | 'jewelry';

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
  stealthDisadvantage?: boolean;
  strengthReq?: number | null;
  kind?: 'light' | 'medium' | 'heavy';
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

function parseMeta(description: string | null | undefined): ItemMeta | null {
  if (!description) return null;
  const lines = description.split('\n').map(l => l.trim());
  const metaLine = [...lines].reverse().find(l => l.startsWith(META_PREFIX));
  if (!metaLine) return null;
  try {
    const json = metaLine.slice(META_PREFIX.length);
    return JSON.parse(json);
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

// Supprime " (xxx po|pa|pc)" du nom
function stripPriceParentheses(name: string): string {
  return name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();
}

// Supprime la ligne #meta: de l’affichage de description
function visibleDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc.split('\n').filter((l) => !l.trim().startsWith(META_PREFIX)).join('\n').trim();
}

// Noms avec seulement la première lettre en majuscule
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

// Normalisation pour comparaisons robustes
function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/* ====================== Fetch + Parsing “Liste d’équipement” ====================== */

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
    if (row.length < 4) continue;
    const [nomRaw, ca, force, discr] = row;
    if (!nomRaw || nomRaw.toLowerCase().includes('armures')) continue;
    const nom = stripPriceParentheses(nomRaw);

    let base = 10, addDex = false, dexCap: number | null = null;
    const dexMatch = ca.match(/(\d+)\s*\+\s*modificateur de Dex(?:\s*\(max\s*(\d+)\))?/i);
    if (dexMatch) {
      base = parseInt(dexMatch[1], 10);
      addDex = true;
      dexCap = dexMatch[2] ? parseInt(dexMatch[2], 10) : null;
    } else {
      const justBase = ca.match(/^\s*(\d+)\s*$/);
      if (justBase) {
        base = parseInt(justBase[1], 10);
        addDex = false;
        dexCap = null;
      }
    }

    const stealthDisadvantage = /désavantage/i.test(discr || '');
    let strengthReq: number | null = null;
    const strMatch = (force || '').match(/For\s*(\d+)/i);
    if (strMatch) strengthReq = parseInt(strMatch[1], 10);

    let kind: 'light' | 'medium' | 'heavy' | undefined = undefined;
    if (/matelassée|cuir|clouté/i.test(nom)) kind = 'light';
    else if (/peaux|chemise de mailles|écailles|cuirasse|demi-plate/i.test(nom)) kind = 'medium';
    else kind = 'heavy';

    items.push({
      id: `armor:${nom}`,
      kind: 'armors',
      name: nom,
      // pas de duplication: l’étiquette montrera la formule, on garde une description courte
      description: '',
      armor: { base, addDex, dexCap, stealthDisadvantage, strengthReq, kind, label: ca },
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
    if (!nomRaw || nomRaw.toLowerCase().includes('armures')) continue;
    const nom = stripPriceParentheses(nomRaw);
    const m = ca.match(/\+?\s*(\d+)/);
    const bonus = m ? parseInt(m[1], 10) : 2;
    items.push({
      id: `shield:${nom}`,
      kind: 'shields',
      name: nom,
      // pas de duplication: l’étiquette montrera “+bonus”
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
    if (!nomRaw || nomRaw.toLowerCase() === 'nom') continue;
    const nom = stripPriceParentheses(nomRaw);

    const dmgMatch = (degats || '').match(/(\d+d\d+)/i);
    const damageDice = dmgMatch ? dmgMatch[1] : '1d6';

    let damageType: 'Tranchant' | 'Perforant' | 'Contondant' = 'Tranchant';
    if (/contondant/i.test(degats)) damageType = 'Contondant';
    else if (/perforant/i.test(degats)) damageType = 'Perforant';
    else if (/tranchant/i.test(degats)) damageType = 'Tranchant';

    let range = 'Corps à corps';
    const pm = (props || '').match(/portée\s*([\d,\.\/\s]+)/i);
    if (pm) {
      const first = pm[1].trim().split(/[\/\s]/)[0]?.trim() || '';
      if (first) range = `${first} m`;
    }

    items.push({
      id: `weapon:${nom}`,
      kind: 'weapons',
      name: nom,
      // pas de duplication: l’étiquette montrera dégâts/propriétés
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
    const description = current.descLines.join('\n').trim();
    items.push({ id: `${kind}:${name}`, kind, name, description });
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (current) flush();
      current = { name: h[1].trim(), descLines: [] };
      continue;
    }
    if (/^---\s*$/.test(line)) {
      if (current) { flush(); continue; }
    }
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

  React.useEffect(() => {
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
        const items: CatalogItem[] = [
          ...parseArmors(armorsMd),
          ...parseShields(shieldsMd),
          ...parseWeapons(weaponsMd),
          ...parseSectionedList(gearMd, 'adventuring_gear'),
          ...parseSectionedList(toolsMd, 'tools'),
        ];
        setAll(items);
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
      if (!filters[ci.kind]) return false;
      if (!q) return true;
      return ci.name.toLowerCase().includes(q);
    });
  }, [all, query, filters]);

  const handlePick = (ci: CatalogItem) => {
    if (quantity <= 0) {
      toast.error('Quantité invalide');
      return;
    }
    let meta: ItemMeta = { type: 'equipment', quantity, equipped: false };
    if (ci.kind === 'armors' && ci.armor) meta = { type: 'armor', quantity, equipped: false, armor: ci.armor };
    if (ci.kind === 'shields' && ci.shield) meta = { type: 'shield', quantity, equipped: false, shield: ci.shield };
    if (ci.kind === 'weapons' && ci.weapon) meta = { type: 'weapon', quantity, equipped: false, weapon: ci.weapon };

    // pas de description redondante pour arme/armure/bouclier
    const description = (ci.kind === 'adventuring_gear' || ci.kind === 'tools') ? (ci.description || '').trim() : '';

    onAddItem({
      name: ci.name,
      description,
      meta,
    });
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-stretch justify-stretch" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900 w-screen h-screen flex flex-col">
        {/* Header plein écran: recherche à gauche, filtres à droite */}
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
                onClick={() => setFilters(prev => ({ ...prev, [k]: !prev[k as keyof FilterState] }))}
                className={`px-2 py-1 rounded text-xs border ${
                  (filters as any)[k] ? 'border-red-500/40 text-red-300 bg-red-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-800/40'
                }`}
              >
                {k === 'weapons' ? 'Armes' :
                 k === 'armors' ? 'Armures' :
                 k === 'shields' ? 'Boucliers' :
                 k === 'adventuring_gear' ? 'Équipements' : 'Outils'}
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

        {/* Liste défilable pleine page */}
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
                        {ci.kind === 'armors' && ci.armor && `CA: ${ci.armor.label}${ci.armor.stealthDisadvantage ? ' • Désavantage Discrétion' : ''}`}
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
                      {(ci.kind === 'adventuring_gear' || ci.kind === 'tools') ? (
                        <div className="text-sm text-gray-300 whitespace-pre-wrap">{(ci.description || '').trim()}</div>
                      ) : (
                        <div className="text-sm text-gray-400">Aucun détail supplémentaire</div>
                      )}
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

/* ====================== Modal “Objet personnalisé” ====================== */

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

  // Armure
  const [armBase, setArmBase] = useState<number>(12);
  const [armAddDex, setArmAddDex] = useState<boolean>(true);
  const [armDexCap, setArmDexCap] = useState<number | ''>(2);
  const [armKind, setArmKind] = useState<'light' | 'medium' | 'heavy'>('medium');

  // Bouclier
  const [shieldBonus, setShieldBonus] = useState<number>(2);

  // Arme
  const [wDice, setWDice] = useState('1d6');
  const [wType, setWType] = useState<'Tranchant' | 'Perforant' | 'Contondant'>('Tranchant');
  const [wProps, setWProps] = useState('');
  const [wRange, setWRange] = useState('Corps à corps');

  const add = () => {
    const cleanNameRaw = name.trim();
    if (!cleanNameRaw) {
      toast.error('Nom requis');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantité invalide');
      return;
    }
    const cleanName = smartCapitalize(cleanNameRaw);
    let meta: ItemMeta = { type, quantity, equipped: false };
    if (type === 'armor') {
      const cap = armDexCap === '' ? null : Number(armDexCap);
      const label = `${armBase}${armAddDex ? ` + modificateur de Dex${cap != null ? ` (max ${cap})` : ''}` : ''}`;
      meta.armor = { base: armBase, addDex: armAddDex, dexCap: cap, kind: armKind, label };
    } else if (type === 'shield') {
      meta.shield = { bonus: shieldBonus };
    } else if (type === 'weapon') {
      meta.weapon = { damageDice: wDice, damageType: wType, properties: wProps, range: wRange };
    }
    onAdd({ name: cleanName, description: description.trim(), meta });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-3" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900/95 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4">
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
            </select>
          </div>
        </div>

        {type === 'armor' && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Base CA</label>
              <input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={armBase} onChange={e => setArmBase(parseInt(e.target.value) || 10)} />
            </div>
            <div className="flex items-center gap-2">
              <input id="addDex" type="checkbox" checked={armAddDex} onChange={e => setArmAddDex(e.target.checked)} />
              <label htmlFor="addDex" className="text-sm text-gray-300">Ajoute mod DEX</label>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cap DEX (vide = illimité)</label>
              <input
                type="number"
                className="input-dark w-full px-3 py-2 rounded-md"
                value={armDexCap}
                onChange={e => setArmDexCap(e.target.value === '' ? '' : parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Catégorie</label>
              <select className="input-dark w-full px-3 py-2 rounded-md" value={armKind} onChange={e => setArmKind(e.target.value as any)}>
                <option value="light">Légère</option>
                <option value="medium">Intermédiaire</option>
                <option value="heavy">Lourde</option>
              </select>
            </div>
          </div>
        )}

        {type === 'shield' && (
          <div className="mt-3">
            <label className="block text-sm text-gray-400 mb-1">Bonus de bouclier</label>
            <input type="number" className="input-dark w-full px-3 py-2 rounded-md" value={shieldBonus} onChange={e => setShieldBonus(parseInt(e.target.value) || 0)} />
          </div>
        )}

        {type === 'weapon' && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Dés de dégâts</label>
              <input className="input-dark w-full px-3 py-2 rounded-md" value={wDice} onChange={e => setWDice(e.target.value)} placeholder="1d6" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type de dégâts</label>
              <select className="input-dark w-full px-3 py-2 rounded-md" value={wType} onChange={e => setWType(e.target.value as any)}>
                <option>Tranchant</option>
                <option>Perforant</option>
                <option>Contondant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Propriétés</label>
              <input className="input-dark w-full px-3 py-2 rounded-md" value={wProps} onChange={e => setWProps(e.target.value)} placeholder="Finesse, Polyvalente..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Portée</label>
              <input className="input-dark w-full px-3 py-2 rounded-md" value={wRange} onChange={e => setWRange(e.target.value)} placeholder="Corps à corps, 6 m..." />
            </div>
          </div>
        )}

        <div className="mt-3">
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea className="input-dark w-full px-3 py-2 rounded-md" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
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

/* ====================== Popup des slots (avec bouton Équipé) ====================== */

const getTitle = (type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag') => {
  switch (type) {
    case 'potion': return 'Potions';
    case 'shield': return 'Bouclier';
    case 'armor': return 'Armure';
    case 'weapon': return 'Armes';
    case 'bag': return 'Sac à dos';
    case 'jewelry': return 'Bijoux';
    default: return '';
  }
};

interface InfoBubbleProps {
  equipment: Equipment | null;
  position: string;
  onClose: () => void;
  setIsEditing: (value: boolean) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  onToggleEquip?: () => void;
  isEquipped?: boolean;
  onRequestOpenList?: () => void;
}

const InfoBubble = ({ equipment, position, onClose, setIsEditing, type, onToggleEquip, isEquipped, onRequestOpenList }: InfoBubbleProps) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[70]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[69]" onClick={onClose} />
      <div className="relative p-4 bg-gray-900/95 text-sm text-gray-300 rounded-lg shadow-lg w-[min(32rem,95vw)] border border-gray-700/50 z-[70]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-100 text-lg">{getTitle(type)}</h4>
          <div className="flex items-center gap-1">
            {(type === 'armor' || type === 'shield') && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleEquip?.(); }}
                className={`px-2 py-1 rounded text-xs border ${
                  isEquipped ? 'border-green-500/40 text-green-300 bg-green-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'
                }`}
              >
                {isEquipped ? 'Équipé' : 'Non équipé'}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Modifier (contenu texte)"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {equipment ? (
          <div className="space-y-1">
            {equipment.name && <h5 className="font-medium text-gray-100 break-words">{smartCapitalize(equipment.name)}</h5>}
            {equipment.description && <p className="text-sm text-gray-400 whitespace-pre-wrap">{equipment.description}</p>}

            {type === 'armor' && equipment.armor_formula && (
              <div className="mt-2 text-sm text-gray-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Formule</span>
                  <span className="font-medium text-gray-100">{equipment.armor_formula.label || ''}</span>
                </div>
              </div>
            )}

            {type === 'shield' && typeof equipment.shield_bonus === 'number' && (
              <div className="mt-2 text-sm text-gray-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Bonus de bouclier</span>
                  <span className="font-medium text-gray-100">+{equipment.shield_bonus}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          (type === 'armor' || type === 'shield') ? (
            <div className="text-sm text-gray-400">
              Aucun {type === 'armor' ? 'armure' : 'bouclier'} équipé.
              <div className="mt-3">
                <button
                  onClick={() => onRequestOpenList?.()}
                  className="btn-primary px-3 py-2 rounded-lg"
                >
                  Équiper depuis la liste
                </button>
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

/* ====================== Equipment Slot ====================== */

interface EquipmentSlotProps {
  icon: React.ReactNode;
  position: string;
  equipment: Equipment | null;
  onEquip: (equipment: Equipment | null) => void;
  type: 'armor' | 'weapon' | 'shield' | 'potion' | 'jewelry' | 'bag';
  bubblePosition: string;
  onRequestOpenList: () => void;
  onToggleEquipFromSlot: () => void;
  isEquipped: boolean;
}

const EquipmentSlot = ({
  icon, position, equipment, onEquip, type, bubblePosition, onRequestOpenList, onToggleEquipFromSlot, isEquipped
}: EquipmentSlotProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleClick = () => setShowInfo(prev => !prev);
  const handleClose = () => setShowInfo(false);
  const handleEdit = () => { setShowInfo(false); setIsEditing(true); };

  return (
    <>
      <button
        onClick={handleClick}
        className={`absolute ${position} ${type === 'bag' ? 'w-24 h-24' : 'w-12 h-12'} rounded-lg hover:bg-gray-700/20 transition-all duration-200 border border-gray-600/50 hover:border-gray-500/50 flex items-center justify-center cursor-pointer`}
        style={{ zIndex: showInfo ? 50 : 10 }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {type === 'bag' ? icon : React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
      </button>

      {showInfo && (
        <InfoBubble
          equipment={equipment}
          position={bubblePosition}
          onClose={handleClose}
          setIsEditing={handleEdit}
          type={type}
          onToggleEquip={onToggleEquipFromSlot}
          isEquipped={isEquipped}
          onRequestOpenList={onRequestOpenList}
        />
      )}

      {isEditing && (
        <div /> /* édition via sac uniquement */
      )}
    </>
  );
};

/* ====================== Modal d’édition d’un item d’inventaire ====================== */

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
    <div className="fixed inset-0 bg-black/60 z-[85] flex items-center justify-center p-3" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900/95 border border-gray-800 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-100">Modifier l’objet</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg">
            <X />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom</label>
            <input className="input-dark w-full px-3 py-2 rounded-md" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea className="input-dark w-full px-3 py-2 rounded-md" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
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

/* ====================== Main component ====================== */

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
  const getCurrencyColor = (c: Currency) => c === 'gold' ? 'text-yellow-500' : c === 'silver' ? 'text-gray-300' : 'text-orange-400';
  const getCurrencyName = (c: Currency) => c === 'gold' ? 'Or' : c === 'silver' ? 'Argent' : 'Cuivre';
  const handleAction = (add: boolean) => {
    const n = parseInt(amount) || 0;
    if (n > 0) { (add ? onAdd : onSpend)(n); setAmount(''); }
  };
  return (
    <div className="flex items-center gap-2 h-11 relative">
      <div className={`w-16 text-center font-medium ${getCurrencyColor(currency)}`}>{getCurrencyName(currency)}</div>
      <div className="w-16 h-full text-center bg-gray-800/50 rounded-md flex items-center justify-center font-bold">{value}</div>
      <div className="flex-1 flex items-center justify-end gap-1">
        <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-dark w-20 h-11 px-2 rounded-md text-center text-base" placeholder="0" />
        <button onClick={() => handleAction(true)} className="h-11 w-[72px] text-base text-green-500 hover:bg-green-900/30 rounded-md transition-colors whitespace-nowrap border border-green-500/20 hover:border-green-500/40">Ajouter</button>
        <button onClick={() => handleAction(false)} className="h-11 w-[72px] text-base text-red-500 hover:bg-red-900/30 rounded-md transition-colors whitespace-nowrap border border-red-500/20 hover:border-red-500/40">Dépenser</button>
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

  // Slots
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

  /* ===== Money ===== */
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

  /* ===== Inventory CRUD ===== */
  const refreshInventory = async () => {
    const { data } = await supabase.from('inventory_items').select('*').eq('player_id', player.id);
    if (data) onInventoryUpdate(data);
  };

  const addFromList = async (payload: { name: string; description?: string; meta: ItemMeta }) => {
    try {
      // Pas de redondance: description déjà nettoyée côté modal
      const finalDesc = injectMetaIntoDescription(payload.description || '', payload.meta);
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
      const finalDesc = injectMetaIntoDescription(payload.description || '', payload.meta);
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
    const nextDesc = injectMetaIntoDescription(visibleDescription(item.description), nextMeta);
    const { error } = await supabase.from('inventory_items').update({ description: nextDesc }).eq('id', item.id);
    if (error) throw error;
  };

  // Déséquipe tous les autres objets d’un type (armure ou bouclier) pour garantir l’unicité
  const unequipOthersOfType = async (type: 'armor' | 'shield', keepItemId?: string) => {
    const updates: Promise<any>[] = [];
    for (const it of inventory) {
      const meta = parseMeta(it.description);
      if (!meta) continue;
      if ((type === 'armor' && meta.type === 'armor') || (type === 'shield' && meta.type === 'shield')) {
        if (it.id !== keepItemId && meta.equipped) {
          updates.push(updateItemMeta(it, { ...meta, equipped: false }));
        }
      }
    }
    if (updates.length) {
      await Promise.allSettled(updates);
      await refreshInventory();
    }
  };

  /* ===== Equip / Unequip toggle (unique) ===== */
  const toggleEquip = async (item: InventoryItem) => {
    const meta = parseMeta(item.description);
    if (!meta) return;

    const nextEquipped = !meta.equipped;
    const nextMeta: ItemMeta = { ...meta, equipped: nextEquipped };

    try {
      // Garantit 1 seule armure/bouclier équipée à la fois
      if (meta.type === 'armor' && nextEquipped) await unequipOthersOfType('armor', item.id);
      if (meta.type === 'shield' && nextEquipped) await unequipOthersOfType('shield', item.id);

      // Persiste l’état
      await updateItemMeta(item, nextMeta);

      // Applique effet gameplay
      if (meta.type === 'armor') {
        if (nextEquipped && meta.armor) {
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            armor_formula: {
              base: meta.armor.base,
              addDex: meta.armor.addDex,
              dexCap: meta.armor.dexCap ?? null,
              strengthReq: meta.armor.strengthReq ?? null,
              stealthDisadvantage: meta.armor.stealthDisadvantage ?? false,
              kind: meta.armor.kind,
              label: meta.armor.label,
            },
          };
          setArmor(eq); await saveEquipment('armor', eq);
        } else {
          setArmor(null); await saveEquipment('armor', null);
        }
      }
      if (meta.type === 'shield') {
        if (nextEquipped && meta.shield) {
          const eq: Equipment = {
            name: item.name,
            description: visibleDescription(item.description),
            shield_bonus: meta.shield.bonus,
          };
          setShield(eq); await saveEquipment('shield', eq);
        } else {
          setShield(null); await saveEquipment('shield', null);
        }
      }
      if (meta.type === 'weapon') {
        if (nextEquipped && meta.weapon) {
          try {
            const newAttack = await attackService.addAttack({
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
            if (newAttack) {
              toast.success('Attaque créée');
            } else {
              toast.error("Impossible de créer l'attaque (vérifier les permissions RLS)");
            }
          } catch (err: any) {
            console.error(err);
            toast.error("Création d'attaque impossible. Si vous voyez un code 42501 (RLS), ajoutez une policy d'insert sur attacks.");
          }
        }
      }

      // Rafraîchir l’inventaire pour refléter “equipped”
      await refreshInventory();
    } catch (e) {
      console.error(e);
      toast.error('Erreur bascule équiper');
    }
  };

  // Toggle depuis slot: bascule l’état (si rien d’équipé, ouvre la liste)
  const toggleFromSlot = async (slot: 'armor' | 'shield') => {
    const equippedName = slot === 'armor' ? armor?.name : shield?.name;
    if (!equippedName) {
      setShowList(true);
      return;
    }
    const item = inventory.find(i => norm(stripPriceParentheses(i.name)) === norm(stripPriceParentheses(equippedName)));
    if (!item) {
      if (slot === 'armor') { setArmor(null); await saveEquipment('armor', null); }
      if (slot === 'shield') { setShield(null); await saveEquipment('shield', null); }
      return;
    }
    const meta = parseMeta(item.description);
    if (!meta) return;
    const nextMeta: ItemMeta = { ...meta, equipped: false };
    await updateItemMeta(item, nextMeta);
    if (slot === 'armor') { setArmor(null); await saveEquipment('armor', null); }
    if (slot === 'shield') { setShield(null); await saveEquipment('shield', null); }
    await refreshInventory();
  };

  // État d’expansion du sac
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // Filtre du sac
  const [bagFilter, setBagFilter] = useState('');
  const [bagKinds, setBagKinds] = useState<Record<MetaType, boolean>>({
    armor: true, shield: true, weapon: true, equipment: true, potion: true, jewelry: true
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

  return (
    <div className="space-y-6">
      {/* Carte personnage équipable */}
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

            {/* Armor slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-purple-500" />}
              position="top-[25%] left-1/2 -translate-x-1/2 bg-gray-800/50"
              equipment={armor || null}
              onEquip={(eq) => { setArmor(eq); saveEquipment('armor', eq); }}
              type="armor"
              bubblePosition="right-[5%] top-[15%]"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => toggleFromSlot('armor')}
              isEquipped={!!armor}
            />

            {/* Shield slot */}
            <EquipmentSlot
              icon={<Shield size={24} className="text-blue-500" />}
              position="top-[45%] left-[15%] bg-gray-800/50"
              equipment={shield || null}
              onEquip={(eq) => { setShield(eq as any); saveEquipment('shield', eq as any); }}
              type="shield"
              bubblePosition="left-[5%] top-[15%]"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => toggleFromSlot('shield')}
              isEquipped={!!shield}
            />

            {/* Weapon slot (informationnel) */}
            <EquipmentSlot
              icon={<Sword size={24} className="text-red-500" />}
              position="top-[45%] right-[15%] bg-gray-800/50"
              equipment={weapon || { name: 'Armes', description: 'Gérées dans Attaques', isTextArea: true }}
              onEquip={(eq) => { setWeapon(eq as any); saveEquipment('weapon', eq as any); }}
              type="weapon"
              bubblePosition="right-[5%] top-[15%]"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => {}}
              isEquipped={false}
            />

            {/* Potion */}
            <EquipmentSlot
              icon={<Flask size={24} className="text-green-500" title="Potions et poisons" />}
              position="top-[5%] right-[5%] bg-gray-800/50"
              equipment={potion || { name: 'Potions et poisons', description: '', isTextArea: true }}
              onEquip={(eq) => { setPotion(eq as any); saveEquipment('potion', eq as any); }}
              type="potion"
              bubblePosition="right-[5%] top-[5%]"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => {}}
              isEquipped={false}
            />

            {/* Bijoux */}
            <EquipmentSlot
              icon={<Star size={24} className="text-yellow-500" />}
              position="top-[15%] right-[5%] bg-gray-800/50"
              equipment={jewelry || { name: 'Bijoux', description: '', isTextArea: true }}
              onEquip={(eq) => { setJewelry(eq as any); saveEquipment('jewelry', eq as any); }}
              type="jewelry"
              bubblePosition="right-[5%] top-[15%]"
              onRequestOpenList={() => setShowList(true)}
              onToggleEquipFromSlot={() => {}}
              isEquipped={false}
            />

            {/* Sac */}
            <EquipmentSlot
              icon={<img src="https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static//8-2-backpack-png-pic.png" alt="Backpack" className="w-24 h-24 object-contain" />}
              position="bottom-[5%] right-[2%]"
              equipment={bag || { name: 'Sac à dos', description: '', isTextArea: true }}
              onEquip={(eq) => { setBag(eq as any); saveEquipment('bag', eq as any); }}
              type="bag"
              bubblePosition="left-[5%] bottom-[5%]"
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
          {/* Barre actions + filtre: recherche à gauche, filtres à droite */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setShowList(true)}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 justify-center"
              title="Ouvrir la liste d’équipement"
            >
              <Plus size={20} />
              Liste d’équipement
            </button>
            <button
              onClick={() => setShowCustom(true)}
              className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700/40 text-gray-200 flex items-center gap-2"
              title="Créer un objet personnalisé"
            >
              <Plus size={18} />
              Objet personnalisé
            </button>

            <div className="flex-1 min-w-[220px] flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={bagFilter}
                onChange={(e) => setBagFilter(e.target.value)}
                placeholder="Filtrer le sac…"
                className="input-dark px-3 py-2 rounded-md w-full"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {(['armor','shield','weapon','equipment','potion','jewelry'] as MetaType[]).map(k => (
                <button
                  key={k}
                  onClick={() => setBagKinds(prev => ({ ...prev, [k]: !prev[k] }))}
                  className={`px-2 py-1 rounded text-xs border ${
                    bagKinds[k] ? 'border-red-500/40 text-red-300 bg-red-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-800/40'
                  }`}
                >
                  {k === 'armor' ? 'Armure' :
                   k === 'shield' ? 'Bouclier' :
                   k === 'weapon' ? 'Arme' :
                   k === 'potion' ? 'Potion/Poison' :
                   k === 'jewelry' ? 'Bijoux' : 'Équipement'}
                </button>
              ))}
            </div>
          </div>

          {/* Liste inventaire (dépliable + bouton unique Équipé/Non équipé + roue paramètres) */}
          <div className="space-y-2">
            {filteredInventory.map((item) => {
              const meta = parseMeta(item.description);
              const qty = meta?.quantity ?? 1;
              const desc = visibleDescription(item.description);
              const isArmor = meta?.type === 'armor';
              const isShield = meta?.type === 'shield';
              const isWeapon = meta?.type === 'weapon';

              // Statut “équipé” (slots pour armure/bouclier, méta pour arme)
              const equippedBySlot =
                (isArmor && armor && norm(stripPriceParentheses(armor.name)) === norm(stripPriceParentheses(item.name))) ||
                (isShield && shield && norm(stripPriceParentheses(shield.name)) === norm(stripPriceParentheses(item.name)));

              const isEquipped = equippedBySlot || !!meta?.equipped;

              return (
                <div key={item.id} className="bg-gray-800/40 border border-gray-700/40 rounded-md">
                  <div className="flex items-start justify-between p-2">
                    <div className="flex-1 mr-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="text-left text-gray-100 font-medium hover:underline break-words"
                          title="Voir le détail"
                        >
                          {smartCapitalize(item.name)}
                        </button>
                        {qty > 1 && <span className="text-xs px-2 py-0.5 rounded bg-gray-700/60 text-gray-300">x{qty}</span>}
                        {isArmor && <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-300">Armure</span>}
                        {isShield && <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300">Bouclier</span>}
                        {isWeapon && <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-300">Arme</span>}
                      </div>
                      {desc && (
                        <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{desc}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(isArmor || isShield || isWeapon) && (
                        <button
                          onClick={() => toggleEquip(item)}
                          className={`px-2 py-1 rounded text-xs border ${
                            isEquipped
                              ? 'border-green-500/40 text-green-300 bg-green-900/20'
                              : 'border-gray-600 text-gray-300 hover:bg-gray-700/40'
                          }`}
                          title={isEquipped ? 'Cliquer pour déséquiper' : 'Cliquer pour équiper'}
                        >
                          {isEquipped ? 'Équipé' : 'Non équipé'}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700/40 rounded-full transition-colors"
                        title="Paramètres"
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => removeItemFromInventory(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
                        title="Supprimer l'objet"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Détail déplié – pleine largeur */}
                  {expanded[item.id] && (
                    <div className="px-3 pb-3">
                      {isArmor && meta?.armor && (
                        <div className="text-xs text-gray-400">
                          CA: {meta.armor.label}{meta.armor.stealthDisadvantage ? ' • Désavantage Discrétion' : ''}
                          {meta.armor.strengthReq ? ` • For ${meta.armor.strengthReq}` : ''}
                        </div>
                      )}
                      {isShield && meta?.shield && (
                        <div className="text-xs text-gray-400">Bonus de bouclier: +{meta.shield.bonus}</div>
                      )}
                      {isWeapon && meta?.weapon && (
                        <div className="text-xs text-gray-400">
                          Dégâts: {meta.weapon.damageDice} {meta.weapon.damageType}
                          {meta.weapon.properties ? ` • Props: ${meta.weapon.properties}` : ''}
                          {meta.weapon.range ? ` • Portée: ${meta.weapon.range}` : ''}
                        </div>
                      )}
                      {desc && !(isArmor || isShield || isWeapon) && (
                        <div className="text-xs text-gray-400 mt-1">{/* description juste pour les autres */}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showList && (
        <EquipmentListModal
          onClose={() => setShowList(false)}
          onAddItem={addFromList}
        />
      )}

      {showCustom && (
        <CustomItemModal
          onClose={() => setShowCustom(false)}
          onAdd={addCustom}
        />
      )}

      {editingItem && (
        <InventoryItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={refreshInventory}
        />
      )}
    </div>
  );
}