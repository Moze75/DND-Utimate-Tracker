import { DndClassData } from '../types/character';

export const classes: DndClassData[] = [
  {
    name: 'Guerrier',
    description: 'Maître des armes et des armures, expert du combat au corps à corps.',
    hitDie: 10,
    primaryAbility: ['Force', 'Dextérité'],
    savingThrows: ['Force', 'Constitution'],
    skillsToChoose: 2,
    availableSkills: ['Acrobaties', 'Athlétisme', 'Histoire', 'Intimidation', 'Perception', 'Survie'],
    equipment: ['Armure de mailles', 'Bouclier', 'Épée longue', 'Javelines'],
    features: ['Botte D\'arme', 'Second souffle', 'Style de combat']
  },
  {
    name: 'Magicien',
    description: 'Érudit des arts arcaniques, capable de manipuler la réalité par la magie.',
    hitDie: 6,
    primaryAbility: ['Intelligence'],
    savingThrows: ['Intelligence', 'Sagesse'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Histoire', 'Intuition', 'Investigation', 'Médecine', 'Religion'],
    equipment: ['Dague', 'Focaliseur arcanique', 'Livre de sorts'],
    features: ['Sorts', 'Restauration magique', 'Savoir rituel']
  },
  {
    name: 'Roublard',
    description: 'Expert en discrétion et en finesse, spécialiste des attaques sournoises.',
    hitDie: 8,
    primaryAbility: ['Dextérité'],
    savingThrows: ['Dextérité', 'Intelligence'],
    skillsToChoose: 4,
    availableSkills: ['Acrobaties', 'Athlétisme', 'Escamotage', 'Furtivité', 'Intimidation', 'Investigation', 'Perception', 'Persuasion', 'Perspicacité', 'Représentation', 'Tromperie'],
    equipment: ['Armure de cuir', 'Dague', 'Rapière', 'Outils de voleur'],
    features: ['Argot des voleurs', 'Attaque sournoise', 'Botte d\'arme', 'Expertise']
  },
  {
    name: 'Clerc',
    description: 'Serviteur divin, capable de canaliser la puissance des dieux.',
    hitDie: 8,
    primaryAbility: ['Sagesse'],
    savingThrows: ['Sagesse', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Histoire', 'Intuition', 'Médecine', 'Persuasion', 'Religion'],
    equipment: ['Armure de mailles', 'Bouclier', 'Masse d’armes', 'Symbole sacré'],
    features: ['Sorts']
  },
  {
    name: 'Rôdeur',
    description: 'Gardien des terres sauvages, chasseur et pisteur accompli.',
    hitDie: 10,
    primaryAbility: ['Dextérité', 'Sagesse'],
    savingThrows: ['Force', 'Dextérité'],
    skillsToChoose: 3,
    availableSkills: ['Athlétisme', 'Intuition', 'Investigation', 'Nature', 'Perception', 'Furtivité', 'Survie'],
    equipment: ['Armure de cuir clouté', 'Épée courte', 'Arc long', 'Carquois'],
    features: ['Sorts', 'Bottes d\'arme', 'Ennemi juré']
  },
  {
    name: 'Barbare',
    description: 'Guerrier primitif animé par une rage destructrice.',
    hitDie: 12,
    primaryAbility: ['Force'],
    savingThrows: ['Force', 'Constitution'],
    skillsToChoose: 2,
    availableSkills: ['Dressage', 'Athlétisme', 'Intimidation', 'Nature', 'Perception', 'Survie'],
    equipment: ['Hache à deux mains', 'Javelines', 'Armure de cuir', 'Sac d’explorateur'],
    features: ['Rage', 'Défense sans armure']
  },
  {
    name: 'Barde',
    description: 'Artiste et magicien, qui tisse des sorts avec musique et mots.',
    hitDie: 8,
    primaryAbility: ['Charisme'],
    savingThrows: ['Dextérité', 'Charisme'],
    skillsToChoose: 3,
    availableSkills: ['Arcanes', 'Athlétisme', 'Escamotage', 'Histoire', 'Investigation', 'Médecine', 'Nature', 'Perception', 'Représentation', 'Persuasion', 'Perspicacité', 'Furtivité', 'Tromperie'],
    equipment: ['Armure de cuir', 'Rapière', 'Instrument de musique', 'Dague'],
    features: ['Inspiration bardique', 'Sorts']
  },
  {
    name: 'Druide',
    description: 'Prêtre de la nature, capable de se transformer en animal.',
    hitDie: 8,
    primaryAbility: ['Sagesse'],
    savingThrows: ['Intelligence', 'Sagesse'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Dressage', 'Intuition', 'Médecine', 'Nature', 'Perception', 'Religion', 'Survie'],
    equipment: ['Armure de cuir', 'Bouclier', 'Cimeterre', 'Focaliseur druidique'],
    features: ['Sort', 'Druidique', 'Ordre primitif']
  },
  {
    name: 'Moine',
    description: 'Artiste martial qui canalise son énergie intérieure.',
    hitDie: 8,
    primaryAbility: ['Dextérité', 'Sagesse'],
    savingThrows: ['Force', 'Dextérité'],
    skillsToChoose: 2,
    availableSkills: ['Acrobaties', 'Athlétisme', 'Histoire', 'Intuition', 'Religion', 'Furtivité'],
    equipment: ['Dague', 'Fléchettes', 'Outils d’artisan', 'Sac d’explorateur'],
    features: ['Arts martiaux', 'Défense sans armure', 'Style de combat']
  },
  {
    name: 'Paladin',
    description: 'Guerrier saint lié par des serments sacrés.',
    hitDie: 10,
    primaryAbility: ['Force', 'Charisme'],
    savingThrows: ['Sagesse', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Athlétisme', 'Intimidation', 'Intuition', 'Médecine', 'Persuasion', 'Religion'],
    equipment: ['Armure de mailles', 'Bouclier', 'Épée longue', 'Javelines'],
    features: ['Botte D\'arme', 'Imposition des mains', 'Sorts']
  },
  {
    name: 'Ensorceleur',
    description: 'Magicien inné dont les pouvoirs viennent de son héritage.',
    hitDie: 6,
    primaryAbility: ['Charisme'],
    savingThrows: ['Constitution', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Escamotage', 'Intuition', 'Intimidation', 'Persuasion', 'Religion'],
    equipment: ['Dague', 'Focaliseur arcanique', 'Armure de cuir'],
    features: ['Sorts', 'Sorcellerie innée']
  },
  {
    name: 'Occultiste',
    description: 'Magicien qui a conclu un pacte avec une entité extraplanaire.',
    hitDie: 8,
    primaryAbility: ['Charisme'],
    savingThrows: ['Sagesse', 'Charisme'],
    skillsToChoose: 2,
    availableSkills: ['Arcanes', 'Escamotage', 'Histoire', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
    equipment: ['Armure de cuir', 'Dague', 'Arbalète légère', 'Focaliseur arcanique'],
    features: ['Magie de pacte', 'Manifestations occultes']
  }
];