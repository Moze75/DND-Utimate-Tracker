import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Book, Search, Filter, Sparkles, Clock, Target, Zap, Wand2, Skull, Check } from 'lucide-react';
import { DndClass } from '../types/dnd';
import { supabase } from '../lib/supabase';

interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: {
    V: boolean;
    S: boolean;
    M: string | null;
  };
  duration: string;
  description: string;
  higher_levels?: string;
  classes: string[];
}

interface SpellbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerClass?: DndClass | null | undefined;
  selectionMode?: boolean;
  onSpellSelect?: (spell: any) => void;
  selectedSpells?: any[];
  onConfirm?: (spells: any[]) => void;
}

const MAGIC_SCHOOLS = [
  'Abjuration',
  'Invocation',
  'Divination',
  'Enchantement',
  'Évocation',
  'Illusion',
  'Nécromancie',
  'Transmutation'
];

const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/* ===================== Helpers de canonicalisation classes ===================== */

function stripDiacritics(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function normalize(s: string) {
  return stripDiacritics((s || '').toLowerCase().trim());
}
function canonicalizeClass(name: string | null | undefined): string {
  if (!name) return '';
  const n = normalize(name);
  if (['barbare', 'barbarian'].includes(n)) return 'Barbare';
  if (['barde', 'bard'].includes(n)) return 'Barde';
  if (['clerc', 'cleric', 'pretre', 'prêtre', 'prete', 'pretresse', 'pretres'].includes(n)) return 'Clerc';
  if (['druide', 'druid'].includes(n)) return 'Druide';
  if (['ensorceleur', 'sorcerer', 'sorceror'].includes(n)) return 'Ensorceleur';
  if (['guerrier', 'fighter'].includes(n)) return 'Guerrier';
  if (['magicien', 'wizard', 'mage'].includes(n)) return 'Magicien';
  if (['moine', 'monk'].includes(n)) return 'Moine';
  if (['paladin'].includes(n)) return 'Paladin';
  if (['rodeur', 'rôdeur', 'ranger'].includes(n)) return 'Rôdeur';
  if (['roublard', 'voleur', 'rogue', 'thief'].includes(n)) return 'Roublard';
  // Occultiste (Warlock) — alias “Sorcier” legacy
  if (['occultiste', 'warlock', 'sorcier'].includes(n)) return 'Occultiste';
  return name;
}
function classListsInclude(list: string[] | undefined, cls: string | null | undefined): boolean {
  if (!list || !cls) return false;
  const target = canonicalizeClass(cls);
  return list.some((c) => canonicalizeClass(c) === target);
}
const canonicalPlayerClassBadge = (playerClass?: DndClass | null | undefined) =>
  canonicalizeClass(playerClass || '') || (playerClass || '');

/* ===================== Données de fallback (SAMPLE_SPELLS) ===================== */
/* Note: mise à jour pour 2024 — remplacer “Sorcier” par “Occultiste”
         corriger quelques incohérences (ex: Flèche acide niveau 2) */

const SAMPLE_SPELLS: Spell[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Projectile magique',
    level: 1,
    school: 'Évocation',
    casting_time: '1 action',
    range: '36 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Instantané',
    description:
      "Vous créez trois fléchettes scintillantes d'énergie magique. Chaque fléchette touche une créature de votre choix que vous pouvez voir à portée.",
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 2 ou supérieur, le sort crée une fléchette de plus pour chaque niveau d'emplacement au-delà du niveau 1.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Soins',
    level: 1,
    school: 'Évocation',
    casting_time: '1 action',
    range: 'Contact',
    components: { V: true, S: true, M: null },
    duration: 'Instantané',
    description:
      "Une créature que vous touchez récupère un nombre de points de vie égal à 1d8 + votre modificateur de caractéristique d'incantation.",
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 2 ou supérieur, les soins augmentent de 1d8 pour chaque niveau d'emplacement au-delà du niveau 1.",
    classes: ['Barde', 'Clerc', 'Druide', 'Paladin', 'Rôdeur']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Bouclier',
    level: 1,
    school: 'Abjuration',
    casting_time: '1 réaction',
    range: 'Personnelle',
    components: { V: true, S: true, M: null },
    duration: '1 round',
    description:
      "Une barrière invisible de force magique apparaît et vous protège. Jusqu'au début de votre prochain tour, vous avez un bonus de +5 à la CA.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Boule de feu',
    level: 3,
    school: 'Évocation',
    casting_time: '1 action',
    range: '45 mètres',
    components: { V: true, S: true, M: "une petite boule de guano de chauve-souris et de soufre" },
    duration: 'Instantané',
    description:
      'Une traînée brillante jaillit de votre doigt pointé vers un point que vous choisissez à portée, puis explose en un rugissement de flammes.',
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 4 ou supérieur, les dégâts augmentent de 1d6 pour chaque niveau d'emplacement au-delà du niveau 3.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Inspiration héroïque',
    level: 1,
    school: 'Enchantement',
    casting_time: '1 action bonus',
    range: '18 mètres',
    components: { V: true, S: false, M: null },
    duration: 'Concentration, jusqu\'à 1 minute',
    description:
      'Une créature volontaire que vous pouvez voir à portée est inspirée par vos paroles encourageantes.',
    classes: ['Barde']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Armure de mage',
    level: 1,
    school: 'Abjuration',
    casting_time: '1 action',
    range: 'Contact',
    components: { V: true, S: true, M: 'un morceau de cuir tanné' },
    duration: '8 heures',
    description:
      "Vous touchez une créature volontaire qui ne porte pas d'armure. Jusqu'à la fin du sort, la CA de base de la cible devient 13 + son modificateur de Dextérité.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Détection de la magie',
    level: 1,
    school: 'Divination',
    casting_time: '1 action',
    range: '9 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Concentration, jusqu\'à 10 minutes',
    description:
      'Pendant la durée du sort, vous ressentez la présence de magie dans un rayon de 9 mètres autour de vous.',
    classes: ['Barde', 'Clerc', 'Druide', 'Magicien', 'Paladin', 'Rôdeur', 'Ensorceleur', 'Occultiste']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'Lumière',
    level: 0,
    school: 'Évocation',
    casting_time: '1 action',
    range: 'Contact',
    components: { V: true, S: false, M: 'une luciole ou de la mousse phosphorescente' },
    duration: '1 heure',
    description:
      "Vous touchez un objet qui ne fait pas plus de 3 mètres dans chaque dimension. Jusqu'à la fin du sort, l'objet émet une lumière vive dans un rayon de 6 mètres.",
    classes: ['Barde', 'Clerc', 'Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    casting_time: '1 action',
    range: '3 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Jusqu\'à 1 heure',
    description:
      "Ce sort est un tour de magie mineur que les lanceurs de sorts novices utilisent pour s'entraîner.",
    classes: ['Barde', 'Ensorceleur', 'Occultiste', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Flèche acide',
    level: 2,
    school: 'Invocation',
    casting_time: '1 action',
    range: '27 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Instantané',
    description:
      "Une flèche scintillante d'énergie acide file vers une créature à portée.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    name: 'Bénédiction',
    level: 1,
    school: 'Enchantement',
    casting_time: '1 action',
    range: '9 mètres',
    components: { V: true, S: true, M: "une aspersion d'eau bénite" },
    duration: 'Concentration, jusqu\'à 1 minute',
    description:
      'Vous bénissez jusqu’à trois créatures de votre choix à portée.',
    classes: ['Clerc', 'Paladin']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    name: 'Charme-personne',
    level: 1,
    school: 'Enchantement',
    casting_time: '1 action',
    range: '9 mètres',
    components: { V: true, S: true, M: null },
    duration: '1 heure',
    description:
      'Vous tentez de charmer un humanoïde que vous pouvez voir à portée.',
    classes: ['Barde', 'Druide', 'Ensorceleur', 'Occultiste', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    name: 'Invisibilité',
    level: 2,
    school: 'Illusion',
    casting_time: '1 action',
    range: 'Contact',
    components: { V: true, S: true, M: 'un cil enrobé de gomme arabique' },
    duration: 'Concentration, jusqu\'à 1 heure',
    description:
      'Une créature que vous touchez devient invisible jusqu’à la fin du sort.',
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 3 ou supérieur, vous pouvez cibler une créature supplémentaire pour chaque niveau d'emplacement au-delà du niveau 2.",
    classes: ['Barde', 'Ensorceleur', 'Occultiste', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    name: "Toile d'araignée",
    level: 2,
    school: 'Invocation',
    casting_time: '1 action',
    range: '18 mètres',
    components: { V: true, S: true, M: "un peu de toile d'araignée" },
    duration: 'Concentration, jusqu\'à 1 heure',
    description:
      "Vous invoquez une masse de toiles d'araignée épaisses et collantes en un point que vous pouvez voir à portée.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015',
    name: 'Foudre',
    level: 3,
    school: 'Évocation',
    casting_time: '1 action',
    range: '30 mètres',
    components: { V: true, S: true, M: "un peu de fourrure et une baguette d'ambre, de cristal ou de verre" },
    duration: 'Instantané',
    description:
      "Un éclair forme une ligne de 30 mètres de long et 1,50 mètre de large partant de vous dans une direction de votre choix.",
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 4 ou supérieur, les dégâts augmentent de 1d6 pour chaque niveau d'emplacement au-delà du niveau 3.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440016',
    name: 'Contresort',
    level: 3,
    school: 'Abjuration',
    casting_time: '1 réaction',
    range: '18 mètres',
    components: { V: false, S: true, M: null },
    duration: 'Instantané',
    description: "Vous tentez d'interrompre une créature en train de lancer un sort.",
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 4 ou supérieur, l'interruption est automatique si le niveau du sort est inférieur ou égal au niveau de l'emplacement utilisé.",
    classes: ['Ensorceleur', 'Occultiste', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440017',
    name: 'Hâte',
    level: 3,
    school: 'Transmutation',
    casting_time: '1 action',
    range: '9 mètres',
    components: { V: true, S: true, M: 'un copeau de racine de réglisse' },
    duration: 'Concentration, jusqu\'à 1 minute',
    description:
      "Choisissez une créature volontaire que vous pouvez voir à portée. Jusqu'à la fin du sort, la vitesse de la cible est doublée.",
    classes: ['Ensorceleur', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440018',
    name: 'Guérison de groupe',
    level: 3,
    school: 'Évocation',
    casting_time: '1 action',
    range: '18 mètres',
    components: { V: true, S: true, M: null },
    duration: 'Instantané',
    description:
      "Une vague d'énergie curative émane d'un point de votre choix à portée.",
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 4 ou supérieur, les soins augmentent de 1d8 pour chaque niveau d'emplacement au-delà du niveau 3.",
    classes: ['Barde', 'Clerc', 'Druide']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440019',
    name: 'Porte dimensionnelle',
    level: 4,
    school: 'Invocation',
    casting_time: '1 action',
    range: '150 mètres',
    components: { V: true, S: false, M: null },
    duration: 'Instantané',
    description:
      "Vous vous téléportez depuis votre position actuelle vers n'importe quel autre endroit à portée.",
    classes: ['Barde', 'Ensorceleur', 'Occultiste', 'Magicien']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440020',
    name: 'Mur de feu',
    level: 4,
    school: 'Évocation',
    casting_time: '1 action',
    range: '36 mètres',
    components: { V: true, S: true, M: 'un petit morceau de phosphore' },
    duration: 'Concentration, jusqu\'à 1 minute',
    description: 'Vous créez un mur de feu sur une surface solide à portée.',
    higher_levels:
      "Quand vous lancez ce sort en utilisant un emplacement de sort de niveau 5 ou supérieur, les dégâts augmentent de 1d8 pour chaque niveau d'emplacement au-delà du niveau 4.",
    classes: ['Druide', 'Ensorceleur', 'Magicien']
  }
];

export function SpellbookModal({ 
  isOpen, 
  onClose, 
  playerClass, 
  selectionMode = false,
  onSpellSelect,
  selectedSpells = [],
  onConfirm
}: SpellbookModalProps) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [filteredSpells, setFilteredSpells] = useState<Spell[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(new Set());
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [totalSpellsCount, setTotalSpellsCount] = useState(0);

  // Charger les sorts depuis Supabase Storage
  useEffect(() => {
    const loadSpells = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        // Essayer de charger depuis le bucket public
        const { data, error } = await supabase.storage
          .from('sorts')
          .download('Sorts 2024.md');

        if (error) {
          // Fallback en cas d'accès impossible
          throw new Error('Fichier de sorts non accessible');
        }

        const text = await data.text();
        const parsedSpells = parseSpellsFromMarkdown(text);
        
        setTotalSpellsCount(parsedSpells.length);
        setSpells(parsedSpells);
      } catch (error) {
        // Fallback local
        setTotalSpellsCount(SAMPLE_SPELLS.length);
        setSpells(SAMPLE_SPELLS);
      } finally {
        setLoading(false);
      }
    };
    
    loadSpells();
  }, [isOpen]);

  // Empêcher le défilement de l'arrière-plan
  useEffect(() => {
    if (isOpen) {
      // Le modal gère son propre défilement
    }
  }, [isOpen]);

  // Fonction pour parser les sorts depuis le fichier Markdown
  const parseSpellsFromMarkdown = (text: string): Spell[] => {
    const spells: Spell[] = [];
    
    // Diviser le texte en sections de sorts (chaque sort commence par # suivi d'un nom)
    const sections = text.split(/(?=^# [^#])/m).filter(section => section.trim().length > 0);
    
    sections.forEach((section) => {
      const lines = section.split('\n');
      const spell: Partial<Spell> = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Math.random()}`,
        classes: [],
        components: { V: false, S: false, M: null },
        level: 0,
        school: 'Évocation',
        casting_time: '1 action',
        range: '9 mètres',
        duration: 'Instantané',
        description: ''
      };
      
      let descriptionLines: string[] = [];
      let higherLevelsLines: string[] = [];
      let inHigherLevelsSection = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Nom du sort
        if (trimmedLine.startsWith('# ')) {
          spell.name = trimmedLine.substring(2).trim();
          continue;
        }
        
        // Détecter les lignes d'information (niveau, école, classes)
        if (trimmedLine.match(/^[A-Za-zÀ-ÿ\s]+\s+de\s+niveau\s+\d+/i) || 
            trimmedLine.match(/^Tour\s+de\s+magie/i)) {
          
          // Extraire le niveau
          if (trimmedLine.toLowerCase().includes('tour de magie')) {
            spell.level = 0;
          } else {
            const levelMatch = trimmedLine.match(/niveau\s+(\d+)/i);
            if (levelMatch) {
              spell.level = parseInt(levelMatch[1]);
            }
          }
          
          // Extraire l'école de magie
          const schoolMatch = trimmedLine.match(/^([A-Za-zÀ-ÿ\s]+)\s+de\s+niveau/i);
          if (schoolMatch) {
            spell.school = schoolMatch[1].trim();
          } else if (trimmedLine.toLowerCase().includes('tour de magie')) {
            const schoolMatch2 = trimmedLine.match(/Tour\s+de\s+magie\s+d[''']([A-Za-zÀ-ÿ\s]+)/i);
            if (schoolMatch2) {
              spell.school = schoolMatch2[1].trim();
            }
          }
          
          // Extraire les classes (entre parenthèses)
          const classMatch = trimmedLine.match(/\(([^)]+)\)/);
          if (classMatch) {
            const classesText = classMatch[1];

            // Parser les classes avec mapping + canonicalisation 2024
            const classMapping: { [key: string]: string } = {
              'barbare': 'Barbare',
              'barde': 'Barde',
              'clerc': 'Clerc',
              'druide': 'Druide',
              'ensorceleur': 'Ensorceleur',
              'guerrier': 'Guerrier',
              'magicien': 'Magicien',
              'moine': 'Moine',
              'paladin': 'Paladin',
              'rôdeur': 'Rôdeur',
              'rodeur': 'Rôdeur',
              'roublard': 'Roublard',
              // 2024: “Occultiste” au lieu de “Sorcier” (Warlock)
              'occultiste': 'Occultiste',
              'sorcier': 'Occultiste',
              'warlock': 'Occultiste',
              // on tolère aussi anglais usuels
              'wizard': 'Magicien',
              'bard': 'Barde',
              'cleric': 'Clerc',
              'druid': 'Druide',
              'fighter': 'Guerrier',
              'monk': 'Moine',
              'ranger': 'Rôdeur',
              'rogue': 'Roublard',
              'sorcerer': 'Ensorceleur',
              'paladin': 'Paladin',
            };
            
            const detectedClasses: string[] = [];
            const lc = normalize(classesText);
            Object.entries(classMapping).forEach(([key, value]) => {
              if (lc.includes(key)) {
                if (!detectedClasses.includes(value)) {
                  detectedClasses.push(value);
                }
              }
            });
            // Canonicaliser par sécurité
            spell.classes = (detectedClasses || []).map(canonicalizeClass);
          }
          
          continue;
        }
        
        // Champs "**Champ:** valeur"
        if (trimmedLine.match(/^\*\*[^*]+\*\*\s*:/)) {
          const match = trimmedLine.match(/^\*\*([^*]+)\*\*\s*:\s*(.+)$/);
          if (match) {
            const fieldName = match[1].trim().toLowerCase();
            const valuePart = match[2].trim();
            
            switch (fieldName) {
              case "temps d'incantation":
              case 'temps d incantation':
              case 'incantation':
                spell.casting_time = valuePart;
                break;
              case 'portée':
              case 'portee':
                spell.range = valuePart;
                break;
              case 'composantes':
              case 'composants': {
                const components = { V: false, S: false, M: null as string | null };
                if (valuePart.toUpperCase().includes('V')) components.V = true;
                if (valuePart.toUpperCase().includes('S')) components.S = true;
                const mMatch = valuePart.match(/M[:\s]*\(?([^)]+)\)?/i);
                if (mMatch) components.M = mMatch[1];
                spell.components = components;
                break;
              }
              case 'durée':
              case 'duree':
                spell.duration = valuePart;
                break;
            }
          }
          continue;
        }
        
        // Détecter "Aux niveaux supérieurs"
        if (
          trimmedLine.toLowerCase().includes('aux niveaux supérieurs') ||
          trimmedLine.toLowerCase().includes('niveaux supérieurs') ||
          trimmedLine.toLowerCase().includes('emplacement de niveau supérieur') ||
          trimmedLine.toLowerCase().includes('emplacements de niveaux supérieurs') ||
          trimmedLine.toLowerCase().includes('améliorations de sorts mineurs')
        ) {
          inHigherLevelsSection = true;
          higherLevelsLines.push(trimmedLine);
          continue;
        }
        
        // Si on est dans la section "niveaux supérieurs"
        if (inHigherLevelsSection) {
          // Vérifier si on sort de la section (nouveau champ ou nouveau sort)
          if (trimmedLine.startsWith('**') || trimmedLine.startsWith('#')) {
            inHigherLevelsSection = false;
            // Traiter cette ligne normalement (ne pas faire continue)
          } else {
            higherLevelsLines.push(trimmedLine);
            continue;
          }
        }
              
        // Si ce n'est pas un champ spécial et qu'on a déjà le nom, c'est la description
        if (!trimmedLine.startsWith('**') && !trimmedLine.startsWith('#') && spell.name && !inHigherLevelsSection) {
          descriptionLines.push(trimmedLine);
        }
      } // Fin boucle lignes
      
      // Finaliser le sort
      if (spell.name) {
        // Nettoyer la description en enlevant les infos de niveau/école/classes du début
        let cleanDescription = descriptionLines.join('\n').trim();
        
        // Enlever les lignes qui contiennent des infos de niveau/école/classes
        const descriptionParts = cleanDescription.split('\n').filter(line => {
          const trimmed = line.trim().toLowerCase();
          return !trimmed.match(/^[a-zà-ÿ\s]+\s+de\s+niveau\s+\d+/i) &&
                 !trimmed.match(/^tour\s+de\s+magie/i) &&
                 !trimmed.includes('(') ||
                 trimmed.length > 50;
        });
        
        spell.description = descriptionParts.join('\n').trim();
        spell.higher_levels = (higherLevelsLines.join('\n').trim() || undefined);
        
        // Convertir les classes en tableau canonique
        spell.classes = (spell.classes || []).map(canonicalizeClass);
        
        spells.push(spell as Spell);
      }
    });
    
    return spells;
  };

  // Filtrer les sorts selon les critères
  useEffect(() => {
    let filtered = spells;

    // Filtrer par classe du joueur (sauf si showAllClasses est activé)
    if (!showAllClasses && playerClass) {
      const canon = canonicalizeClass(playerClass);
      filtered = filtered.filter(spell => classListsInclude(spell.classes, canon));
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      const q = normalize(searchTerm);
      filtered = filtered.filter(spell =>
        normalize(spell.name).includes(q) ||
        normalize(spell.description).includes(q)
      );
    }

    // Filtrer par niveau
    if (selectedLevels.size > 0) {
      filtered = filtered.filter(spell => selectedLevels.has(spell.level));
    }

    // Filtrer par école
    if (selectedSchool) {
      filtered = filtered.filter(spell => spell.school === selectedSchool);
    }

    setFilteredSpells(filtered);
  }, [spells, searchTerm, selectedLevels, selectedSchool, playerClass, showAllClasses]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedLevels(new Set());
    setSelectedSchool('');
    setShowAllClasses(false);
  };

  const getComponentsText = (components: Spell['components']) => {
    const parts = [];
    if (components.V) parts.push('V');
    if (components.S) parts.push('S');
    if (components.M) parts.push(`M (${components.M})`);
    return parts.join(', ');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] border border-gray-700/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700/50 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Book className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="text-xl font-semibold text-gray-100">
                  Grimoire de sorts
                </h3>
                <p className="text-gray-400">
                  {!showAllClasses && playerClass ? `Sorts de ${canonicalPlayerClassBadge(playerClass)}` : 'Tous les sorts'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - Single scrollable area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Bouton de validation en mode sélection */}
            {selectionMode && selectedSpells.length > 0 && (
              <div className="sticky top-0 z-10 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-100">
                        {selectedSpells.length} sort{selectedSpells.length > 1 ? 's' : ''} sélectionné{selectedSpells.length > 1 ? 's' : ''}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onConfirm) {
                        onConfirm(selectedSpells);
                        onClose();
                      }
                    }}
                    className="shrink-0 min-w-[200px] sm:min-w-[220px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-lg font-medium transition"
                  >
                    <Check size={16} />
                    Valider la sélection
                  </button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-dark w-full pl-10 pr-3 py-2 rounded-lg"
                  />
                </div>

                {/* Level Filter */}
                <div className="relative">
                  <div
                    className="input-dark px-3 py-2 rounded-lg cursor-pointer"
                    onClick={() => {
                      const dropdown = document.getElementById('level-dropdown');
                      if (dropdown) {
                        dropdown.classList.toggle('hidden');
                      }
                    }}
                  >
                    {selectedLevels.size === 0
                      ? 'Tous les niveaux'
                      : selectedLevels.size === 1
                      ? Array.from(selectedLevels)[0] === 0
                        ? 'Tours de magie'
                        : `Niveau ${Array.from(selectedLevels)[0]}`
                      : `${selectedLevels.size} niveaux sélectionnés`}
                  </div>
                  <div
                    id="level-dropdown"
                    className="hidden absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                  >
                    {SPELL_LEVELS.map((level) => (
                      <label key={level} className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLevels.has(level)}
                          onChange={(e) => {
                            const newLevels = new Set(selectedLevels);
                            if (e.target.checked) {
                              newLevels.add(level);
                            } else {
                              newLevels.delete(level);
                            }
                            setSelectedLevels(newLevels);
                          }}
                          className="mr-2 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300">
                          {level === 0 ? 'Tours de magie' : `Niveau ${level}`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* School Filter */}
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="input-dark px-3 py-2 rounded-lg"
                >
                  <option value="">Toutes les écoles</option>
                  {MAGIC_SCHOOLS.map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>

                {/* Class Filter Toggle */}
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllClasses}
                      onChange={(e) => setShowAllClasses(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        showAllClasses ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          showAllClasses ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </div>
                    <span className="ml-3 text-sm text-gray-300">Toutes les classes</span>
                  </label>
                </div>

                {/* Reset Filters */}
                <button
                  onClick={resetFilters}
                  className="btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Filter size={16} />
                  Réinitialiser
                </button>
              </div>
            </div>
            
            {/* Spells list */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                  <p className="text-gray-400">Chargement des sorts...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-gray-400 mb-4 flex items-center justify-between">
                  <span>
                    {filteredSpells.length} sort{filteredSpells.length > 1 ? 's' : ''} trouvé{filteredSpells.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    {!showAllClasses && playerClass && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                        {canonicalPlayerClassBadge(playerClass)}
                      </span>
                    )}
                    {totalSpellsCount > 0 && (
                      <span className="text-xs text-gray-500">sur {totalSpellsCount} total</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {filteredSpells.map((spell) => (
                    <div
                      key={spell.id}
                      className="relative border border-gray-600/50 bg-gray-800/30 rounded-lg overflow-hidden hover:bg-gray-700/30 transition-colors"
                    >
                      {selectionMode && (
                        <div className="absolute top-3 right-3 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSpellSelect?.(spell);
                            }}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedSpells.find((s) => s.id === spell.id)
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-gray-600 hover:border-blue-500'
                            }`}
                          >
                            {selectedSpells.find((s) => s.id === spell.id) && <Check size={14} />}
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setSelectedSpell(selectedSpell?.id === spell.id ? null : spell)
                        }
                        className="w-full text-left p-3 pr-12 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2 pr-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-base text-gray-100">{spell.name}</h4>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-xs bg-gray-700/50 px-2 py-1 rounded-full font-medium text-gray-300">
                              {spell.level === 0 ? 'Tour' : `Niv. ${spell.level}`}
                            </div>
                            <div
                              className={`transform transition-transform duration-200 ${
                                selectedSpell?.id === spell.id ? 'rotate-180' : ''
                              }`}
                            >
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          {spell.school} • {spell.casting_time} • {spell.range}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {spell.classes.slice(0, 4).map((className) => {
                            const isPlayerClass =
                              canonicalizeClass(className) === canonicalizeClass(playerClass || '');
                            return (
                              <span
                                key={className}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  isPlayerClass
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                    : 'bg-gray-700/50 text-gray-500'
                                }`}
                              >
                                {className}
                              </span>
                            );
                          })}
                          {spell.classes.length > 4 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{spell.classes.length - 4} autres
                            </span>
                          )}
                        </div>
                      </button>
                      
                      {/* Expanded Details */}
                      {selectedSpell?.id === spell.id && (
                        <div className="border-t border-gray-700/50 bg-gray-900/50 p-4 space-y-4">
                          {/* Casting Info Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-gray-800/50 p-2 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-400">Temps</span>
                              </div>
                              <div className="text-sm text-gray-200 font-medium">{spell.casting_time}</div>
                            </div>
                            <div className="bg-gray-800/50 p-2 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-400">Portée</span>
                              </div>
                              <div className="text-sm text-gray-200 font-medium">{spell.range}</div>
                            </div>
                            <div className="bg-gray-800/50 p-2 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-400">Composantes</span>
                              </div>
                              <div className="text-sm text-gray-200 font-medium">{getComponentsText(spell.components)}</div>
                            </div>
                            <div className="bg-gray-800/50 p-2 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-400">Durée</span>
                              </div>
                              <div className="text-sm text-gray-200 font-medium">{spell.duration}</div>
                            </div>
                          </div>

                          {/* Description + Niveaux supérieurs */}
                          <div className="bg-gray-800/30 p-3 rounded-lg">
                            <h5 className="font-semibold text-gray-200 mb-2">Description</h5>
                            <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                              {spell.description}
                              {spell.higher_levels && `\n\n${spell.higher_levels}`}
                            </div>
                          </div>

                          {/* All Classes */}
                          <div className="bg-gray-800/30 p-3 rounded-lg">
                            <h5 className="font-semibold text-gray-200 mb-2">Classes disponibles</h5>
                            <div className="flex flex-wrap gap-2">
                              {spell.classes.map((className, idx) => (
                                <span
                                  key={`${className}-${idx}`}
                                  className={`px-2 py-1 rounded-lg text-sm font-medium ${
                                    canonicalizeClass(className) === canonicalizeClass(playerClass || '')
                                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                      : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                                  }`}
                                >
                                  {className}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filteredSpells.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <Book className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-400">Aucun sort trouvé</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Essayez de modifier vos filtres ou activez "Toutes les classes"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}