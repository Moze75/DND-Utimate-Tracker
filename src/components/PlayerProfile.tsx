import React, { useState, useEffect } from 'react';
import {
  Settings,
  Moon,
  Star,
  Dice1 as DiceD20,
  X,
  Save,
  TrendingUp,
  Brain,
  Shield,
  Plus,
  Minus,
} from 'lucide-react';
import { DndClass, Player, PlayerStats, PlayerBackground } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Avatar } from './Avatar';
import { CONDITIONS } from './ConditionsSection';
import { SessionsModal } from './SessionsModal';
import { LevelUpModal } from './LevelUpModal';

// Helpers D&D
const getModifier = (score: number): number => Math.floor((score - 10) / 2);

const getProficiencyBonusForLevel = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

const DND_CLASSES: DndClass[] = [
  '',
  'Barbare',
  'Barde',
  'Clerc',
  'Druide',
  'Ensorceleur',
  'Guerrier',
  'Magicien',
  'Moine',
  'Paladin',
  'Rôdeur',
  'Roublard',
  'Sorcier'
];

const DND_RACES = [
  '',
  'Humain',
  'Elfe',
  'Nain',
  'Halfelin',
  'Gnome',
  'Demi-Elfe',
  'Demi-Orc',
  'Tieffelin',
  'Drakéide',
  'Autre'
];

const DND_BACKGROUNDS: PlayerBackground[] = [
  '',
  'Acolyte',
  'Artisan de guilde',
  'Artiste',
  'Charlatan',
  'Criminel',
  'Ermite',
  'Héros du peuple',
  'Marin',
  'Noble',
  'Sage',
  'Sauvageon',
  'Soldat',
  'Autre'
];

const DND_ALIGNMENTS = [
  '',
  'Loyal Bon',
  'Neutre Bon',
  'Chaotique Bon',
  'Loyal Neutre',
  'Neutre',
  'Chaotique Neutre',
  'Loyal Mauvais',
  'Neutre Mauvais',
  'Chaotique Mauvais'
];

const DND_LANGUAGES = [
  'Commun',
  'Elfique',
  'Nain',
  'Géant',
  'Gnome',
  'Gobelin',
  'Halfelin',
  'Orc',
  'Abyssal',
  'Céleste',
  'Commun des profondeurs',
  'Draconique',
  'Infernal',
  'Primordial',
  'Sylvestre',
  'Autre'
];

const getDexModFromPlayer = (player: Player): number => {
  const dex = player.abilities?.find(a => a.name === 'Dextérité');
  if (!dex) return 0;
  if (typeof dex.modifier === 'number') return dex.modifier;
  if (typeof dex.score === 'number') return getModifier(dex.score);
  return 0;
};

interface PlayerProfileProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

