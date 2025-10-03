import { DndClassData } from '../types/character';

export const classes: DndClassData[] = [
  {
    name: 'Barbare',
    description: 'Guerrier primitif animé par une rage destructrice.',
    hitDie: 12,
    primaryAbility: ['Force'],
    savingThrows: ['Force', 'Constitution'],
    skillsToChoose: 2,
    availableSkills: ['Athlétisme', 'Dressage', 'Intimidation', 'Nature', 'Perception', 'Survie'],
    weaponProficiencies: ['Armes courantes', 'Armes de guerre'],
    armorProficiencies: ['Armures légères', 'Armures intermédiaires', 'Boucliers'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Hache à deux mains', '4 hachettes', 'Paquetage d\'explorateur', '15 po']
      },
      {
        label: 'B',
        items: ['75 po']
      }
    ],
    equipment: [],
    features: ['Rage', 'Défense sans armure']
  },
  {
    name: 'Barde',
    description: 'Artiste et magicien, qui tisse des sorts avec musique et mots.',
    hitDie: 8,
    primaryAbility: ['Charisme'],
    savingThrows: ['Dextérité', 'Charisme'],
    skillsToChoose: 3,
    availableSkills: [], // "3 compétences au choix (cf. chapitre 1)" - toutes compétences disponibles
    weaponProficiencies: ['Armes courantes'],
    armorProficiencies: ['Armures légères'],
    toolProficiencies: ['3 instruments de musique au choix'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Armure de cuir', '2 dagues', 'Instrument de musique de votre choix', 'Paquetage d\'artiste', '19 po']
      },
      {
        label: 'B',
        items: ['90 po']
      }
    ],
    equipment: [],
    features: ['Inspiration bardique', 'Sorts']
  },
  {
    name: 'Clerc',
    description: 'Serviteur divin, capable de canaliser la puissance des dieux.',
    hitDie: 8,
    primaryAbility: ['Sagesse'],
    savingThrows: ['Sagesse', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Histoire', 'Intuition', 'Médecine', 'Persuasion', 'Religion'],
    weaponProficiencies: ['Armes courantes'],
    armorProficiencies: ['Armures légères', 'Armures intermédiaires', 'Boucliers'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Chemise de mailles', 'Bouclier', 'Masse d\'armes', 'Symbole sacré', 'Paquetage d\'ecclésiastique', '7 po']
      },
      {
        label: 'B',
        items: ['110 po']
      }
    ],
    equipment: [],
    features: ['Sorts', 'Canalisation d\'énergie divine']
  },
  {
    name: 'Druide',
    description: 'Prêtre de la nature, capable de se transformer en animal.',
    hitDie: 8,
    primaryAbility: ['Sagesse'],
    savingThrows: ['Intelligence', 'Sagesse'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Dressage', 'Intuition', 'Médecine', 'Nature', 'Perception', 'Religion', 'Survie'],
    weaponProficiencies: ['Armes courantes'],
    armorProficiencies: ['Armures légères', 'Boucliers'],
    toolProficiencies: ['Matériel d\'herboriste'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Armure de cuir', 'Bouclier', 'Serpe', 'Focaliseur druidique (bâton de combat)', 'Paquetage d\'explorateur', 'Matériel d\'herboriste', '9 po']
      },
      {
        label: 'B',
        items: ['50 po']
      }
    ],
    equipment: [],
    features: ['Sorts', 'Druidique']
  },
  {
    name: 'Ensorceleur',
    description: 'Magicien inné dont les pouvoirs viennent de son héritage.',
    hitDie: 6,
    primaryAbility: ['Charisme'],
    savingThrows: ['Constitution', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Intimidation', 'Intuition', 'Persuasion', 'Religion', 'Tromperie'],
    weaponProficiencies: ['Armes courantes'],
    armorProficiencies: [],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Lance', '2 dagues', 'Focaliseur arcanique (cristal)', 'Paquetage d\'exploration souterraine', '28 po']
      },
      {
        label: 'B',
        items: ['50 po']
      }
    ],
    equipment: [],
    features: ['Sorts', 'Sorcellerie innée']
  },
  {
    name: 'Guerrier',
    description: 'Maître des armes et des armures, expert du combat au corps à corps.',
    hitDie: 10,
    primaryAbility: ['Force', 'Dextérité'],
    savingThrows: ['Force', 'Constitution'],
    skillsToChoose: 2,
    availableSkills: ['Acrobaties', 'Athlétisme', 'Dressage', 'Histoire', 'Intuition', 'Intimidation', 'Perception', 'Persuasion', 'Survie'],
    weaponProficiencies: ['Armes courantes', 'Armes de guerre'],
    armorProficiencies: ['Armures légères', 'Armures intermédiaires', 'Armures lourdes', 'Boucliers'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Cotte de mailles', 'Épée à deux mains', 'Fléau d\'armes', '8 javelines', 'Paquetage d\'exploration souterraine', '4 po']
      },
      {
        label: 'B',
        items: ['Armure de cuir', 'Arc long', '20 flèches', 'Carquois', 'Épée courte', 'Paquetage d\'explorateur', '10 po']
      },
      {
        label: 'C',
        items: ['155 po']
      }
    ],
    equipment: [],
    features: ['Second souffle', 'Style de combat']
  },
  {
    name: 'Magicien',
    description: 'Érudit des arts arcaniques, capable de manipuler la réalité par la magie.',
    hitDie: 6,
    primaryAbility: ['Intelligence'],
    savingThrows: ['Intelligence', 'Sagesse'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Histoire', 'Intuition', 'Investigation', 'Médecine', 'Nature', 'Religion'],
    weaponProficiencies: ['Armes courantes'],
    armorProficiencies: [],
    equipmentOptions: [
      {
        label: 'A',
        items: ['2 dagues', 'Focaliseur arcanique (bâton de combat)', 'Robe', 'Grimoire', 'Paquetage d\'érudit', '5 po']
      },
      {
        label: 'B',
        items: ['55 po']
      }
    ],
    equipment: [],
    features: ['Sorts', 'Restauration magique']
  },
  {
    name: 'Moine',
    description: 'Artiste martial qui canalise son énergie intérieure.',
    hitDie: 8,
    primaryAbility: ['Dextérité', 'Sagesse'],
    savingThrows: ['Force', 'Dextérité'],
    skillsToChoose: 2,
    availableSkills: ['Acrobaties', 'Athlétisme', 'Discrétion', 'Histoire', 'Intuition', 'Religion'],
    weaponProficiencies: ['Armes courantes', 'Armes de guerre dotées de la propriété Légère'],
    armorProficiencies: [],
    toolProficiencies: ['Un type d\'outils d\'artisan ou d\'instrument de musique'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Lance', '5 dagues', 'Outils d\'artisan ou instrument de musique', 'Paquetage d\'explorateur', '11 po']
      },
      {
        label: 'B',
        items: ['30 po']
      }
    ],
    equipment: [],
    features: ['Arts martiaux', 'Défense sans armure']
  },
  {
    name: 'Occultiste',
    description: 'Magicien qui a conclu un pacte avec une entité extraplanaire.',
    hitDie: 8,
    primaryAbility: ['Charisme'],
    savingThrows: ['Sagesse', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Histoire', 'Intimidation', 'Investigation', 'Nature', 'Religion', 'Tromperie'],
    weaponProficiencies: ['Armes courantes'],
    armorProficiencies: ['Armures légères'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Armure de cuir', 'Serpe', '2 dagues', 'Focaliseur arcanique (orbe)', 'Livre (savoir occulte)', 'Paquetage d\'érudit', '15 po']
      },
      {
        label: 'B',
        items: ['100 po']
      }
    ],
    equipment: [],
    features: ['Magie de pacte', 'Manifestations occultes']
  },
  {
    name: 'Paladin',
    description: 'Guerrier saint lié par des serments sacrés.',
    hitDie: 10,
    primaryAbility: ['Force', 'Charisme'],
    savingThrows: ['Sagesse', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Athlétisme', 'Intimidation', 'Intuition', 'Médecine', 'Persuasion', 'Religion'],
    weaponProficiencies: ['Armes courantes', 'Armes de guerre'],
    armorProficiencies: ['Armures légères', 'Armures intermédiaires', 'Armures lourdes', 'Boucliers'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Cotte de mailles', 'Bouclier', 'Épée longue', '6 javelines', 'Symbole sacré', 'Paquetage d\'ecclésiastique', '9 po']
      },
      {
        label: 'B',
        items: ['150 po']
      }
    ],
    equipment: [],
    features: ['Détection du mal', 'Imposition des mains']
  },
  {
    name: 'Rôdeur',
    description: 'Gardien des terres sauvages, chasseur et pisteur accompli.',
    hitDie: 10,
    primaryAbility: ['Dextérité', 'Sagesse'],
    savingThrows: ['Force', 'Dextérité'],
    skillsToChoose: 3,
    availableSkills: ['Athlétisme', 'Discrétion', 'Dressage', 'Intuition', 'Investigation', 'Nature', 'Perception', 'Survie'],
    weaponProficiencies: ['Armes courantes', 'Armes de guerre'],
    armorProficiencies: ['Armures légères', 'Armures intermédiaires', 'Boucliers'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Armure de cuir clouté', 'Cimeterre', 'Épée courte', 'Arc long', '20 flèches', 'Carquois', 'Focaliseur druidique (branche de gui)', 'Paquetage d\'explorateur', '5 po']
      },
      {
        label: 'B',
        items: ['150 po']
      }
    ],
    equipment: [],
    features: ['Ennemi juré', 'Exploration naturelle']
  },
  {
    name: 'Roublard',
    description: 'Expert en discrétion et en finesse, spécialiste des attaques sournoises.',
    hitDie: 8,
    primaryAbility: ['Dextérité'],
    savingThrows: ['Dextérité', 'Intelligence'],
    skillsToChoose: 4,
    availableSkills: ['Acrobaties', 'Athlétisme', 'Discrétion', 'Escamotage', 'Intimidation', 'Intuition', 'Investigation', 'Perception', 'Persuasion', 'Tromperie'],
    weaponProficiencies: ['Armes courantes', 'Armes de guerre présentant la propriété Finesse ou Légère'],
    armorProficiencies: ['Armures légères'],
    toolProficiencies: ['Outils de voleur'],
    equipmentOptions: [
      {
        label: 'A',
        items: ['Armure de cuir', '2 dagues', 'Épée courte', 'Arc court', '20 flèches', 'Carquois', 'Outils de voleur', 'Paquetage de cambrioleur', '8 po']
      },
      {
        label: 'B',
        items: ['100 po']
      }
    ],
    equipment: [],
    features: ['Argot des voleurs', 'Attaque sournoise', 'Expertise']
  }
];