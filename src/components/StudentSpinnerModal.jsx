import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { X, Dices, Sparkles, Users, Play, RotateCcw } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const WHEEL_COLORS = [
  '#dc2626', // Red
  '#18181b', // Black
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#d97706', // Amber/Gold
  '#059669', // Emerald
  '#be123c', // Rose
  '#0284c7'  // Sky
];

const TWO_PI = Math.PI * 2;
const mod = (a, n) => ((a % n) + n) % n;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const SPIN_DURATION_MS = 3600; // duración del giro (ms)
const TARGET_ANGLE = -Math.PI / 2; // la bolita siempre termina arriba

export default function StudentSpinnerModal({
  isOpen,
  onClose,
  students = [],
  completedStudentIds = [],
  activeClassroomName = 'Salón Activo',
  onStudentSelected,
  onOpenRosterModal,
  onResetRound,
  onCloseSession
}) {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const rotationRef = useRef(0);
  const lastSliceIdxRef = useRef(-1);
  const ballAngleRef = useRef(0);
  const ballRadiusRef = useRef(124);
  const rafRef = useRef(null);
  const spinningRef = useRef(false);
  const layerRef = useRef(null); // cache de la ruleta (gajos + nombres) para no redibujar sombras cada frame

  // Eligible students: only those who have NOT been selected in today's session
  const eligibleStudents = students.filter(s => !completedStudentIds.includes(s.id));

  // Slices currently rendered on the wheel
  const [displayedStudents, setDisplayedStudents] = useState(eligibleStudents);

  // Sync displayed slices with eligible students whenever modal opens or state changes without active spin/winner
  useEffect(() => {
    if (!winner && !isSpinning) {
      const pending = students.filter(s => !completedStudentIds.includes(s.id));
      setDisplayedStudents(pending);
    }
  }, [students, completedStudentIds, winner, isSpinning]);

  const numSlices = displayedStudents.length;
  const sliceAngle = numSlices > 0 ? (2 * Math.PI) / numSlices : 0;

  const drawWheel = useCallback((rotation, pool) => {
    const canvas = canvasRef.current;
    const slicesCount = pool ? pool.length : 0;
    if (!canvas || slicesCount === 0) return;
    const currentSliceAngle = TWO_PI / slicesCount;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 12;

    // Capa cacheada: gajos + nombres (lo más pesado por el shadowBlur). Se dibuja UNA vez por lista de alumnos.
    const key = width + '|' + pool.map(st => `${st.id}:${st.name}:${st.avatar || ''}`).join('|');
    if (!layerRef.current || layerRef.current.key !== key) {
      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const octx = off.getContext('2d');
      for (let i = 0; i < slicesCount; i++) {
        const startAngle = i * currentSliceAngle;
        const endAngle = startAngle + currentSliceAngle;
        const student = pool[i];
        octx.save();
        octx.beginPath();
        octx.moveTo(centerX, centerY);
        octx.arc(centerX, centerY, radius, startAngle, endAngle);
        octx.closePath();
        octx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
        octx.fill();
        octx.lineWidth = 1.5;
        octx.strokeStyle = '#fef08a';
        octx.stroke();

        octx.save();
        octx.translate(centerX, centerY);
        octx.rotate(startAngle + currentSliceAngle / 2);
        octx.textAlign = 'right';
        octx.fillStyle = '#ffffff';
        octx.font = slicesCount <= 4 ? 'bold 14px system-ui, sans-serif' : 'bold 11px system-ui, sans-serif';
        octx.shadowColor = 'rgba(0,0,0,0.85)';
        octx.shadowBlur = 4;
        const maxLen = slicesCount <= 4 ? 20 : 13;
        const displayName = student.name.length > maxLen ? student.name.substring(0, maxLen - 1) + '…' : student.name;
        octx.fillText(`${student.avatar || '👤'} ${displayName}`, radius - 15, 4);
        octx.restore();
        octx.restore();
      }
      layerRef.current = { key, canvas: off };
    }

    ctx.clearRect(0, 0, width, height);

    // Outer Casino Rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, TWO_PI);
    ctx.fillStyle = '#b45309';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();
    const totalRivets = 20;
    for (let i = 0; i < totalRivets; i++) {
      const rAngle = (i * TWO_PI) / totalRivets;
      ctx.beginPath();
      ctx.arc(centerX + (radius + 4) * Math.cos(rAngle), centerY + (radius + 4) * Math.sin(rAngle), 2.5, 0, TWO_PI);
      ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#ffffff';
      ctx.fill();
    }
    ctx.restore();

    // Gajos (imagen cacheada, solo se rota)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.drawImage(layerRef.current.canvas, -centerX, -centerY);
    ctx.restore();

    // Center Golden Cap
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, TWO_PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LUCKY', centerX, centerY - 3);
    ctx.font = '8px system-ui';
    ctx.fillText('CASINO', centerX, centerY + 10);
    ctx.restore();

    // Orbiting Ivory Ball
    if (ballRadiusRef.current > 0) {
      const bx = centerX + ballRadiusRef.current * Math.cos(ballAngleRef.current);
      const by = centerY + ballRadiusRef.current * Math.sin(ballAngleRef.current);
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx + 1.5, by + 2, 6, 0, TWO_PI);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, TWO_PI);
      const ballGrad = ctx.createRadialGradient(bx - 1.5, by - 1.5, 1, bx, by, 5.5);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.7, '#e2e8f0');
      ballGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // Al ABRIR el modal: reiniciar estado. Depende SOLO de isOpen.
  // (Antes dependía de completedStudentIds: al elegir ganador el padre lo actualizaba, este efecto
  //  se disparaba y reseteaba bolita/rueda/ganador => la "teletransportación".)
  useEffect(() => {
    if (isOpen) {
      setWinner(null);
      setIsSpinning(false);
      spinningRef.current = false;
      ballAngleRef.current = TARGET_ANGLE;
      ballRadiusRef.current = 124;
      const pending = students.filter(s => !completedStudentIds.includes(s.id));
      setDisplayedStudents(pending);
      drawWheel(rotationRef.current, pending);
    }
    // eslint-disable-next-line
  }, [isOpen]);

  // Redibujar cuando cambian los gajos mostrados (nunca durante el giro)
  useEffect(() => {
    if (isOpen && !spinningRef.current) {
      drawWheel(rotationRef.current, displayedStudents);
    }
  }, [isOpen, displayedStudents, drawWheel]);

  // Cancelar animación al desmontar
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  if (!isOpen) return null;

  // Giro con ganador decidido de antemano y animación basada en TIEMPO (no en frames):
  // la rueda y la bolita desaceleran con easing y terminan EXACTAMENTE en el gajo ganador (sin saltos).
  const handleSpin = () => {
    const poolToSpin = displayedStudents.length > 0
      ? displayedStudents
      : students.filter(s => !completedStudentIds.includes(s.id));

    if (spinningRef.current || poolToSpin.length === 0) return;

    spinningRef.current = true;
    setIsSpinning(true);
    setWinner(null);
    sounds.playLever();

    const slicesCount = poolToSpin.length;
    const sliceAng = TWO_PI / slicesCount;
    const canvas = canvasRef.current;
    const outerRadius = (canvas ? canvas.width / 2 : 170) - 14;
    const pocketRestRadius = outerRadius - 32;

    // 1) Elegir ganador (aleatorio uniforme) ANTES de animar
    const winnerIdx = Math.floor(Math.random() * slicesCount);
    const selectedStudent = poolToSpin[winnerIdx];

    // 2) Ángulos finales: el centro del gajo ganador queda justo bajo la bolita (arriba)
    const r0 = rotationRef.current;
    const b0 = ballAngleRef.current;
    const wheelTotal = (3 + Math.floor(Math.random() * 2)) * TWO_PI
      + mod(TARGET_ANGLE - (winnerIdx + 0.5) * sliceAng - r0, TWO_PI);
    const ballTotal = -((6 + Math.floor(Math.random() * 2)) * TWO_PI + mod(b0 - TARGET_ANGLE, TWO_PI));

    let lastIdx = -1;
    let lastTick = 0;
    const startTime = performance.now();

    const finish = () => {
      rotationRef.current = r0 + wheelTotal;
      ballAngleRef.current = b0 + ballTotal;
      ballRadiusRef.current = pocketRestRadius;
      drawWheel(rotationRef.current, poolToSpin);
      rafRef.current = null;
      spinningRef.current = false;
      setIsSpinning(false);
      setWinner(selectedStudent);
      sounds.playJackpot();
      confetti({ particleCount: 130, spread: 85, origin: { y: 0.6 } });
      if (onStudentSelected && selectedStudent) {
        onStudentSelected(selectedStudent);
      }
    };

    const animate = (now) => {
      const t = Math.min(1, (now - startTime) / SPIN_DURATION_MS);
      rotationRef.current = r0 + wheelTotal * easeOutCubic(t);
      ballAngleRef.current = b0 + ballTotal * easeOutQuart(t);

      // La bolita cae del borde al bolsillo con un pequeño rebote amortiguado
      if (t > 0.55) {
        const p = (t - 0.55) / 0.45;
        const ripple = Math.sin(p * Math.PI * 3) * (1 - p) * 4;
        ballRadiusRef.current = outerRadius - (outerRadius - pocketRestRadius) * easeOutCubic(p) + ripple;

        const idx = Math.floor(mod(ballAngleRef.current - rotationRef.current, TWO_PI) / sliceAng) % slicesCount;
        if (idx !== lastIdx && now - lastTick > 70) {
          sounds.playBallBounce();
          lastTick = now;
        }
        lastIdx = idx;
      } else {
        ballRadiusRef.current = outerRadius;
      }

      if (t < 1) {
        drawWheel(rotationRef.current, poolToSpin);
        rafRef.current = requestAnimationFrame(animate);
      } else {
        finish();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const handleConfirmWinner = () => {
    if (winner && onStudentSelected) {
      onStudentSelected(winner);
    }
    onClose();
  };

  const handleSpinAgain = () => {
    // Redraw wheel with remaining eligible students (excluding current winner)
    const nextEligible = students.filter(s => !completedStudentIds.includes(s.id) && s.id !== winner?.id);
    setWinner(null);
    setDisplayedStudents(nextEligible);
    drawWheel(rotationRef.current, nextEligible);
  };

  const totalCompleted = completedStudentIds.length;
  const isAllCompleted = students.length > 0 && eligibleStudents.length === 0;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-500/80 rounded-3xl p-6 max-w-lg w-full cabinet-3d-shadow relative text-center flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Sorteo de Participante • Sesión Diaria
          </div>
          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100">
            🎲 RULETA DE ALUMNOS
          </h3>
          <p className="text-xs text-gray-400">
            {activeClassroomName} • <strong className="text-amber-300">{eligibleStudents.length}</strong> de {students.length} alumnos pendientes hoy
            {totalCompleted > 0 && (
              <span className="ml-1 text-emerald-400 font-bold">({totalCompleted} ya seleccionados)</span>
            )}
          </p>
        </div>

        {/* All Students Completed State */}
        {isAllCompleted ? (
          <div className="py-8 px-6 border-2 border-emerald-500/40 bg-emerald-950/20 rounded-3xl my-4 max-w-sm mx-auto space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-3xl animate-bounce">
              🎉
            </div>
            <h4 className="text-lg font-black text-white">
              ¡Todos los Alumnos Han Sido Sorteados!
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Los {students.length} estudiantes del salón ya fueron elegidos y eliminados de la lista de espera de la sesión de hoy.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {onResetRound && (
                <button
                  onClick={() => {
                    sounds.playChips();
                    onResetRound();
                    setWinner(null);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Iniciar Nueva Ronda (Habilitar a Todos)</span>
                </button>
              )}
              {onCloseSession && (
                <button
                  onClick={() => {
                    onClose();
                    onCloseSession();
                  }}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs rounded-xl border border-gray-700 transition cursor-pointer"
                >
                  <span>📋 Cerrar y Archivar Sesión Diaria</span>
                </button>
              )}
            </div>
          </div>
        ) : students.length > 0 ? (
          /* Wheel Canvas Container in 3D Perspective Stage */
          <div className="casino-3d-stage relative my-1">
            <div
              className="transition-transform duration-500"
              style={{ transform: 'perspective(750px) rotateX(15deg)', transformStyle: 'preserve-3d', willChange: 'transform' }}
            >
              <canvas
                ref={canvasRef}
                width={340}
                height={340}
                className="rounded-full cabinet-3d-shadow border-4 border-amber-500/60"
              />
            </div>
          </div>
        ) : (
          /* No students registered in classroom */
          <div className="py-12 px-6 border-2 border-dashed border-gray-800 rounded-3xl my-4 max-w-sm">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-300">No hay estudiantes en este salón</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Agrega los nombres de tus alumnos para hacer el sorteo.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenRosterModal();
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs rounded-xl shadow hover:scale-105 transition cursor-pointer"
            >
              + Ingresar Nombres
            </button>
          </div>
        )}

        {/* Winner Announcement Banner */}
        {winner && (
          <div className="my-2.5 p-3.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400 rounded-2xl w-full animate-fadeIn shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-black text-amber-300 tracking-wider">
                🎉 ¡Elegido por la Ruleta! (Eliminado de la sesión)
              </span>
              <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold">
                {Math.max(0, eligibleStudents.length - 1)} restantes
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-3xl">{winner.avatar || '🎩'}</span>
              <h4 className="text-2xl font-black text-white">{winner.name}</h4>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              ¡Es el turno de {winner.name.split(' ')[0]} de probar suerte en los juegos virtuales!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {!isAllCompleted && displayedStudents.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 w-full">
            {!winner ? (
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-gray-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/30 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Dices className="w-5 h-5" />
                <span>{isSpinning ? '¡Girando la Ruleta Rápida...!' : `¡Girar Ruleta (${displayedStudents.length} en juego)!`}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleConfirmWinner}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-white font-black text-sm rounded-xl shadow-lg transition transform hover:scale-105 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>¡Jugar con {winner.name.split(' ')[0]}!</span>
                </button>

                {eligibleStudents.length > 1 && (
                  <button
                    onClick={handleSpinAgain}
                    disabled={isSpinning}
                    className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs rounded-xl border border-gray-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Sortear siguiente ({eligibleStudents.length - 1} restantes)</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
