import React from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { CharacterExportPayload } from '../../types/CharacterExport';
import { User, Heart, Shield, Zap, Users, Package, Image as ImageIcon, Sword, Wrench, Star, ScrollText, Coins } from 'lucide-react';
import { calculateModifier } from '../../utils/dndCalculations';

interface ExportModalProps {
  open: boolean;
  payload: CharacterExportPayload | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportModal({ open, payload, onClose, onConfirm }: ExportModalProps) {
  if (!open || !payload) return null;

  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  // Convertit les pieds en mètres pour l'affichage
  const feetToMeters = (ft: number) => {
    return Math.round(ft * 0.3048 * 2) / 2;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Exporter le personnage</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
          {/* Portrait / Avatar (si fourni) */}
          {payload.avatarImageUrl && (
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <ImageIcon className="w-5 h-5 text-cyan-400 mr-2" />
                  <h4 className="text-white font-semibold">Portrait</h4>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full flex items-center justify-center">
                  <img
                    src={payload.avatarImageUrl}
                    alt="Portrait du personnage"
                    className="max-h-64 object-contain rounded-md border border-gray-800"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informations de base */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <User className="w-5 h-5 text-blue-400 mr-2" />
                <h4 className="text-white font-semibold">Informations de base</h4>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Nom</span>
                <span className="text-white font-medium">{payload.characterName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Race</span>
                <span className="text-white font-medium">{payload.selectedRace}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Classe</span>
                <span className="text-white font-medium">{payload.selectedClass}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Historique</span>
                <span className="text-white font-medium">{payload.selectedBackground}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Niveau</span>
                <span className="text-white font-medium">{payload.level}</span>
              </div>
              {payload.gold && payload.gold > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Or initial</span>
                  <span className="text-white font-medium">{payload.gold} po</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistiques de combat */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Heart className="w-5 h-5 text-red-400 mr-2" />
                <h4 className="text-white font-semibold">Statistiques de combat</h4>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">PV</span>
                <span className="text-white font-medium">{payload.hitPoints}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">CA</span>
                <span className="text-white font-medium">{payload.armorClass}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Initiative</span>
                <span className="text-white font-medium">{sign(payload.initiative)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Vitesse</span>
                <span className="text-white font-medium">{feetToMeters(payload.speed)} m</span>
              </div>
            </CardContent>
          </Card>

          {/* Caractéristiques */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Zap className="w-5 h-5 text-yellow-400 mr-2" />
                <h4 className="text-white font-semibold">Caractéristiques</h4>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(payload.finalAbilities).map(([ability, score]) => {
                  const mod = calculateModifier(score);
                  return (
                    <div key={ability} className="text-center">
                      <div className="font-medium text-white text-sm">{ability}</div>
                      <div className="text-2xl font-bold text-white">{score}</div>
                      <div className="text-sm text-gray-400">{sign(mod)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ✅ NOUVEAU : Maîtrises d'armes et d'armures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Maîtrises d'armes */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Sword className="w-5 h-5 text-red-400 mr-2" />
                  <h4 className="text-white font-semibold">Maîtrises d'armes</h4>
                </div>
              </CardHeader>
              <CardContent>
                {payload.weaponProficiencies && payload.weaponProficiencies.length > 0 ? (
                  <ul className="text-sm text-gray-300 space-y-1">
                    {payload.weaponProficiencies.map((weapon, i) => (
                      <li key={i}>• {weapon}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">Aucune maîtrise d'arme</div>
                )}
              </CardContent>
            </Card>

            {/* Formation aux armures */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-400 mr-2" />
                  <h4 className="text-white font-semibold">Formation aux armures</h4>
                </div>
              </CardHeader>
              <CardContent>
                {payload.armorProficiencies && payload.armorProficiencies.length > 0 ? (
                  <ul className="text-sm text-gray-300 space-y-1">
                    {payload.armorProficiencies.map((armor, i) => (
                      <li key={i}>• {armor}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">Aucune formation aux armures</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ✅ NOUVEAU : Maîtrises d'outils (si applicable) */}
          {payload.toolProficiencies && payload.toolProficiencies.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Wrench className="w-5 h-5 text-yellow-400 mr-2" />
                  <h4 className="text-white font-semibold">Maîtrises d'outils</h4>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-300 space-y-1">
                  {payload.toolProficiencies.map((tool, i) => (
                    <li key={i}>• {tool}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* ✅ NOUVEAU : Jets de sauvegarde */}
          {payload.savingThrows && payload.savingThrows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-green-400 mr-2" />
                  <h4 className="text-white font-semibold">Jets de sauvegarde maîtrisés</h4>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {payload.savingThrows.map((save, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-green-500/20 text-green-200 rounded border border-green-500/30"
                    >
                      {save}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compétences */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Star className="w-5 h-5 text-purple-400 mr-2" />
                <h4 className="text-white font-semibold">Compétences maîtrisées</h4>
              </div>
            </CardHeader>
            <CardContent>
              {payload.proficientSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {payload.proficientSkills.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 text-xs bg-purple-500/20 text-purple-200 rounded border border-purple-500/30"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Aucune compétence maîtrisée</div>
              )}
            </CardContent>
          </Card>

          {/* ✅ NOUVEAU : Traits raciaux et capacités de classe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traits raciaux */}
            {payload.racialTraits && payload.racialTraits.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Users className="w-5 h-5 text-purple-400 mr-2" />
                    <h4 className="text-white font-semibold">Traits raciaux</h4>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {payload.racialTraits.map((trait, i) => (
                      <li key={i}>• {trait}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Capacités de classe */}
            {payload.classFeatures && payload.classFeatures.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Zap className="w-5 h-5 text-green-400 mr-2" />
                    <h4 className="text-white font-semibold">Capacités de classe</h4>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {payload.classFeatures.map((feature, i) => (
                      <li key={i}>• {feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ✅ NOUVEAU : Don et capacité d'historique */}
          {(payload.backgroundFeat || payload.backgroundFeature) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Don d'historique */}
              {payload.backgroundFeat && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <ScrollText className="w-5 h-5 text-amber-400 mr-2" />
                      <h4 className="text-white font-semibold">Don d'historique</h4>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-300">{payload.backgroundFeat}</div>
                  </CardContent>
                </Card>
              )}

              {/* Capacité d'historique */}
              {payload.backgroundFeature && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-cyan-400 mr-2" />
                      <h4 className="text-white font-semibold">Capacité d'historique</h4>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-300">{payload.backgroundFeature}</div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ✅ NOUVEAU : Langues */}
          {payload.languages && payload.languages.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <ScrollText className="w-5 h-5 text-blue-400 mr-2" />
                  <h4 className="text-white font-semibold">Langues</h4>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {payload.languages.map((lang, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-blue-500/20 text-blue-200 rounded border border-blue-500/30"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Équipement */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Package className="w-5 h-5 text-yellow-400 mr-2" />
                <h4 className="text-white font-semibold">Équipement</h4>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* ✅ NOUVEAU : Affichage des options sélectionnées */}
                <div className="text-xs text-gray-400 space-y-1">
                  {payload.selectedEquipmentOption && (
                    <div>Équipement de classe : Option {payload.selectedEquipmentOption}</div>
                  )}
                  {payload.selectedBackgroundEquipmentOption && (
                    <div>Équipement d'historique : Option {payload.selectedBackgroundEquipmentOption}</div>
                  )}
                </div>

                {payload.equipment.length > 0 ? (
                  <ul className="text-sm text-gray-300 space-y-1">
                    {payload.equipment.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">Aucun équipement</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ✅ NOUVEAU : Dés de vie */}
          {payload.hitDice && (
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <Heart className="w-5 h-5 text-red-400 mr-2" />
                  <h4 className="text-white font-semibold">Dés de vie</h4>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-300">
                  {payload.hitDice.total} {payload.hitDice.die} 
                  {payload.hitDice.used > 0 && (
                    <span className="text-gray-400"> ({payload.hitDice.used} utilisé{payload.hitDice.used > 1 ? 's' : ''})</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-800">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onConfirm} className="min-w-[200px]">
            Confirmer l'export
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;