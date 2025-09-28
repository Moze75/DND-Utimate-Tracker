import { DndRace } from '../types/character';

export const races: DndRace[] = [
  {
    name: 'Humain',
    description: 'Polyvalents et adaptables, les humains se distinguent par leur ambition.',
    size: 'Moyen ou Petit',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: ['Une compétence au choix'],
    traits: [
      'Compétent (maîtrise d\'une compétence)',
      'Ingénieux (inspiration héroïque après repos long)',
      'Don d\'origine (au choix)'
    ]
  },
  {
    name: 'Elfe',
    description: 'Gracieux et proches de la magie, les elfes vivent en harmonie avec la nature.',
    size: 'Moyen',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: ['Intuition, Perception ou Survie (au choix)'],
    traits: [
      'Vision dans le noir (18 m)',
      'Ascendance féerique (avantage contre Charmé)',
      'Transe (repos long en 4h)',
      'Lignage elfique (choix entre Haut elfe, Elfe sylvestre ou Drow avec sorts et capacités associés)'
    ]
  },
  {
    name: 'Demi-Elfe',
    description: 'Nés de l\'union entre humain et elfe, ils naviguent entre deux mondes.',
    size: 'Moyen',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: ['Intuition, Perception ou Survie (au choix)'],
    traits: [
      'Vision dans le noir (18 m)',
      'Ascendance féerique (avantage contre Charmé)',
      'Ingénieux (inspiration héroïque après repos long)',
      'Lignage elfique (au choix entre Drow, Haut elfe, ou Elfe sylvestre)'
    ]
  },
  {
    name: 'Nain',
    description: 'Robustes et endurants, les nains sont d\'excellents artisans et combattants.',
    size: 'Moyen',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (36 m)',
      'Résistance naine (avantage contre poison)',
      'Connaissance de la pierre (Perception des vibrations)',
      'Ténacité naine (+1 pv par niveau)'
    ]
  },
  {
    name: 'Halfelin',
    description: 'Petits mais courageux, les halfelins sont réputés pour leur chance.',
    size: 'Petit',
    speed: 30, // 9 m = 30 pieds
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Chanceux (relance les 1)',
      'Brave (avantage contre Effrayé)',
      'Agilité halfeline (déplacement dans l\'espace des grandes créatures)',
      'Discrétion naturelle (action Furtivité à l\'ombre des grandes créatures)'
    ]
  },
  {
    name: 'Drakeide',
    description: 'Descendants des dragons, les drakéides possèdent des pouvoirs draconiques.',
    size: 'Moyen',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (18 m)',
      'Ascendance draconique (choix du type de dragon)',
      'Souffle draconique (1d10 → évolutif, utilisations = bonus de maîtrise)',
      'Résistance draconique (selon type de dragon)',
      'Vol draconique (niv 5, ailes spectrales 10 min, repos long)'
    ]
  },
  {
    name: 'Gnome',
    description: 'Petits et curieux, les gnomes excellent dans la magie et l\'ingéniosité.',
    size: 'Petit',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (18 m)',
      'Ruse gnome (avantage aux JS mentaux)',
      'Lignage gnome (choix entre Forêts ou Roches avec sorts et capacités associés)'
    ]
  },
  {
    name: 'Orc',
    description: 'Fiers et puissants, les orcs sont marqués par leur force et leur ténacité.',
    size: 'Moyen',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (36 m)',
      'Acharnement (rester à 1 pv 1/long rest)',
      'Poussée d\'adrénaline (PV temporaires + action Pointe, utilisations = bonus de maîtrise)'
    ]
  },
  {
    name: 'Demi-Orc',
    description: 'Issus de l\'union d\'humains et d\'orcs, ils héritent d\'une grande endurance.',
    size: 'Moyen',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (36 m)',
      'Acharnement (rester à 1 pv 1/long rest)',
      'Ingénieux (inspiration héroïque après repos long)'
    ]
  },
  {
    name: 'Tieffelin',
    description: 'Marqués par un héritage fiélon, les tieffelins portent en eux la magie des plans inférieurs.',
    size: 'Moyen ou Petit',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (18 m)',
      'Héritage fiélon (choix entre Infernal, Abyssal ou Chtonien avec sorts et résistances associés)',
      'Présence d\'outre-monde (thaumaturgie)'
    ]
  },
  {
    name: 'Aasimar',
    description: 'Descendants des plans célestes, porteurs de lumière et de puissance divine.',
    size: 'Moyen ou Petit',
    speed: 30,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (18 m)',
      'Mains guérisseuses (soins = bonus de maîtrise en d4, repos long)',
      'Résistance céleste (radiant & nécrotique)',
      'Porte-lumière (lumière)',
      'Révélation céleste (niv 3 : ailes, linceul nécrotique ou radiance, 1 min, repos long)'
    ]
  },
  {
    name: 'Goliath',
    description: 'Descendants des géants, les goliaths possèdent une puissance colossale.',
    size: 'Moyen (grands)',
    speed: 35,
    languages: ['Commun', 'Au choix'],
    proficiencies: [],
    traits: [
      'Vision dans le noir (18 m)',
      'Ascendance gigantesque (choix parmi 6 pouvoirs de géants, utilisations = bonus de maîtrise)',
      'Forme de géant (niv 5, taille G, 10 min, avantage Force, +3 m vitesse, repos long)',
      'Forte carrure (avantage vs Agrippé, capacité de charge accrue)'
    ]
  }
];