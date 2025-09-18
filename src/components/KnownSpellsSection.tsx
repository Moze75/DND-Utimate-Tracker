import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, BookOpen, Search, Check, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { Player } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { SpellbookModal } from './SpellbookModal';

interface KnownSpell {
  id: string;
  player_id: string;
  spell_id: string;
  spell_name: string;
  spell_level: number;
  spell_school: string;
  spell_description: string;
  spell_casting_time: string;
  spell_range: string;
  spell_duration: string;
  spell_components: {
    V: boolean;
    S: boolean;
    M: string | null;
  };
  spell_higher_levels?: string;
  is_prepared: boolean;
  created_at: string;
}

interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: {
    V: boolean;
    S: boolean;
    M: string | null;
  };
  duration: string;
  description: string;
  higher_levels?: string;
  classes: string[];
}

interface KnownSpellsSectionProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

// Utilitaire pour formater les composantes de sort
const getComponentsText = (components: { V: boolean; S: boolean; M: string | null }) => {
  const parts: string[] = [];
  if (components.V) parts.push('V');
  if (components.S) parts.push('S');
  if (components.M) parts.push(`M (${components.M})`);
  return parts.join(', ');
};

// Helpers D&D (DD des sorts)
const getModifier = (score: number): number => Math.floor((score - 10) / 2);
const getProficiencyBonusForLevel = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};
const getSpellcastingAbilityName = (cls?: string): 'Charisme' | 'Sagesse' | 'Intelligence' | null => {
  if (!cls) return null;
  const c = cls.toLowerCase();
  if (c.includes('barde') || c.includes('bard')) return 'Charisme';
  if (c.includes('clerc') || c.includes('cleric')) return 'Sagesse';
  if (c.includes('druide') || c.includes('druid')) return 'Sagesse';
  if (c.includes('ensorceleur') || c.includes('sorcerer')) return 'Charisme';
  if (c.includes('magicien') || c.includes('wizard')) return 'Intelligence';
  if (c.includes('paladin')) return 'Charisme';
  if (c.includes('rôdeur') || c.includes('rodeur') || c.includes('ranger')) return 'Sagesse';
  if (c.includes('occultiste') || c.includes('warlock')) return 'Charisme';
  return null;
};
const getAbilityModFromPlayer = (player: Player, abilityNameFr: 'Charisme' | 'Sagesse' | 'Intelligence'): number => {
  const ability = player.abilities?.find(a => a.name === abilityNameFr);
  if (!ability) return 0;
  if (typeof (ability as any).modifier === 'number') return (ability as any).modifier;
  if (typeof (ability as any).score === 'number') return getModifier((ability as any).score);
  return 0;
};

// Animations CSS (injectées dynamiquement)
const magicalAnimationCSS = `
  @keyframes magical-explosion {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; background: radial-gradient(circle, #8b5cf6 0%, #3b82f6 50%, transparent 70%); border-radius: 50%; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; box-shadow: 0 0 20px #8b5cf6, 0 0 40px #3b82f6; }
    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
  }
`;

