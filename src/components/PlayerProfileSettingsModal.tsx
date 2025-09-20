import React, { useEffect, useState } from 'react';
import { X, Save, TrendingUp, Triangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Avatar } from './Avatar';
import { LevelUpModal } from './LevelUpModal';
import type { DndClass, Player, PlayerBackground, PlayerStats } from '../types/dnd';

/* ============================ Helpers ============================ */

const getModifier = (score: number): number => Math.floor((score - 10) / 2);

const getProficiencyBonusForLevel = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

const getDexModFromPlayer = (player: Player): number => {
  const dex = player.abilities?.find((a) => a.name === 'Dextérité');
  if (!dex) return 0;
  if (typeof dex.modifier === 'number') return dex.modifier;
  if (typeof dex.score === 'number') return getModifier(dex.score);
  return 0;
};

// Canonicalisation minimale pour compat RPC (backend encore sur "Sorcier")
function mapClassForRpc(pClass: DndClass | null | undefined): string | null | undefined {
  if (pClass === 'Occultiste') return 'Occultiste';
  return pClass;
}

/* ============================ Données de sélection ============================ */

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
  'Occultiste',
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
  'Autre',
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
  'Autre',
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
  'Chaotique Mauvais',
];

export interface PlayerProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  onUpdate: (player: Player) => void;
}

