import React, { useState } from 'react';
import { Heart, Plus, Minus, Sword, Swords, Target, Dice6, Shield, Zap, Settings, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Player, Attack } from '../types/dnd';
import toast from 'react-hot-toast';
import { ConditionsSection } from './ConditionsSection';
import { DiceRoller } from '../components/DiceRoller';
import { SpellSlotSelectionModal } from '../components/SpellSlotSelectionModal';
import { StandardActionsSection } from './StandardActionsSection';
import { attackService } from '../services/attackService';
import { supabase } from '../lib/supabase';

interface CombatTabProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

interface AttackEditModalProps {
  attack: Attack | null;
  onClose: () => void;
  onSave: (attack: Partial<Attack>) => void;
  onDelete?: () => void;
}

const DAMAGE_TYPES = [
  'Acide', 'Contondant', 'Feu', 'Froid', 'Force', 'Foudre', 
  'Nécrotique', 'Perforant', 'Poison', 'Psychique', 'Radiant', 
  'Tonnerre', 'Tranchant'
];

const RANGES = [
  'Corps à corps', 'Contact', '1,5 m', '3 m', '6 m', '9 m', '12 m', 
  '18 m', '24 m', '30 m', '36 m', '45 m', '60 m', '90 m'
];

const AttackEditModal = ({ attack, onClose, onSave, onDelete }: AttackEditModalProps) => {
  const [formData, setFormData] = useState({
    name: attack?.name || '',
    damage_dice: attack?.damage_dice || '1d8',
    damage_type: attack?.damage_type || 'Tranchant',
    range: attack?.range || 'Corps à corps',
    properties: attack?.properties || '',
    manual_attack_bonus: attack?.manual_attack_bonus || null,
    manual_damage_bonus: attack?.manual_damage_bonus || null,
    expertise: attack?.expertise || false,
    attack_type: attack?.attack_type || 'physical',
    spell_level: attack?.spell_level !== undefined ? attack?.spell_level : null
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Le nom de l\'attaque est obligatoire');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-100 mb-6">
          {attack ? 'Modifier l\'attaque' : 'Nouvelle attaque'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nom de l'attaque
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
              placeholder="Ex: Épée longue"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type d'attaque
            </label>
            <select
              value={formData.attack_type}
              onChange={(e) => setFormData({ 
                ...formData, 
                attack_type: e.target.value as 'physical' | 'spell',
                spell_level: e.target.value === 'physical' ? null : (formData.spell_level !== null ? formData.spell_level : 1)
              })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
            >
              <option value="physical">Attaque physique</option>
              <option value="spell">Sort</option>
            </select>
          </div>

          {formData.attack_type === 'spell' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Niveau du sort
              </label>
              <select
                value={formData.spell_level !== null ? formData.spell_level : 1}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  spell_level: parseInt(e.target.value)
                })}
                className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
              >
                <option value={1}>Cantrip (niveau 0)</option>
                <option value={2}>Niveau 1</option>
                <option value={3}>Niveau 2</option>
                <option value={4}>Niveau 3</option>
                <option value={5}>Niveau 4</option>
                <option value={6}>Niveau 5</option>
                <option value={7}>Niveau 6</option>
                <option value={8}>Niveau 7</option>
                <option value={9}>Niveau 8</option>
                <option value={10}>Niveau 9</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dés de dégâts
            </label>
            <input
              type="text"
              value={formData.damage_dice}
              onChange={(e) => setFormData({ ...formData, damage_dice: e.target.value })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
              placeholder="Ex: 1d8, 2d6"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type de dégâts
            </label>
            <select
              value={formData.damage_type}
              onChange={(e) => setFormData({ ...formData, damage_type: e.target.value })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
            >
              {DAMAGE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Portée
            </label>
            <select
              value={formData.range}
              onChange={(e) => setFormData({ ...formData, range: e.target.value })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
            >
              {RANGES.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Propriétés (optionnel)
            </label>
            <input
              type="text"
              value={formData.properties}
              onChange={(e) => setFormData({ ...formData, properties: e.target.value })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
              placeholder="Ex: Finesse, Polyvalente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bonus d'attaque manuel (vide = auto)
            </label>
            <input
              type="number"
              value={formData.manual_attack_bonus || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                manual_attack_bonus: e.target.value ? parseInt(e.target.value) : null 
              })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
              placeholder="Laissez vide pour calcul automatique"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bonus de dégâts manuel (vide = auto)
            </label>
            <input
              type="number"
              value={formData.manual_damage_bonus || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                manual_damage_bonus: e.target.value ? parseInt(e.target.value) : null 
              })}
              className="input-dark w-full px-3 py-2 rounded-md border border-gray-600 focus:border-red-500"
              placeholder="Laissez vide pour calcul automatique"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, expertise: !formData.expertise })}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                formData.expertise
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              }`}
            >
              {formData.expertise && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <label className="text-sm font-medium text-gray-300 cursor-pointer" onClick={() => setFormData({ ...formData, expertise: !formData.expertise })}>
              Maîtrise (ajoute le bonus de maîtrise)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="btn-primary flex-1 px-4 py-2 rounded-lg"
            >
              Sauvegarder
            </button>
            {attack && onDelete && (
              <button
                onClick={onDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2 rounded-lg"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CombatTab({ player, onUpdate }: CombatTabProps) {
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAttack, setEditingAttack] = useState<Attack | null>(null);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [showMaxHpModal, setShowMaxHpModal] = useState(false);
  const [newMaxHp, setNewMaxHp] = useState(player.max_hp.toString());
  const [damageValue, setDamageValue] = useState('');
  const [healValue, setHealValue] = useState('');
  const [tempHpValue, setTempHpValue] = useState('');
  const [diceCount, setDiceCount] = useState<{[key: string]: number}>({});
  const [diceRollerOpen, setDiceRollerOpen] = useState(false);
  const [rollData, setRollData] = useState<{
    type: 'attack' | 'damage';
    attackName: string;
    diceFormula: string;
    modifier: number;
  } | null>(null);
  const [spellSlotModalOpen, setSpellSlotModalOpen] = useState(false);
  const [pendingSpellCast, setPendingSpellCast] = useState<{
    attackName: string;
    suggestedLevel: number;
    isAttackRoll: boolean;
  } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<{[key: string]: boolean}>({
    physical: false,
    spell1: false,
    spell2: false,
    spell3: false,
    spell4: false,
    spell5: false,
    spell6: false,
    spell7: false,
    spell8: false,
    spell9: false,
    spell10: false
  });

  React.useEffect(() => {
    fetchAttacks();
  }, [player.id]);

  React.useEffect(() => {
    // Initialise le nombre de dés pour chaque attaque en extrayant le nombre du damage_dice
    const initialDiceCount: {[key: string]: number} = {};
    attacks.forEach(attack => {
      // Extrait le nombre de dés depuis damage_dice (ex: "2d6" -> 2)
      const match = attack.damage_dice.match(/^(\d+)d\d+/);
      const diceNumber = match ? parseInt(match[1]) : 1;
      initialDiceCount[attack.id] = diceNumber;
    });
    setDiceCount(initialDiceCount);
  }, [attacks]);

  const fetchAttacks = async () => {
    try {
      const attacksData = await attackService.getPlayerAttacks(player.id);
      setAttacks(attacksData);
    } catch (error) {
      console.error('Erreur lors de la récupération des attaques:', error);
      toast.error('Erreur lors de la récupération des attaques');
    }
  };

  const saveAttack = async (attackData: Partial<Attack>) => {
    try {
      if (editingAttack) {
        // Mise à jour d'une attaque existante
        const updatedAttack = await attackService.updateAttack({
          ...attackData,
          id: editingAttack.id,
          attack_type: attackData.attack_type || 'physical',
          spell_level: attackData.attack_type === 'spell' ? (attackData.spell_level || 1) : null
        });
        
        if (updatedAttack) {
          setAttacks(attacks.map(attack => 
            attack.id === editingAttack.id 
              ? updatedAttack
              : attack
          ));
          
          // Met à jour le nombre de dés si damage_dice a changé
          if (attackData.damage_dice) {
            const match = attackData.damage_dice.match(/^(\d+)d\d+/);
            const diceNumber = match ? parseInt(match[1]) : 1;
            setDiceCount(prev => ({
              ...prev,
              [editingAttack.id]: diceNumber
            }));
          }
          
          toast.success('Attaque modifiée');
        }
        
      } else {
        // Création d'une nouvelle attaque
        const newAttack = await attackService.addAttack({
          player_id: player.id,
          ...attackData,
          attack_type: attackData.attack_type || 'physical',
          spell_level: attackData.attack_type === 'spell' ? (attackData.spell_level || 1) : null
        });
        
        if (newAttack) {
          setAttacks([...attacks, newAttack]);
          
          // Initialise le nombre de dés pour la nouvelle attaque
          if (newAttack.damage_dice) {
            const match = newAttack.damage_dice.match(/^(\d+)d\d+/);
            const diceNumber = match ? parseInt(match[1]) : 1;
            setDiceCount(prev => ({
              ...prev,
              [newAttack.id]: diceNumber
            }));
          }
          
          toast.success('Attaque ajoutée');
        }
      }

      setEditingAttack(null);
      setShowAttackModal(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'attaque:', error);
      toast.error('Erreur lors de la sauvegarde de l\'attaque');
    }
  };

  const deleteAttack = async (attackId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette attaque ?')) return;

    try {
      const success = await attackService.removeAttack(attackId);
      
      if (success) {
        setAttacks(attacks.filter(attack => attack.id !== attackId));
        setEditingAttack(null);
        setShowAttackModal(false);
        toast.success('Attaque supprimée');
      } else {
        throw new Error('Échec de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'attaque:', error);
      toast.error('Erreur lors de la suppression de l\'attaque');
    }
  };

  const updateDiceCount = (attackId: string, change: number) => {
    setDiceCount(prev => ({
      ...prev,
      [attackId]: Math.max(1, (prev[attackId] || 1) + change)
    }));
  };

  const getWoundLevel = () => {
    const currentTotal = player.current_hp + player.temporary_hp;
    const percentage = (currentTotal / player.max_hp) * 100;
    
    if (currentTotal <= 0) return 'Mort';
    if (percentage >= 1 && percentage <= 30) return 'Blessures critiques';
    if (percentage > 30 && percentage <= 60) return 'Blessures importantes';
    if (percentage > 60 && percentage <= 75) return 'Blessures';
    if (percentage > 75 && percentage <= 90) return 'Blessures légères';
    if (percentage > 90 && percentage <= 99) return 'Égratignures';
    return 'En pleine forme';
  };

  const getWoundColor = () => {
    const currentTotal = player.current_hp + player.temporary_hp;
    const percentage = (currentTotal / player.max_hp) * 100;
    
    if (currentTotal <= 0) return 'text-black';
    if (percentage >= 1 && percentage <= 30) return 'text-red-600';
    if (percentage > 30 && percentage <= 60) return 'text-red-500';
    if (percentage > 60 && percentage <= 75) return 'text-orange-500';
    if (percentage > 75 && percentage <= 90) return 'text-yellow-500';
    if (percentage > 90 && percentage <= 99) return 'text-yellow-400';
    return 'text-green-500';
  };

  const getHPBarColor = () => {
    const currentTotal = player.current_hp + player.temporary_hp;
    const percentage = (currentTotal / player.max_hp) * 100;
    
    if (currentTotal <= 0) return 'from-black to-gray-800';
    if (percentage >= 1 && percentage <= 30) return 'from-red-600 to-red-700';
    if (percentage > 30 && percentage <= 60) return 'from-red-500 to-red-600';
    if (percentage > 60 && percentage <= 75) return 'from-orange-500 to-red-500';
    if (percentage > 75 && percentage <= 90) return 'from-yellow-500 to-orange-500';
    if (percentage > 90 && percentage <= 99) return 'from-yellow-400 to-yellow-500';
    return 'from-green-500 to-green-600';
  };

  const applyDamage = async () => {
    const damage = parseInt(damageValue) || 0;
    if (damage <= 0) return;

    let newCurrentHP = player.current_hp;
    let newTempHP = player.temporary_hp;

    // Les dégâts touchent d'abord les PV temporaires
    if (newTempHP > 0) {
      if (damage >= newTempHP) {
        const remainingDamage = damage - newTempHP;
        newTempHP = 0;
        newCurrentHP = Math.max(0, newCurrentHP - remainingDamage);
      } else {
        newTempHP = newTempHP - damage;
      }
    } else {
      newCurrentHP = Math.max(0, newCurrentHP - damage);
    }

    await updateHP(newCurrentHP, newTempHP);
    setDamageValue('');
    
    // Animation de dégâts
    const hpElement = document.querySelector('.hp-bar');
    if (hpElement) {
      hpElement.classList.add('damage-animation');
      setTimeout(() => hpElement.classList.remove('damage-animation'), 600);
    }
    
    toast.success(`${damage} dégâts appliqués`);
  };

  const applyHealing = async () => {
    const healing = parseInt(healValue) || 0;
    if (healing <= 0) return;

    const newCurrentHP = Math.min(player.max_hp, player.current_hp + healing);
    await updateHP(newCurrentHP);
    setHealValue('');
    
    // Animation de soins
    const hpElement = document.querySelector('.hp-bar');
    if (hpElement) {
      hpElement.classList.add('heal-animation');
      setTimeout(() => hpElement.classList.remove('heal-animation'), 600);
    }
    
    toast.success(`${healing} PV récupérés`);
  };

  const applyTempHP = async () => {
    const tempHP = parseInt(tempHpValue) || 0;
    if (tempHP <= 0) return;

    // Les PV temporaires ne s'accumulent pas, on prend le maximum
    const newTempHP = Math.max(player.temporary_hp, tempHP);
    await updateHP(player.current_hp, newTempHP);
    setTempHpValue('');
    
    toast.success(`${newTempHP} PV temporaires appliqués`);
  };

  const updateHP = async (newCurrentHP: number, newTempHP?: number) => {
    const clampedHP = Math.max(0, Math.min(player.max_hp, newCurrentHP));
    const clampedTempHP = Math.max(0, newTempHP ?? player.temporary_hp);
    
    try {
      // Mise à jour directe des PV via update standard
      const updateData = {
        current_hp: clampedHP
      };
      
      // Ajouter les PV temporaires seulement si spécifiés
      if (newTempHP !== undefined) {
        Object.assign(updateData, { temporary_hp: clampedTempHP });
      }
      
      const { error } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', player.id);
      
      if (error) throw error;
      
      // Mise à jour locale de l'état
      onUpdate({
        ...player,
        current_hp: clampedHP,
        temporary_hp: clampedTempHP
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des PV:', error);
      toast.error('Erreur lors de la mise à jour des PV');
    }
  };

  const updateMaxHP = async () => {
    const newMax = parseInt(newMaxHp) || 1;
    const clampedMaxHP = Math.max(1, newMax);
    const adjustedCurrentHP = Math.min(player.current_hp, clampedMaxHP);

    try {
      const { error } = await supabase
        .from('players')
        .update({
          max_hp: clampedMaxHP,
          current_hp: adjustedCurrentHP
        })
        .eq('id', player.id);

      if (error) throw error;

      onUpdate({
        ...player,
        max_hp: clampedMaxHP,
        current_hp: adjustedCurrentHP
      });

      setShowMaxHpModal(false);
      toast.success('PV maximum mis à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des PV max:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getAttackBonus = (attack: Attack): number => {
    if (attack.manual_attack_bonus !== null && attack.manual_attack_bonus !== undefined) {
      return attack.manual_attack_bonus;
    }

    const proficiencyBonus = player.stats?.proficiency_bonus || 2;
    
    // Détermine le modificateur de caractéristique basé sur la classe et le type d'attaque
    let abilityModifier = 0;
    if (player.abilities) {
      // Logique basée sur la classe du joueur
      if (player.class === 'Ensorceleur' || player.class === 'Barde' || player.class === 'Paladin') {
        // Utilise le Charisme
        const chaAbility = player.abilities.find(a => a.name === 'Charisme');
        abilityModifier = chaAbility?.modifier || 0;
      } else if (player.class === 'Moine' || player.class === 'Roublard') {
        // Utilise la Dextérité
        const dexAbility = player.abilities.find(a => a.name === 'Dextérité');
        abilityModifier = dexAbility?.modifier || 0;
      } else {
        // Par défaut, utilise la Force pour les attaques au corps à corps, Dextérité pour les attaques à distance
        if (attack.range?.toLowerCase().includes('distance') || attack.range?.toLowerCase().includes('portée')) {
          const dexAbility = player.abilities.find(a => a.name === 'Dextérité');
          abilityModifier = dexAbility?.modifier || 0;
        } else {
          const strAbility = player.abilities.find(a => a.name === 'Force');
          abilityModifier = strAbility?.modifier || 0;
        }
      }
    }

    // Ajoute le bonus de maîtrise seulement si l'attaque a la maîtrise
    const masteryBonus = attack.expertise ? proficiencyBonus : 0;
    
    return abilityModifier + masteryBonus;
  };

  const getDamageBonus = (attack: Attack): number => {
    if (attack.manual_damage_bonus !== null && attack.manual_damage_bonus !== undefined) {
      return attack.manual_damage_bonus;
    }

    // Détermine le modificateur de caractéristique basé sur la classe et le type d'attaque
    let abilityModifier = 0;
    if (player.abilities) {
      // Logique basée sur la classe du joueur
      if (player.class === 'Ensorceleur' || player.class === 'Barde' || player.class === 'Paladin') {
        // Utilise le Charisme
        const chaAbility = player.abilities.find(a => a.name === 'Charisme');
        abilityModifier = chaAbility?.modifier || 0;
      } else if (player.class === 'Moine' || player.class === 'Roublard') {
        // Utilise la Dextérité
        const dexAbility = player.abilities.find(a => a.name === 'Dextérité');
        abilityModifier = dexAbility?.modifier || 0;
      } else {
        // Par défaut, utilise la Force pour les attaques au corps à corps, Dextérité pour les attaques à distance
        if (attack.range?.toLowerCase().includes('distance') || attack.range?.toLowerCase().includes('portée')) {
          const dexAbility = player.abilities.find(a => a.name === 'Dextérité');
          abilityModifier = dexAbility?.modifier || 0;
        } else {
          const strAbility = player.abilities.find(a => a.name === 'Force');
          abilityModifier = strAbility?.modifier || 0;
        }
      }
    }

    return abilityModifier;
  };

  // Fonction pour vérifier si le joueur a des emplacements de sorts disponibles
  const hasAvailableSpellSlots = (): boolean => {
    if (!player.spell_slots) return false;
    
    for (let level = 1; level <= 9; level++) {
      const levelKey = `level${level}` as keyof typeof player.spell_slots;
      const usedKey = `used${level}` as keyof typeof player.spell_slots;
      
      const maxSlots = player.spell_slots[levelKey] || 0;
      const usedSlots = player.spell_slots[usedKey] || 0;
      
      if (maxSlots > usedSlots) {
        return true;
      }
    }
    
    return false;
  };

  const rollAttack = (attack: Attack) => {
    console.log('🎯 Clic sur attaque:', attack.name);
    
    // Vérifie si c'est un cantrip (niveau 0 = valeur 1 dans notre système)
    const isCantrip = attack.attack_type === 'spell' && attack.spell_level === 1;
    
    // Détermine si c'est une attaque magique basée sur le type d'attaque
    const isMagicalAttack = attack.attack_type === 'spell';
    
    // Ouvre le popup de sélection d'emplacement SEULEMENT pour les attaques magiques qui ne sont PAS des cantrips
    if (isMagicalAttack && !isCantrip && hasAvailableSpellSlots()) {
      console.log('✨ Ouverture du popup de sélection d\'emplacement');
      setPendingSpellCast({
        attackName: attack.name,
        suggestedLevel: Math.max(2, attack.spell_level || 2), // Minimum niveau 1 (valeur 2)
        isAttackRoll: true
      });
      setSpellSlotModalOpen(true);
      return;
    }

    // Pour les attaques physiques, cantrips, ou si aucun emplacement disponible, lancer directement
    console.log(isCantrip ? '🔮 Cantrip - pas de consommation d\'emplacement' : '⚔️ Attaque normale');
    const attackBonus = getAttackBonus(attack);
    setRollData({
      type: 'attack',
      attackName: attack.name,
      diceFormula: '1d20',
      modifier: attackBonus
    });
    setDiceRollerOpen(true);
  };

  const rollDamage = (attack: Attack) => {
    console.log('💥 Clic sur dégâts:', attack.name);
    
    // Vérifie si c'est un cantrip
    const isCantrip = attack.attack_type === 'spell' && attack.spell_level === 1;
    
    // Les dégâts ne consomment jamais d'emplacements de sorts, et les cantrips sont gratuits
    console.log(isCantrip ? '🔮 Dégâts de cantrip - gratuit' : '💥 Lancement direct des dégâts');
    const damageBonus = getDamageBonus(attack);
    const numberOfDice = diceCount[attack.id] || 1;
    
    let diceFormula = attack.damage_dice;
    const match = diceFormula.match(/(\d+)d(\d+)/);
    if (match) {
      const sides = match[2];
      diceFormula = `${numberOfDice}d${sides}`;
    }
    
    setRollData({
      type: 'damage',
      attackName: attack.name,
      diceFormula,
      modifier: damageBonus
    });
    setDiceRollerOpen(true);
  };

  const handleSpellSlotConfirm = async (level: number) => {
    if (!pendingSpellCast) return;
    
    console.log('🎯 Confirmation emplacement niveau:', level);
    
    try {
      // Consomme l'emplacement de sort
      const usedKey = `used${level}` as keyof typeof player.spell_slots;
      const currentUsed = player.spell_slots?.[usedKey] || 0;
      
      const newSpellSlots = {
        ...player.spell_slots,
        [usedKey]: currentUsed + 1
      };
      
      const { error } = await supabase
        .from('players')
        .update({ spell_slots: newSpellSlots })
        .eq('id', player.id);
      
      if (error) throw error;
      
      onUpdate({
        ...player,
        spell_slots: newSpellSlots
      });
      
      // Lance l'attaque ou les dégâts selon le type
      const attack = attacks.find(a => a.name === pendingSpellCast.attackName);
      if (attack) {
        if (pendingSpellCast.isAttackRoll) {
          console.log('🎯 Lancement du jet d\'attaque');
          const attackBonus = getAttackBonus(attack);
          setRollData({
            type: 'attack',
            attackName: attack.name,
            diceFormula: '1d20',
            modifier: attackBonus
          });
          setDiceRollerOpen(true);
        } else {
          console.log('💥 Lancement des dégâts');
          const damageBonus = getDamageBonus(attack);
          const numberOfDice = diceCount[attack.id] || 1;
          
          let diceFormula = attack.damage_dice;
          const match = diceFormula.match(/(\d+)d(\d+)/);
          if (match) {
            const sides = match[2];
            diceFormula = `${numberOfDice}d${sides}`;
          }
          
          setRollData({
            type: 'damage',
            attackName: attack.name,
            diceFormula,
            modifier: damageBonus
          });
          setDiceRollerOpen(true);
        }
      }
      
      toast.success(`✨ Emplacement de sort niveau ${level} consommé`);
    } catch (error) {
      console.error('Erreur lors de la consommation de l\'emplacement de sort:', error);
      toast.error('Erreur lors du lancement du sort');
    } finally {
      setPendingSpellCast(null);
    }
  };

  const getDamageFormula = (attack: Attack): string => {
    const numberOfDice = diceCount[attack.id] || 1;
    const match = attack.damage_dice.match(/(\d+)d(\d+)/);
    if (match) {
      const sides = match[2];
      return `${numberOfDice}d${sides}`;
    }
    return attack.damage_dice;
  };

  // Fonction pour vérifier si c'est une attaque magique
  const isMagicalAttack = (attack: Attack): boolean => {
    // Gestion des attaques sans attack_type (anciennes attaques) - exclut les cantrips
    const isSpellAttack = attack.attack_type === 'spell' || 
                         (!attack.attack_type && ['Force', 'Nécrotique', 'Psychique', 'Radiant', 'Tonnerre', 'Feu', 'Froid', 'Foudre', 'Acide', 'Poison'].includes(attack.damage_type));
    
    // Si c'est un cantrip, on ne l'affiche pas comme attaque magique nécessitant des emplacements
    const isCantrip = attack.spell_level === 1;
    
    return isSpellAttack && !isCantrip;
  };

  const formatDamageDisplay = (attack: Attack): string => {
    const damageBonus = getDamageBonus(attack);
    const formula = getDamageFormula(attack);
    
    // Si le bonus est 0, ne pas l'afficher
    if (damageBonus === 0) {
      return formula;
    }
    
    return `${formula}${damageBonus >= 0 ? '+' : ''}${damageBonus}`;
  };

  const totalHP = player.current_hp + player.temporary_hp;
  const hpPercentage = Math.max(0, (totalHP / player.max_hp) * 100);
  const isCriticalHealth = totalHP <= Math.floor(player.max_hp * 0.1);

  // Fonction pour grouper les attaques par catégorie
  const groupAttacksByCategory = () => {
    const groups: {[key: string]: Attack[]} = {};
    
    attacks.forEach(attack => {
      // Gestion des attaques sans attack_type (anciennes attaques)
      const attackType = attack.attack_type || 'physical';
      
      if (attackType === 'physical') {
        if (!groups.physical) groups.physical = [];
        groups.physical.push(attack);
      } else if (attackType === 'spell') {
        // Conversion : valeur 1 = cantrip (niveau 0), valeur 2 = niveau 1, etc.
        const level = attack.spell_level || 1;
        const actualLevel = level - 1; // Convertit en niveau D&D réel
        const key = `spell${level}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(attack);
      } else {
        // Fallback pour les attaques sans type défini
        if (!groups.physical) groups.physical = [];
        groups.physical.push(attack);
      }
    });
    
    return groups;
  };

  const getCategoryTitle = (key: string): string => {
    if (key === 'physical') return 'Attaques physiques';
    if (key.startsWith('spell')) {
      const level = key.replace('spell', '');
      if (level === '1') return 'Cantrips (niveau 0)';
      return `Sorts de niveau ${parseInt(level) - 1}`;
    }
    return key;
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderAttackCard = (attack: Attack) => (
    <div key={attack.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h4 className="font-medium text-gray-100 text-base">{attack.name}</h4>
          <p className="text-sm text-gray-400">{attack.damage_type} • {attack.range}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setEditingAttack(attack);
              setShowAttackModal(true);
            }}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => deleteAttack(attack.id)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-900/30 rounded transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Contrôle du nombre de dés - SEULEMENT pour les attaques magiques */}
      {isMagicalAttack(attack) && (
        <div className="flex items-center justify-end mb-1">
          <div className="flex items-center">
            <button
              onClick={() => updateDiceCount(attack.id, -1)}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
              disabled={(diceCount[attack.id] || 1) <= 1}
            >
              <Minus size={14} />
            </button>
            <span className="px-3 py-1 text-sm text-gray-300 min-w-[50px] text-center">
              {getDamageFormula(attack)}
            </span>
            <button
              onClick={() => updateDiceCount(attack.id, 1)}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => rollAttack(attack)}
          className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-md transition-colors flex items-center justify-center"
        >
          Attaque : 1d20+{getAttackBonus(attack)}
        </button>
        
        <button
          onClick={() => rollDamage(attack)}
          className="flex-1 bg-orange-600/60 hover:bg-orange-500/60 text-white px-3 py-2 rounded-md transition-colors flex items-center justify-center"
        >
          Dégâts : {isMagicalAttack(attack) ? formatDamageDisplay(attack) : `${attack.damage_dice}${getDamageBonus(attack) !== 0 ? (getDamageBonus(attack) >= 0 ? '+' : '') + getDamageBonus(attack) : ''}`}
        </button>
      </div>
    </div>
  );

  // Fonction pour rendre les emplacements de sorts pour une catégorie
  const renderSpellSlots = (categoryKey: string) => {
    if (!categoryKey.startsWith('spell') || categoryKey === 'spell1') return null; // Pas d'emplacements pour les cantrips
    
    const spellLevel = parseInt(categoryKey.replace('spell', '')) - 1; // Convertit en niveau D&D réel
    if (!player.spell_slots) return null;
    
    const levelKey = `level${spellLevel}` as keyof typeof player.spell_slots;
    const usedKey = `used${spellLevel}` as keyof typeof player.spell_slots;
    
    const maxSlots = player.spell_slots[levelKey] || 0;
    const usedSlots = player.spell_slots[usedKey] || 0;
    const availableSlots = maxSlots - usedSlots;
    
    if (maxSlots === 0) return null;
    
    return (
      <div className="flex items-center gap-2 ml-3">
        <div className="flex gap-0.5">
          {Array.from({ length: maxSlots }, (_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-sm border transition-all duration-200 ${
                index < availableSlots
                  ? 'bg-purple-500 border-purple-400 shadow-sm'
                  : 'bg-gray-700 border-gray-600'
              }`}
              title={index < availableSlots ? 'Emplacement disponible' : 'Emplacement utilisé'}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 min-w-[24px]">
          {availableSlots}/{maxSlots}
        </span>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (availableSlots > 0) {
              const newSpellSlots = {
                ...player.spell_slots,
                [usedKey]: usedSlots + 1
              };

              try {
                const { error } = await supabase
                  .from('players')
                  .update({ spell_slots: newSpellSlots })
                  .eq('id', player.id);

                if (error) throw error;

                onUpdate({
                  ...player,
                  spell_slots: newSpellSlots
                });

                toast.success(`✨ Emplacement de sort niveau ${spellLevel} consommé`);
              } catch (error) {
                console.error('Erreur lors de la consommation de l\'emplacement:', error);
                toast.error('Erreur lors de la consommation');
              }
            }
          }}
          disabled={availableSlots === 0}
          className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded transition-all duration-200 ${
            availableSlots > 0
              ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-sm'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
          title={availableSlots > 0 ? `Consommer emplacement niveau ${spellLevel}` : 'Aucun emplacement disponible'}
        >
          -
        </button>
      </div>
    );
  };
  return (
    <div className="space-y-6">
      {/* Points de vie */}
      <div className="stat-card">
        <div className="stat-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Points de vie</h3>
              <p className={`text-sm font-medium ${getWoundColor()}`}>{getWoundLevel()}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNewMaxHp(player.max_hp.toString());
              setShowMaxHpModal(true);
            }}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center"
          >
            <Settings size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {/* Barre de vie principale */}
            <div className="relative">
              {/* Affichage des PV directement sur la barre - TOUJOURS VISIBLE */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <span className="text-white font-bold text-sm drop-shadow-lg">
                  {totalHP} / {player.max_hp}
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden relative">
                {/* Barre de PV principale */}
                <div 
                  className={`hp-bar hp-bar-main h-full transition-all duration-500 bg-gradient-to-r ${getHPBarColor()} ${
                    isCriticalHealth ? 'heartbeat-animation' : ''
                  }`}
                  style={{ width: `${Math.min(100, (player.current_hp / player.max_hp) * 100)}%` }}
                />
                {/* Barre de PV temporaires */}
                {player.temporary_hp > 0 && (
                  <div 
                    className="hp-bar-temp absolute top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400"
                    style={{ 
                      left: `${Math.min(100, (player.current_hp / player.max_hp) * 100)}%`,
                      width: `${Math.min(100 - (player.current_hp / player.max_hp) * 100, (player.temporary_hp / player.max_hp) * 100)}%`
                    }}
                  />
                )}
              </div>
            </div>

            {/* Contrôles de gestion des PV */}
            <div className="grid grid-cols-3 gap-4">
              {/* Dégâts */}
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center">
                  <input
                    type="number"
                    value={damageValue}
                    onChange={(e) => setDamageValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && applyDamage()}
                    className="input-dark w-16 px-2 py-2 rounded-l-md text-center text-sm"
                    placeholder="0"
                    min="0"
                  />
                  <button
                    onClick={applyDamage}
                    disabled={!damageValue || parseInt(damageValue) <= 0}
                    className="px-3 py-2 bg-transparent hover:bg-gray-600/30 disabled:bg-transparent disabled:cursor-not-allowed text-red-500 rounded-r-md text-sm font-medium transition-colors"
                  >
                    OK
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 text-sm text-red-500 mt-1">
                  <Sword size={16} />
                  <span>Dégâts</span>
                </div>
              </div>

              {/* Soins */}
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center">
                  <input
                    type="number"
                    value={healValue}
                    onChange={(e) => setHealValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && applyHealing()}
                    className="input-dark w-16 px-2 py-2 rounded-l-md text-center text-sm"
                    placeholder="0"
                    min="0"
                  />
                  <button
                    onClick={applyHealing}
                    disabled={!healValue || parseInt(healValue) <= 0}
                    className="px-3 py-2 bg-transparent hover:bg-gray-600/30 disabled:bg-transparent disabled:cursor-not-allowed text-green-400 rounded-r-md text-sm font-medium transition-colors"
                  >
                    OK
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 text-sm text-green-400 mt-1">
                  <Heart size={16} />
                  <span>Soins</span>
                </div>
              </div>

              {/* PV Temporaires */}
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center">
                  <input
                    type="number"
                    value={tempHpValue}
                    onChange={(e) => setTempHpValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && applyTempHP()}
                    className="input-dark w-16 px-2 py-2 rounded-l-md text-center text-sm"
                    placeholder="0"
                    min="0"
                  />
                  <button
                    onClick={applyTempHP}
                    disabled={!tempHpValue || parseInt(tempHpValue) <= 0}
                    className="px-3 py-2 bg-transparent hover:bg-gray-600/30 disabled:bg-transparent disabled:cursor-not-allowed text-blue-400 rounded-r-md text-sm font-medium transition-colors"
                  >
                    OK
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 text-sm text-blue-400 mt-1">
                  <Shield size={16} />
                  <span>PV Temp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de modification des PV max */}
      {showMaxHpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Modifier les PV maximum
            </h3>
            
            <div className="space-y-4">
              <input
                type="number"
                value={newMaxHp}
                onChange={(e) => setNewMaxHp(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-md text-center"
                min="1"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={updateMaxHP}
                  className="btn-primary flex-1 px-4 py-2 rounded-lg"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setShowMaxHpModal(false)}
                  className="btn-secondary px-4 py-2 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attaques */}
      <div className="stat-card">
        <div className="stat-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-100">Attaques</h3>
          </div>
          <button
            onClick={() => {
              setEditingAttack(null);
              setShowAttackModal(true);
            }}
            className="p-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {(() => {
            const groupedAttacks = groupAttacksByCategory();
            const categoryOrder = ['physical', 'spell0', 'spell1', 'spell2', 'spell3', 'spell4', 'spell5', 'spell6', 'spell7', 'spell8', 'spell9'];
            
            return categoryOrder.map(categoryKey => {
              const categoryAttacks = groupedAttacks[categoryKey];
              if (!categoryAttacks || categoryAttacks.length === 0) return null;
              
              const isExpanded = expandedCategories[categoryKey];
              
              return (
                <div key={categoryKey} className="mb-4">
                  <button
                    onClick={() => toggleCategory(categoryKey)}
                    className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700/70 rounded-lg transition-colors mb-2"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium text-gray-200">
                        {getCategoryTitle(categoryKey)}
                      </span>
                      <span className="text-sm text-gray-400">
                        ({categoryAttacks.length})
                      </span>
                      {renderSpellSlots(categoryKey)}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="space-y-2 ml-2">
                      {categoryAttacks.map(renderAttackCard)}
                    </div>
                  )}
                </div>
              );
            });
          })()}

          {attacks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Sword className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune attaque configurée</p>
              <p className="text-sm">Cliquez sur + pour ajouter une attaque</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'édition d'attaque */}
      {showAttackModal && (
        <AttackEditModal
          attack={editingAttack}
          onClose={() => {
            setShowAttackModal(false);
            setEditingAttack(null);
          }}
          onSave={saveAttack}
          onDelete={editingAttack ? () => deleteAttack(editingAttack.id) : undefined}
        />
      )}

      <StandardActionsSection player={player} onUpdate={onUpdate} />
      
      <ConditionsSection player={player} onUpdate={onUpdate} />

      {/* Dice Roller Modal */}
      <DiceRoller
        isOpen={diceRollerOpen}
        onClose={() => setDiceRollerOpen(false)}
        rollData={rollData}
      />

      {/* Spell Slot Selection Modal */}
      {spellSlotModalOpen && pendingSpellCast && (
        <SpellSlotSelectionModal
          isOpen={spellSlotModalOpen}
          onClose={() => {
            console.log('🚪 Fermeture du modal de sélection d\'emplacement');
            setSpellSlotModalOpen(false);
            setPendingSpellCast(null);
          }}
          onConfirm={handleSpellSlotConfirm}
          player={player}
          attackName={pendingSpellCast.attackName}
          suggestedLevel={pendingSpellCast.suggestedLevel}
        />
      )}
    </div>
  );
}