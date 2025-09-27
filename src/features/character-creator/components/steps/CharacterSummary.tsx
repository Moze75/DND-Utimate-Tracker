import React, { useState } from 'react';
import { races } from '../../data/races';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { Users, Zap, Shield, Star, ChevronDown, Eye, Heart } from 'lucide-react';

interface RaceSelectionProps {
  selectedRace: string;
  onRaceSelect: (race: string) => void;
  onNext: () => void;
}

export default function RaceSelection({ selectedRace, onRaceSelect, onNext }: RaceSelectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Conversion pieds -> mètres (les données sont déjà en pieds dans le nouveau système)
  const feetToMeters = (ft?: number) => {
    if (!ft && ft !== 0) return '';
    return Math.round(ft * 0.3048 * 2) / 2;
  };

  const handleClick = (raceName: string) => {
    onRaceSelect(raceName);
    setExpanded((prev) => (prev === raceName ? null : raceName));
  };

  const getRaceIcon = (raceName: string) => {
    if (raceName === 'Elfe' || raceName === 'Demi-Elfe') {
      return <Star className="w-5 h-5 text-green-400" />;
    }
    if (raceName === 'Nain') {
      return <Shield className="w-5 h-5 text-orange-400" />;
    }
    if (raceName === 'Halfelin') {
      return <Heart className="w-5 h-5 text-yellow-400" />;
    }
    if (raceName === 'Drakéide') {
      return <Zap className="w-5 h-5 text-red-400" />;
    }
    if (raceName === 'Gnome') {
      return <Star className="w-5 h-5 text-purple-400" />;
    }
    if (raceName.includes('Orc')) {
      return <Shield className="w-5 h-5 text-red-500" />;
    }
    if (raceName === 'Tieffelin') {
      return <Zap className="w-5 h-5 text-purple-500" />;
    }
    if (raceName === 'Aasimar') {
      return <Star className="w-5 h-5 text-blue-300" />;
    }
    if (raceName === 'Goliath') {
      return <Shield className="w-5 h-5 text-gray-400" />;
    }
    if (raceName === 'Humain') {
      return <Users className="w-5 h-5 text-blue-400" />;
    }
    return <Users className="w-5 h-5 text-gray-400" />;
  };

  const hasVisionInDark = (traits: string[]) => {
    return traits.some(trait => trait.includes('Vision dans le noir'));
  };

  return (
    <div className="wizard-step space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choisissez votre espèce</h2>
        <p className="text-gray-400">Votre race détermine vos capacités innées et votre héritage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {races.map((race) => {
          const isSelected = selectedRace === race.name;
          const isExpanded = expanded === race.name;

          return (
            <Card
              key={race.name}
              selected={isSelected}
              onClick={() => handleClick(race.name)}
              className="h-full"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{race.name}</h3>
                  <div className="flex items-center gap-2">
                    {getRaceIcon(race.name)}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-3">{race.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                    <span>Vitesse: {feetToMeters(race.speed)} m</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Shield className="w-4 h-4 mr-2 text-blue-400" />
                    <span>Taille: {race.size}</span>
                  </div>
                  {hasVisionInDark(race.traits) && (
                    <div className="flex items-center text-sm text-gray-400">
                      <Eye className="w-4 h-4 mr-2 text-purple-400" />
                      <span>Vision dans le noir</span>
                    </div>
                  )}
                  {race.languages && race.languages.length > 0 && (
                    <div className="flex items-center text-sm text-gray-400">
                      <Star className="w-4 h-4 mr-2 text-green-400" />
                      <span>
                        Langues: {race.languages.slice(0, 2).join(', ')}
                        {race.languages.length > 2 ? '...' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-gray-700/50 pt-4 animate-fade-in">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <h4 className="font-medium text-white mb-2">Langues</h4>
                        <p className="text-gray-300 text-sm">
                          {race.languages && race.languages.length > 0 ? race.languages.join(', ') : '—'}
                        </p>
                      </div>

                      {race.proficiencies && race.proficiencies.length > 0 && (
                        <div>
                          <h4 className="font-medium text-white mb-2">Compétences</h4>
                          <p className="text-gray-300 text-sm">
                            {race.proficiencies.join(', ')}
                          </p>
                        </div>
                      )}

                      {race.traits && race.traits.length > 0 && (
                        <div>
                          <h4 className="font-medium text-white mb-2">Traits raciaux</h4>
                          <div className="max-h-32 overflow-y-auto">
                            <ul className="text-gray-300 text-sm space-y-1">
                              {race.traits.map((trait, index) => (
                                <li key={index} className="leading-relaxed">• {trait}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pt-6">
        <Button
          onClick={onNext}
          disabled={!selectedRace}
          size="lg"
          className="min-w-[200px]"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}