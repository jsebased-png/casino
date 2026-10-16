import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Coins, Play, Sparkles, Trophy, AlertCircle } from 'lucide-react';
import { sounds } from '../../utils/soundEffects';
import QuestionCard from '../QuestionCard';

const BINS = [
  { label: '10x', mult: 10, color: '#dc2626', isExonerated: true },
  { label: '3x', mult: 3, color: '#ea580c', isExonerated: true },
  { label: '1.5x', mult: 1.5, color: '#ca8a04', isExonerated: true },
  { label: '0.5x', mult: 0.5, color: '#475569', isExonerated: false },
  { label: '0.2x', mult: 0.2, color: '#334155', isExonerated: false },
  { label: '0.5x', mult: 0.5, color: '#475569', isExonerated: false },
  { label: '1.5x', mult: 1.5, color: '#ca8a04', isExonerated: true },
  { label: '3x', mult: 3, color: '#ea580c', isExonerated: true },
  { label: '10x', mult: 10, color: '#dc2626', isExonerated: true }
];

export default function PlinkoGame({
  activity,
  chips,
  onUpdateChips,
  onBackToLobby,
  activeStudent,
  onRecordStudentScore,
  onAdvanceStudentTurn,
  onGenerateTurnQuestion
}) {
  const canvasRef = useRef(null);
  const [bet, setBet] = useState(50);
  const [isDropping, setIsDropping] = useState(false);
  const [landedBin, setLandedBin] = useState(null);

  // Outcome states
  const [roundOutcome, setRoundOutcome] = useState(null); // 'lucky_exonerated' | 'unlucky_challenge' | null
  const [winMessage, setWinMessage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnQuestionOverride, setTurnQuestionOverride] = useState(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);

  const activePegFlashRef = useRef([]); // pins to glow on hit
  const animationFrameRef = useRef(null);

  const questions = activity?.questions || [];
  const currentQuestion = turnQuestionOverride || questions[currentQuestionIndex % (questions.length || 1)];

  // Board Geometry configuration
  const rows = 8;
  const pinRadius = 4;
  const ballRadius = 7.5;

  // Compute pins coordinates
  const getPins = (width, height) => {
    const pins = [];
    const startY = 60;
    const endY = height - 60;
    const rowSpacing = (endY - startY) / (rows - 1);

    for (let r = 0; r < rows; r++) {
      const pinCount = r + 3; // row 0: 3 pins, row 7: 10 pins
      const y = startY + r * rowSpacing;
      const xSpacing = 32;
      const rowWidth = (pinCount - 1) * xSpacing;
      const startX = (width - rowWidth) / 2;

      for (let p = 0; p < pinCount; p++) {
        pins.push({
          x: startX + p * xSpacing,
          y,
          r: pinRadius,
          id: `${r}_${p}`
        });
      }
    }
    return pins;
  };

  const drawBoard = (ball = null, winningBinIdx = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Board Background with subtle glow
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // subtle vertical shadow line on the left side
    const shadowGrad = ctx.createLinearGradient(0, 0, 15, 0);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, 15, height);
    ctx.restore();

    // Top Chute funnel
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(width / 2 - 25, 10);
    ctx.lineTo(width / 2 - 12, 45);
    ctx.lineTo(width / 2 + 12, 45);
    ctx.lineTo(width / 2 + 25, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.restore();

    // Pins
    const pins = getPins(width, height);
    const now = Date.now();
    activePegFlashRef.current = activePegFlashRef.current.filter(f => now - f.time < 300);

    pins.forEach((pin) => {
      const flash = activePegFlashRef.current.find(f => f.id === pin.id);
      ctx.save();
      
      // small dark shadow arc below each pin
      ctx.beginPath();
      ctx.arc(pin.x, pin.y + 1.5, pin.r, 0, Math.PI, false);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pin.x, pin.y, pin.r, 0, 2 * Math.PI);

      if (flash) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
      } else {
        const pinGrad = ctx.createRadialGradient(pin.x - 1, pin.y - 1, 0, pin.x, pin.y, pin.r);
        pinGrad.addColorStop(0, '#ffffff');
        pinGrad.addColorStop(0.3, '#cbd5e1');
        pinGrad.addColorStop(1, '#475569');
        ctx.fillStyle = pinGrad;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 4;
      }
      ctx.fill();
      ctx.restore();
    });

    // Multiplier Bins at Bottom
    const binCount = BINS.length; // 9
    const binWidth = (width - 20) / binCount;
    const binY = height - 44;

    BINS.forEach((bin, idx) => {
      const bx = 10 + idx * binWidth;
      const isLanded = winningBinIdx === idx;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx + 1.5, binY, binWidth - 3, 34, 6);
      ctx.fillStyle = isLanded ? '#facc15' : bin.color;
      ctx.fill();

      // darker border at the bottom of each bin (2px)
      ctx.beginPath();
      ctx.moveTo(bx + 4.5, binY + 34);
      ctx.lineTo(bx + binWidth - 1.5, binY + 34);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();

      ctx.lineWidth = isLanded ? 3 : 1;
      ctx.strokeStyle = isLanded ? '#ffffff' : '#00000040';
      ctx.stroke();

      ctx.fillStyle = isLanded ? '#000000' : '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bin.label, bx + binWidth / 2, binY + 17);
      ctx.restore();
    });

    // Draw Falling Ball
    if (ball) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ballRadius, 0, 2 * Math.PI);
      const bGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0.5, ball.x + 2, ball.y + 2, ballRadius);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.2, '#fef08a');
      bGrad.addColorStop(0.5, '#f59e0b');
      bGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = bGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#fef08a';
      ctx.stroke();

      // Specular highlight
      ctx.beginPath();
      ctx.arc(ball.x - 2.5, ball.y - 2.5, 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
      
      ctx.restore();
    }
  };

  useEffect(() => {
    drawBoard();
  }, []);

  const handleDropChip = () => {
    if (isDropping || roundOutcome === 'unlucky_challenge') return;
    if (chips < bet) {
      sounds.playWrong();
      alert('No tienes suficientes fichas para esta apuesta.');
      return;
    }

    onUpdateChips(-bet);
    sounds.playChips();

    setIsDropping(true);
    setRoundOutcome(null);
    setWinMessage(null);
    setLandedBin(null);
    setTurnQuestionOverride(null);

    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const pins = getPins(width, height);

    let ball = {
      x: width / 2 + (Math.random() * 6 - 3),
      y: 35,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 1.5
    };

    const gravity = 0.22;
    const bounceDamping = 0.58;
    const binY = height - 44;

    const animate = () => {
      ball.vy += gravity;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall boundaries
      if (ball.x - ballRadius < 12) {
        ball.x = 12 + ballRadius;
        ball.vx = -ball.vx * 0.5;
      }
      if (ball.x + ballRadius > width - 12) {
        ball.x = width - 12 - ballRadius;
        ball.vx = -ball.vx * 0.5;
      }

      // Pin Collisions
      pins.forEach((pin) => {
        const dx = ball.x - pin.x;
        const dy = ball.y - pin.y;
        const dist = Math.hypot(dx, dy);
        const minDist = pin.r + ballRadius;

        if (dist < minDist) {
          // Collision Normal
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);

          // Displace ball outside pin
          ball.x = pin.x + nx * minDist;
          ball.y = pin.y + ny * minDist;

          // Reflect velocity
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * bounceDamping + (Math.random() - 0.5) * 0.8;
          ball.vy = (ball.vy - 2 * dot * ny) * bounceDamping;

          // Add flash
          activePegFlashRef.current.push({ id: pin.id, time: Date.now() });
          sounds.playPegBounce();
        }
      });

      drawBoard(ball, null);

      if (ball.y < binY + 12) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ball reached bin floor
        const binWidth = (width - 20) / BINS.length;
        const binIdx = Math.max(0, Math.min(BINS.length - 1, Math.floor((ball.x - 10) / binWidth)));
        const finalBin = BINS[binIdx];

        drawBoard(null, binIdx);
        setIsDropping(false);
        setLandedBin(finalBin);
        evaluateDrop(finalBin);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const evaluateDrop = (bin) => {
    if (bin.isExonerated) {
      // Exonerated!
      const payout = Math.round(bet * bin.mult);
      onUpdateChips(payout);

      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, payout, true, false, {
          machine: 'plinko',
          bet,
          outcome: 'exonerated_by_luck',
          question: null
        });
      }

      setRoundOutcome('lucky_exonerated');
      sounds.playJackpot();
      confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 } });
      setWinMessage(
        `🎉 ¡EXONERADO POR SUERTE EN PLINKO! La ficha cayó en la casilla dorada ${bin.label}. ¡${activeStudent ? activeStudent.name : 'El estudiante'} se salva del reto y cobra +${payout} fichas!`
      );
    } else {
      // Low bin, challenge
      setRoundOutcome('unlucky_challenge');
      sounds.playWrong();
      setWinMessage(
        `⚠️ ¡Mala suerte! La ficha cayó en la casilla baja ${bin.label} (inferior a 1.5x). ¡Debes responder el reto de inglés para salvarte!`
      );

      // Auto-generate pedagogical turn question on loss based on active session topics
      if (onGenerateTurnQuestion) {
        setIsGeneratingIA(true);
        onGenerateTurnQuestion(activeStudent)
          .then(newQ => {
            if (newQ) setTurnQuestionOverride(newQ);
          })
          .catch(err => console.error('Error auto-generating loss question in Plinko:', err))
          .finally(() => setIsGeneratingIA(false));
      }
    }
  };

  const handleQuestionAnswer = (isCorrect, selected, q) => {
    if (isCorrect) {
      const reward = (q?.points || 200) + bet;
      onUpdateChips(reward);
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, reward, true, true, {
          machine: 'plinko',
          bet,
          outcome: 'answered_correct',
          question: q?.question || 'Reto de Plinko'
        });
      }
      sounds.playCorrect();
      confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
      setWinMessage(`🎯 ¡Excelente! ${activeStudent ? activeStudent.name : 'Respuesta correcta'}. Salvaste tu turno y ganaste +${reward} fichas.`);
    } else {
      sounds.playWrong();
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, -bet, false, true, {
          machine: 'plinko',
          bet,
          outcome: 'answered_wrong',
          question: q?.question || 'Reto de Plinko'
        });
      }
      setWinMessage('❌ Respuesta incorrecta. ¡La casa retiene las fichas este turno!');
    }
  };

  const handleGenerateLiveQuestion = async () => {
    if (!onGenerateTurnQuestion) return;
    setIsGeneratingIA(true);
    sounds.playChips();
    try {
      const liveQ = await onGenerateTurnQuestion(activeStudent);
      if (liveQ) {
        setTurnQuestionOverride(liveQ);
        sounds.playCorrect();
      }
    } catch (err) {
      console.error('Error generating AI question:', err);
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const handleResetForNextRound = () => {
    setRoundOutcome(null);
    setWinMessage(null);
    setLandedBin(null);
    setTurnQuestionOverride(null);
    setCurrentQuestionIndex(prev => (prev + 1) % (questions.length || 1));
    if (onAdvanceStudentTurn) {
      onAdvanceStudentTurn();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-fadeIn space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/90 border border-amber-500/40 p-4 rounded-3xl backdrop-blur-md shadow-xl">
        <button
          onClick={() => {
            sounds.playTick();
            onBackToLobby();
          }}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition px-3 py-1.5 rounded-xl hover:bg-gray-800 text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Volver al Lobby</span>
        </button>

        {activeStudent && (
          <div className="flex items-center gap-2.5 bg-amber-950/60 border border-amber-500/40 px-3.5 py-1.5 rounded-2xl">
            <span className="text-xl">{activeStudent.avatar || '🎩'}</span>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-amber-300 block leading-tight">Turno en Plinko:</span>
              <span className="text-xs font-black text-white">{activeStudent.name}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-black/60 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-black text-amber-300 font-mono">
            {chips.toLocaleString()} Fichas
          </span>
        </div>
      </div>

      {/* Main Plinko Stage */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Plinko Pegboard Canvas */}
        <div className={`md:col-span-7 bg-gradient-to-b from-gray-900 via-slate-950 to-black border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-center casino-3d-stage cabinet-3d-shadow ${roundOutcome === 'lucky_exonerated' ? 'win-glow' : ''}`} style={{ transform: 'perspective(700px) rotateX(10deg)' }}>
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Pirámide Plinko Casino
            </span>
            {landedBin && (
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-500 text-black">
                Casilla: {landedBin.label}
              </span>
            )}
          </div>

          <canvas
            ref={canvasRef}
            width={380}
            height={440}
            className="rounded-2xl border border-gray-800 shadow-inner max-w-full"
          />

          <p className="text-[11px] text-gray-400 text-center mt-3">
            La ficha rebotará por los pines. Casillas laterales (&ge; 1.5x) exoneran. Casillas medias (&lt; 1.0x) activan reto.
          </p>
        </div>

        {/* Controls Column */}
        <div className="md:col-span-5 bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 cabinet-3d-shadow">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              Regla de Exoneración
            </div>
            <h3 className="text-xl font-black text-white">
              🟢 Plinko Lucky Drop
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Suelta la ficha en la pirámide de pines. <strong>Si aterriza en una casilla de 1.5x, 3x o 10x, ¡el alumno queda totalmente EXONERADO!</strong>
            </p>
          </div>

          {/* Bet Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5">
              Fichas en Apuesta:
            </label>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  disabled={isDropping || roundOutcome === 'unlucky_challenge'}
                  onClick={() => {
                    sounds.playChips();
                    setBet(amt);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    bet === amt
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Drop Button */}
          {!roundOutcome && (
            <button
              onClick={handleDropChip}
              disabled={isDropping || chips < bet}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black font-black text-base rounded-2xl shadow-xl shadow-amber-950/60 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 cabinet-3d-shadow"
            >
              <Play className={`w-5 h-5 ${isDropping ? 'animate-bounce' : ''}`} />
              <span>{isDropping ? 'REBOTANDO EN LOS PINES...' : `SOLTAR FICHA (${bet} Fichas)`}</span>
            </button>
          )}

          {/* Win / Feedback message */}
          {winMessage && (
            <div className={`p-4 rounded-2xl border text-xs md:text-sm leading-relaxed ${
              roundOutcome === 'lucky_exonerated'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/60 border-red-500/50 text-red-200'
            }`}>
              {winMessage}
            </div>
          )}

          {/* Exonerated button */}
          {roundOutcome === 'lucky_exonerated' && (
            <button
              onClick={handleResetForNextRound}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span>Siguiente Turno / Continuar</span>
            </button>
          )}
        </div>
      </div>

      {/* Challenge Section on Unlucky drop */}
      {roundOutcome === 'unlucky_challenge' && (
        <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl animate-fadeIn space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-base font-black text-white">
                  Desafío de Inglés por Casilla Baja
                </h4>
                <p className="text-xs text-gray-400">
                  {activeStudent ? activeStudent.name : 'El estudiante'} cayó en casilla baja de Plinko. ¡Debe responder el reto para salvar su puntuación!
                </p>
              </div>
            </div>

            {onGenerateTurnQuestion && (
              <button
                onClick={handleGenerateLiveQuestion}
                disabled={isGeneratingIA}
                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isGeneratingIA ? 'animate-spin' : ''}`} />
                <span>{isGeneratingIA ? 'Generando con IA...' : 'Generar Otra Pregunta IA (Groq)'}</span>
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
              onAnswer={handleQuestionAnswer}
              activeStudent={activeStudent}
            />
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              No hay preguntas configuradas para esta actividad.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleResetForNextRound}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Pasar al Siguiente Alumno ⏭️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