export function PlayerProfile({ player, onUpdate }: PlayerProfileProps) {
  const [editing, setEditing] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Tooltips pour les 4 infos (CA/VIT/INIT/MAÎT)
  const [activeTooltip, setActiveTooltip] = useState<'ac' | 'speed' | 'initiative' | 'proficiency' | null>(null);

  // Etats d'identité / profil
  const [adventurerName, setAdventurerName] = useState(player.adventurer_name || '');
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url || '');
  const [selectedClass, setSelectedClass] = useState<DndClass | undefined>(player.class || undefined);
  const [selectedSubclass, setSelectedSubclass] = useState(player.subclass || '');
  const [selectedRace, setSelectedRace] = useState(player.race || '');
  const [availableSubclasses, setAvailableSubclasses] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<PlayerBackground | undefined>(player.background || undefined);
  const [selectedAlignment, setSelectedAlignment] = useState(player.alignment || '');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(player.languages || []);
  const [age, setAge] = useState(player.age || '');
  const [gender, setGender] = useState(player.gender || '');
  const [characterHistory, setCharacterHistory] = useState(player.character_history || '');
  const [level, setLevel] = useState(player.level);
  const [hitDice, setHitDice] = useState(player.hit_dice || { total: player.level, used: 0 });
  const [maxHp, setMaxHp] = useState(player.max_hp);
  const [currentHp, setCurrentHp] = useState(player.current_hp);
  const [tempHp, setTempHp] = useState(player.temporary_hp);

  // Stats affichées (lecture). On les resynchronise avec player.
  const [stats, setStats] = useState<PlayerStats>(player.stats || {
    armor_class: 10,
    initiative: 0,
    speed: 30,
    proficiency_bonus: 2,
    inspirations: player.stats?.inspirations || 0
  });

  // Champs d'édition dédiés pour les 4 inputs afin d'autoriser le "vide"
  const [acField, setAcField] = useState<string>('');
  const [initField, setInitField] = useState<string>('');
  const [speedField, setSpeedField] = useState<string>('');
  const [profField, setProfField] = useState<string>('');

  // Mettre à jour les états locaux quand le player change
  useEffect(() => {
    setLevel(player.level);
    setMaxHp(player.max_hp);
    setCurrentHp(player.current_hp);
    setTempHp(player.temporary_hp);
    setHitDice(player.hit_dice || { total: player.level, used: 0 });

    setAdventurerName(player.adventurer_name || '');
    setSelectedClass(player.class || undefined);
    setSelectedSubclass(player.subclass || '');
    setSelectedRace(player.race || '');
    setSelectedBackground(player.background || undefined);
    setSelectedAlignment(player.alignment || '');
    setSelectedLanguages(player.languages || []);
    setAge(player.age || '');
    setGender(player.gender || '');
    setCharacterHistory(player.character_history || '');

    setStats(player.stats || {
      armor_class: 10,
      initiative: 0,
      speed: 30,
      proficiency_bonus: 2,
      inspirations: player.stats?.inspirations || 0
    });
  }, [player]);

  // Charger les sous-classes disponibles quand la classe change
  useEffect(() => {
    const loadSubclasses = async () => {
      if (!selectedClass) {
        setAvailableSubclasses([]);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('get_subclasses_by_class', {
          p_class: selectedClass
        });
        if (error) throw error;
        setAvailableSubclasses(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des sous-classes:', error);
        setAvailableSubclasses([]);
      }
    };
    loadSubclasses();
  }, [selectedClass]);

  // Pré-remplir les champs d'édition quand on ouvre le modal
  useEffect(() => {
    if (!editing) return;

    const dexMod = getDexModFromPlayer(player);
    const profAuto = getProficiencyBonusForLevel(level);

    // On ne calcule que si vide/0 côté player.stats
    const acInitial = (player.stats?.armor_class ?? 0) || 0;
    const initInitial = player.stats?.initiative;
    const speedInitial = (player.stats?.speed ?? 0) || 0;
    const profInitial = (player.stats?.proficiency_bonus ?? 0) || 0;

    setAcField(acInitial > 0 ? String(acInitial) : String(10 + dexMod));
    setInitField(initInitial !== undefined && initInitial !== null ? String(initInitial) : String(dexMod));
    setSpeedField(speedInitial > 0 ? String(speedInitial) : String(9));
    setProfField(profInitial > 0 ? String(profInitial) : String(profAuto));
  }, [editing, player, level]);

  const handleShortRest = async () => {
    if (!player.hit_dice || player.hit_dice.total - player.hit_dice.used <= 0) {
      toast.error('Aucun dé de vie disponible');
      return;
    }
    try {
      const hitDieSize = (() => {
        switch (player.class) {
          case 'Barbare': return 12;
          case 'Guerrier':
          case 'Paladin':
          case 'Rôdeur': return 10;
          case 'Barde':
          case 'Clerc':
          case 'Druide':
          case 'Moine':
          case 'Roublard':
          case 'Sorcier': return 8;
          case 'Magicien':
          case 'Ensorceleur': return 6;
          default: return 8;
        }
      })();

      const roll = Math.floor(Math.random() * hitDieSize) + 1;
      const constitutionMod = player.abilities?.find(a => a.name === 'Constitution')?.modifier || 0;
      const healing = Math.max(1, roll + constitutionMod);

      // Restaure 1 Conduit divin au Paladin (si utilisé)
      const nextCR: any = { ...(player.class_resources || {}) };
      let recoveredLabel = '';
      if (player.class === 'Paladin' && typeof nextCR.used_channel_divinity === 'number') {
        const before = nextCR.used_channel_divinity || 0;
        nextCR.used_channel_divinity = Math.max(0, before - 1);
        if (before > 0) recoveredLabel = ' (+1 Conduit divin récupéré)';
      }

      const { error } = await supabase
        .from('players')
        .update({
          current_hp: Math.min(player.max_hp, player.current_hp + healing),
          hit_dice: {
            ...player.hit_dice,
            used: player.hit_dice.used + 1
          },
          class_resources: nextCR
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        current_hp: Math.min(player.max_hp, player.current_hp + healing),
        hit_dice: {
          ...player.hit_dice,
          used: player.hit_dice.used + 1
        },
        class_resources: nextCR
      });

      toast.success(`Repos court : +${healing} PV${recoveredLabel}`);
    } catch (error) {
      console.error('Erreur lors du repos court:', error);
      toast.error('Erreur lors du repos');
    }
  };

  const handleLongRest = async () => {
    try {
      // Prépare une restauration complète des ressources consommées
      const nextCR: any = { ...(player.class_resources || {}) };
      nextCR.used_rage = 0;
      nextCR.used_bardic_inspiration = 0;
      nextCR.used_channel_divinity = 0; // Clerc & Paladin
      nextCR.used_wild_shape = 0;
      nextCR.used_sorcery_points = 0;
      nextCR.used_action_surge = 0;
      nextCR.used_arcane_recovery = false;
      // Compat Moine selon clé utilisée dans la base
      nextCR.used_credo_points = 0;
      nextCR.used_ki_points = 0;
      nextCR.used_lay_on_hands = 0;
      nextCR.used_favored_foe = 0;

      const { error } = await supabase
        .from('players')
        .update({
          current_hp: player.max_hp,
          temporary_hp: 0,
          hit_dice: {
            total: player.level,
            used: Math.max(0, player.hit_dice?.used - Math.floor(player.level / 2) || 0)
          },
          class_resources: nextCR,
          spell_slots: {
            ...player.spell_slots,
            used1: 0, used2: 0, used3: 0, used4: 0,
            used5: 0, used6: 0, used7: 0, used8: 0, used9: 0
          },
          is_concentrating: false,
          concentration_spell: null
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        current_hp: player.max_hp,
        temporary_hp: 0,
        hit_dice: {
          total: player.level,
          used: Math.max(0, player.hit_dice?.used - Math.floor(player.level / 2) || 0)
        },
        class_resources: nextCR,
        spell_slots: {
          ...player.spell_slots,
          used1: 0, used2: 0, used3: 0, used4: 0,
          used5: 0, used6: 0, used7: 0, used8: 0, used9: 0
        },
        is_concentrating: false,
        concentration_spell: null
      });

      toast.success('Repos long effectué (toutes les ressources restaurées)');
    } catch (error) {
      console.error('Erreur lors du repos long:', error);
      toast.error('Erreur lors du repos');
    }
  };

  const handleSave = async () => {
    try {
      // Calculs auto si valeurs vides
      const dexMod = getDexModFromPlayer(player);
      const profAuto = getProficiencyBonusForLevel(level);

      const acVal = parseInt(acField, 10);
      const initVal = parseInt(initField, 10);
      const speedVal = parseInt(speedField, 10);
      const profVal = parseInt(profField, 10);

      const finalizedStats: PlayerStats = {
        ...player.stats, // préserve inspirations et autres champs
        armor_class: Number.isFinite(acVal) && acVal > 0 ? acVal : 10 + dexMod,
        initiative: Number.isFinite(initVal) ? initVal : dexMod,
        speed: Number.isFinite(speedVal) && speedVal > 0 ? speedVal : 9,
        proficiency_bonus: Number.isFinite(profVal) && profVal > 0 ? profVal : profAuto,
      };

      const updateData = {
        adventurer_name: adventurerName.trim() || null,
        race: selectedRace || null,
        class: selectedClass || null,
        subclass: selectedSubclass || null,
        background: selectedBackground || null,
        alignment: selectedAlignment || null,
        languages: selectedLanguages,
        max_hp: maxHp,
        current_hp: currentHp,
        temporary_hp: tempHp,
        age: age.trim() || null,
        gender: gender.trim() || null,
        character_history: characterHistory.trim() || null,
        level: level,
        hit_dice: {
          total: level,
          used: Math.min(hitDice.used, level)
        },
        stats: finalizedStats
      };

      const { data, error } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', player.id)
        .select();

      if (error) throw error;

      onUpdate({
        ...player,
        ...updateData
      });

      setEditing(false);
      toast.success('Profil mis à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Affichage (lecture)
  if (!editing) {
    return (
      <div className="stat-card">
        <div className="stat-header flex items-start justify-between">
          <div className="flex flex-col gap-4 w-full">
            {/* États actifs uniquement */}
            {player.active_conditions && player.active_conditions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {player.active_conditions
                  .map(conditionId => CONDITIONS.find(c => c.id === conditionId))
                  .filter(Boolean)
                  .map(condition => (
                    <div
                      key={condition!.id}
                      className="inline-block px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 text-sm font-medium"
                    >
                      {condition!.name}
                    </div>
                  ))}
              </div>
            )}

            {/* Layout horizontal: grille 2 colonnes (Avatar fluide + colonne boutons fixe) */}
            <div
              className="grid items-start gap-3 sm:gap-4"
              style={{ gridTemplateColumns: 'minmax(0,1fr) 8rem' }} // 8rem = 128px
            >
              {/* Avatar responsive (remplit la colonne gauche) */}
              <div className="relative w-full min-w-0 aspect-[7/10] sm:aspect-[2/3] rounded-lg overflow-hidden bg-gray-800/50 flex items-center justify-center">
                {/* Bouton paramètres en overlay en haut à droite */}
                <button
                  onClick={() => setEditing(true)}
                  className="absolute top-2 right-2 w-9 h-9 rounded-full bg-gray-900/40 backdrop-blur-sm text-white hover:bg-gray-800/50 hover:text-white flex items-center justify-center z-10 transition-all duration-150"
                >
                  <Settings className="w-5 h-5" />
                </button>

                <Avatar
                  url={avatarUrl}
                  playerId={player.id}
                  size="lg"
                  editable={false}
                  onAvatarUpdate={() => {}}
                />

                {/* Superposition avec les informations du personnage */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pointer-events-none">
                  <div className="text-white">
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">
                      {adventurerName || player.name}
                    </h3>
                    {selectedClass && (
                      <p className="text-sm text-gray-200 drop-shadow-md">
                        {selectedClass} niveau {level}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Colonne boutons fixe (8rem) */}
              <div className="flex flex-col gap-3 sm:gap-4 items-stretch w-32 justify-start">
                {/* Bloc Inspiration */}
                <div className="w-32 rounded text-sm bg-gray-800/50 flex flex-col">
                  <div className="text-gray-400 text-sm text-center h-8 flex items-center justify-center gap-1">
                    <span className="ml-3">Inspiration</span>
                    <Star className="w-4 h-4 ml-2" />
                  </div>
                  <div className="flex items-center justify-center gap-2 h-8">
                    <button
                      onClick={async () => {
                        try {
                          const newValue = Math.max(0, (player.stats?.inspirations || 0) - 1);
                          const newStats = { ...(player.stats || {}), inspirations: newValue } as PlayerStats;
                          const { error } = await supabase.from('players').update({ stats: newStats }).eq('id', player.id);
                          if (error) throw error;
                          onUpdate({ ...player, stats: newStats });
                          toast.success('Inspiration retirée');
                        } catch (error) {
                          console.error('Erreur lors de la mise à jour de l\'inspiration:', error);
                          toast.error('Erreur lors de la mise à jour');
                        }
                      }}
                      className={`w-6 h-6 flex items-center justify-center rounded ${
                        (player.stats?.inspirations || 0) > 0
                          ? 'text-yellow-500 hover:bg-yellow-500/20'
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={(player.stats?.inspirations || 0) <= 0}
                    >
                      <Minus size={14} />
                    </button>
                    <span className={`font-medium w-4 text-center ${(player.stats?.inspirations || 0) > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {player.stats?.inspirations || 0}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          const newValue = Math.min(3, (player.stats?.inspirations || 0) + 1);
                          const newStats = { ...(player.stats || {}), inspirations: newValue } as PlayerStats;
                          const { error } = await supabase.from('players').update({ stats: newStats }).eq('id', player.id);
                          if (error) throw error;
                          onUpdate({ ...player, stats: newStats });
                          toast.success('Inspiration ajoutée');
                        } catch (error) {
                          console.error('Erreur lors de la mise à jour de l\'inspiration:', error);
                          toast.error('Erreur lors de la mise à jour');
                        }
                      }}
                      className={`w-6 h-6 flex items-center justify-center rounded ${
                        (player.stats?.inspirations || 0) < 3
                          ? 'text-yellow-500 hover:bg-yellow-500/20'
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={(player.stats?.inspirations || 0) >= 3}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Repos long */}
                <button
                  onClick={handleLongRest}
                  className="w-32 h-9 rounded text-sm bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 flex items-center justify-between px-3"
                >
                  <span className="ml-1.5 flex-1 text-left">Repos long</span>
                  <Moon className="w-4 h-4" />
                </button>

                {/* Repos court */}
                <button
                  onClick={handleShortRest}
                  className="w-32 h-9 rounded text-sm bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 flex items-center justify-between px-3"
                >
                  <span className="ml-1.5 flex-1 text-left">Repos court</span>
                  <DiceD20 className="w-4 h-4" />
                </button>

                {/* Dés de vie */}
                {player.hit_dice && (
                  <div className="w-32 px-2 py-1 text-sm bg-gray-800/30 rounded flex flex-col items-center">
                    <span className="text-gray-400 mb-0.5">Dés de vie</span>
                    <span className="text-gray-300 font-medium text-center">
                      {player.hit_dice.total - player.hit_dice.used} / {player.hit_dice.total}
                    </span>
                  </div>
                )}

                {/* Concentration */}
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('players')
                        .update({
                          is_concentrating: !player.is_concentrating,
                          concentration_spell: !player.is_concentrating ? 'Sort actif' : null
                        })
                        .eq('id', player.id);
                      if (error) throw error;

                      onUpdate({
                        ...player,
                        is_concentrating: !player.is_concentrating,
                        concentration_spell: !player.is_concentrating ? 'Sort actif' : null
                      });

                      toast.success(player.is_concentrating ? 'Concentration interrompue' : 'Concentration activée');
                    } catch (error) {
                      console.error('Erreur lors de la modification de la concentration:', error);
                      toast.error('Erreur lors de la modification de la concentration');
                    }
                  }}
                  className={`w-32 h-9 rounded text-sm flex items-center px-3 transition-all duration-200 ${
                    player.is_concentrating 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/20 animate-pulse' 
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="ml-auto inline-flex items-center gap-1">
                    <span>Concentration</span>
                    <Brain className={`w-4 h-4 ${player.is_concentrating ? 'text-purple-400' : 'text-gray-400'}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div></div>
        </div>

        {/* Modals */}
        {showSessions && (
          <SessionsModal isGM={player.is_gm || false} onClose={() => setShowSessions(false)} />
        )}

        <div className="grid grid-cols-4 gap-4 mt-2 bg-gray-800/50 rounded-lg py-1">
          {/* CA */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-10 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'ac' ? null : 'ac')}
            >
              <Shield className="absolute inset-0 w-full h-full text-gray-400 stroke-[1.5] scale-125" />
              <div className="absolute inset-0 flex items-center justify-center -translate-y-1 text-lg font-bold text-gray-100 z-10">
                {stats.armor_class}
              </div>
              {activeTooltip === 'ac' && (
                <>
                  <div className="tooltip-overlay" onClick={() => setActiveTooltip(null)} />
                  <div className="invisible tooltip-visible fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[92%] z-50">
                    <h4 className="font-semibold text-gray-100 mb-1">Classe d'Armure</h4>
                    <p className="mb-2">Détermine la difficulté pour vous toucher en combat.</p>
                    <p className="text-gray-400">Calcul de base :</p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                      <li>10 + modificateur de Dextérité</li>
                      <li>+ bonus d'armure (si équipée)</li>
                      <li>+ bonus de bouclier (si équipé)</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1" />
          </div>

          {/* Vitesse */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-12 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'speed' ? null : 'speed')}
            >
              <div className="text-lg font-bold text-gray-100">
                {stats.speed} m
              </div>
              {activeTooltip === 'speed' && (
                <>
                  <div className="tooltip-overlay" onClick={() => setActiveTooltip(null)} />
                  <div className="invisible tooltip-visible fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[92%] z-50">
                    <h4 className="font-semibold text-gray-100 mb-1">Vitesse</h4>
                    <p className="mb-2">Distance que vous pouvez parcourir en un tour.</p>
                    <div className="text-gray-400">
                      <p>Équivalences :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>{stats.speed} mètres = {Math.floor((stats.speed || 0) / 1.5)} cases</li>
                        <li>Course : × 2 ({(stats.speed || 0) * 2} mètres)</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1 text-center -ml-2">VIT</div>
          </div>

          {/* Initiative */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-10 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'initiative' ? null : 'initiative')}
            >
              <div className="text-lg font-bold text-gray-100">
                {stats.initiative >= 0 ? '+' : ''}{stats.initiative}
              </div>
              {activeTooltip === 'initiative' && (
                <>
                  <div className="tooltip-overlay" onClick={() => setActiveTooltip(null)} />
                  <div className="invisible tooltip-visible fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[92%] z-50">
                    <h4 className="font-semibold text-gray-100 mb-1">Initiative</h4>
                    <p className="mb-2">Détermine l'ordre d'action en combat.</p>
                    <div className="text-gray-400">
                      <p>Calcul :</p>
                      <ul className="list-disc list-inside">
                        <li>1d20 + modificateur de Dextérité</li>
                        <li>+ bonus spéciaux éventuels</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1 text-center -ml-2">INIT</div>
          </div>

          {/* Bonus de maîtrise */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-10 h-10 -mt-2 -mb-1 group cursor-pointer"
              onClick={() => setActiveTooltip(activeTooltip === 'proficiency' ? null : 'proficiency')}
            >
              <div className="text-lg font-bold text-gray-100">
                +{stats.proficiency_bonus}
              </div>
              {activeTooltip === 'proficiency' && (
                <>
                  <div className="tooltip-overlay" onClick={() => setActiveTooltip(null)} />
                  <div className="invisible tooltip-visible fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-gray-900/95 backdrop-blur-sm text-sm text-gray-300 rounded-lg max-w-sm w-[92%] z-50">
                    <h4 className="font-semibold text-gray-100 mb-1">Bonus de Maîtrise</h4>
                    <p>Représente votre expertise générale.</p>
                    <div className="text-gray-400">
                      <p>S'applique à :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Jets d'attaque avec armes maîtrisées</li>
                        <li>DD des sorts</li>
                        <li>Compétences maîtrisées</li>
                        <li>Jets de sauvegarde maîtrisés</li>
                      </ul>
                      <p className="mt-2">Note : Ne s'applique pas aux dégâts !</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500 -mt-1 text-center -ml-2">MAÎT</div>
          </div>
        </div>
      </div>
    );
  }

  // Mode édition - Modal plein écran
  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 py-8 space-y-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Modifier le profil</h2>
          <button
            onClick={() => setEditing(false)}
            className="p-2 text-gray-400 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Identité */}
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="text-lg font-semibold text-gray-100">Identité</h3>
            </div>
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Avatar</label>
                  <div className="w-40 h-56 rounded-lg overflow-hidden bg-gray-800/50 mx-auto">
                    <Avatar
                      url={avatarUrl}
                      playerId={player.id}
                      onAvatarUpdate={(url) => setAvatarUrl(url)}
                      size="lg"
                      editable={true}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nom d'aventurier
                  </label>
                  <input
                    type="text"
                    value={adventurerName}
                    onChange={(e) => setAdventurerName(e.target.value)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    placeholder="Nom d'aventurier"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Niveau */}
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="text-lg font-semibold text-gray-100">Niveau</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Niveau</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={level}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) setLevel(Math.max(1, Math.min(20, value)));
                  }}
                  className="input-dark w-full px-3 py-2 rounded-md"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              <button
                onClick={() => setShowLevelUp(true)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
              >
                <TrendingUp size={20} />
                Passer au niveau {level + 1}
              </button>
            </div>
          </div>

          {/* Classe et Race */}
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="text-lg font-semibold text-gray-100">Classe et Race</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Race</label>
                  <select
                    value={selectedRace}
                    onChange={(e) => setSelectedRace(e.target.value)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                  >
                    {DND_RACES.map((race) => (
                      <option key={race} value={race}>
                        {race || 'Sélectionnez une race'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Classe</label>
                  <select
                    value={selectedClass || ''}
                    onChange={(e) => setSelectedClass(e.target.value as DndClass)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                  >
                    {DND_CLASSES.map((dndClass) => (
                      <option key={dndClass} value={dndClass}>
                        {dndClass || 'Sélectionnez une classe'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sous-classe</label>
                  <select
                    value={selectedSubclass}
                    onChange={(e) => setSelectedSubclass(e.target.value)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    disabled={!selectedClass || availableSubclasses.length === 0}
                  >
                    <option value="">Sélectionnez une sous-classe</option>
                    {availableSubclasses.map((subclass) => (
                      <option key={subclass} value={subclass}>
                        {subclass}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques (édition des 4 champs avec auto si vide) */}
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="text-lg font-semibold text-gray-100">Statistiques</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CA */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Classe d'armure (CA)
                  </label>
                  <input
                    type="number"
                    value={acField}
                    onChange={(e) => setAcField(e.target.value)}
                    onBlur={() => {
                      if (acField === '' || parseInt(acField, 10) <= 0) {
                        const dm = getDexModFromPlayer(player);
                        setAcField(String(10 + dm));
                      }
                    }}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    placeholder="Auto si vide: 10 + mod DEX"
                  />
                </div>

                {/* Initiative */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initiative
                  </label>
                  <input
                    type="number"
                    value={initField}
                    onChange={(e) => setInitField(e.target.value)}
                    onBlur={() => {
                      if (initField === '') {
                        const dm = getDexModFromPlayer(player);
                        setInitField(String(dm));
                      }
                    }}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    placeholder="Auto si vide: mod DEX"
                  />
                </div>

                {/* Vitesse */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vitesse (m)
                  </label>
                  <input
                    type="number"
                    value={speedField}
                    onChange={(e) => setSpeedField(e.target.value)}
                    onBlur={() => {
                      if (speedField === '' || parseInt(speedField, 10) <= 0) {
                        setSpeedField('9');
                      }
                    }}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    placeholder="Auto si vide: 9 m"
                  />
                </div>

                {/* Bonus de maîtrise */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Bonus de maîtrise
                  </label>
                  <input
                    type="number"
                    value={profField}
                    onChange={(e) => setProfField(e.target.value)}
                    onBlur={() => {
                      if (profField === '' || parseInt(profField, 10) <= 0) {
                        setProfField(String(getProficiencyBonusForLevel(level)));
                      }
                    }}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    placeholder="Auto si vide: selon niveau"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Points de vie */}
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="text-lg font-semibold text-gray-100">Points de vie</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">PV Maximum</label>
                  <input
                    type="number"
                    min={1}
                    value={maxHp}
                    onChange={(e) => setMaxHp(parseInt(e.target.value, 10) || 1)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dés de vie disponibles
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={level}
                    value={level - (hitDice?.used || 0)}
                    onChange={(e) =>
                      setHitDice({
                        total: level,
                        used: Math.max(0, Math.min(level, level - (parseInt(e.target.value, 10) || 0)))
                      })
                    }
                    className="input-dark w-full px-3 py-2 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Historique / Alignement / Infos */}
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="text-lg font-semibold text-gray-100">Historique</h3>
            </div>
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Historique</label>
                  <select
                    value={selectedBackground || ''}
                    onChange={(e) => setSelectedBackground(e.target.value as PlayerBackground)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                  >
                    {DND_BACKGROUNDS.map((b) => (
                      <option key={b} value={b}>
                        {b || 'Sélectionnez un historique'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Alignement</label>
                  <select
                    value={selectedAlignment}
                    onChange={(e) => setSelectedAlignment(e.target.value)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                  >
                    {DND_ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>
                        {a || 'Sélectionnez un alignement'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Âge</label>
                  <input
                    type="text"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    placeholder="Âge du personnage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                  <input
                    type="text"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="input-dark w-full px-3 py-2 rounded-md"
                    placeholder="Genre du personnage"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Langues */}
          <div className="stat-card">
            <div className="stat-header">
              <h3 className="text-lg font-semibold text-gray-100">Langues</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {DND_LANGUAGES.map((language) => (
                  <label
                    key={language}
                    className="flex items-center cursor-pointer hover:bg-gray-800/30 p-2 rounded transition-colors"
                  >
                    <div
                      className={`mr-2 h-4 w-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        selectedLanguages.includes(language)
                          ? 'bg-red-500 border-red-500'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (selectedLanguages.includes(language)) {
                          setSelectedLanguages(selectedLanguages.filter(lang => lang !== language));
                        } else {
                          setSelectedLanguages([...selectedLanguages, language]);
                        }
                      }}
                    >
                      {selectedLanguages.includes(language) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-300 select-none">{language}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Histoire */}
          <div className="stat-card">
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Histoire du personnage
              </label>
              <textarea
                value={characterHistory}
                onChange={(e) => setCharacterHistory(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-md"
                rows={6}
                placeholder="Décrivez l'histoire de votre personnage..."
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 fixed bottom-0 left-0 right-0 bg-gray-900/95 p-4 border-t border-gray-700/50 z-10">
            <div className="max-w-4xl mx-auto w-full flex gap-3">
              <button
                onClick={handleSave}
                className="btn-primary flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg"
              >
                <Save size={20} />
                Sauvegarder
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg"
              >
                <X size={20} />
                Annuler
              </button>
            </div>
          </div>
        </div>

        {/* Modal de passage de niveau */}
        <LevelUpModal
          isOpen={showLevelUp}
          onClose={() => setShowLevelUp(false)}
          player={player}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}