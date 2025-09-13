import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Book, Swords, Shield, Zap, Eye, Users, Heart, Search, Wand2, Target, Move } from 'lucide-react';

interface StandardAction {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  rules: string[];
  actionType: 'Action' | 'Action bonus' | 'Réaction' | 'Mouvement';
}

const STANDARD_ACTIONS: StandardAction[] = [
  {
    id: 'attack',
    name: 'Attaquer',
    icon: <Swords className="w-5 h-5 text-red-500" />,
    description: 'Effectuer une attaque au corps à corps ou à distance.',
    rules: [
      'Jet d\'attaque : 1d20 + modificateur de caractéristique + bonus de maîtrise (si maîtrisé)',
      'Si le jet égale ou dépasse la CA de la cible, l\'attaque touche',
      'Lancez les dégâts selon l\'arme utilisée',
      'Critique naturel sur un 20 : doublez les dés de dégâts'
    ],
    actionType: 'Action'
  },
  {
    id: 'dash',
    name: 'Foncer',
    icon: <Move className="w-5 h-5 text-blue-500" />,
    description: 'Doubler sa vitesse de déplacement pour ce tour.',
    rules: [
      'Votre vitesse de déplacement est doublée pour ce tour',
      'Vous pouvez vous déplacer d\'une distance supplémentaire égale à votre vitesse',
      'Ne permet pas d\'effectuer d\'autres actions',
      'Peut être combiné avec un mouvement normal'
    ],
    actionType: 'Action'
  },
  {
    id: 'disengage',
    name: 'Se désengager',
    icon: <Shield className="w-5 h-5 text-green-500" />,
    description: 'Éviter les attaques d\'opportunité en se déplaçant.',
    rules: [
      'Votre mouvement ne provoque pas d\'attaques d\'opportunité pour le reste du tour',
      'Vous pouvez vous éloigner d\'ennemis adjacents sans risque',
      'Utile pour repositionner un personnage fragile',
      'Ne vous donne pas de mouvement supplémentaire'
    ],
    actionType: 'Action'
  },
  {
    id: 'dodge',
    name: 'Esquiver',
    icon: <Target className="w-5 h-5 text-purple-500" />,
    description: 'Se concentrer entièrement sur l\'évitement des attaques.',
    rules: [
      'Les jets d\'attaque contre vous ont le désavantage',
      'Vous avez l\'avantage aux jets de sauvegarde de Dextérité',
      'L\'effet dure jusqu\'au début de votre prochain tour',
      'Vous ne pouvez pas effectuer d\'autres actions'
    ],
    actionType: 'Action'
  },
  {
    id: 'grapple',
    name: 'Empoigner',
    icon: <Users className="w-5 h-5 text-orange-500" />,
    description: 'Saisir et immobiliser une créature.',
    rules: [
      'Remplace une attaque si vous avez plusieurs attaques',
      'Jet de Force (Athlétisme) contre Force (Athlétisme) ou Dextérité (Acrobaties) de la cible',
      'En cas de succès, la cible est agrippée',
      'La cible agrippée a une vitesse de 0 et ne peut pas se déplacer'
    ],
    actionType: 'Action'
  },
  {
    id: 'help',
    name: 'Aider',
    icon: <Heart className="w-5 h-5 text-pink-500" />,
    description: 'Aider un allié dans une tâche ou une attaque.',
    rules: [
      'Donnez l\'avantage au prochain jet de caractéristique d\'un allié',
      'Ou donnez l\'avantage à la prochaine attaque d\'un allié contre une créature à 1,50 m de vous',
      'L\'avantage est perdu s\'il n\'est pas utilisé avant votre prochain tour',
      'Vous devez être capable d\'aider de manière significative'
    ],
    actionType: 'Action'
  },
  {
    id: 'hide',
    name: 'Se cacher',
    icon: <Eye className="w-5 h-5 text-gray-500" />,
    description: 'Tenter de devenir invisible aux ennemis.',
    rules: [
      'Jet de Dextérité (Discrétion) contre Sagesse (Perception) passive des ennemis',
      'Vous devez être hors de vue pour tenter de vous cacher',
      'En cas de succès, vous êtes caché jusqu\'à ce que vous soyez découvert',
      'Attaquer depuis une cachette donne l\'avantage'
    ],
    actionType: 'Action'
  },
  {
    id: 'improvise',
    name: 'Improviser',
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    description: 'Effectuer une action créative non listée.',
    rules: [
      'Décrivez votre action au MJ',
      'Le MJ détermine si c\'est possible et quel jet effectuer',
      'Généralement un jet de caractéristique approprié',
      'La difficulté dépend de la complexité de l\'action'
    ],
    actionType: 'Action'
  },
  {
    id: 'influence',
    name: 'Influencer',
    icon: <Users className="w-5 h-5 text-indigo-500" />,
    description: 'Tenter d\'influencer une créature par la parole.',
    rules: [
      'Jet de Charisme (Persuasion, Intimidation, ou Tromperie)',
      'La difficulté dépend de l\'attitude de la cible',
      'Peut changer l\'attitude d\'une créature hostile en neutre',
      'Nécessite un langage commun ou des gestes compréhensibles'
    ],
    actionType: 'Action'
  },
  {
    id: 'cast_spell',
    name: 'Lancer un sort',
    icon: <Wand2 className="w-5 h-5 text-purple-400" />,
    description: 'Lancer un sort avec un temps d\'incantation d\'1 action.',
    rules: [
      'Consomme un emplacement de sort du niveau approprié',
      'Respectez les composantes requises (V, S, M)',
      'La cible doit être à portée du sort',
      'Certains sorts nécessitent un jet d\'attaque ou de sauvegarde'
    ],
    actionType: 'Action'
  },
  {
    id: 'ready',
    name: 'Préparer',
    icon: <Target className="w-5 h-5 text-cyan-500" />,
    description: 'Préparer une action à déclencher selon une condition.',
    rules: [
      'Choisissez une action et une condition de déclenchement',
      'Votre réaction se déclenche quand la condition est remplie',
      'Si la condition ne se produit pas, l\'action est perdue',
      'Vous pouvez vous déplacer jusqu\'à votre vitesse dans le cadre de l\'action préparée'
    ],
    actionType: 'Action'
  },
  {
    id: 'search',
    name: 'Chercher',
    icon: <Search className="w-5 h-5 text-teal-500" />,
    description: 'Chercher activement quelque chose dans l\'environnement.',
    rules: [
      'Jet de Sagesse (Perception) ou Intelligence (Investigation)',
      'Permet de trouver des objets cachés, des passages secrets, etc.',
      'Plus efficace que la Perception passive',
      'Le MJ peut révéler des détails supplémentaires'
    ],
    actionType: 'Action'
  }
];

interface StandardActionsSectionProps {
  player: any;
  onUpdate: (player: any) => void;
}

export function StandardActionsSection({ player, onUpdate }: StandardActionsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAction, setSelectedAction] = useState<StandardAction | null>(null);

  const handleActionClick = (action: StandardAction) => {
    setSelectedAction(selectedAction?.id === action.id ? null : action);
  };

  return (
    <div className="stat-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <Book className="text-orange-500" size={20} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Actions standard</h2>
        </div>
        {isExpanded ? (
          <ChevronDown className="text-gray-400" size={20} />
        ) : (
          <ChevronRight className="text-gray-400" size={20} />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {STANDARD_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedAction?.id === action.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50'
                }`}
              >
                {action.name}
              </button>
            ))}
          </div>

          {selectedAction && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-3 mb-3">
                {selectedAction.icon}
                <div>
                  <h3 className="text-lg font-medium text-blue-300">
                    {selectedAction.name}
                  </h3>
                  <span className="text-sm text-gray-400">{selectedAction.actionType}</span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-4">{selectedAction.description}</p>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-200 mb-2">Règles :</h4>
                {selectedAction.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500/50 flex-shrink-0" />
                    <p className="text-gray-400 flex-1">{rule}</p>
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