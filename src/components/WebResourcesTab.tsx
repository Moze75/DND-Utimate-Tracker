import React from 'react';
import { MessageSquare, BookOpen } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';

export function WebResourcesTab() {
  const player = usePlayer();

  return (
    <div className="space-y-6">
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <MessageSquare className="text-blue-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Discord</h2>
        </div>
        <div className="p-4">
          <a
            href="https://discord.com/channels/1315405525898231809/1315405525898231813"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <MessageSquare size={20} />
            Accéder au Discord du groupe
          </a>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-header flex items-center gap-3">
          <BookOpen className="text-purple-500" size={24} />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">AideDD</h2>
        </div>
        <div className="p-4 space-y-3">
          <a
            href="https://www.aidedd.org/dnd-filters/sorts.php"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <BookOpen size={20} />
            Consulter les sorts sur AideDD
          </a>
          {player?.class === 'Ensorceleur' && (
            <a
              href="https://www.aidedd.org/regles/classes/ensorceleur/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              Consulter Ensorceleur sur AideDD
            </a>
          )}
          {player?.class === 'Barde' && (
            <a
              href="https://www.aidedd.org/regles/classes/barde/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              Consulter Barde sur AideDD
            </a>
          )}
          {player?.class === 'Moine' && (
            <a
              href="https://www.aidedd.org/regles/classes/moine/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              Consulter Moine sur AideDD
            </a>
          )}
          {player?.class === 'Paladin' && (
            <a
              href="https://www.aidedd.org/regles/classes/paladin/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <BookOpen size={20} />
              Consulter Paladin sur AideDD
            </a>
          )}
        </div>
      </div>
    </div>
  );
}