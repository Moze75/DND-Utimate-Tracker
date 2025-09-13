import React, { useState } from 'react';
import { User, ChevronDown, ChevronRight } from 'lucide-react';
import { Condition, Player } from '../types/dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const CONDITIONS: Condition[] = [
  {
    id: 'blinded',
    name: 'Aveuglé',
    description: 'Une créature aveuglée ne peut pas voir.',
    effects: [
      'La créature rate automatiquement tout test de caractéristique qui nécessite la vue',
      'Les jets d\'attaque contre la créature ont l\'avantage',
      'Les jets d\'attaque de la créature ont le désavantage'
    ]
  },
  {
    id: 'charmed',
    name: 'Charmé',
    description: 'Une créature charmée ne peut pas attaquer celui qui l\'a charmée.',
    effects: [
      'La créature ne peut pas attaquer celui qui l\'a charmée',
      'Celui qui a charmé la créature a l\'avantage aux tests de Charisme pour interagir avec elle'
    ]
  },
  {
    id: 'deafened',
    name: 'Assourdi',
    description: 'Une créature assourdie ne peut pas entendre.',
    effects: [
      'La créature rate automatiquement tout test de caractéristique qui nécessite l\'ouïe'
    ]
  },
  {
    id: 'frightened',
    name: 'Effrayé',
    description: 'Une créature effrayée a le désavantage aux tests tant que la source de sa peur est visible.',
    effects: [
      'La créature a le désavantage aux tests de caractéristique tant que la source de sa peur est visible',
      'La créature ne peut pas se rapprocher volontairement de la source de sa peur'
    ]
  },
  {
    id: 'grappled',
    name: 'Agrippé',
    description: 'Une créature agrippée ne peut pas se déplacer.',
    effects: [
      'La vitesse de la créature devient 0',
      'L\'état prend fin si celui qui agrippe est incapable d\'agir'
    ]
  },
  {
    id: 'incapacitated',
    name: 'Incapable d\'agir',
    description: 'Une créature incapable d\'agir ne peut effectuer aucune action ni réaction.',
    effects: [
      'La créature ne peut effectuer aucune action ni réaction'
    ]
  },
  {
    id: 'invisible',
    name: 'Invisible',
    description: 'Une créature invisible ne peut pas être vue.',
    effects: [
      'La créature est impossible à voir sans magie ou sens spécial',
      'La créature est considérée comme fortement obscurcie',
      'La position de la créature peut être détectée par le bruit ou les traces',
      'Les jets d\'attaque contre la créature ont le désavantage',
      'Les jets d\'attaque de la créature ont l\'avantage'
    ]
  },
  {
    id: 'paralyzed',
    name: 'Paralysé',
    description: 'Une créature paralysée est incapable d\'agir et de parler.',
    effects: [
      'La créature est incapable d\'agir et de parler',
      'La créature rate automatiquement les jets de sauvegarde de Force et de Dextérité',
      'Les jets d\'attaque contre la créature ont l\'avantage',
      'Toute attaque qui touche la créature à moins de 1,50 mètre est un coup critique'
    ]
  },
  {
    id: 'petrified',
    name: 'Pétrifié',
    description: 'Une créature pétrifiée est transformée en substance solide inanimée.',
    effects: [
      'La créature est transformée en substance solide inanimée',
      'Son poids est multiplié par dix',
      'La créature ne vieillit plus',
      'La créature est incapable d\'agir',
      'Les jets d\'attaque contre la créature ont l\'avantage',
      'La créature rate automatiquement les jets de sauvegarde de Force et de Dextérité',
      'La créature est résistante à tous les dégâts'
    ]
  },
  {
    id: 'poisoned',
    name: 'Empoisonné',
    description: 'Une créature empoisonnée subit un désavantage aux jets d\'attaque et aux tests de caractéristique.',
    effects: [
      'La créature a le désavantage aux jets d\'attaque',
      'La créature a le désavantage aux tests de caractéristique'
    ]
  },
  {
    id: 'prone',
    name: 'À terre',
    description: 'Une créature à terre a une mobilité limitée.',
    effects: [
      'La seule option de mouvement est de ramper',
      'La créature a le désavantage aux jets d\'attaque',
      'Les jets d\'attaque au corps à corps contre la créature ont l\'avantage',
      'Les jets d\'attaque à distance contre la créature ont le désavantage'
    ]
  },
  {
    id: 'restrained',
    name: 'Entravé',
    description: 'Une créature entravée voit sa vitesse réduite à 0.',
    effects: [
      'La vitesse de la créature devient 0',
      'Les jets d\'attaque contre la créature ont l\'avantage',
      'Les jets d\'attaque de la créature ont le désavantage',
      'La créature a le désavantage aux jets de sauvegarde de Dextérité'
    ]
  },
  {
    id: 'stunned',
    name: 'Étourdi',
    description: 'Une créature étourdie est incapable d\'agir et parle de manière hésitante.',
    effects: [
      'La créature est incapable d\'agir et parle de manière hésitante',
      'La créature rate automatiquement les jets de sauvegarde de Force et de Dextérité',
      'Les jets d\'attaque contre la créature ont l\'avantage'
    ]
  },
  {
    id: 'unconscious',
    name: 'Inconscient',
    description: 'Une créature inconsciente est incapable d\'agir et n\'est pas consciente de son environnement.',
    effects: [
      'La créature est incapable d\'agir et n\'est pas consciente de son environnement',
      'La créature lâche ce qu\'elle tient et tombe à terre',
      'La créature rate automatiquement les jets de sauvegarde de Force et de Dextérité',
      'Les jets d\'attaque contre la créature ont l\'avantage',
      'Toute attaque qui touche la créature à moins de 1,50 mètre est un coup critique'
    ]
  }
];

