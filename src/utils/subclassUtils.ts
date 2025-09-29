// Mapping des sous-classes (copié depuis ClassesTab.tsx)
export const SUBCLASS_ALIASES: Record<string, string[]> = {
  // Barbare
  'voie de l arbre monde': ['Voie de l’Arbre-Monde', 'Voie de l arbre-monde', 'Voie de l arbre monde', 'Path of the World Tree'],
  'voie du berserker': ['Voie du Berserker', 'Berserker', 'Path of the Berserker'],
  'voie du coeur sauvage': ['Voie du Cœur sauvage', 'Voie du Coeur sauvage', 'Path of the Wild Heart'],
  'voie du zelateur': ['Voie du Zélateur', 'Voie du Zelateur', 'Path of the Zealot'],

  // Barde
  'college de la danse': ['Collège de la Danse', 'College de la Danse', 'College of Dance'],
  'college du savoir': ['Collège du Savoir', 'College du savoir', 'College of Lore', 'Lore'],
  'college de la seduction': ['Collège de la Séduction', 'College de la Seduction', 'College of Glamour', 'Glamour'],
  'college de la vaillance': ['Collège de la Vaillance', 'College de la Vaillance', 'College of Valor', 'Valor'],

  // Clerc
  'domaine de la guerre': ['Domaine de la Guerre', 'War Domain'],
  'domaine de la lumiere': ['Domaine de la Lumière', 'Light Domain'],
  'domaine de la ruse': ['Domaine de la Ruse', 'Trickery Domain'],
  'domaine de la vie': ['Domaine de la Vie', 'Life Domain'],

  // Druide
  'cercle des astres': ['Cercle des Astres', 'Circle of Stars', 'Stars'],
  'cercle de la lune': ['Cercle de la Lune', 'Circle of the Moon', 'Moon'],
  'cercle des mers': ['Cercle des Mers', 'Circle of the Sea', 'Sea'],
  'cercle de la terre': ['Cercle de la Terre', 'Circle of the Land', 'Land'],

  // Ensorceleur
  'sorcellerie aberrante': ['Sorcellerie aberrante', 'Aberrant Sorcery', 'Aberrant Mind'],
  'sorcellerie draconique': ['Sorcellerie draconique'],
  'sorcellerie mecanique': ['Sorcellerie mécanique'],
  'sorcellerie sauvage': ['Sorcellerie sauvage'],

  // Guerrier
  'champion': ['Champion', 'Champion Fighter'],
  'chevalier occultiste': ['Chevalier occultiste', 'Eldritch Knight'],
  'maitre de guerre': ['Maître de guerre', 'Maitre de guerre', 'Battle Master', 'Battlemaster'],
  'soldat psi': ['Soldat psi', 'Psi Warrior', 'Psychic Warrior'],

  // Magicien
  'abjurateur': ['Abjurateur', 'Abjuration', 'School of Abjuration'],
  'devin': ['Devin', 'Divination', 'School of Divination'],
  'evocateur': ['Évocateur', 'Evocateur', 'School of Evocation'],
  'illusionniste': ['Illusionniste', 'Illusion', 'School of Illusion'],

  // Moine
  'credo des elements': ['Crédo des Éléments', 'Credo des Elements', 'Way of the Four Elements'],
  'credo de la misericorde': ['Crédo de la Miséricorde', 'Credo de la Misericorde', 'Way of Mercy'],
  'credo de l ombre': ['Crédo de l’Ombre', 'Credo de l Ombre', 'Way of Shadow', 'Shadow'],
  'credo de la paume': ['Crédo de la Paume'],

  // Occultiste (Warlock)
  'protecteur archifee': ['Protecteur Archifée', 'Archfey', 'The Archfey'],
  'protecteur celeste': ['Protecteur Céleste', 'Celeste', 'The Celestial', 'Celestial'],
  'protecteur fiélon': ['Protecteur Fiélon', 'Protecteur Fielon', 'The Fiend', 'Fiend'],
  'protecteur grand ancien': ['Protecteur Grand Ancien', 'The Great Old One', 'Great Old One'],

  // Paladin
  'serment de gloire': ['Serment de Gloire', 'Oath of Glory'],
  'serment des anciens': ['Serment des Anciens', 'Oath of the Ancients'],
  'serment de devotion': ['Serment de Dévotion', 'Serment de Devotion', 'Oath of Devotion'],
  'serment de vengeance': ['Serment de Vengeance', 'Oath of Vengeance'],

  // Rôdeur
  'belluaire': ['Belluaire', 'Beast Master', 'Beastmaster'],
  'chasseur': ['Chasseur', 'Hunter'],
  'traqueur des tenebres': ['Traqueur des ténèbres', 'Traqueur des tenebres', 'Gloom Stalker'],
  'vagabond feerique': ['Vagabond féérique', 'Vagabond feerique', 'Fey Wanderer'],

  // Roublard
  'ame aceree': ['Âme acérée', 'Ame aceree', 'Soulknife'],
  'arnaqueur arcanique': ['Arnaqueur arcanique', 'Arcane Trickster'],
  'assassin': ['Assassin'],
  'voleur': ['Voleur', 'Thief'],
};

// Fonction de canonisation du nom de classe (copiée depuis ClassesTab.tsx)
export function canonicalClass(name: string): string {
  const norm = (s: string) =>
    (s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const n = norm(name);

  if (['barbare', 'barbarian'].includes(n)) return 'Barbare';
  if (['barde', 'bard'].includes(n)) return 'Barde';
  if (['clerc', 'cleric', 'pretre', 'prêtre', 'pretres'].includes(n)) return 'Clerc';
  if (['druide', 'druid'].includes(n)) return 'Druide';
  if (['ensorceleur', 'sorcerer', 'sorceror'].includes(n)) return 'Ensorceleur';
  if (['guerrier', 'fighter'].includes(n)) return 'Guerrier';
  if (['magicien', 'wizard', 'mage'].includes(n)) return 'Magicien';
  if (['moine', 'monk'].includes(n)) return 'Moine';
  if (['paladin'].includes(n)) return 'Paladin';
  if (['rodeur', 'rôdeur', 'ranger'].includes(n)) return 'Rôdeur';
  if (['roublard', 'voleur', 'rogue', 'thief'].includes(n)) return 'Roublard';
  if (['occultiste', 'warlock', 'sorcier'].includes(n)) return 'Occultiste';

  return name || '';
}

// Helper pour obtenir les sous-classes d'une classe
export function getSubclassesForClass(className: string): Array<{ key: string, label: string }> {
  const normClass = canonicalClass(className);
  return Object.entries(SUBCLASS_ALIASES)
    .filter(([key, aliases]) => {
      // On considère qu'une sous-classe appartient à une classe si son alias (label) contient la classe normalisée
      return aliases.some(a => a.toLowerCase().includes(normClass.toLowerCase()));
    })
    .map(([key, aliases]) => ({
      key,
      label: aliases[0]
    }));
}