/* ===== Règles d’affichage des niveaux de slots D&D 5e (bornage par classe/niveau) ===== */
type CasterType = 'full' | 'half' | 'warlock' | 'none';
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const getCasterType = (cls?: string): CasterType => {
  if (!cls) return 'none';
  const c = normalize(cls);
  if (['wizard','magicien','mage'].some(k => c.includes(k))) return 'full';
  if (['sorcerer','ensorceleur'].some(k => c.includes(k))) return 'full';
  if (['cleric','clerc'].some(k => c.includes(k))) return 'full';
  if (['druid','druide'].some(k => c.includes(k))) return 'full';
  if (['bard','barde'].some(k => c.includes(k))) return 'full';
  if (['paladin'].some(k => c.includes(k))) return 'half';
  if (['ranger','rodeur','rôdeur'].some(k => c.includes(k))) return 'half';
  if (['artificer','artificier'].some(k => c.includes(k))) return 'half';
  if (['warlock','sorcier'].some(k => c.includes(k))) return 'warlock';
  return 'none';
};
const getWarlockPactSlotLevel = (level: number): number => {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  if (level <= 6) return 3;
  if (level <= 8) return 4;
  return 5;
};
const getHighestAllowedSlotLevel = (casterType: CasterType, level: number): number => {
  if (casterType === 'warlock') return getWarlockPactSlotLevel(level);
  if (casterType === 'full') return Math.min(9, Math.ceil(level / 2));
  if (casterType === 'half') {
    const eff = Math.floor(level / 2);
    return Math.min(5, Math.max(0, Math.ceil(eff / 2)));
  }
  return 0;
};
const getCharacterLevel = (player: Player): number => Number((player as any).level ?? 1) || 1;

/* ====== Composants ====== */

