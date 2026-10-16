import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Coins, Flame, ArrowLeft, CheckCircle2, AlertCircle, Play, Sparkles } from 'lucide-react';
import { sounds } from '../../utils/soundEffects';
import QuestionCard from '../QuestionCard';

const SYMBOLS = [
  { id: 'cherry', icon: '🍒', name: 'Cherry', mult: 2, weight: 30 },
  { id: 'lemon', icon: '🍋', name: 'Lemon', mult: 3, weight: 25 },
  { id: 'clover', icon: '🍀', name: 'Clover', mult: 4, weight: 20 },
  { id: 'bell', icon: '🔔', name: 'Bell', mult: 5, weight: 15 },
  { id: 'diamond', icon: '💎', name: 'Diamond', mult: 10, weight: 8 },
  { id: 'seven', icon: '7️⃣', name: 'Lucky 7', mult: 25, weight: 4 },
];

export default function SlotsGame({
  activity,
  chips,
  onUpdateChips,
  onBackToLobby,
  activeStudent,
  onRecordStudentScore,
  onAdvanceStudentTurn,
  onGenerateTurnQuestion
}) {
  const [bet, setBet] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['7️⃣', '7️⃣', '7️⃣']);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Luck / Exoneration states
  const [roundOutcome, setRoundOutcome] = useState(null); // 'lucky_exonerated' | 'unlucky_challenge' | null
  const [winMessage, setWinMessage] = useState(null);
  const [turnQuestionOverride, setTurnQuestionOverride] = useState(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);

  const questions = activity?.questions || [];
  const currentQuestion = turnQuestionOverride || questions[currentQuestionIndex % (questions.length || 1)];

  // Helper to pick random symbol with weight
  const getRandomSymbol = () => {
    const totalWeight = SYMBOLS.reduce((acc, s) => acc + s.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const sym of SYMBOLS) {
      if (rand < sym.weight) return sym;
      rand -= sym.weight;
    }
    return SYMBOLS[0];
  };

  // Student pulls lever or presses Spin to test luck!
  const handleSpinRequest = () => {
    if (isSpinning || roundOutcome === 'unlucky_challenge') return;
    if (chips < bet) {
      sounds.playWrong();
      alert('No hay suficientes fichas para esta apuesta. Ajusta la apuesta a continuación.');
      return;
    }

    // Deduct bet initially
    onUpdateChips(-bet);

    sounds.playLever();
    setIsSpinning(true);
    setRoundOutcome(null);
    setWinMessage(null);
    setTurnQuestionOverride(null);

    // Reel spin animation
    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;
      sounds.playTick();
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon,
      ]);

      if (ticks > 16) {
        clearInterval(interval);
        finalizeSpin();
      }
    }, 90);
  };

  const finalizeSpin = () => {
    setIsSpinning(false);

    // Roll for luck: ~45% chance of matching symbols
    const hasLuck = Math.random() < 0.45;
    let finalSymbols;
    let wonChips = 0;

    if (hasLuck) {
      const isJackpot = Math.random() < 0.3;
      if (isJackpot) {
        // 3 matching symbols (Jackpot!)
        const sym = getRandomSymbol();
        finalSymbols = [sym.icon, sym.icon, sym.icon];
        wonChips = Math.round(bet * sym.mult);
      } else {
        // 2 matching symbols
        const sym = getRandomSymbol();
        const other = SYMBOLS.find(s => s.icon !== sym.icon) || sym;
        finalSymbols = [sym.icon, sym.icon, other.icon];
        wonChips = Math.round(bet * 2);
      }

      setReels(finalSymbols);
      onUpdateChips(wonChips);

      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, wonChips, true, false, {
          machine: 'slots',
          bet,
          outcome: 'exonerated_by_luck',
          question: null
        });
      }

      setRoundOutcome('lucky_exonerated');
      sounds.playJackpot();
      confetti({
        particleCount: 130,
        spread: 80,
        origin: { y: 0.6 }
      });

      setWinMessage(
        `🎰 ¡EXONERADO POR SUERTE! Los rodillos coincidieron (${finalSymbols.join(' ')}). ¡${activeStudent ? activeStudent.name : 'El estudiante'} se salva del reto y cobra +${wonChips} fichas!`
      );
    } else {
      // Unlucky: 3 distinct symbols
      const s1 = SYMBOLS[0];
      const s2 = SYMBOLS[1];
      const s3 = SYMBOLS[2];
      finalSymbols = [s1.icon, s2.icon, s3.icon];
      setReels(finalSymbols);
      setRoundOutcome('unlucky_challenge');
      sounds.playWrong();
      setWinMessage('⚠️ ¡Mala suerte! Los rodillos no coincidieron. ¡Debes responder el reto de inglés para salvar tu turno!');

      // Auto-generate pedagogical turn question on loss based on active session topics
      if (onGenerateTurnQuestion) {
        setIsGeneratingIA(true);
        onGenerateTurnQuestion(activeStudent)
          .then(newQ => {
            if (newQ) setTurnQuestionOverride(newQ);
          })
          .catch(err => console.error('Error auto-generating loss question in Slots:', err))
          .finally(() => setIsGeneratingIA(false));
      }
    }
  };

  // Called when student answers the question after being unlucky
  const handleQuestionAnswer = (isCorrect, selected, q) => {
    if (isCorrect) {
      const reward = (q?.points || 200) + bet;
      onUpdateChips(reward);

      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, reward, true, true, {
          machine: 'slots',
          bet,
          outcome: 'answered_correct',
          question: q?.question || 'Reto de inglés'
        });
      }

      sounds.playCorrect();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setWinMessage(`🎯 ¡Excelente! ${activeStudent ? activeStudent.name : 'Respuesta correcta'}. Salvaste tu turno y ganaste +${reward} fichas.`);
    } else {
      sounds.playWrong();
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, -bet, false, true, {
          machine: 'slots',
          bet,
          outcome: 'answered_wrong',
          question: q?.question || 'Reto de inglés'
        });
      }
      setWinMessage('❌ Respuesta incorrecta. No te preocupes, ¡la práctica hace al maestro!');
    }
  };

  // On demand question regeneration using Groq AI
  const handleRegenerateTurnQuestion = async () => {
    if (!onGenerateTurnQuestion) return;
    setIsGeneratingIA(true);
    sounds.playChips();
    try {
      const newQ = await onGenerateTurnQuestion(activeStudent);
      if (newQ) {
        setTurnQuestionOverride(newQ);
        sounds.playTick();
      }
    } catch (err) {
      alert(err.message || 'Error al generar pregunta con IA.');
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const handleNextTurn = () => {
    setRoundOutcome(null);
    setWinMessage(null);
    setTurnQuestionOverride(null);
    setCurrentQuestionIndex(prev => (prev + 1) % (questions.length || 1));
    if (onAdvanceStudentTurn) {
      onAdvanceStudentTurn();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fadeIn space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToLobby}
          className="px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Sala Principal
        </button>

        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100 uppercase tracking-wider">
            🎰 Slots de la Fortuna
          </h2>
          <p className="text-xs text-gray-400">
            Regla: ¡Si coinciden los rodillos te salvas de la pregunta! Si no, ¡a responder!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>{chips.toLocaleString()} Fichas</span>
          </div>
        </div>
      </div>

      {/* Active Student Turn Badge */}
      {activeStudent && (
        <div className="p-3 bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-purple-950/60 border-2 border-purple-500/50 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeStudent.avatar || '🎩'}</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Turno en la Máquina:</span>
              <h4 className="text-base font-black text-white">{activeStudent.name}</h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-300 font-bold bg-black/40 px-2.5 py-1 rounded-xl border border-amber-500/20">
              💰 {activeStudent.chips || 1000} Fichas
            </span>

            {/* Quick Generate Turn Question with IA */}
            {onGenerateTurnQuestion && (
              <button
                onClick={handleRegenerateTurnQuestion}
                disabled={isGeneratingIA}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
                title="Generar un nuevo reto de inglés para este turno con IA Groq"
              >
                <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isGeneratingIA ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isGeneratingIA ? 'Generando...' : '⚡ Reto IA'}</span>
              </button>
            )}

            {onAdvanceStudentTurn && (
              <button
                onClick={onAdvanceStudentTurn}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-bold rounded-xl border border-gray-700 transition cursor-pointer"
              >
                Cambiar Turno ↻
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slot Machine Cabinet */}
      <div className="casino-3d-stage">
        <div className={`bg-gradient-to-b from-red-950 via-gray-950 to-black border-4 border-amber-500 rounded-3xl p-6 md:p-8 relative overflow-hidden text-center cabinet-3d-shadow transition-colors duration-500 ${
          roundOutcome === 'lucky_exonerated' ? 'win-glow' : ''
        }`}>
          {/* Neon Light Top Border */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-red-500 animate-pulse" />
          
          {/* Metallic Sweep Overlay */}
          <div className="absolute inset-0 metallic-shine pointer-events-none" />

          {/* Slot Machine Cabinet with Animated Side Lever */}
          <div className="relative max-w-lg mx-auto my-4 flex items-center justify-center">
            {/* Cabinet Body */}
            <div className="w-full bg-black/85 border-4 border-amber-400 rounded-3xl p-5 shadow-inner relative overflow-hidden z-10">
              {/* Flashing Marquee Bulbs Header */}
              <div className="flex justify-between items-center px-4 mb-3" style={{ transformStyle: 'preserve-3d' }}>
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full hover:[transform:translateZ(4px)] ${
                      isSpinning
                        ? i % 2 === 0 ? 'bg-yellow-300 shadow-[0_0_8px_#fde047]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                        : 'bg-amber-400/80 shadow-[0_0_4px_#f59e0b]'
                    } transition-all duration-200 cursor-default`}
                  />
                ))}
              </div>

              {/* Reels Display Box */}
              <div 
                className="grid grid-cols-3 gap-3 md:gap-4 bg-gradient-to-b from-gray-950 via-gray-900 to-black p-3.5 rounded-2xl border-2 border-amber-500/50 shadow-inner"
                style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
              >
                {reels.map((symbol, idx) => (
                  <div
                    key={idx}
                    className={`h-28 md:h-32 rounded-xl bg-gradient-to-b from-gray-900 to-black border-2 relative overflow-hidden ${
                      roundOutcome === 'lucky_exonerated'
                        ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                        : 'border-amber-500/40'
                    } flex items-center justify-center text-5xl md:text-6xl shadow-lg select-none transition-all duration-100 ${
                      isSpinning ? 'reel-spin-3d blur-[1px] scale-95' : 'reel-stop-3d scale-100'
                    }`}
                  >
                    {symbol}
                    {/* Glass Reflection Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>

          {/* Animated Physical Lever on right side */}
          <div className="hidden sm:flex flex-col items-center ml-2 cursor-pointer select-none z-10" onClick={handleSpinRequest}>
            <div
              className={`w-4 bg-gradient-to-b from-gray-400 to-gray-700 rounded-full border border-gray-500 transition-all duration-500 origin-bottom ${
                isSpinning ? 'h-14 translate-y-8 [transform:rotateX(60deg)_rotateZ(12deg)]' : 'h-24 hover:scale-105'
              }`}
            >
              {/* Golden Knob at lever top */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-yellow-200 shadow-lg -translate-x-2 -translate-y-4 hover:shadow-[0_0_12px_#fde047]" />
            </div>
            <div className="w-6 h-6 rounded-full bg-gray-900 border-2 border-amber-500 mt-1 shadow-md" />
          </div>
        </div>

        {/* Outcome Notification Banner */}
        {winMessage && (
          <div className={`max-w-xl mx-auto my-3 p-3.5 rounded-2xl border text-xs md:text-sm font-bold flex items-center justify-center gap-2 animate-fadeIn ${
            roundOutcome === 'lucky_exonerated'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/40'
              : 'bg-amber-950/80 border-amber-500 text-amber-200'
          }`}>
            {roundOutcome === 'lucky_exonerated' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{winMessage}</span>
          </div>
        )}

        {/* Bet Selection & Controls */}
        <div className="max-w-md mx-auto mt-4 pt-3 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">Apuesta:</span>
            {[25, 50, 100, 200].map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  sounds.playChips();
                  setBet(amount);
                }}
                disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                  bet === amount
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 font-black scale-105'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          {/* Spin / Lever Button or Next Turn Button */}
          {roundOutcome !== 'unlucky_challenge' ? (
            <button
              onClick={handleSpinRequest}
              disabled={isSpinning}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-gray-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/30 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Flame className="w-4 h-4 fill-black" />
              <span>{isSpinning ? '¡Girando...!' : '¡TIRAR DE LA PALANCA!'}</span>
            </button>
          ) : (
            <span className="text-xs text-red-400 font-bold animate-pulse">
              👇 ¡Responde el reto para continuar!
            </span>
          )}
        </div>

        {/* Lucky Exoneration Success Actions */}
        {roundOutcome === 'lucky_exonerated' && (
          <div className="mt-4 pt-3 border-t border-emerald-800/40 flex justify-center gap-3">
            <button
              onClick={handleNextTurn}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-white font-bold text-xs rounded-xl shadow-lg transition transform hover:scale-105 cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Siguiente Turno / Alumno →</span>
            </button>

            <button
              onClick={() => {
                setRoundOutcome(null);
                setWinMessage(null);
              }}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs rounded-xl border border-gray-700 transition cursor-pointer"
            >
              Tirar de nuevo
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Unlucky English Challenge Section */}
      {roundOutcome === 'unlucky_challenge' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="p-3 bg-red-950/60 border-2 border-red-500/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-red-200">
              {isGeneratingIA ? 'Generando reto pedagógico con IA...' : '⚠️ Al no coincidir los rodillos, el estudiante debe responder el siguiente desafío de inglés:'}
            </span>

            {onGenerateTurnQuestion && (
              <button
                type="button"
                onClick={handleRegenerateTurnQuestion}
                disabled={isGeneratingIA}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingIA ? 'animate-spin' : ''}`} />
                <span>{isGeneratingIA ? 'Generando...' : '⚡ Generar Otro Reto IA'}</span>
              </button>
            )}
          </div>

          {isGeneratingIA && !turnQuestionOverride ? (
            <div className="p-8 text-center bg-purple-950/30 border border-purple-500/30 rounded-2xl animate-pulse space-y-2">
              <Sparkles className="w-8 h-8 text-yellow-400 mx-auto animate-spin" />
              <p className="text-sm font-bold text-purple-200">Generando reto pedagógico para {activeStudent ? activeStudent.name : 'el estudiante'}...</p>
              <p className="text-xs text-purple-400">Creando pregunta adaptada a los temas activos de la sesión</p>
            </div>
          ) : currentQuestion ? (
            <QuestionCard
              key={currentQuestion.id || currentQuestionIndex}
              question={currentQuestion}
              questionNumber={(currentQuestionIndex % (questions.length || 1)) + 1}
              totalQuestions={questions.length}
              onAnswer={handleQuestionAnswer}
              activeStudent={activeStudent}
              showNextButton={true}
              onNext={handleNextTurn}
              onRegenerateQuestion={onGenerateTurnQuestion ? handleRegenerateTurnQuestion : null}
              isRegenerating={isGeneratingIA}
            />
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              No hay preguntas configuradas para esta actividad.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
