import React from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { CharacterExportPayload } from '../../types/CharacterExport';
import { User, Heart, Shield, Zap, Users, Package, Image as ImageIcon } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
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
                <span className="text-white font-medium">{payload.speed} ft</span>
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

          {/* Compétences */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Users className="w-5 h-5 text-purple-400 mr-2" />
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

          {/* Équipement */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Package className="w-5 h-5 text-yellow-400 mr-2" />
                <h4 className="text-white font-semibold">Équipement</h4>
              </div>
            </CardHeader>
            <CardContent>
              {payload.equipment.length > 0 ? (
                <ul className="text-sm text-gray-300 space-y-1">
                  {payload.equipment.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">Aucun équipement</div>
              )}
              {payload.selectedBackgroundEquipmentOption && (
                <div className="text-xs text-gray-400 mt-2">
                  Option d’historique: {payload.selectedBackgroundEquipmentOption}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-800">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onConfirm} className="min-w-[200px]">
            Confirmer l’export
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;