export function PlayerProfileSettingsModal({
  open,
  onClose,
  player,
  onUpdate,
}: PlayerProfileSettingsModalProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Dirty tracking
  const [isDirty, setDirty] = useState(false);

  // Etats d'identité / profil (spécifiques à l'édition)
  const [adventurerName, setAdventurerName] = useState(player.adventurer_name || '');
  const [avatarUrl, setAvatarUrl] = useState(player.avatar_url || '');
  const [selectedClass, setSelectedClass] = useState<DndClass | undefined>(player.class || undefined);
  const [selectedSubclass, setSelectedSubclass] = useState(player.subclass || '');
  const [selectedRace, setSelectedRace] = useState(player.race || '');
  const [availableSubclasses, setAvailableSubclasses] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<PlayerBackground | undefined>(
    player.background || undefined
  );
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

  // champs d'édition permissifs
  const [acField, setAcField] = useState<string>('');
  const [initField, setInitField] = useState<string>('');
  const [speedField, setSpeedField] = useState<string>('');
  const [profField, setProfField] = useState<string>('');

  // Sync local state quand la modale s'ouvre ou quand le player change
  useEffect(() => {
    if (!open) return;

    // Reset dirty à l'ouverture
    setDirty(false);

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
    setAvatarUrl(player.avatar_url || '');

    const dexMod = getDexModFromPlayer(player);
    const profAuto = getProficiencyBonusForLevel(player.level);

    const acInitial = (player.stats?.armor_class ?? 0) || 0;
    const initInitial = player.stats?.initiative;
    const speedInitial = (player.stats?.speed ?? 0) || 0;
    const profInitial = (player.stats?.proficiency_bonus ?? 0) || 0;

    setAcField(acInitial > 0 ? String(acInitial) : String(10 + dexMod));
    setInitField(initInitial !== undefined && initInitial !== null ? String(initInitial) : String(dexMod));
    setSpeedField(speedInitial > 0 ? String(speedInitial) : String(9));
    setProfField(profInitial > 0 ? String(profInitial) : String(profAuto));
  }, [open, player]);

  // Charger les sous-classes disponibles quand la classe change
  useEffect(() => {
    if (!open) return;
    const loadSubclasses = async () => {
      if (!selectedClass) {
        setAvailableSubclasses([]);
        return;
      }
      try {
        const rpcClass = mapClassForRpc(selectedClass);
        const { data, error } = await supabase.rpc('get_subclasses_by_class', {
          p_class: rpcClass,
        });
        if (error) throw error;
        setAvailableSubclasses((data as any) || []);
      } catch (error) {
        console.error('Erreur lors du chargement des sous-classes:', error);
        setAvailableSubclasses([]);
      }
    };
    loadSubclasses();
  }, [open, selectedClass]);

  /* ============================ Sauvegarde ============================ */

  const handleSave = async () => {
    try {
      const dexMod = getDexModFromPlayer(player);
      const profAuto = getProficiencyBonusForLevel(level);

      const acVal = parseInt(acField, 10);
      const initVal = parseInt(initField, 10);
      const speedVal = parseInt(speedField, 10);
      const profVal = parseInt(profField, 10);

      const finalizedStats: PlayerStats = {
        ...player.stats,
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
          used: Math.min(hitDice.used, level),
        },
        stats: finalizedStats,
      };

      const { error } = await supabase.from('players').update(updateData).eq('id', player.id);
      if (error) throw error;

      onUpdate({
        ...player,
        ...updateData,
      });

      toast.success('Profil mis à jour');
      setDirty(false);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (!open) return null;

  /* ============================ Rendu (modale) ============================ */

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 py-8 space-y-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Profil et caractéristiques</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

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
                    onAvatarUpdate={(url) => { setAvatarUrl(url); setDirty(true); }}
                    size="lg"
                    editable
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom d'aventurier</label>
                <input
                  type="text"
                  value={adventurerName}
                  onChange={(e) => { setAdventurerName(e.target.value); setDirty(true); }}
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
                  if (!isNaN(value)) {
                    setLevel(Math.max(1, Math.min(20, value)));
                    setDirty(true);
                  }
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
                  onChange={(e) => { setSelectedRace(e.target.value); setDirty(true); }}
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
                  onChange={(e) => { setSelectedClass(e.target.value as DndClass); setDirty(true); }}
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
                  onChange={(e) => { setSelectedSubclass(e.target.value); setDirty(true); }}
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

        {/* Statistiques */}
        <div className="stat-card">
          <div className="stat-header">
            <h3 className="text-lg font-semibold text-gray-100">Statistiques</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Classe d'armure (CA)
                </label>
                <input
                  type="number"
                  value={acField}
                  onChange={(e) => { setAcField(e.target.value); setDirty(true); }}
                  onBlur={() => {
                    if (acField === '' || parseInt(acField, 10) <= 0) {
                      const dm = getDexModFromPlayer(player);
                      const next = String(10 + dm);
                      if (next !== acField) {
                        setAcField(next);
                        setDirty(true);
                      }
                    }
                  }}
                  className="input-dark w-full px-3 py-2 rounded-md"
                  placeholder="Auto si vide: 10 + mod DEX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initiative
                </label>
                <input
                  type="number"
                  value={initField}
                  onChange={(e) => { setInitField(e.target.value); setDirty(true); }}
                  onBlur={() => {
                    if (initField === '') {
                      const dm = getDexModFromPlayer(player);
                      const next = String(dm);
                      if (next !== initField) {
                        setInitField(next);
                        setDirty(true);
                      }
                    }
                  }}
                  className="input-dark w-full px-3 py-2 rounded-md"
                  placeholder="Auto si vide: mod DEX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vitesse (m)
                </label>
                <input
                  type="number"
                  value={speedField}
                  onChange={(e) => { setSpeedField(e.target.value); setDirty(true); }}
                  onBlur={() => {
                    if (speedField === '' || parseInt(speedField, 10) <= 0) {
                      const next = '9';
                      if (next !== speedField) {
                        setSpeedField(next);
                        setDirty(true);
                      }
                    }
                  }}
                  className="input-dark w-full px-3 py-2 rounded-md"
                  placeholder="Auto si vide: 9 m"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bonus de maîtrise
                </label>
                <input
                  type="number"
                  value={profField}
                  onChange={(e) => { setProfField(e.target.value); setDirty(true); }}
                  onBlur={() => {
                    if (profField === '' || parseInt(profField, 10) <= 0) {
                      const next = String(getProficiencyBonusForLevel(level));
                      if (next !== profField) {
                        setProfField(next);
                        setDirty(true);
                      }
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
                  onChange={(e) => { setMaxHp(parseInt(e.target.value, 10) || 1); setDirty(true); }}
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
                  onChange={(e) => {
                    setHitDice({
                      total: level,
                      used: Math.max(0, Math.min(level, level - (parseInt(e.target.value, 10) || 0))),
                    });
                    setDirty(true);
                  }}
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
                  onChange={(e) => { setSelectedBackground(e.target.value as PlayerBackground); setDirty(true); }}
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
                  onChange={(e) => { setSelectedAlignment(e.target.value); setDirty(true); }}
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
                  onChange={(e) => { setAge(e.target.value); setDirty(true); }}
                  className="input-dark w-full px-3 py-2 rounded-md"
                  placeholder="Âge du personnage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => { setGender(e.target.value); setDirty(true); }}
                  className="input-dark w-full px-3 py-2 rounded-md"
                  placeholder="Genre du personnage"
                />
              </div>
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
              onChange={(e) => { setCharacterHistory(e.target.value); setDirty(true); }}
              className="input-dark w-full px-3 py-2 rounded-md"
              rows={6}
              placeholder="Décrivez l'histoire de votre personnage..."
            />
          </div>
        </div>

        {/* Bandeau fixe bas: Retour toujours visible, Sauvegarder seulement si modifié */}
        <div className="flex gap-3 fixed bottom-0 left-0 right-0 bg-gray-900/95 p-4 border-t border-gray-700/50 z-10">
          <div className="max-w-4xl mx-auto w-full flex gap-3 justify-end">
            {isDirty && (
              <button
                onClick={handleSave}
                className="btn-primary px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg"
              >
                <Save size={20} />
                Sauvegarder
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg"
            >
              <Triangle size={18} className="transform -rotate-90" />
              Retour
            </button>
          </div>
        </div>

        {/* Modal passage de niveau */}
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