const SpellLevelStats = React.memo(({ 
  levelName, 
  player, 
  onUpdate, 
  usedSlots, 
  maxSlots 
}: {
  levelName: string;
  player: Player;
  onUpdate: (player: Player) => void;
  usedSlots: number;
  maxSlots: number;
}) => {
  const level = parseInt(levelName.split(' ')[1]);
  const remainingSlots = Math.max(0, maxSlots - usedSlots);

  const handleSlotUse = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (remainingSlots <= 0) return;

    // Effet visuel rapide
    const button = e.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = `${rect.left}px`;
    container.style.top = `${rect.top}px`;
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    const anim = document.createElement('div');
    anim.style.position = 'absolute';
    anim.style.left = '50%';
    anim.style.top = '50%';
    anim.style.width = '200px';
    anim.style.height = '200px';
    anim.style.animation = 'magical-explosion 0.6s ease-out forwards';
    container.appendChild(anim);
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 600);

    try {
      const usedKey = `used${level}` as keyof typeof player.spell_slots;
      const newSpellSlots = {
        ...player.spell_slots,
        [usedKey]: usedSlots + 1
      };
      const { error } = await supabase.from('players').update({ spell_slots: newSpellSlots }).eq('id', player.id);
      if (error) throw error;

      onUpdate({ ...player, spell_slots: newSpellSlots });
      toast.success(`✨ Emplacement de niveau ${level} utilisé`);
    } catch (err) {
      console.error('Erreur slots:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [level, remainingSlots, usedSlots, player, onUpdate]);

  if (maxSlots === 0) return null;

  return (
    <div className="flex items-center gap-2 ml-auto">
      <div className="flex gap-0.5">
        {Array.from({ length: maxSlots }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm border transition-all duration-300 ${
              i < usedSlots ? 'bg-gray-600 border-gray-500 opacity-50' : 'bg-purple-500 border-purple-400 shadow-sm'
            }`}
          />
        ))}
      </div>
      <span className={`text-xs ${remainingSlots === 0 ? 'text-red-400' : remainingSlots <= 2 ? 'text-yellow-400' : 'text-gray-400'}`}>
        {remainingSlots}/{maxSlots}
      </span>
      <button
        onClick={handleSlotUse}
        className={`w-12 h-12 rounded border flex items-center justify-center text-xs font-bold transition-all duration-200 ${
          remainingSlots > 0
            ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30 hover:border-red-500/60'
            : 'bg-gray-700/50 border-gray-600/50 text-gray-500 cursor-not-allowed'
        }`}
        disabled={remainingSlots <= 0}
        title={`Consommer un emplacement de niveau ${level}`}
      >
        <Zap size={20} />
      </button>
    </div>
  );
});
SpellLevelStats.displayName = 'SpellLevelStats';

function SpellCard({ 
  spell, 
  expandedSpell, 
  setExpandedSpell,
  onTogglePrepared,
  onRemoveSpell
}: {
  spell: KnownSpell;
  expandedSpell: string | null;
  setExpandedSpell: (id: string | null) => void;
  onTogglePrepared: (id: string, isPrepared: boolean) => void;
  onRemoveSpell: (id: string) => void;
}) {
  const isExpanded = expandedSpell === spell.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRemoveSpell = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };
  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveSpell(spell.id);
    setShowDeleteConfirm(false);
  };
  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  return (
    <div 
      className={`bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden transition-all duration-300 relative ${
        isExpanded ? 'ring-2 ring-purple-500/30 shadow-lg shadow-purple-900/20' : 'hover:bg-gray-700/50'
      } ${spell.is_prepared ? 'border-green-500/30 bg-green-900/10' : ''}`}
    >
      <button
        onClick={() => setExpandedSpell(isExpanded ? null : spell.id)}
        className="w-full text-left p-2 transition-all duration-200"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <h4 className={`font-medium ${spell.is_prepared ? 'text-green-100' : 'text-gray-100'}`}>
              {spell.spell_name}
            </h4>
            {spell.is_prepared && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`text-xs px-2 py-1 rounded-full ${spell.spell_level === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
              {spell.spell_level === 0 ? 'Tour' : `Niv. ${spell.spell_level}`}
            </div>
            {spell.is_prepared && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                <Check size={10} />
                Préparé
              </span>
            )}
            <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
          <span className="capitalize">{spell.spell_school}</span>
          <span>•</span>
          <span>{spell.spell_range}</span>
        </div>
      </button>
      
      <div className="px-2 pb-2 flex items-center justify-end gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePrepared(spell.id, spell.is_prepared);
          }}
          className={`w-6 h-6 rounded-lg ${spell.is_prepared ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'} flex items-center justify-center transition-colors`}
          title={spell.is_prepared ? 'Dépréparer' : 'Préparer'}
        >
          <Check size={16} />
        </button>
        
        <button
          onClick={handleRemoveSpell}
          className="w-6 h-6 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg flex items-center justify-center"
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-lg">
          <div className="bg-gray-900 border border-red-500/50 rounded-lg p-4 shadow-xl min-w-[250px] mx-4">
            <div className="text-sm text-gray-200 mb-4 text-center">
              Supprimer <span className="font-medium text-red-400">"{spell.spell_name}"</span> ?
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={cancelDelete} className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">Annuler</button>
              <button onClick={confirmDelete} className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-gray-700/50 bg-gray-900/50">
          <div className="p-3 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700/30">
                <div className="text-xs font-medium text-gray-400 mb-1">Temps d'incantation</div>
                <div className="text-sm text-gray-200 font-medium">{spell.spell_casting_time}</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700/30">
                <div className="text-xs font-medium text-gray-400 mb-1">Portée</div>
                <div className="text-sm text-gray-200 font-medium">{spell.spell_range}</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700/30">
                <div className="text-xs font-medium text-gray-400 mb-1">Composantes</div>
                <div className="text-sm text-gray-200 font-medium">{getComponentsText(spell.spell_components)}</div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700/30">
                <div className="text-xs font-medium text-gray-400 mb-1">Durée</div>
                <div className="text-sm text-gray-200 font-medium">{spell.spell_duration}</div>
              </div>
            </div>

            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/20">
              <h5 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-400" />
                Description
              </h5>
              <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                {spell.spell_description}
                {spell.spell_higher_levels && `\n\n${spell.spell_higher_levels}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function KnownSpellsSection({ player, onUpdate }: KnownSpellsSectionProps) {
  const [knownSpells, setKnownSpells] = useState<KnownSpell[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSpellbook, setShowSpellbook] = useState(false);
  const [selectedSpells, setSelectedSpells] = useState<Spell[]>([]);
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrepared, setFilterPrepared] = useState<'all' | 'prepared' | 'unprepared'>('all');

  // Inject animations CSS
  useEffect(() => {
    const id = 'magical-animations';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = magicalAnimationCSS;
      document.head.appendChild(style);
    }
  }, []);

  const toggleLevelCollapse = useCallback((levelName: string) => {
    setCollapsedLevels(prev => {
      const next = new Set(prev);
      if (next.has(levelName)) next.delete(levelName);
      else next.add(levelName);
      return next;
    });
  }, []);

  useEffect(() => {
    fetchKnownSpells();
  }, [player.id]);

  const fetchKnownSpells = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('player_spells')
        .select(`
          id,
          player_id,
          spell_id,
          is_prepared,
          created_at,
          spells ( id, name, level, school, casting_time, range, components, duration, description, higher_levels )
        `)
        .eq('player_id', player.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const transformed: KnownSpell[] = (data || []).map(item => ({
        id: item.id,
        player_id: item.player_id,
        spell_id: item.spell_id,
        spell_name: item.spells.name,
        spell_level: item.spells.level,
        spell_school: item.spells.school,
        spell_description: item.spells.description,
        spell_casting_time: item.spells.casting_time,
        spell_range: item.spells.range,
        spell_duration: item.spells.duration,
        spell_components: item.spells.components,
        spell_higher_levels: item.spells.higher_levels,
        is_prepared: item.is_prepared,
        created_at: item.created_at
      }));
      setKnownSpells(transformed);
    } catch (err) {
      console.error('Erreur sorts connus:', err);
      toast.error('Erreur lors de la récupération des sorts connus');
    } finally {
      setLoading(false);
    }
  };

  const handleSpellsSelected = async (spells: Spell[]) => {
    try {
      const spellIds = spells.map(s => s.id);
      const { data: existing } = await supabase.from('spells').select('id').in('id', spellIds);
      const existIds = new Set(existing?.map(s => s.id) || []);
      const toInsert = spells
        .filter(spell => !existIds.has(spell.id))
        .map(spell => ({
          id: spell.id,
          name: spell.name,
          level: spell.level,
          school: spell.school,
          casting_time: spell.casting_time,
          range: spell.range,
          components: spell.components,
          duration: spell.duration,
          description: spell.description,
          higher_levels: spell.higher_levels || null
        }));
      if (toInsert.length > 0) {
        await supabase.from('spells').upsert(toInsert, { onConflict: 'id', ignoreDuplicates: true });
      }
      const links = spells.map(spell => ({ player_id: player.id, spell_id: spell.id, is_prepared: false }));
      const { error: linkErr } = await supabase.from('player_spells').upsert(links, { onConflict: 'player_id,spell_id', ignoreDuplicates: true });
      if (linkErr) throw linkErr;

      await fetchKnownSpells();
      toast.success(`✨ ${spells.length} sort${spells.length > 1 ? 's' : ''} ajouté${spells.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error("Erreur d'ajout des sorts:", err);
      toast.error("Erreur lors de l'ajout des sorts");
    }
  };

  const removeKnownSpell = useCallback(async (spellId: string) => {
    try {
      const { error } = await supabase.from('player_spells').delete().eq('id', spellId);
      if (error) throw error;
      setKnownSpells(prev => prev.filter(s => s.id !== spellId));
      toast.success('Sort retiré de vos sorts connus');
    } catch (err) {
      console.error('Erreur suppression sort:', err);
      toast.error('Erreur lors de la suppression du sort');
    }
  }, []);

  const togglePrepared = useCallback(async (spellId: string, isPrepared: boolean) => {
    try {
      const { error } = await supabase.from('player_spells').update({ is_prepared: !isPrepared }).eq('id', spellId);
      if (error) throw error;
      setKnownSpells(prev => prev.map(s => s.id === spellId ? { ...s, is_prepared: !isPrepared } : s));
      toast.success(`✨ Sort ${isPrepared ? 'dépréparé' : 'préparé'}`);
    } catch (err) {
      console.error('Erreur MAJ préparation:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  // Filtre / groupe
  const { filteredSpells, preparedCount } = useMemo(() => {
    let filtered = knownSpells;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.spell_name.toLowerCase().includes(q) ||
        s.spell_school.toLowerCase().includes(q)
      );
    }
    if (filterPrepared !== 'all') {
      filtered = filtered.filter(s => (filterPrepared === 'prepared' ? s.is_prepared : !s.is_prepared));
    }
    return { filteredSpells: filtered, preparedCount: knownSpells.filter(s => s.is_prepared).length };
  }, [knownSpells, searchTerm, filterPrepared]);

  const groupedSpells = useMemo(() => {
    return filteredSpells.reduce((groups, spell) => {
      const level = spell.spell_level;
      const key = level === 0 ? 'Tours de magie' : `Niveau ${level}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(spell);
      return groups;
    }, {} as Record<string, KnownSpell[]>);
  }, [filteredSpells]);

  // DD des sorts + Bonus d'attaque des sorts
  const spellcastingAbilityName = useMemo(
    () => getSpellcastingAbilityName(player.class as any),
    [player.class]
  );
  const abilityMod = useMemo(
    () => (spellcastingAbilityName ? getAbilityModFromPlayer(player, spellcastingAbilityName) : 0),
    [player, spellcastingAbilityName]
  );
  const proficiencyBonus = useMemo(
    () => (player.stats?.proficiency_bonus && player.stats.proficiency_bonus > 0)
      ? player.stats.proficiency_bonus
      : getProficiencyBonusForLevel(player.level || 1),
    [player.stats?.proficiency_bonus, player.level]
  );
  const spellSaveDC = useMemo(
    () => (spellcastingAbilityName ? 8 + proficiencyBonus + abilityMod : null),
    [spellcastingAbilityName, proficiencyBonus, abilityMod]
  );
  const spellAttackBonus = useMemo(
    () => (spellcastingAbilityName ? proficiencyBonus + abilityMod : null),
    [spellcastingAbilityName, proficiencyBonus, abilityMod]
  );

  // BORNAGE D&D 5e + rendu systématique des emplacements
  const casterType = useMemo(() => getCasterType((player as any).class), [player]);
  const characterLevel = useMemo(() => getCharacterLevel(player), [player]);
  const allowedLevelsSet = useMemo(() => {
    const set = new Set<number>();
    if (casterType === 'none') return set;
    if (casterType === 'warlock') {
      const pact = getWarlockPactSlotLevel(characterLevel);
      if (pact > 0) set.add(pact);
      return set;
    }
    const highest = getHighestAllowedSlotLevel(casterType, characterLevel);
    for (let l = 1; l <= highest; l++) set.add(l);
    return set;
  }, [casterType, characterLevel]);

  // Niveaux à rendre: cantrips si présents, + niveaux autorisés ayant slots>0 OU ayant des sorts présents
  const levelsToRender = useMemo(() => {
    const levels: string[] = [];
    if (groupedSpells['Tours de magie']?.length) levels.push('Tours de magie');
    for (let lvl = 1; lvl <= 9; lvl++) {
      if (!allowedLevelsSet.has(lvl)) continue;
      const key = `level${lvl}` as keyof typeof player.spell_slots;
      const hasSlots = (player.spell_slots?.[key] || 0) > 0;
      const hasSpells = !!groupedSpells[`Niveau ${lvl}`];
      if (hasSlots || hasSpells) levels.push(`Niveau ${lvl}`);
    }
    return levels;
  }, [player.spell_slots, groupedSpells, allowedLevelsSet]);

  return (
    <div className="stats-card">
      <div className="stat-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-base font-semibold text-gray-100">
              Sorts connus ({knownSpells.length})
            </h3>
            {spellSaveDC !== null && (
              <p className="text-sm text-purple-300">
                DD des sorts: {spellSaveDC}
              </p>
            )}
            {spellAttackBonus !== null && (
              <p className="text-sm text-purple-300">
                Bonus d'attaque : {spellAttackBonus >= 0 ? '+' : ''}{spellAttackBonus}
              </p>
            )}
            {preparedCount > 0 && (
              <p className="text-sm text-green-400">
                {preparedCount} préparé{preparedCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowSpellbook(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1.5 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-900/20 flex items-center gap-2"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>
      
      <div className="p-3">
        {/* Recherche / filtres */}
        {knownSpells.length > 0 && (
          <div className="mb-3 space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher un sort..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-3 py-1.5 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <select
                value={filterPrepared}
                onChange={(e) => setFilterPrepared(e.target.value as 'all' | 'prepared' | 'unprepared')}
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-2 py-1.5 text-gray-100 focus:outline-none focus:border-blue-500/50"
              >
                <option value="all">Tous les sorts</option>
                <option value="prepared">Préparés</option>
                <option value="unprepared">Non préparés</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
          </div>
        ) : knownSpells.length === 0 && levelsToRender.length === 0 ? (
          <div className="text-center py-6">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-2">Aucun sort connu</p>
            <p className="text-gray-500 text-sm">Cliquez sur "Ajouter" pour choisir vos sorts</p>
          </div>
        ) : filteredSpells.length === 0 && levelsToRender.length === 0 ? (
          <div className="text-center py-6">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-2">Aucun sort trouvé</p>
            <p className="text-gray-500 text-sm">Essayez de modifier vos critères de recherche</p>
          </div>
        ) : (
          <div className="space-y-3">
            {levelsToRender.map((levelName) => {
              const level = levelName === 'Tours de magie' ? 0 : parseInt(levelName.split(' ')[1]);
              const levelKey = `level${level}` as keyof typeof player.spell_slots;
              const usedKey = `used${level}` as keyof typeof player.spell_slots;
              const spells = groupedSpells[levelName] || [];
              const maxSlots = level === 0 ? 0 : (player.spell_slots?.[levelKey] || 0);
              const usedSlots = level === 0 ? 0 : (player.spell_slots?.[usedKey] || 0);

              return (
                <div key={levelName} className="space-y-2" data-spell-level={level} id={`spell-level-${level}`}>
                  <button
                    onClick={() => toggleLevelCollapse(levelName)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-800/30 rounded-lg p-2 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 flex-1 pr-2">
                      <h4 className="text-sm font-semibold text-purple-300 group-hover:text-purple-200">
                        {levelName} ({spells.length})
                      </h4>
                      {levelName !== 'Tours de magie' && (
                        <SpellLevelStats
                          levelName={levelName}
                          player={player}
                          onUpdate={onUpdate}
                          usedSlots={usedSlots}
                          maxSlots={maxSlots}
                        />
                      )}
                    </div>
                    <div className="flex items-center pl-1">
                      {collapsedLevels.has(levelName) ? (
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                      )}
                    </div>
                  </button>

                  {!collapsedLevels.has(levelName) && (
                    <div className="space-y-2 ml-2">
                      {spells.map((spell) => (
                        <SpellCard
                          key={spell.id}
                          spell={spell}
                          expandedSpell={expandedSpell}
                          setExpandedSpell={setExpandedSpell}
                          onTogglePrepared={togglePrepared}
                          onRemoveSpell={removeKnownSpell}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSpellbook && (
        <SpellbookModal
          isOpen={showSpellbook}
          onClose={() => {
            setShowSpellbook(false);
            setSelectedSpells([]);
          }}
          playerClass={player.class}
          selectionMode={true}
          onSpellSelect={(spell) => {
            setSelectedSpells(prev => {
              const exists = prev.find(s => s.id === spell.id);
              return exists ? prev.filter(s => s.id !== spell.id) : [...prev, spell];
            });
          }}
          selectedSpells={selectedSpells}
          onConfirm={handleSpellsSelected}
        />
      )}
    </div>
  );
}