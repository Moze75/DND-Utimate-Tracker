import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

interface Session {
  id: string;
  date: string;
}

interface SessionsModalProps {
  isGM: boolean;
  onClose: () => void;
}

export function SessionsModal({ isGM, onClose }: SessionsModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchSessions();

    // Subscribe to changes
    const subscription = supabase
      .channel('game_sessions_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [...prev, payload.new as Session].sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            ));
            toast.success('Nouvelle session planifiée');
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(session => session.id !== payload.old.id));
            toast.success('Session annulée');
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Erreur lors de la récupération des sessions');
    }
  };

  const addSession = async () => {
    if (!selectedDate) return;

    try {
      const { error } = await supabase
        .from('game_sessions')
        .insert([{ date: selectedDate }]);

      if (error) throw error;

      setSelectedDate('');
      toast.success('Session ajoutée');
    } catch (error) {
      console.error('Error adding session:', error);
      toast.error('Erreur lors de l\'ajout de la session');
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Session supprimée');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erreur lors de la suppression de la session');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Toaster position="top-right" />
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Prochaines sessions</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700/50"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {isGM && (
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100"
              />
              <button
                onClick={addSession}
                disabled={!selectedDate}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={20} />
                Ajouter
              </button>
            </div>
          )}

          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Aucune session prévue</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="text-red-500" size={20} />
                    <span className="text-gray-100">
                      {formatDate(session.date)}
                    </span>
                  </div>
                  {isGM && (
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}