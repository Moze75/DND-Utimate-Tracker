import React, { useState } from 'react';
import { backgrounds } from '../../data/backgrounds';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { BookOpen, Star, Wrench, Zap, ChevronDown, CheckCircle2, Circle, Scroll } from 'lucide-react';

interface BackgroundSelectionProps {
selectedBackground: string;
onBackgroundSelect: (background: string) => void;

// Rendus optionnels pour éviter les erreurs si non encore branchés depuis le Wizard
selectedEquipmentOption?: 'A' | 'B' | '';
onEquipmentOptionChange?: (opt: 'A' | 'B' | '') => void;

onNext: () => void;
onPrevious: () => void;
}

// Données des historiques avec leurs dons
const backgroundsData = [
{
name: "Acolyte",
description: "Vous étiez au service d'un temple, accomplissant des rites religieux en l'honneur d'une divinité ou d'un panthéon.",
abilityScores: ["Intelligence", "Sagesse", "Charisme"],
feat: "Initié à la magie (Clerc)",
skillProficiencies: ["Intuition", "Religion"],
toolProficiencies: ["Matériel de calligraphie"],
equipmentOptions: {
optionA: [
"Matériel de calligraphie",
"Livre de prières",
"Symbole sacré",
"Parchemin (10 feuilles)",
"Robe",
"8 po"
],
optionB: ["50 po"]
}
},
{
name: "Artisan",
description: "Vous avez appris à créer des objets artisanaux de base et à amadouer les clients difficiles.",
abilityScores: ["Force", "Dextérité", "Intelligence"],
feat: "Façonneur",
skillProficiencies: ["Investigation", "Persuasion"],
toolProficiencies: ["Outils d'artisan (au choix)"],
equipmentOptions: {
optionA: [
"Outils d'artisan",
"2 sacoches",
"Tenue de voyage",
"32 po"
],
optionB: ["50 po"]
}
},
{
name: "Artiste",
description: "Vous avez passé votre jeunesse avec des musiciens et acrobates, apprenant l'art de la scène.",
abilityScores: ["Force", "Dextérité", "Charisme"],
feat: "Musicien",
skillProficiencies: ["Acrobaties", "Représentation"],
toolProficiencies: ["Instrument de musique (au choix)"],
equipmentOptions: {
optionA: [
"Instrument de musique",
"2 costumes",
"Miroir",
"Parfum",
"Tenue de voyage",
"11 po"
],
optionB: ["50 po"]
}
},
{
name: "Charlatan",
description: "Vous avez appris l'art de vendre du rêve aux malheureux en quête d'un bobard réconfortant.",
abilityScores: ["Dextérité", "Constitution", "Charisme"],
feat: "Doué",
skillProficiencies: ["Escamotage", "Tromperie"],
toolProficiencies: ["Matériel de contrefaçon"],
equipmentOptions: {
optionA: [
"Matériel de contrefaçon",
"Beaux habits",
"Costume",
"15 po"
],
optionB: ["50 po"]
}
},
{
name: "Criminel",
description: "Vous gagniez votre pain dans les ruelles sombres, en coupant des bourses ou en cambriolant des échoppes.",
abilityScores: ["Dextérité", "Constitution", "Intelligence"],
feat: "Voleur",
skillProficiencies: ["Discrétion", "Escamotage"],
toolProficiencies: ["Outils de voleur"],
equipmentOptions: {
optionA: [
"2 dagues",
"Outils de voleur",
"2 sacoches",
"Pied-de-biche",
"Tenue de voyage",
"16 po"
],
optionB: ["50 po"]
}
},
{
name: "Ermite",
description: "Vous avez passé vos jeunes années isolé, réfléchissant aux mystères de la création.",
abilityScores: ["Constitution", "Sagesse", "Charisme"],
feat: "Guérisseur",
skillProficiencies: ["Médecine", "Religion"],
toolProficiencies: ["Matériel d'herboriste"],
equipmentOptions: {
optionA: [
"Bâton de combat",
"Matériel d'herboriste",
"Huile (3 flasques)",
"Lampe",
"Livre (philosophie)",
"Sac de couchage",
"Tenue de voyage",
"16 po"
],
optionB: ["50 po"]
}
},
{
name: "Fermier",
description: "Vous avez grandi près de la terre, gagnant en patience et en robustesse au contact de la nature.",
abilityScores: ["Force", "Constitution", "Sagesse"],
feat: "Robuste",
skillProficiencies: ["Dressage", "Nature"],
toolProficiencies: ["Outils de charpentier"],
equipmentOptions: {
optionA: [
"Serpe",
"Outils de charpentier",
"Trousse de soins",
"Pelle",
"Pot en fer",
"Tenue de voyage",
"30 po"
],
optionB: ["50 po"]
}
},
{
name: "Garde",
description: "Vous avez monté la garde, apprenant à surveiller les maraudeurs et les fauteurs de troubles.",
abilityScores: ["Force", "Intelligence", "Sagesse"],
feat: "Vigilant",
skillProficiencies: ["Athlétisme", "Perception"],
toolProficiencies: ["Boîte de jeux (au choix)"],
equipmentOptions: {
optionA: [
"Arbalète légère + 20 carreaux",
"Carquois",
"Lance",
"Boîte de jeux",
"Lanterne à capote",
"Menottes",
"Tenue de voyage",
"12 po"
],
optionB: ["50 po"]
}
},
{
name: "Guide",
description: "Vous avez grandi en pleine nature sauvage, apprenant à explorer et canaliser la magie naturelle.",
abilityScores: ["Dextérité", "Constitution", "Sagesse"],
feat: "Initié à la magie (Druide)",
skillProficiencies: ["Discrétion", "Survie"],
toolProficiencies: ["Outils de cartographe"],
equipmentOptions: {
optionA: [
"Arc court + 20 flèches",
"Carquois",
"Outils de cartographe",
"Sac de couchage",
"Tente",
"Tenue de voyage",
"3 po"
],
optionB: ["50 po"]
}
},
{
name: "Marchand",
description: "Apprenti auprès d'un négociant, vous avez appris les bases du commerce et du transport de marchandises.",
abilityScores: ["Constitution", "Intelligence", "Charisme"],
feat: "Chanceux",
skillProficiencies: ["Dressage", "Persuasion"],
toolProficiencies: ["Instruments de navigateur"],
equipmentOptions: {
optionA: [
"Instruments de navigateur",
"2 sacoches",
"Tenue de voyage",
"22 po"
],
optionB: ["50 po"]
}
},
{
name: "Marin",
description: "Vous avez vécu l'existence du grand large, échangeant récits avec le peuple de la mer.",
abilityScores: ["Force", "Dextérité", "Sagesse"],
feat: "Bagarreur de tavernes",
skillProficiencies: ["Acrobaties", "Perception"],
toolProficiencies: ["Instruments de navigateur"],
equipmentOptions: {
optionA: [
"Dague",
"Instruments de navigateur",
"Corde",
"Tenue de voyage",
"20 po"
],
optionB: ["50 po"]
}
},
{
name: "Noble",
description: "Vous avez passé votre enfance dans un château, apprenant l'autorité au milieu de l'opulence.",
abilityScores: ["Force", "Intelligence", "Charisme"],
feat: "Doué",
skillProficiencies: ["Histoire", "Persuasion"],
toolProficiencies: ["Boîte de jeux (au choix)"],
equipmentOptions: {
optionA: [
"Boîte de jeux",
"Beaux habits",
"Parfum",
"29 po"
],
optionB: ["50 po"]
}
},
{
name: "Sage",
description: "Vos années ont été consacrées à l'étude, engrangeant le savoir du multivers et des rudiments de magie.",
abilityScores: ["Constitution", "Intelligence", "Sagesse"],
feat: "Initié à la magie (Magicien)",
skillProficiencies: ["Arcanes", "Histoire"],
toolProficiencies: ["Matériel de calligraphie"],
equipmentOptions: {
optionA: [
"Bâton de combat",
"Matériel de calligraphie",
"Livre (d'histoire)",
"Parchemin (8 feuilles)",
"Robe",
"8 po"
],
optionB: ["50 po"]
}
},
{
name: "Scribe",
description: "Formé dans un scriptorium, vous avez appris à écrire lisiblement et à produire des textes impeccables.",
abilityScores: ["Dextérité", "Intelligence", "Sagesse"],
feat: "Doué",
skillProficiencies: ["Investigation", "Perception"],
toolProficiencies: ["Matériel de calligraphie"],
equipmentOptions: {
optionA: [
"Matériel de calligraphie",
"Beaux habits",
"Lampe",
"Huile (3 flasques)",
"Parchemin (12 feuilles)",
"23 po"
],
optionB: ["50 po"]
}
},
{
name: "Soldat",
description: "Formé aux rudiments de la guerre, vous avez la bataille dans le sang et l'entraînement par réflexe.",
abilityScores: ["Force", "Dextérité", "Constitution"],
feat: "Sauvagerie martiale",
skillProficiencies: ["Athlétisme", "Intimidation"],
toolProficiencies: ["Boîte de jeux (au choix)"],
equipmentOptions: {
optionA: [
"Arc court + 20 flèches",
"Carquois",
"Lance",
"Boîte de jeux",
"Trousse de soins",
"Tenue de voyage",
"14 po"
],
optionB: ["50 po"]
}
},
{
name: "Voyageur",
description: "Vous avez grandi dans la rue parmi les marginaux, gardant votre fierté et votre espoir malgré les épreuves.",
abilityScores: ["Dextérité", "Sagesse", "Charisme"],
feat: "Chanceux",
skillProficiencies: ["Discrétion", "Intuition"],
toolProficiencies: ["Outils de voleur"],
equipmentOptions: {
optionA: [
"2 dagues",
"Outils de voleur",
"Boîte de jeux (tout type)",
"Sac de couchage",
"2 sacoches",
"Tenue de voyage",
"16 po"
],
optionB: ["50 po"]
}
}
];

