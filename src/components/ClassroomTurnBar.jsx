import React, { useState } from 'react';
import { Users, ChevronRight, Coins, Disc3, Sparkles } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function ClassroomTurnBar({
  students = [],
  activeStudent,
  onNextStudent,
  onOpenSpinner,
  onOpenRosterModal,
  onGenerateTurnQuestion
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!students || students.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-4 px-4 py-2.5 bg-gray-900/60 border border-gray-800 rounded-2xl flex items-center justify-between text-xs backdrop-blur-sm">
        <span className="text-gray-400 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-amber-400" />
          Modo Proyección: Ingresa los nombres de tus estudiantes para jugar por turnos.
        </span>
        <button
          onClick={onOpenRosterModal}
          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
        >
          <Users className="w-3.5 h-3.5" /> Cargar Estudiantes
        </button>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!onGenerateTurnQuestion) return;
    setIsGenerating(true);
    sounds.playChips();
    try {
      await onGenerateTurnQuestion(activeStudent);
      sounds.playTick();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-4 p-3 bg-gradient-to-r from-gray-950 via-amber-950/40 to-gray-950 border-2 border-amber-500/60 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
      {/* Current Student in Turn */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl shadow-inner animate-bounce">
          {activeStudent?.avatar || '🎩'}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              🎯 Turno de Juego
            </span>
            <span className="text-xs text-gray-400 font-mono">
              ({students.indexOf(activeStudent) + 1} / {students.length})
            </span>
          </div>
          <h4 className="text-base font-black text-white flex items-center gap-2">
            {activeStudent?.name || 'Estudiante'}
          </h4>
        </div>
      </div>

      {/* Student Personal Chips & Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-black/60 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-inner mr-1">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-black text-amber-300">
            {activeStudent?.chips?.toLocaleString() || 1000} Fichas
          </span>
        </div>

        {/* Generate Question for Turn with IA */}
        {onGenerateTurnQuestion && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 text-purple-200 hover:text-white border border-purple-500/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
            title="Generar nueva pregunta con IA para este turno"
          >
            <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGenerating ? 'Generando...' : '⚡ Reto IA'}</span>
          </button>
        )}

        {/* Spinner Modal Trigger Button */}
        {onOpenSpinner && (
          <button
            onClick={() => {
              sounds.playTick();
              onOpenSpinner();
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
            title="Abrir ruleta de la suerte para sortear estudiante"
          >
            <Disc3 className="w-4 h-4 text-yellow-300 animate-spin" />
            <span className="hidden sm:inline">Ruleta Alumnos</span>
          </button>
        )}

        {/* Next Turn Button */}
        <button
          onClick={() => {
            sounds.playTick();
            onNextStudent();
          }}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black transition flex items-center gap-1 shadow-md shadow-amber-500/20 cursor-pointer"
          title="Pasar al siguiente estudiante en orden"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Manage Roster Button */}
        <button
          onClick={onOpenRosterModal}
          className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
          title="Ver o modificar salones y estudiantes"
        >
          <Users className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