interface ConditionsSectionProps {
  player: Player;
  onUpdate: (player: Player) => void;
}

export function ConditionsSection({ player, onUpdate }: ConditionsSectionProps) {
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);
  const [conditionsExpanded, setConditionsExpanded] = useState(false);

  // Early return if player is undefined
  if (!player) {
    return (
      <div className="stat-card">
        <button
          onClick={() => setConditionsExpanded(!conditionsExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <User className="text-orange-500" size={20} />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-100">États</h2>
          </div>
          {conditionsExpanded ? (
            <ChevronDown className="text-gray-400" size={20} />
          ) : (
            <ChevronRight className="text-gray-400" size={20} />
          )}
        </button>
        <div className="p-4">
          <p className="text-gray-400">Chargement des états...</p>
        </div>
      </div>
    );
  }

  const activeConditions = player?.active_conditions || [];

  const updateSelectedCondition = (condition: Condition, isActive: boolean) => {
    if (isActive) {
      setSelectedCondition(condition);
    } else if (selectedCondition?.id === condition.id) {
      setSelectedCondition(null);
    }
  };

  const handleToggleCondition = async (conditionId: string) => {
    if (!player) return;

    const newConditions = activeConditions.includes(conditionId)
      ? activeConditions.filter(id => id !== conditionId)
      : [...activeConditions, conditionId];

    const condition = CONDITIONS.find(c => c.id === conditionId);
    if (!condition) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ active_conditions: newConditions })
        .eq('id', player.id);

      if (error) throw error;

      await onUpdate({
        ...player,
        active_conditions: newConditions
      });

      const condition = CONDITIONS.find(c => c.id === conditionId);
      if (condition) {
        toast.success(
          activeConditions.includes(conditionId)
            ? `État retiré : ${condition.name}`
            : `État ajouté : ${condition.name}`
        );
      }

      updateSelectedCondition(condition, newConditions.includes(conditionId));
    } catch (error) {
      console.error('Erreur lors de la mise à jour des états:', error);
      toast.error('Erreur lors de la mise à jour des états');
    }
  };

  const handleConditionClick = (condition: Condition) => {
    handleToggleCondition(condition.id);
    if (selectedCondition?.id === condition.id) {
      setSelectedCondition(null);
    } else {
      setSelectedCondition(condition);
    }
  };

  return (
    <div className="stat-card">
      <button
        onClick={() => setConditionsExpanded(!conditionsExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <User className="text-blue-500" size={20} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">États</h2>
        </div>
        {conditionsExpanded ? (
          <ChevronDown className="text-gray-400" size={20} />
        ) : (
          <ChevronRight className="text-gray-400" size={20} />
        )}
      </button>
      
      {conditionsExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {CONDITIONS.map((condition) => (
              <button
                key={condition.id}
                onClick={() => handleConditionClick(condition)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeConditions.includes(condition.id)
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50'
                }`}
              >
                {condition.name}
              </button>
            ))}
          </div>

          {selectedCondition && activeConditions.includes(selectedCondition.id) && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <h3 className="text-lg font-medium text-orange-400 mb-2">
                {selectedCondition.name}
              </h3>
              <p className="text-gray-300 mb-4">{selectedCondition.description}</p>
              <div className="space-y-2">
                {selectedCondition.effects.map((effect, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-orange-500/50" />
                    <p className="text-gray-400 flex-1">{effect}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}