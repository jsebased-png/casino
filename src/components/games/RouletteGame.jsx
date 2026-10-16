import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ArrowLeft, Coins, Disc3, CheckCircle2, AlertCircle, Play, Sparkles, Trophy } from 'lucide-react';
import { sounds } from '../../utils/soundEffects';
import QuestionCard from '../QuestionCard';

// European Roulette 37 Pockets sequence (0 to 36)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

function getNumberColor(num) {
  if (num === 0) return '#16a34a'; // Green
  return RED_NUMBERS.includes(num) ? '#dc2626' : '#18181b'; // Red or Black
}

function getNumberCategory(num) {
  if (num === 0) {
    return {
      parity: 'zero',
      color: 'green',
      half: 'zero'
    };
  }
  return {
    parity: num % 2 === 0 ? 'even' : 'odd',
    color: RED_NUMBERS.includes(num) ? 'red' : 'black',
    half: num <= 18 ? 'low' : 'high'
  };
}

export default function RouletteGame({
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

  // Betting state: Bet amount & the 3 criteria choices
  const [bet, setBet] = useState(50);
  const [betParity, setBetParity] = useState('even'); // 'even' | 'odd'
  const [betColor, setBetColor] = useState('red');    // 'red' | 'black'
  const [betHalf, setBetHalf] = useState('low');      // 'low' (1-18) | 'high' (19-36)

  // Wheel & Ball Animation States
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState(null);
  const [criteriaResults, setCriteriaResults] = useState(null);

  // Luck / Exoneration states
  const [roundOutcome, setRoundOutcome] = useState(null); // 'lucky_exonerated' | 'unlucky_challenge' | null
  const [winMessage, setWinMessage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnQuestionOverride, setTurnQuestionOverride] = useState(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);

  // Physics animation refs
  const wheelAngleRef = useRef(0);
  const ballAngleRef = useRef(0);
  const ballRadiusRef = useRef(140);
  const lastBounceTickRef = useRef(-1);

  const questions = activity?.questions || [];
  const currentQuestion = turnQuestionOverride || questions[currentQuestionIndex % (questions.length || 1)];

  const totalPockets = WHEEL_NUMBERS.length; // 37
  const pocketAngle = (2 * Math.PI) / totalPockets;

  // Render Canvas (Wheel + Orbiting Ball)
  const renderCanvas = (wheelRotation, ballAngle, ballRadius, highlightPocket = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = width / 2 - 10;
    const pocketTrackRadius = outerRadius - 38;
    const innerHubRadius = 42;

    ctx.clearRect(0, 0, width, height);

    // 0. 3D shadow underneath the wheel
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 15, outerRadius + 8, outerRadius, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.restore();

    // 1. Mahogany / Rosewood Outer Casino Bezel
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius + 8, 0, 2 * Math.PI);
    const woodGrad = ctx.createRadialGradient(centerX, centerY, outerRadius - 20, centerX, centerY, outerRadius + 8);
    woodGrad.addColorStop(0, '#78350f');
    woodGrad.addColorStop(0.6, '#451a03');
    woodGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = woodGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Golden Rivets along outer rim
    const totalRivets = 24;
    for (let i = 0; i < totalRivets; i++) {
      const a = (i * 2 * Math.PI) / totalRivets;
      const rx = centerX + (outerRadius + 3) * Math.cos(a);
      const ry = centerY + (outerRadius + 3) * Math.sin(a);
      ctx.beginPath();
      ctx.arc(rx, ry, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#ffffff';
      ctx.fill();
    }
    ctx.restore();

    // 1.5 Metallic Silver Rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius - 1, 0, 2 * Math.PI);
    const rimGrad = ctx.createLinearGradient(centerX - outerRadius, centerY - outerRadius, centerX + outerRadius, centerY + outerRadius);
    rimGrad.addColorStop(0, '#c0c0c0');
    rimGrad.addColorStop(1, '#4b5563');
    ctx.lineWidth = 3;
    ctx.strokeStyle = rimGrad;
    ctx.stroke();
    ctx.restore();

    // 2. Ball Track Ring (Dark Polished Metal)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius - 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#334155';
    ctx.stroke();
    ctx.restore();

    // 3. Rotating Wheel Head (37 Pockets)
    ctx.save();
    for (let i = 0; i < totalPockets; i++) {
      const startAngle = wheelRotation + i * pocketAngle;
      const endAngle = startAngle + pocketAngle;
      const num = WHEEL_NUMBERS[i];
      const isWinner = highlightPocket === i;

      // Pocket wedge
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, pocketTrackRadius, startAngle, endAngle);
      ctx.closePath();

      if (isWinner) {
        ctx.fillStyle = '#fbbf24'; // Bright gold highlight for winning number
      } else {
        ctx.fillStyle = getNumberColor(num);
      }
      ctx.fill();

      // Divider Frets (Metallic separators) - Subtle 3D edge
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b';
      ctx.stroke();
      ctx.save();
      ctx.translate(1, 1);
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();
      ctx.restore();

      // Number Label inside pocket
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + pocketAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = isWinner ? '#000000' : '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 3;
      ctx.fillText(num.toString(), pocketTrackRadius - 10, 4);
      ctx.restore();
    }
    ctx.restore();

    // 4. Center Golden Turret / Cone
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerHubRadius, 0, 2 * Math.PI);
    const hubGrad = ctx.createRadialGradient(centerX - 8, centerY - 8, 2, centerX, centerY, innerHubRadius);
    hubGrad.addColorStop(0, '#fef08a');
    hubGrad.addColorStop(0.4, '#eab308');
    hubGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();

    // Crossbar handles on turret
    for (let b = 0; b < 4; b++) {
      const bAngle = wheelRotation + (b * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + 26 * Math.cos(bAngle), centerY + 26 * Math.sin(bAngle));
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fef08a';
      ctx.stroke();
    }

    ctx.fillStyle = '#1c1917';
    ctx.font = '900 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VEGAS', centerX, centerY - 3);
    ctx.font = '700 7px system-ui';
    ctx.fillText('ROULETTE', centerX, centerY + 8);
    ctx.restore();

    // 5. Orbiting Roulette Ball (Bolita Real)
    if (ballRadius > 0) {
      const bx = centerX + ballRadius * Math.cos(ballAngle);
      const by = centerY + ballRadius * Math.sin(ballAngle);

      ctx.save();
      // Ball drop shadow
      ctx.beginPath();
      ctx.arc(bx + 2, by + 3, 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fill();

      // Ivory Ball with 3D radial shine
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, 2 * Math.PI);
      const ballGrad = ctx.createRadialGradient(bx - 1.5, by - 1.5, 1, bx, by, 5);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.7, '#e2e8f0');
      ballGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      // Specular highlight on the ball
      ctx.beginPath();
      ctx.arc(bx - 1.5, by - 1.5, 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      ctx.restore();
    }
  };

  // Initial draw
  useEffect(() => {
    renderCanvas(0, 0, 140, null);
  }, []);

  // Spin Roulette Wheel and Simulate Real Orbiting Ball
  const spinRoulette = () => {
    if (isSpinning || roundOutcome === 'unlucky_challenge') return;
    if (chips < bet) {
      sounds.playWrong();
      alert('No hay suficientes fichas. Por favor reduce la apuesta.');
      return;
    }

    onUpdateChips(-bet);
    sounds.playLever();

    setIsSpinning(true);
    setRoundOutcome(null);
    setWinMessage(null);
    setWinningNumber(null);
    setCriteriaResults(null);
    setTurnQuestionOverride(null);

    // Pick target winning number randomly
    const targetPocketIndex = Math.floor(Math.random() * totalPockets);
    const targetNumber = WHEEL_NUMBERS[targetPocketIndex];

    const canvas = canvasRef.current;
    const outerTrackRadius = (canvas ? canvas.width / 2 : 190) - 20;
    const pocketRestRadius = outerTrackRadius - 48;

    let wheelSpeed = 0.08 + Math.random() * 0.03;      // Wheel rotates clockwise
    let ballSpeed = -(0.28 + Math.random() * 0.06);     // Ball orbits counter-clockwise
    let currentRadius = outerTrackRadius;

    let progress = 0;
    const totalDurationFrames = 260 + Math.floor(Math.random() * 40);

    const animate = () => {
      progress++;

      // Decelerate wheel and ball
      wheelSpeed *= 0.992;
      ballSpeed *= 0.988;

      wheelAngleRef.current += wheelSpeed;
      ballAngleRef.current += ballSpeed;

      // As ball slows down, drop from outer rim inward to pocket
      if (progress > totalDurationFrames * 0.55) {
        const dropRatio = (progress - totalDurationFrames * 0.55) / (totalDurationFrames * 0.45);
        currentRadius = outerTrackRadius - (outerTrackRadius - pocketRestRadius) * Math.min(1, dropRatio * 1.05);

        // Ivory ball bounce sound on frets
        const currentBallSlice = Math.floor(
          Math.abs(ballAngleRef.current - wheelAngleRef.current) / pocketAngle
        ) % totalPockets;

        if (currentBallSlice !== lastBounceTickRef.current && Math.random() > 0.4) {
          sounds.playBallBounce();
          lastBounceTickRef.current = currentBallSlice;
        }
      }

      ballRadiusRef.current = currentRadius;

      renderCanvas(wheelAngleRef.current, ballAngleRef.current, ballRadiusRef.current, null);

      if (progress < totalDurationFrames && Math.abs(ballSpeed) > 0.008) {
        requestAnimationFrame(animate);
      } else {
        // Lock ball into the exact target pocket
        const pocketCenterAngle = wheelAngleRef.current + targetPocketIndex * pocketAngle + pocketAngle / 2;
        ballAngleRef.current = pocketCenterAngle;
        ballRadiusRef.current = pocketRestRadius;

        renderCanvas(wheelAngleRef.current, ballAngleRef.current, ballRadiusRef.current, targetPocketIndex);

        setIsSpinning(false);
        setWinningNumber(targetNumber);
        evaluateLuck(targetNumber, targetPocketIndex);
      }
    };

    requestAnimationFrame(animate);
  };

  // Evaluate the 2 of 3 criteria rule for exoneration
  const evaluateLuck = (num, pocketIdx) => {
    const cat = getNumberCategory(num);

    let matchParity = false;
    let matchColor = false;
    let matchHalf = false;

    if (num !== 0) {
      matchParity = cat.parity === betParity;
      matchColor = cat.color === betColor;
      matchHalf = cat.half === betHalf;
    }

    const matchedCount = (matchParity ? 1 : 0) + (matchColor ? 1 : 0) + (matchHalf ? 1 : 0);
    const isExonerated = matchedCount >= 2;

    const breakdown = {
      number: num,
      color: cat.color,
      parity: cat.parity,
      half: cat.half,
      matchParity,
      matchColor,
      matchHalf,
      matchedCount,
      isExonerated
    };
    setCriteriaResults(breakdown);

    if (isExonerated) {
      // Exonerated! Payout: 2x for 2 hits, 3.5x for all 3 hits!
      const multiplier = matchedCount === 3 ? 3.5 : 2.0;
      const payout = Math.round(bet * multiplier);
      onUpdateChips(payout);

      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, payout, true, false, {
          machine: 'roulette',
          bet,
          outcome: 'exonerated_by_luck',
          question: null
        });
      }

      setRoundOutcome('lucky_exonerated');
      sounds.playJackpot();
      confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
      setWinMessage(
        `🎉 ¡EXONERADO POR SUERTE! Cayó el número ${num} (${cat.color === 'red' ? 'ROJO' : cat.color === 'black' ? 'NEGRO' : 'VERDE'}) y acertaste ${matchedCount} de 3 criterios. ¡${activeStudent ? activeStudent.name : 'El estudiante'} se salva de responder y cobra +${payout} fichas!`
      );
    } else {
      // Unlucky! Must answer challenge
      setRoundOutcome('unlucky_challenge');
      sounds.playWrong();
      setWinMessage(
        `⚠️ ¡Mala suerte! Cayó el número ${num}. Solo acertaste ${matchedCount} de 3 criterios (necesitabas 2 o más). ¡Debes responder el reto de inglés!`
      );

      // Auto-generate pedagogical turn question on loss based on active session topics
      if (onGenerateTurnQuestion) {
        setIsGeneratingIA(true);
        onGenerateTurnQuestion(activeStudent)
          .then(newQ => {
            if (newQ) setTurnQuestionOverride(newQ);
          })
          .catch(err => console.error('Error auto-generating loss question in Roulette:', err))
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
          machine: 'roulette',
          bet,
          outcome: 'answered_correct',
          question: q?.question || 'Reto de ruleta'
        });
      }
      sounds.playCorrect();
      confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
      setWinMessage(`🎯 ¡Excelente! ${activeStudent ? activeStudent.name : 'Respuesta correcta'}. Salvaste tu turno y ganaste +${reward} fichas.`);
    } else {
      sounds.playWrong();
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, -bet, false, true, {
          machine: 'roulette',
          bet,
          outcome: 'answered_wrong',
          question: q?.question || 'Reto de ruleta'
        });
      }
      setWinMessage('❌ Respuesta incorrecta. ¡La casa se queda con las fichas este giro!');
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
    setWinningNumber(null);
    setCriteriaResults(null);
    setTurnQuestionOverride(null);
    setCurrentQuestionIndex(prev => (prev + 1) % (questions.length || 1));
    if (onAdvanceStudentTurn) {
      onAdvanceStudentTurn();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 animate-fadeIn space-y-6">
      {/* Top Bar Navigation & Active Student */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900/90 border border-blue-500/40 p-4 rounded-3xl backdrop-blur-md shadow-xl">
        <button
          onClick={() => {
            sounds.playTick();
            onBackToLobby();
          }}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition px-3 py-1.5 rounded-xl hover:bg-gray-800 text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>Volver al Lobby</span>
        </button>

        {activeStudent && (
          <div className="flex items-center gap-2.5 bg-blue-950/60 border border-blue-500/40 px-3.5 py-1.5 rounded-2xl">
            <span className="text-xl">{activeStudent.avatar || '🎩'}</span>
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-blue-300 block leading-tight">Turno en Ruleta:</span>
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

      {/* Main Roulette Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas Wheel */}
        <div className="lg:col-span-6 bg-gradient-to-b from-gray-900 via-slate-950 to-black border-2 border-blue-500/40 rounded-3xl p-5 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden casino-3d-stage cabinet-3d-shadow">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <Disc3 className="w-4 h-4 text-yellow-400" />
              Ruleta Europea (37 Números 0-36)
            </span>
            {winningNumber !== null && (
              <span className={`text-xs font-black px-2.5 py-1 rounded-xl text-white ${getNumberColor(winningNumber) === '#dc2626' ? 'bg-red-600' : getNumberColor(winningNumber) === '#18181b' ? 'bg-zinc-800' : 'bg-emerald-600'}`}>
                Salió: {winningNumber}
              </span>
            )}
          </div>

          <div className="relative my-3" style={{ transform: 'perspective(800px) rotateX(18deg)' }}>
            <canvas
              ref={canvasRef}
              width={370}
              height={370}
              className="rounded-full shadow-2xl border-4 border-amber-500/50 bg-black/80 max-w-full"
            />
          </div>

          <p className="text-[11px] text-gray-400 text-center mt-1">
            {isSpinning
              ? '🎡 ¡La bolita está girando a toda velocidad por el riel exterior!'
              : 'La bolita orbitará en sentido contrario y caerá en una de las 37 casillas.'}
          </p>
        </div>

        {/* Right Column: 2 of 3 Criteria Betting Board & Controls */}
        <div className="lg:col-span-6 bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-5 cabinet-3d-shadow">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              Regla de Exoneración
            </div>
            <h3 className="text-xl font-black text-white">
              🎯 Acierta 2 de las 3 Opciones
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              Selecciona tus pronósticos en los 3 criterios clásicos. <strong>¡Si aciertas al menos 2 de los 3 (2/3 o 3/3), quedas totalmente EXONERADO!</strong>
            </p>
          </div>

          {/* Criteria 1: Par o Impar */}
          <div className="bg-black/50 border border-gray-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                1. Paridad (Par / Impar)
              </span>
              <span className="text-[11px] text-gray-400">Elige uno</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
                onClick={() => {
                  sounds.playTick();
                  setBetParity('even');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                  betParity === 'even'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                    : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-750'
                }`}
              >
                ⚖️ PAR (Even)
              </button>
              <button
                disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
                onClick={() => {
                  sounds.playTick();
                  setBetParity('odd');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                  betParity === 'odd'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                    : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-750'
                }`}
              >
                🎲 IMPAR (Odd)
              </button>
            </div>
          </div>

          {/* Criteria 2: Rojo o Negro */}
          <div className="bg-black/50 border border-gray-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                2. Color (Rojo / Negro)
              </span>
              <span className="text-[11px] text-gray-400">Elige uno</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
                onClick={() => {
                  sounds.playTick();
                  setBetColor('red');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                  betColor === 'red'
                    ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-950/60'
                    : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-750'
                }`}
              >
                🔴 ROJO (Red)
              </button>
              <button
                disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
                onClick={() => {
                  sounds.playTick();
                  setBetColor('black');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                  betColor === 'black'
                    ? 'bg-zinc-800 border-zinc-500 text-amber-400 shadow-lg'
                    : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-750'
                }`}
              >
                ⚫ NEGRO (Black)
              </button>
            </div>
          </div>

          {/* Criteria 3: 1ra Mitad o 2da Mitad */}
          <div className="bg-black/50 border border-gray-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                3. Mitad del Tablero
              </span>
              <span className="text-[11px] text-gray-400">1-18 vs 19-36</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
                onClick={() => {
                  sounds.playTick();
                  setBetHalf('low');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                  betHalf === 'low'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                    : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-750'
                }`}
              >
                🔢 1ra Mitad (1 - 18)
              </button>
              <button
                disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
                onClick={() => {
                  sounds.playTick();
                  setBetHalf('high');
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer border ${
                  betHalf === 'high'
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                    : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-750'
                }`}
              >
                🔟 2da Mitad (19 - 36)
              </button>
            </div>
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
                  disabled={isSpinning || roundOutcome === 'unlucky_challenge'}
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

          {/* Action Spin Button */}
          {!roundOutcome && (
            <button
              onClick={spinRoulette}
              disabled={isSpinning || chips < bet}
              style={{ transform: 'perspective(600px) rotateX(3deg)' }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-950/60 transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 cabinet-3d-shadow"
            >
              <Disc3 className={`w-5 h-5 text-yellow-300 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'GIRANDO LA RULETA...' : `LANZAR BOLA (Apostar ${bet} Fichas)`}</span>
            </button>
          )}

          {/* Criteria Breakdown Results Display */}
          {criteriaResults && (
            <div className={`p-4 rounded-2xl border ${criteriaResults.isExonerated ? 'bg-emerald-950/40 border-emerald-500/50 win-glow' : 'bg-red-950/40 border-red-500/50'} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Resultado del Giro: Número {criteriaResults.number}
                </span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${criteriaResults.isExonerated ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'}`}>
                  {criteriaResults.matchedCount} de 3 Aciertos
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className={`p-2 rounded-xl text-center border ${criteriaResults.matchParity ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200' : 'bg-red-900/40 border-red-400 text-red-200'}`}>
                  <span className="block font-bold">1. Paridad</span>
                  <span>{criteriaResults.matchParity ? '✅ Acierto' : '❌ Fallo'}</span>
                </div>
                <div className={`p-2 rounded-xl text-center border ${criteriaResults.matchColor ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200' : 'bg-red-900/40 border-red-400 text-red-200'}`}>
                  <span className="block font-bold">2. Color</span>
                  <span>{criteriaResults.matchColor ? '✅ Acierto' : '❌ Fallo'}</span>
                </div>
                <div className={`p-2 rounded-xl text-center border ${criteriaResults.matchHalf ? 'bg-emerald-900/60 border-emerald-400 text-emerald-200' : 'bg-red-900/40 border-red-400 text-red-200'}`}>
                  <span className="block font-bold">3. Mitad</span>
                  <span>{criteriaResults.matchHalf ? '✅ Acierto' : '❌ Fallo'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Win / Feedback Banner */}
          {winMessage && (
            <div className={`p-4 rounded-2xl border text-xs md:text-sm leading-relaxed ${
              roundOutcome === 'lucky_exonerated'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/60 border-red-500/50 text-red-200'
            }`}>
              {winMessage}
            </div>
          )}

          {/* Exonerated: Next student / round button */}
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

      {/* Unlucky Challenge Section (English Question Card) */}
      {roundOutcome === 'unlucky_challenge' && (
        <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl animate-fadeIn space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-base font-black text-white">
                  Desafío de Inglés por Mala Suerte
                </h4>
                <p className="text-xs text-gray-400">
                  {activeStudent ? activeStudent.name : 'El estudiante'} no logró 2 aciertos en la ruleta. ¡Debe responder correctamente para salvar sus fichas!
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
