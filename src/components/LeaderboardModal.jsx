import React, { useState, useEffect } from 'react';
import { Trophy, X, Medal, Sparkles, Coins, Users } from 'lucide-react';
import { getLeaderboard } from '../services/firebaseService';

export default function LeaderboardModal({ isOpen, onClose, currentPin }) {
  const [filterPin, setFilterPin] = useState(currentPin || '');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadScores();
    }
  }, [isOpen, filterPin]);

  const loadScores = async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(filterPin || null);
      setScores(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-b from-gray-900 to-black border-2 border-amber-500/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-1 animate-bounce" />
          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">
            CASINO HIGH ROLLERS
          </h3>
          <p className="text-xs text-gray-400">
            Top English learners ranked by chips won & accuracy
          </p>
        </div>

        {/* Filter Input */}
        <div className="mb-4">
          <input
            type="text"
            value={filterPin}
            onChange={(e) => setFilterPin(e.target.value.toUpperCase())}
            placeholder="Filter by Room PIN (leave blank for All)..."
            className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none uppercase"
          />
        </div>

        {/* Scores List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              Loading rankings...
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl">
              <p className="text-gray-500 text-xs">No recorded scores yet.</p>
              <p className="text-[11px] text-gray-600 mt-1">Play any machine and hit the jackpot to enter the rankings!</p>
            </div>
          ) : (
            scores.map((sc, idx) => {
              let rankBadge = <span className="text-gray-400 font-bold text-xs w-6 text-center">#{idx + 1}</span>;
              if (idx === 0) rankBadge = <span className="text-xl">🥇</span>;
              if (idx === 1) rankBadge = <span className="text-xl">🥈</span>;
              if (idx === 2) rankBadge = <span className="text-xl">🥉</span>;

              return (
                <div
                  key={sc.id || idx}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-400/50 shadow-md'
                      : 'bg-gray-800/40 border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {rankBadge}
                    <span className="text-2xl">{sc.avatar || '🎩'}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {sc.playerNick}
                        {sc.pin && (
                          <span className="text-[10px] text-amber-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">
                            {sc.pin}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {sc.correctAnswers} / {sc.totalQuestions} correct ({sc.accuracy || 0}%)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-amber-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      {sc.chips?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] text-gray-500">Chips</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl transition"
          >
            Close Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
