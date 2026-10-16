import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  HelpCircle, 
  Award, 
  Eye, 
  EyeOff, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw,
  BookOpen,
  Edit3,
  ListFilter
} from 'lucide-react';
import { tts } from '../utils/tts';
import { sounds } from '../utils/soundEffects';

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLocked = false,
  showNextButton = false,
  onNext,
  activeStudent,
  onRegenerateQuestion,
  isRegenerating = false
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [studentDraft, setStudentDraft] = useState('');

  // Reset internal state when a new question arrives with a different ID
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setShowModelAnswer(false);
    setStudentDraft('');
  }, [question?.id]);

  if (!question) return null;

  const handleSpeak = (textToSpeak) => {
    if (!textToSpeak) return;
    setIsSpeaking(true);
    sounds.playChips();
    tts.speak(textToSpeak, {
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  // Multiple choice selection
  const handleSelect = (option) => {
    if (hasAnswered || isLocked) return;

    setSelectedOption(option);
    setHasAnswered(true);

    const isCorrect = option === question.correctAnswer;
    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    if (onAnswer) {
      onAnswer(isCorrect, option, question);
    }
  };

  // Teacher oral or open grading (✅ / ❌)
  const handleTeacherGrade = (isCorrect) => {
    if (hasAnswered || isLocked) return;

    setHasAnswered(true);
    setSelectedOption(isCorrect ? (question.correctAnswer || 'Correcto') : 'Incorrecto');

    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    if (onAnswer) {
      onAnswer(isCorrect, isCorrect ? (question.correctAnswer || 'oral_pass') : 'oral_fail', question);
    }
  };

  const isConceptType = question.type === 'concept';
  const isExampleType = question.type === 'example';
  const hasOptions = Array.isArray(question.options) && question.options.length >= 2;
  const isMultipleChoice = question.type === 'multiple_choice' || hasOptions;
  const isOpenChallenge = isConceptType || isExampleType || !hasOptions;

  const isCorrectAnswer = selectedOption === question.correctAnswer || selectedOption === 'Correcto';

  // Badge metadata
  let badgeIcon = <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
  let badgeText = question.category || 'Reto de Inglés';
  let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

  if (isConceptType) {
    badgeIcon = <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
    badgeText = '📖 Concepto (Pregunta Abierta)';
    badgeColor = 'bg-purple-500/25 text-purple-300 border-purple-500/40';
  } else if (isExampleType) {
    badgeIcon = <Edit3 className="w-3.5 h-3.5 text-emerald-400" />;
    badgeText = '✍️ Dar un Ejemplo';
    badgeColor = 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40';
  } else if (isMultipleChoice) {
    badgeIcon = <ListFilter className="w-3.5 h-3.5 text-amber-400" />;
    badgeText = '📝 Opción Múltiple';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-black border-2 border-amber-500/50 rounded-3xl p-5 md:p-6 cabinet-3d-shadow relative overflow-hidden backdrop-blur-md animate-fadeIn">
      {/* Vegas Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-gray-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider flex items-center gap-1.5 ${badgeColor}`}>
            {badgeIcon}
            {badgeText}
          </span>
          {questionNumber && (
            <span className="text-xs text-gray-400 font-medium">
              Pregunta {questionNumber} / {totalQuestions || '?'}
            </span>
          )}
          {activeStudent && (
            <span className="text-xs bg-purple-950/80 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-bold">
              👤 Responde: {activeStudent.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Turn Regenerate Button */}
          {onRegenerateQuestion && !hasAnswered && (
            <button
              type="button"
              onClick={onRegenerateQuestion}
              disabled={isRegenerating || isLocked}
              className="px-2.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Generar otra pregunta con Groq IA para este alumno"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-300 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRegenerating ? 'Generando...' : '⚡ Otra Pregunta IA'}</span>
            </button>
          )}

          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            +{question.points || 200} Fichas
          </span>

          {/* TTS Listen Button */}
          <button
            onClick={() => handleSpeak(question.question)}
            title="Escuchar pronunciación (TTS)"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
              isSpeaking
                ? 'bg-amber-500 text-gray-950 scale-105 shadow-lg shadow-amber-500/40 animate-pulse'
                : 'bg-gray-800 hover:bg-gray-700 text-amber-300 hover:text-amber-200 border border-amber-500/30'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">Escuchar</span>
          </button>
        </div>
      </div>

      {/* Prompt Instructions Banner */}
      {question.promptInstructions && (
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-medium flex items-center gap-2">
          <span>💡 {question.promptInstructions}</span>
        </div>
      )}

      {/* Main Challenge Text */}
      <div className="my-3">
        <h3 className="text-lg md:text-xl font-bold text-white tracking-wide leading-relaxed bg-black/40 p-4 rounded-2xl border border-gray-800">
          {question.question}
        </h3>
      </div>

      {/* TYPE 1: Multiple Choice Grid (4 options A, B, C, D) */}
      {hasOptions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {question.options.map((opt, idx) => {
            let btnStyle = 'bg-gray-800/80 hover:bg-gray-750 text-gray-200 border-gray-700 hover:border-amber-500/50 shadow-[0_4px_0_#1e293b] hover:shadow-[0_6px_0_#1e293b] active:translate-y-1 active:shadow-none';
            let icon = null;

            if (hasAnswered) {
              if (opt === question.correctAnswer) {
                btnStyle = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 font-bold shadow-[0_4px_0_#065f46] scale-[1.01]';
                icon = <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
              } else if (opt === selectedOption) {
                btnStyle = 'bg-red-950/90 border-red-500 text-red-200 font-semibold shadow-[0_4px_0_#991b1b]';
                icon = <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
              } else {
                btnStyle = 'bg-gray-900/40 text-gray-500 border-gray-800 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                disabled={hasAnswered || isLocked}
                className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left group relative cursor-pointer disabled:cursor-default ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-black/40 border border-gray-700 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm md:text-base font-medium">{opt}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeak(opt);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:scale-110 p-1 text-gray-400 hover:text-amber-300 transition-opacity"
                    title="Pronunciar opción"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  {icon}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* TYPE 2 & 3: Open Concept / Example Drafting Area (Optional Student Input) */}
      {isOpenChallenge && !hasAnswered && (
        <div className="mt-3 p-3.5 bg-black/50 border border-gray-800 rounded-2xl space-y-2">
          <label className="block text-xs font-semibold text-gray-300">
            {isExampleType 
              ? '✍️ Escribe tu oración de ejemplo (o explícala en voz alta al docente):' 
              : '📖 Espacio para redactar tu explicación o notas (opcional):'}
          </label>
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={studentDraft}
              onChange={(e) => setStudentDraft(e.target.value)}
              placeholder={isExampleType ? "ej. If I won the lottery, I would buy a house..." : "Explica aquí tu respuesta..."}
              className="w-full bg-gray-900 border border-gray-700 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
            />
            {studentDraft.trim() && (
              <button
                type="button"
                onClick={() => handleSpeak(studentDraft)}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl border border-amber-500/30 text-xs font-bold self-end transition cursor-pointer"
                title="Pronunciar mi texto"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Teacher Evaluation & Model Answer Bar (For Open questions & Oral grading) */}
      {(!hasAnswered || isOpenChallenge) && (
        <div className="mt-5 p-4 rounded-2xl bg-black/40 border border-gray-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <span>👨‍🏫</span> Evaluación del Docente en Clase:
            </span>

            {/* Toggle Model Answer Button */}
            {(question.modelAnswer || question.correctAnswer) && (
              <button
                type="button"
                onClick={() => setShowModelAnswer(!showModelAnswer)}
                className="px-3 py-1 rounded-xl bg-gray-800 hover:bg-gray-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition border border-gray-700 cursor-pointer"
              >
                {showModelAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showModelAnswer ? 'Ocultar Solución Modelo' : '👁️ Ver Solución / Ejemplo Modelo'}
              </button>
            )}
          </div>

          {/* Model Answer Preview Box */}
          {showModelAnswer && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-400">
                  {isExampleType ? 'Oración / Ejemplo Esperado:' : 'Explicación / Respuesta Modelo:'}
                </p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  "{question.modelAnswer || question.correctAnswer}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSpeak(question.modelAnswer || question.correctAnswer)}
                className="p-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-lg transition cursor-pointer"
                title="Escuchar modelo"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Teacher Grade Buttons */}
          {!hasAnswered && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleTeacherGrade(true)}
                disabled={isLocked}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>✅ Correcto / Válido (+{question.points || 200})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTeacherGrade(false)}
                disabled={isLocked}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <ThumbsDown className="w-4 h-4" />
                <span>❌ Incorrecto</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Explanation Box (Visible after answering, remains stable) */}
      {hasAnswered && question.explanation && (
        <div className={`mt-4 p-4 rounded-xl border animate-fadeIn text-sm ${
          isCorrectAnswer 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-start gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wider mb-1 text-amber-300">
                {isCorrectAnswer ? '🎯 ¡Excelente trabajo!' : '💡 Regla y Explicación:'}
              </p>
              <p className="text-xs md:text-sm leading-relaxed text-gray-200">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Optional Next Button */}
      {hasAnswered && showNextButton && onNext && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Siguiente Reto →
          </button>
        </div>
      )}
    </div>
  );
}
