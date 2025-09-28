import { DndBackground } from '../types/character';

export const backgrounds: DndBackground[] = [
  {
    name: 'Acolyte',
    abilityScores: ['Intelligence', 'Sagesse', 'Charisme'],
    feat: 'Initié à la magie',
    skillProficiencies: ['Intuition', 'Religion'],
    toolProficiencies: ['Matériel de calligraphie'],
    equipmentOptions: {
      optionA: ['Matériel de calligraphie', 'Livre de prières', 'Symbole sacré', 'Parchemin (10 feuilles)', 'Robe', '8 po'],
      optionB: ['50 po']
    },
    description: "Vous étiez au service d'un temple, situé en ville ou isolé dans quelque bosquet sacré. Vous y accomplissiez des rites religieux en l'honneur d'une divinité ou d'un panthéon."
  },
  {
    name: 'Artisan',
    abilityScores: ['Force', 'Dextérité', 'Intelligence'],
    feat: 'Façonneur',
    skillProficiencies: ['Investigation', 'Persuasion'],
    toolProficiencies: ['Outils d\'artisan (au choix)'],
    equipmentOptions: {
      optionA: ['Outils d\'artisan', '2 sacoches', 'Tenue de voyage', '32 po'],
      optionB: ['50 po']
    },
    description: "Vous avez commencé à lessiver les sols et récurer les plans de travail dans l'atelier d'un artisan pour quelques piécettes par jour dès que vous avez eu la force de porter un seau."
  },
  {
    name: 'Artiste',
    abilityScores: ['Force', 'Dextérité', 'Charisme'],
    feat: 'Musicien',
    skillProficiencies: ['Acrobaties', 'Représentation'],
    toolProficiencies: ['Instrument de musique (au choix)'],
    equipmentOptions: {
      optionA: ['Instrument de musique', '2 costumes', 'Miroir', 'Parfum', 'Tenue de voyage', '11 po'],
      optionB: ['50 po']
    },
    description: "Vous avez passé le plus clair de votre jeunesse à suivre les foires et carnavals itinérants, effectuant de menus travaux pour les musiciens et acrobates en échange de leçons."
  },
  {
    name: 'Charlatan',
    abilityScores: ['Dextérité', 'Constitution', 'Charisme'],
    feat: 'Doué',
    skillProficiencies: ['Escamotage', 'Tromperie'],
    toolProficiencies: ['Matériel de contrefaçon'],
    equipmentOptions: {
      optionA: ['Matériel de contrefaçon', 'Beaux habits', 'Costume', '15 po'],
      optionB: ['50 po']
    },
    description: "Sitôt en âge de commander une bière, vous avez eu votre tabouret favori dans toutes les tavernes à quinze kilomètres à la ronde de votre lieu de naissance."
  },
  {
    name: 'Criminel',
    abilityScores: ['Dextérité', 'Constitution', 'Intelligence'],
    feat: 'Doué',
    skillProficiencies: ['Discrétion', 'Escamotage'],
    toolProficiencies: ['Outils de voleur'],
    equipmentOptions: {
      optionA: ['2 dagues', 'Outils de voleur', '2 sacoches', 'Pied-de-biche', 'Tenue de voyage', '16 po'],
      optionB: ['50 po']
    },
    description: "Vous gagniez votre pain dans les ruelles sombres, en coupant des bourses ou en cambriolant des échoppes."
  },
  {
    name: 'Ermite',
    abilityScores: ['Constitution', 'Sagesse', 'Charisme'],
    feat: 'Guérisseur',
    skillProficiencies: ['Médecine', 'Religion'],
    toolProficiencies: ['Matériel d\'herboriste'],
    equipmentOptions: {
      optionA: ['Bâton de combat', 'Matériel d\'herboriste', 'Huile (3 flasques)', 'Lampe', 'Livre (philosophie)', 'Sac de couchage', 'Tenue de voyage', '16 po'],
      optionB: ['50 po']
    },
    description: "Vous avez passé vos jeunes années isolé dans une hutte ou un monastère situé bien au-delà des limites du bourg le plus proche."
  },
  {
    name: 'Fermier',
    abilityScores: ['Force', 'Constitution', 'Sagesse'],
    feat: 'Robuste',
    skillProficiencies: ['Dressage', 'Nature'],
    toolProficiencies: ['Outils de charpentier'],
    equipmentOptions: {
      optionA: ['Serpe', 'Outils de charpentier', 'Trousse de soins', 'Pelle', 'Pot en fer', 'Tenue de voyage', '30 po'],
      optionB: ['50 po']
    },
    description: "Vous avez grandi près de la terre. Les années passées à vous occuper des bêtes et à cultiver la terre vous ont permis de gagner en patience et en robustesse."
  },
  {
    name: 'Garde',
    abilityScores: ['Force', 'Intelligence', 'Sagesse'],
    feat: 'Vigilant',
    skillProficiencies: ['Athlétisme', 'Perception'],
    toolProficiencies: ['Boîte de jeux (au choix)'],
    equipmentOptions: {
      optionA: ['Arbalète légère + 20 carreaux', 'Carquois', 'Lance', 'Boîte de jeux', 'Lanterne à capote', 'Menottes', 'Tenue de voyage', '12 po'],
      optionB: ['50 po']
    },
    description: "Vos pieds vous font mal à la simple évocation des longues heures passées à monter la garde dans la tour."
  },
  {
    name: 'Guide',
    abilityScores: ['Dextérité', 'Constitution', 'Sagesse'],
    feat: 'Initié à la magie',
    skillProficiencies: ['Discrétion', 'Survie'],
    toolProficiencies: ['Outils de cartographe'],
    equipmentOptions: {
      optionA: ['Arc court + 20 flèches', 'Carquois', 'Outils de cartographe', 'Sac de couchage', 'Tente', 'Tenue de voyage', '3 po'],
      optionB: ['50 po']
    },
    description: "Vous avez grandi en plein air, loin des terres habitées. Pour toute maison, vous aviez l'endroit où vous dérouliez votre sac de couchage."
  },
  {
    name: 'Marchand',
    abilityScores: ['Constitution', 'Intelligence', 'Charisme'],
    feat: 'Chanceux',
    skillProficiencies: ['Dressage', 'Persuasion'],
    toolProficiencies: ['Instruments de navigateur'],
    equipmentOptions: {
      optionA: ['Instruments de navigateur', '2 sacoches', 'Tenue de voyage', '22 po'],
      optionB: ['50 po']
    },
    description: "Apprenti auprès d'un négociant, d'un chef caravanier ou d'un commerçant ayant pignon sur rue, vous avez appris les bases du commerce."
  },
  {
    name: 'Marin',
    abilityScores: ['Force', 'Dextérité', 'Sagesse'],
    feat: 'Bagarreur de tavernes',
    skillProficiencies: ['Acrobaties', 'Perception'],
    toolProficiencies: ['Instruments de navigateur'],
    equipmentOptions: {
      optionA: ['Dague', 'Instruments de navigateur', 'Corde', 'Tenue de voyage', '20 po'],
      optionB: ['50 po']
    },
    description: "Vous avez vécu l'existence du grand large, le vent dans le dos, le pont oscillant sous vos pieds."
  },
  {
    name: 'Noble',
    abilityScores: ['Force', 'Intelligence', 'Charisme'],
    feat: 'Doué',
    skillProficiencies: ['Histoire', 'Persuasion'],
    toolProficiencies: ['Boîte de jeux (au choix)'],
    equipmentOptions: {
      optionA: ['Boîte de jeux', 'Beaux habits', 'Parfum', '29 po'],
      optionB: ['50 po']
    },
    description: "Vous avez passé votre enfance dans un château, au milieu de l'opulence, du pouvoir et des privilèges."
  },
  {
    name: 'Sage',
    abilityScores: ['Constitution', 'Intelligence', 'Sagesse'],
    feat: 'Initié à la magie',
    skillProficiencies: ['Arcanes', 'Histoire'],
    toolProficiencies: ['Matériel de calligraphie'],
    equipmentOptions: {
      optionA: ['Bâton de combat', 'Matériel de calligraphie', 'Livre (d\'histoire)', 'Parchemin (8 feuilles)', 'Robe', '8 po'],
      optionB: ['50 po']
    },
    description: "Vos années de formation ont été consacrées à voyager de manoir en monastère, où vous accomplissiez divers menus travaux et services en échange de l'accès à la bibliothèque."
  },
  {
    name: 'Scribe',
    abilityScores: ['Dextérité', 'Intelligence', 'Sagesse'],
    feat: 'Doué',
    skillProficiencies: ['Investigation', 'Perception'],
    toolProficiencies: ['Matériel de calligraphie'],
    equipmentOptions: {
      optionA: ['Matériel de calligraphie', 'Beaux habits', 'Lampe', 'Huile (3 flasques)', 'Parchemin (12 feuilles)', '23 po'],
      optionB: ['50 po']
    },
    description: "Vous avez passé vos années de formation dans un scriptorium, un monastère dédié à la préservation du savoir ou quelque administration."
  },
  {
    name: 'Soldat',
    abilityScores: ['Force', 'Dextérité', 'Constitution'],
    feat: 'Sauvagerie martiale',
    skillProficiencies: ['Athlétisme', 'Intimidation'],
    toolProficiencies: ['Boîte de jeux (au choix)'],
    equipmentOptions: {
      optionA: ['Arc court + 20 flèches', 'Carquois', 'Lance', 'Boîte de jeux', 'Trousse de soins', 'Tenue de voyage', '14 po'],
      optionB: ['50 po']
    },
    description: "Formé aux rudiments de la guerre sitôt adulte, vous ne gardez que de rares et précieux souvenirs de ce que fut votre vie avant le métier des armes."
  },
  {
    name: 'Voyageur',
    abilityScores: ['Dextérité', 'Sagesse', 'Charisme'],
    feat: 'Chanceux',
    skillProficiencies: ['Discrétion', 'Intuition'],
    toolProficiencies: ['Outils de voleur'],
    equipmentOptions: {
      optionA: ['2 dagues', 'Outils de voleur', 'Boîte de jeux (tout type)', 'Sac de couchage', '2 sacoches', 'Tenue de voyage', '16 po'],
      optionB: ['50 po']
    },
    description: "Vous avez grandi dans la rue, entouré de marginaux aussi misérables que vous, dont certains étaient vos amis et d'autres des rivaux."
  }
];