import React from 'react';
import { Sparkles, Users, Disc3, Dices, School, ArrowRight, Lock, CheckCircle2, Trophy, Rocket, Gem, Coins } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function StudentLobby({
  activities = [],
  currentActivity,
  onSelectActivity,
  onLaunchGame,
  classrooms = [],
  activeClassroomId,
  onSelectClassroom,
  students = [],
  activeStudent,
  hasChosenTurnStudent = false,
  completedStudentIds = [],
  onOpenSpinner,
  onOpenRosterModal,
  onOpenTeacherPortal,
  onResetSessionRound,
  onCloseDailySession,
  currentTeacher,
  onOpenAuthModal
}) {
  const currentClassroom = classrooms.find(c => c.id === activeClassroomId) || classrooms[0];
  const pendingStudentsCount = students.filter(s => !completedStudentIds.includes(s.id)).length;

  const handleLaunchMachine = (machineType) => {
    sounds.playChips();
    if (onLaunchGame) {
      onLaunchGame(machineType);
    }
  };

  const isUnlocked = Boolean(hasChosenTurnStudent && activeStudent);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-fadeIn space-y-8">
      {/* Welcome Casino Hero Banner */}
      <div className="text-center py-2 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          The Educational English Casino • Ruleta y Juegos Virtuales
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100 tracking-tight neon-text-gold my-2">
          LUCKY ENGLISH CASINO
        </h1>

        <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Sortea primero un participante en la <strong>Ruleta de Alumnos</strong>. Una vez seleccionado, ¡se desplegarán las máquinas virtuales para probar su suerte y exonerarse del reto de inglés!
        </p>
      </div>

      {/* Classroom Status & Student Roulette Gate Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Salon Info Card */}
        <div className="md:col-span-5 bg-gradient-to-b from-gray-900 to-gray-950 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <School className="w-4 h-4" /> Salón de Clases
              </span>
              <button
                onClick={() => {
                  sounds.playTick();
                  if (!currentTeacher && onOpenAuthModal) {
                    onOpenAuthModal('gestionar los salones de clases', onOpenRosterModal);
                  } else {
                    onOpenRosterModal();
                  }
                }}
                className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Gestionar Salones</span>
                {!currentTeacher && <span className="text-[10px]">🔒</span>}
              </button>
            </div>

            <div className="p-3 bg-black/50 border border-gray-800 rounded-2xl">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                🏫 {currentClassroom?.name || 'Salón Principal'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {students.length} estudiantes registrados • {pendingStudentsCount} pendientes hoy
              </p>
            </div>

            {/* Quick Salon Switcher */}
            {classrooms.length > 1 && (
              <div className="mt-3">
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                  Cambiar a otro salón:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {classrooms.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        sounds.playTick();
                        if (onSelectClassroom) onSelectClassroom(c.id);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        c.id === activeClassroomId
                          ? 'bg-amber-500 text-black font-black'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
            <button
              onClick={() => {
                sounds.playTick();
                if (!currentTeacher && onOpenAuthModal) {
                  onOpenAuthModal('ver la lista de alumnos', onOpenRosterModal);
                } else {
                  onOpenRosterModal();
                }
              }}
              className="text-xs text-gray-300 hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Lista de Alumnos ({students.length})</span>
              {!currentTeacher && <span className="text-[10px] text-amber-400">🔒</span>}
            </button>

            <button
              onClick={() => {
                sounds.playTick();
                if (!currentTeacher && onOpenAuthModal) {
                  onOpenAuthModal('acceder al Panel Docente', onOpenTeacherPortal);
                } else {
                  onOpenTeacherPortal();
                }
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>👨‍🏫 Panel Docente (IA)</span>
              {!currentTeacher && <span className="text-[10px]">🔒</span>}
            </button>
          </div>
        </div>

        {/* The Student Roulette Gate (Initial spinner) */}
        <div className="md:col-span-7 bg-gradient-to-br from-purple-950/70 via-gray-900 to-black border-2 border-purple-500/70 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase tracking-widest bg-purple-950/80 px-3 py-1 rounded-full border border-purple-500/40">
                <Dices className="w-3.5 h-3.5 text-yellow-300" />
                1° Paso Obligatorio: Ruleta de Alumnos
              </span>

              {isUnlocked && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Alumno Seleccionado
                </span>
              )}
            </div>

            {isUnlocked && activeStudent ? (
              <div className="p-4 bg-purple-950/40 border border-purple-400/50 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 border-2 border-purple-300 flex items-center justify-center text-3xl shadow-xl shadow-purple-950/80">
                    {activeStudent.avatar || '🎩'}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
                      Alumno en Turno Activo:
                    </span>
                    <h3 className="text-2xl font-black text-white">{activeStudent.name}</h3>
                    <p className="text-xs text-gray-300 mt-0.5">
                      💰 {activeStudent.chips || 1000} Fichas • Aciertos: {activeStudent.correctAnswers || 0} / {activeStudent.totalQuestions || 0}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sounds.playChips();
                    onOpenSpinner();
                  }}
                  className="px-3 py-2 rounded-xl bg-purple-800/80 hover:bg-purple-700 text-purple-200 text-xs font-bold border border-purple-500/40 transition cursor-pointer"
                  title="Girar ruleta para otro alumno"
                >
                  Cambiar Alumno 🎲
                </button>
              </div>
            ) : (
              <div className="p-5 bg-black/60 border border-purple-500/30 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-400/40 mx-auto flex items-center justify-center text-2xl">
                  🎡
                </div>
                <h4 className="text-base font-black text-white">
                  Ningún Alumno Ha Sido Sorteado Aún
                </h4>
                <p className="text-xs text-gray-300 max-w-md mx-auto">
                  Gira la ruleta con la bolita animada para elegir al estudiante que participará en este turno. Las 6 máquinas de casino se desbloquearán inmediatamente.
                </p>
              </div>
            )}
          </div>

          {/* Action Spin Buttons */}
          <div className="mt-4 pt-3 flex flex-wrap gap-2.5">
            {students.length > 0 && pendingStudentsCount === 0 ? (
              <div className="w-full space-y-2">
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center text-xs font-bold text-emerald-300">
                  🎉 ¡Todos los alumnos del salón ya han sido elegidos en la sesión de hoy!
                </div>
                <div className="flex flex-wrap gap-2">
                  {onResetSessionRound && (
                    <button
                      onClick={() => {
                        sounds.playChips();
                        onResetSessionRound();
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                    >
                      🔄 Iniciar Nueva Ronda
                    </button>
                  )}
                  {onCloseDailySession && (
                    <button
                      onClick={() => {
                        sounds.playTick();
                        if (!currentTeacher && onOpenAuthModal) {
                          onOpenAuthModal('cerrar y archivar la sesión diaria', onCloseDailySession);
                        } else {
                          onCloseDailySession();
                        }
                      }}
                      className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs rounded-xl border border-gray-700 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>📋 Cerrar Sesión del Día</span>
                      {!currentTeacher && <span className="text-[10px]">🔒</span>}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  sounds.playChips();
                  if (onOpenSpinner) onOpenSpinner();
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-950/60 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Disc3 className="w-5 h-5 text-yellow-300 animate-spin" />
                <span>{isUnlocked ? 'SORTEAR OTRO ALUMNO 🎲' : `GIRAR RULETA DE ALUMNOS (${pendingStudentsCount} pendientes)`}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CASINO MACHINES SECTION: GATED OR UNLOCKED */}
      <div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>🎰 6 Máquinas Virtuales de Casino</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            {isUnlocked ? '¡Elige una Máquina para Probar tu Suerte!' : 'Máquinas de Casino (Bloqueadas)'}
          </h2>
          <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-xl mx-auto">
            {isUnlocked
              ? `Turno de ${activeStudent?.name}. Si tiene suerte en la máquina elegida se exonera de la pregunta; si no, ¡demuestra sus conocimientos!`
              : 'Gira primero la Ruleta de Alumnos arriba para seleccionar al participante y desbloquear el panel de juegos.'}
          </p>
        </div>

        {/* LOCKED STATE TEASER */}
        {!isUnlocked ? (
          <div
            onClick={() => {
              sounds.playTick();
              onOpenSpinner();
            }}
            className="p-12 bg-gradient-to-b from-gray-900/90 via-black to-gray-950 border-2 border-dashed border-gray-700 hover:border-purple-500/60 rounded-3xl text-center space-y-4 cabinet-3d-shadow transition-all duration-300 cursor-pointer group hover:scale-[1.01]"
          >
            <div className="w-20 h-20 rounded-3xl bg-purple-950/60 border-2 border-purple-500/50 mx-auto flex items-center justify-center text-4xl shadow-lg shadow-purple-950/60 group-hover:scale-110 transition duration-300">
              <Lock className="w-10 h-10 text-yellow-400" />
            </div>
            <h3 className="text-xl font-black text-white">
              Panel de Juegos Protegido
            </h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              Para garantizar que cada alumno tenga su oportunidad justa de jugar, primero debes presionar <strong>"GIRAR RULETA DE ALUMNOS"</strong> arriba. Una vez caiga la bolita en un estudiante, el salón accederá a las 6 máquinas.
            </p>
            <div>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs cabinet-3d-shadow transition transform hover:scale-105 active:scale-95">
                <Disc3 className="w-4 h-4 text-yellow-300 animate-spin" />
                Girar Ruleta Ahora
              </span>
            </div>
          </div>
        ) : (
          /* UNLOCKED: 6 CASINO MACHINES GRID IN 3D STAGE */
          <div className="casino-3d-stage grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* 1. Lucky Slots */}
            <div
              onClick={() => handleLaunchMachine('slots')}
              className="bg-gradient-to-b from-red-950/50 via-gray-900 to-black border-2 border-red-500/50 hover:border-red-400 rounded-3xl p-6 cabinet-3d-shadow transition-all duration-300 transform hover:-translate-y-2 hover:rotate-1 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition duration-300 shadow-md">
                  🎰
                </div>
                <h4 className="text-lg font-black text-white mb-1 group-hover:text-red-300 transition">
                  Lucky Slots
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Tira de la palanca mecánica. <strong>¡Si coinciden 2 o 3 figuras queda EXONERADO!</strong> Si no, responde el reto de inglés.
                </p>
              </div>

              <div className="pt-3 border-t border-red-900/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                  Exoneración: Coincidencia
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-1 group-hover:bg-red-500 transition shadow-md">
                  Jugar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* 2. Vegas Roulette (European 37 numbers & 2/3 criteria) */}
            <div
              onClick={() => handleLaunchMachine('roulette')}
              className="bg-gradient-to-b from-blue-950/50 via-gray-900 to-black border-2 border-blue-500/50 hover:border-blue-400 rounded-3xl p-6 cabinet-3d-shadow transition-all duration-300 transform hover:-translate-y-2 hover:rotate-1 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition duration-300 shadow-md">
                  🎡
                </div>
                <h4 className="text-lg font-black text-white mb-1 group-hover:text-blue-300 transition">
                  Ruleta Vegas (37 Números)
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Ruleta europea con bolita física. <strong>¡Acertar 2 de las 3 opciones (Par/Impar, Color, Mitades) EXONERA de la pregunta!</strong>
                </p>
              </div>

              <div className="pt-3 border-t border-blue-900/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Exoneración: 2 de 3 Aciertos
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1 group-hover:bg-blue-500 transition shadow-md">
                  Jugar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* 3. Blackjack */}
            <div
              onClick={() => handleLaunchMachine('blackjack')}
              className="bg-gradient-to-b from-emerald-950/50 via-gray-900 to-black border-2 border-emerald-500/50 hover:border-emerald-400 rounded-3xl p-6 cabinet-3d-shadow transition-all duration-300 transform hover:-translate-y-2 hover:rotate-1 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition duration-300 shadow-md">
                  🃏
                </div>
                <h4 className="text-lg font-black text-white mb-1 group-hover:text-emerald-300 transition">
                  21 Blackjack
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Mano contra el crupier. <strong>¡Si vences a la casa o logras 21 Blackjack quedas EXONERADO!</strong> Si no, respondes la pregunta.
                </p>
              </div>

              <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Exoneración: Vencer Crupier
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 group-hover:bg-emerald-500 transition shadow-md">
                  Jugar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* 4. Plinko Pyramid */}
            <div
              onClick={() => handleLaunchMachine('plinko')}
              className="bg-gradient-to-b from-amber-950/50 via-gray-900 to-black border-2 border-amber-500/50 hover:border-amber-400 rounded-3xl p-6 cabinet-3d-shadow transition-all duration-300 transform hover:-translate-y-2 hover:rotate-1 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-500/50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition duration-300 shadow-md">
                  🟢
                </div>
                <h4 className="text-lg font-black text-white mb-1 group-hover:text-amber-300 transition">
                  Plinko Lucky Drop
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Suelta la ficha en la pirámide de clavijas. <strong>¡Si cae en casilleros laterales (&ge; 1.5x) quedas EXONERADO!</strong>
                </p>
              </div>

              <div className="pt-3 border-t border-amber-900/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Exoneración: Multiplicador &ge; 1.5x
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-amber-600 text-black font-black text-xs flex items-center gap-1 group-hover:bg-amber-500 transition shadow-md">
                  Jugar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* 5. Lucky Rocket (Crash) */}
            <div
              onClick={() => handleLaunchMachine('crash')}
              className="bg-gradient-to-b from-sky-950/50 via-gray-900 to-black border-2 border-sky-500/50 hover:border-sky-400 rounded-3xl p-6 cabinet-3d-shadow transition-all duration-300 transform hover:-translate-y-2 hover:rotate-1 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-sky-600/20 border border-sky-500/50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition duration-300 shadow-md">
                  🚀
                </div>
                <h4 className="text-lg font-black text-white mb-1 group-hover:text-sky-300 transition">
                  Lucky Rocket (Crash)
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Cohete en tiempo real con multiplicador ascendente. <strong>¡Retírate antes del Crash para quedar EXONERADO!</strong>
                </p>
              </div>

              <div className="pt-3 border-t border-sky-900/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  Exoneración: Retiro a Tiempo
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1 group-hover:bg-sky-500 transition shadow-md">
                  Jugar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* 6. Casino Mines */}
            <div
              onClick={() => handleLaunchMachine('mines')}
              className="bg-gradient-to-b from-teal-950/50 via-gray-900 to-black border-2 border-teal-500/50 hover:border-teal-400 rounded-3xl p-6 cabinet-3d-shadow transition-all duration-300 transform hover:-translate-y-2 hover:rotate-1 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal-600/20 border border-teal-500/50 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition duration-300 shadow-md">
                  💣
                </div>
                <h4 className="text-lg font-black text-white mb-1 group-hover:text-teal-300 transition">
                  Casino Mines (5×5)
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Cuadrícula de gemas y minas. <strong>¡Descubre 2 o más diamantes y plántate a salvo para quedar EXONERADO!</strong>
                </p>
              </div>

              <div className="pt-3 border-t border-teal-900/40 flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                  Exoneración: &ge; 2 Gemas Sin Mina
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center gap-1 group-hover:bg-teal-500 transition shadow-md">
                  Jugar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
