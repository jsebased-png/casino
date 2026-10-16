import React from 'react';
import { 
  Sparkles, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Settings, 
  Bot, 
  Home, 
  Coins,
  Users
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Navbar({
  currentView,
  setCurrentView,
  chips,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenLeaderboard,
  studentsCount,
  onOpenRosterModal
}) {
  return (
    <nav className="w-full bg-gray-950/80 backdrop-blur-md border-b border-amber-500/30 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div 
          onClick={() => {
            sounds.playChips();
            setCurrentView('lobby');
          }}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition transform">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center text-xl">
              🎰
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base md:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100">
                LUCKY ENGLISH
              </span>
              <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-widest">
                VEGAS
              </span>
            </div>
            <p className="text-[10px] text-amber-200/60 hidden sm:block tracking-widest font-semibold uppercase">
              Casino Learning Machines
            </p>
          </div>
        </div>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-1.5 bg-black/50 p-1 rounded-2xl border border-gray-800">
          <button
            onClick={() => {
              sounds.playTick();
              setCurrentView('lobby');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentView === 'lobby'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> Lobby
          </button>

          <button
            onClick={() => {
              sounds.playTick();
              setCurrentView('teacher');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentView === 'teacher'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" /> Panel Docente
          </button>

          <button
            onClick={() => {
              sounds.playTick();
              onOpenRosterModal();
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800/60 transition flex items-center gap-1.5"
            title="Ingresar y gestionar nombres de estudiantes"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Alumnos ({studentsCount})</span>
          </button>

          <button
            onClick={() => {
              sounds.playTick();
              onOpenLeaderboard();
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800/60 transition flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Clasificación
          </button>
        </div>

        {/* Right Tools (Chips, Mute, Settings) */}
        <div className="flex items-center gap-2">
          {/* Chip Counter */}
          <div className="flex items-center gap-1.5 bg-black/60 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-inner">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-300 tracking-wide">
              {chips.toLocaleString()}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isMuted
                ? 'bg-red-950/60 border-red-500/50 text-red-400'
                : 'bg-gray-900 border-gray-800 text-gray-300 hover:text-amber-300'
            }`}
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => {
              sounds.playTick();
              onOpenSettings();
            }}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-amber-300 transition cursor-pointer"
            title="Ajustes (Groq API, Firebase, TTS)"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile Roster Button */}
          <button
            onClick={onOpenRosterModal}
            className="md:hidden p-2 rounded-xl bg-gray-800 text-amber-400 border border-gray-700"
            title="Alumnos"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