export default function BackgroundSelection({
selectedBackground,
onBackgroundSelect,
selectedEquipmentOption = '',
onEquipmentOptionChange = () => {},
onNext,
onPrevious
}: BackgroundSelectionProps) {
const [expanded, setExpanded] = useState<string | null>(null);

const handleClick = (name: string) => {
const isSame = selectedBackground === name;
onBackgroundSelect(name);
setExpanded((prev) => (prev === name ? null : name));
if (!isSame) {
// reset le choix d'équipement si on change d'historique
onEquipmentOptionChange('');
}
};

return ( <div className="wizard-step space-y-6"> <div className="text-center"> <h2 className="text-2xl font-bold text-white mb-2">Choisissez votre historique</h2> <p className="text-gray-400">Votre historique reflète votre passé et vos talents acquis</p> </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
    {backgroundsData.map((bg) => {
      const isSelected = selectedBackground === bg.name;
      const isExpanded = expanded === bg.name;

      return (
        <Card
          key={bg.name}
          selected={isSelected}
          onClick={() => handleClick(bg.name)}
          className="h-fit"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{bg.name}</h3>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm mb-3">{bg.description}</p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center">
                <Scroll className="w-4 h-4 mr-2 text-purple-400" />
                <span>Don: {bg.feat}</span>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-2 text-yellow-400" />
                <span>Compétences: {bg.skillProficiencies?.join(', ') || '—'}</span>
              </div>
              <div className="flex items-center">
                <Wrench className="w-4 h-4 mr-2 text-green-400" />
                <span>Outils: {bg.toolProficiencies?.join(', ') || '—'}</span>
              </div>
              {bg.abilityScores && (
                <div className="flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-red-400" />
                  <span>Caractéristiques clés: {bg.abilityScores.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Détails dépliés dans la carte */}
            {isExpanded && (
              <div className="mt-4 border-t border-gray-700/50 pt-4 animate-fade-in">
                {/* Sélecteur d'option d'équipement A/B */}
                {bg.equipmentOptions && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-white">Équipement de départ</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Option A */}
                      <button
                        type="button"
                        className={`text-left rounded-md border p-3 transition-colors ${
                          selectedEquipmentOption === 'A'
                            ? 'border-red-500/70 bg-red-900/20'
                            : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEquipmentOptionChange('A');
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {selectedEquipmentOption === 'A' ? (
                            <CheckCircle2 className="w-4 h-4 text-red-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-200">Option A</span>
                        </div>
                        <ul className="text-gray-300 text-sm space-y-1">
                          {bg.equipmentOptions.optionA.map((item, i) => (
                            <li key={`A-${i}`}>• {item}</li>
                          ))}
                        </ul>
                      </button>

                      {/* Option B */}
                      <button
                        type="button"
                        className={`text-left rounded-md border p-3 transition-colors ${
                          selectedEquipmentOption === 'B'
                            ? 'border-red-500/70 bg-red-900/20'
                            : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEquipmentOptionChange('B');
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {selectedEquipmentOption === 'B' ? (
                            <CheckCircle2 className="w-4 h-4 text-red-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-200">Option B</span>
                        </div>
                        <ul className="text-gray-300 text-sm space-y-1">
                          {bg.equipmentOptions.optionB.map((item, i) => (
                            <li key={`B-${i}`}>• {item}</li>
                          ))}
                        </ul>
                      </button>
                    </div>
                    <div className="text-xs text-gray-400">
                      Choisissez une option pour continuer.
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    })}
  </div>

  <div className="flex justify-between pt-6">
    <Button onClick={onPrevious} variant="secondary" size="lg">
      Précédent
    </Button>
    <Button
      onClick={onNext}
      disabled={!selectedBackground || !selectedEquipmentOption}
      size="lg"
      className="min-w-[200px]"
    >
      Continuer
    </Button>
  </div>
</div>
);
}

