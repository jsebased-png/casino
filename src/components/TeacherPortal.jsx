import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Play, 
  Key, 
  Layers, 
  Check, 
  BookOpen, 
  Users, 
  School, 
  FileQuestion,
  Calendar,
  History,
  RotateCcw,
  Edit2,
  Eye,
  Flame
} from 'lucide-react';
import { generateEnglishQuiz, generateSingleTurnQuestion, GROQ_MODELS, CHALLENGE_TYPES } from '../services/groqService';
import { saveActivity, deleteActivity, generateGamePin } from '../services/firebaseService';
import { sounds } from '../utils/soundEffects';

const GAME_TYPES = [
  { id: 'all', name: 'Todas las Máquinas (Elección en Sala)' },
  { id: 'slots', name: '🎰 Lucky Slots' },
  { id: 'roulette', name: '🎡 Ruleta Vegas (37 Números)' },
  { id: 'blackjack', name: '🃏 21 Blackjack' },
  { id: 'plinko', name: '🟢 Plinko Pyramid' },
  { id: 'crash', name: '🚀 Lucky Rocket (Crash)' },
  { id: 'mines', name: '💣 Casino Mines (5×5)' }
];

const AVATARS = ['🎩', '👑', '🍀', '🦊', '🤖', '💎', '🎲', '🦁', '⭐', '🚀', '🎯', '🐯', '⚡', '🌸', '🐬'];

export default function TeacherPortal({
  groqApiKey,
  activities,
  onActivitySaved,
  onPlayActivity,
  onOpenSettings,
  classrooms = [],
  activeClassroomId,
  onSelectClassroom,
  onCreateClassroom,
  onDeleteClassroom,
  students = [],
  onUpdateStudents,
  activeSession,
  onUpdateActiveSession,
  onSaveSessionToHistory,
  sessionsHistory = [],
  onDeleteSessionFromHistory,
  onOpenRosterModal
}) {
  const currentClassroom = classrooms.find(c => c.id === activeClassroomId) || classrooms[0] || { id: 'default', name: 'Salón', students: [] };
  const [activeTab, setActiveTab] = useState('session'); // 'session' | 'history' | 'classrooms' | 'create' | 'activities'

  // AI Generator Form State
  const [topic, setTopic] = useState(activeSession?.topic || 'Past Simple & Irregular Verbs');
  const [level, setLevel] = useState(activeSession?.level || 'B1');
  const [gameType, setGameType] = useState('all');
  const [challengeType, setChallengeType] = useState(activeSession?.challengeType || 'random');
  const [questionCount, setQuestionCount] = useState(6);
  const [model, setModel] = useState('openai/gpt-oss-120b');
  const [customInstructions, setCustomInstructions] = useState(activeSession?.customNotes || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Single turn test generator state
  const [testQuestion, setTestQuestion] = useState(null);
  const [isGeneratingTestQ, setIsGeneratingTestQ] = useState(false);

  // Current Activity under creation/editing
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [questions, setQuestions] = useState([]);
  const [generatedPin, setGeneratedPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Classrooms management tab local state
  const [newClassroomName, setNewClassroomName] = useState('');
  const [singleStudentName, setSingleStudentName] = useState('');
  const [bulkStudentsText, setBulkStudentsText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingStudentName, setEditingStudentName] = useState('');

  // Multi-topic management for Session
  const [newTopicInput, setNewTopicInput] = useState('');

  const PRESET_TOPICS = [
    'Past Simple',
    'Present Perfect',
    'Conditionals (0, 1st, 2nd)',
    'Passive Voice',
    'Modal Verbs',
    'Phrasal Verbs',
    'Irregular Verbs',
    'Food & Restaurant',
    'Travel & Directions',
    'Daily Routines'
  ];

  const getSessionTopics = () => {
    if (Array.isArray(activeSession?.topics) && activeSession.topics.length > 0) {
      return activeSession.topics;
    }
    if (activeSession?.topic) {
      return activeSession.topic.split(',').map(t => t.trim()).filter(Boolean);
    }
    return ['Past Simple & Irregular Verbs'];
  };

  const handleAddTopicToSession = (topicName) => {
    const trimmed = (topicName || '').trim();
    if (!trimmed) return;
    const current = getSessionTopics();
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      if (onUpdateActiveSession) {
        onUpdateActiveSession({
          ...activeSession,
          topics: updated,
          topic: updated.join(', ')
        });
      }
    }
    setNewTopicInput('');
  };

  const handleRemoveTopicFromSession = (topicToRemove) => {
    const current = getSessionTopics();
    const updated = current.filter(t => t !== topicToRemove);
    if (onUpdateActiveSession) {
      onUpdateActiveSession({
        ...activeSession,
        topics: updated,
        topic: updated.join(', ')
      });
    }
  };

  const handleToggleTopicPreset = (preset) => {
    const current = getSessionTopics();
    if (current.includes(preset)) {
      handleRemoveTopicFromSession(preset);
    } else {
      handleAddTopicToSession(preset);
    }
  };

  // Selected session to inspect from history
  const [inspectingSession, setInspectingSession] = useState(null);

  // Handle Generate with Groq AI (Multi-question pack)
  const handleGenerateAI = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      alert('Por favor ingresa un tema para la actividad de inglés.');
      return;
    }

    if (!groqApiKey) {
      setAiError('Por favor configura tu Groq API Key primero en Ajustes.');
      onOpenSettings();
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    sounds.playChips();

    try {
      const result = await generateEnglishQuiz({
        apiKey: groqApiKey,
        topic,
        level,
        questionCount: Number(questionCount),
        gameType,
        challengeType,
        model,
        customInstructions
      });

      setActivityTitle(result.title || `Vegas ${topic} Challenge`);
      setActivityDesc(result.description || `Práctica de ${topic} con juegos de casino.`);
      setQuestions(result.questions || []);
      setGeneratedPin(generateGamePin());
      sounds.playJackpot();
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'Error al generar actividad con Groq.');
      sounds.playWrong();
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate single test turn question
  const handleGenerateTestTurn = async () => {
    if (!groqApiKey) {
      alert('Por favor configura tu Groq API Key en Ajustes primero.');
      onOpenSettings();
      return;
    }

    setIsGeneratingTestQ(true);
    setTestQuestion(null);
    sounds.playChips();

    try {
      const q = await generateSingleTurnQuestion({
        apiKey: groqApiKey,
        topic: activeSession?.topic || topic,
        level: activeSession?.level || level,
        challengeType: activeSession?.challengeType || challengeType,
        studentName: 'Alumno de Prueba',
        model,
        customInstructions: activeSession?.customNotes || customInstructions
      });
      setTestQuestion(q);
      sounds.playJackpot();
    } catch (err) {
      alert(err.message || 'Error al generar pregunta de prueba.');
    } finally {
      setIsGeneratingTestQ(false);
    }
  };

  // Add a manual question
  const handleAddQuestion = () => {
    const newQ = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      question: '',
      promptInstructions: 'Responde la pregunta o di la frase en voz alta.',
      options: ['', '', '', ''],
      correctAnswer: '',
      modelAnswer: '',
      explanation: '',
      category: 'Grammar',
      points: 200
    };
    setQuestions([...questions, newQ]);
    sounds.playTick();
  };

  const handleUpdateQuestion = (qIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex][field] = value;
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    const oldVal = updated[qIndex].options[optIndex];
    updated[qIndex].options[optIndex] = value;
    if (updated[qIndex].correctAnswer === oldVal) {
      updated[qIndex].correctAnswer = value;
    }
    setQuestions(updated);
  };

  const handleDeleteQuestion = (qIndex) => {
    const updated = questions.filter((_, idx) => idx !== qIndex);
    setQuestions(updated);
    sounds.playTick();
  };

  // Save full activity
  const handleSaveActivity = async () => {
    if (!activityTitle.trim()) {
      alert('Por favor asigna un título a la actividad.');
      return;
    }

    if (questions.length === 0) {
      alert('Por favor agrega al menos una pregunta o genera con la IA.');
      return;
    }

    setIsSaving(true);
    sounds.playChips();

    try {
      const pin = generatedPin || generateGamePin();
      const activityData = {
        title: activityTitle,
        description: activityDesc,
        level,
        category: topic || 'English Challenge',
        gameType,
        challengeType,
        pin,
        questions,
        createdAt: Date.now()
      };

      const saved = await saveActivity(activityData);
      setGeneratedPin(saved.pin || pin);
      setSaveSuccess(true);
      sounds.playJackpot();

      if (onActivitySaved) {
        onActivitySaved(saved);
      }

      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Error guardando la actividad: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;
    try {
      await deleteActivity(activityId);
      sounds.playTick();
      if (onActivitySaved) {
        onActivitySaved();
      }
    } catch (err) {
      alert('Error eliminando la actividad: ' + err.message);
    }
  };

  // Classroom Management Methods
  const handleCreateClassroomSubmit = (e) => {
    e.preventDefault();
    if (!newClassroomName.trim()) return;
    if (onCreateClassroom) {
      onCreateClassroom(newClassroomName.trim());
      setNewClassroomName('');
      sounds.playChips();
    }
  };

  const handleAddSingleStudent = (e) => {
    e.preventDefault();
    if (!singleStudentName.trim()) return;

    const newStudent = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: singleStudentName.trim(),
      avatar: AVATARS[students.length % AVATARS.length],
      chips: 1000,
      correctAnswers: 0,
      totalQuestions: 0,
      exoneratedCount: 0
    };

    onUpdateStudents([...students, newStudent]);
    setSingleStudentName('');
    sounds.playChips();
  };

  const handleAddBulkStudents = () => {
    if (!bulkStudentsText.trim()) return;

    const names = bulkStudentsText
      .split(/[\n,;]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) return;

    const newStudents = names.map((name, idx) => ({
      id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      avatar: AVATARS[(students.length + idx) % AVATARS.length],
      chips: 1000,
      correctAnswers: 0,
      totalQuestions: 0,
      exoneratedCount: 0
    }));

    onUpdateStudents([...students, ...newStudents]);
    setBulkStudentsText('');
    setShowBulkInput(false);
    sounds.playJackpot();
  };

  const handleSaveStudentEdit = (id) => {
    if (!editingStudentName.trim()) return;
    const updated = students.map(s => s.id === id ? { ...s, name: editingStudentName.trim() } : s);
    onUpdateStudents(updated);
    setEditingStudentId(null);
    sounds.playTick();
  };

  const handleRemoveStudent = (id) => {
    if (confirm('¿Eliminar este estudiante?')) {
      const updated = students.filter(s => s.id !== id);
      onUpdateStudents(updated);
      sounds.playTick();
    }
  };

  const handleResetChips = () => {
    if (confirm(`¿Reiniciar fichas a 1,000 para todos los alumnos de "${currentClassroom?.name}"?`)) {
      const updated = students.map(s => ({ ...s, chips: 1000 }));
      onUpdateStudents(updated);
      sounds.playCoin();
    }
  };

  // Active Session stats calculation
  const sessionTurns = activeSession?.turns || [];
  const totalTurns = sessionTurns.length;
  const exoneratedTurns = sessionTurns.filter(t => t.outcome === 'exonerated_by_luck').length;
  const correctTurns = sessionTurns.filter(t => t.outcome === 'answered_correct').length;
  const wrongTurns = sessionTurns.filter(t => t.outcome === 'answered_wrong').length;
  const challengedTurns = correctTurns + wrongTurns;
  const accuracyPct = challengedTurns > 0 ? Math.round((correctTurns / challengedTurns) * 100) : 0;
  const exoneratedPct = totalTurns > 0 ? Math.round((exoneratedTurns / totalTurns) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-fadeIn space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <School className="w-3.5 h-3.5 text-amber-400" />
            Panel Docente • Salones, Sesiones Diarias & Groq IA
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            Gestión Académica & Casino
            <span className="text-xs bg-purple-950/80 text-purple-300 border border-purple-500/40 px-3 py-1 rounded-full font-bold">
              🏫 {currentClassroom?.name || 'Salón Activo'}
            </span>
          </h2>
          <p className="text-xs text-gray-400">
            Control de salones, historial de sesiones diarias por fecha y generación de preguntas por turno
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-gray-800">
          <button
            onClick={() => setActiveTab('session')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'session'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" /> Sesión Diaria
          </button>

          <button
            onClick={() => setActiveTab('classrooms')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'classrooms'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Users className="w-4 h-4" /> Salones & Alumnos ({students.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <History className="w-4 h-4" /> Historial ({sessionsHistory.length})
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Generador IA
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'activities'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-black'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Layers className="w-4 h-4" /> Actividades ({activities.length})
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SESIÓN DIARIA ACTIVA (Configurar tema, variantes, turnos) */}
      {/* ======================================================== */}
      {activeTab === 'session' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Active Session Configuration Card */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/40 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Configuración de la Sesión Diaria en Vivo
                  </h3>
                  <p className="text-xs text-gray-400">
                    Fecha: <strong className="text-amber-300">{activeSession?.date || 'Hoy'}</strong> • Salón: <strong className="text-white">{currentClassroom?.name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (onSaveSessionToHistory) {
                      onSaveSessionToHistory();
                      sounds.playJackpot();
                      alert('¡Sesión guardada exitosamente en el Historial!');
                    }
                  }}
                  disabled={sessionTurns.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Guardar el registro de turnos de hoy en el historial permanente"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar y Cerrar Sesión en Historial</span>
                </button>
              </div>
            </div>

            {/* Session Settings Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Salon Switcher */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Salón Asignado a la Sesión
                </label>
                <select
                  value={activeClassroomId}
                  onChange={(e) => {
                    if (onSelectClassroom) onSelectClassroom(e.target.value);
                  }}
                  className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none"
                >
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>
                      🏫 {c.name} ({c.students?.length || 0} alumnos)
                    </option>
                  ))}
                </select>
              </div>

              {/* CEFR Level */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Nivel CEFR
                </label>
                <select
                  value={activeSession?.level || 'B1'}
                  onChange={(e) => {
                    if (onUpdateActiveSession) {
                      onUpdateActiveSession({ ...activeSession, level: e.target.value });
                    }
                  }}
                  className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="A1">A1 Beginner</option>
                  <option value="A2">A2 Elementary</option>
                  <option value="B1">B1 Intermediate</option>
                  <option value="B2">B2 Upper Intermediate</option>
                  <option value="C1">C1 Advanced</option>
                </select>
              </div>

              {/* Challenge Type / Variantes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  Formato Pedagógico de las Preguntas en Pérdida
                </label>
                <select
                  value={activeSession?.challengeType || 'random'}
                  onChange={(e) => {
                    if (onUpdateActiveSession) {
                      onUpdateActiveSession({ ...activeSession, challengeType: e.target.value });
                    }
                  }}
                  className="w-full bg-black/60 border border-amber-500/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none"
                >
                  {CHALLENGE_TYPES.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.name} — {ct.desc}</option>
                  ))}
                </select>
              </div>

              {/* Multi-Topic Section for Session */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-black/40 border border-amber-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-amber-300">
                      🎯 Temas de la Sesión para Generación con IA (Uno o Varios) *
                    </label>
                    <p className="text-[11px] text-gray-400">
                      Si el alumno pierde en un juego, Groq IA generará automáticamente preguntas rotando entre estos temas.
                    </p>
                  </div>
                  <span className="text-xs bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    {getSessionTopics().length} tema(s) configurado(s)
                  </span>
                </div>

                {/* Selected Topics Chips */}
                <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-slate-950/80 rounded-xl border border-gray-800">
                  {getSessionTopics().map((tName, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-200 border border-amber-500/50 text-xs font-bold shadow-sm"
                    >
                      <span>📚 {tName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTopicFromSession(tName)}
                        className="text-amber-400 hover:text-red-400 font-black ml-0.5 cursor-pointer"
                        title="Quitar tema"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {getSessionTopics().length === 0 && (
                    <span className="text-xs text-gray-500 italic p-1">
                      No has seleccionado ningún tema. Agrega uno abajo o usa los botones rápidos.
                    </span>
                  )}
                </div>

                {/* Custom Topic Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTopicInput}
                    onChange={(e) => setNewTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTopicToSession(newTopicInput);
                      }
                    }}
                    placeholder="Escribe un tema específico (ej. Third Conditional, Phrasal Verbs with 'Get', Hotel Vocabulary)..."
                    className="flex-1 bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTopicToSession(newTopicInput)}
                    disabled={!newTopicInput.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>

                {/* Quick Presets Bar */}
                <div>
                  <span className="block text-[11px] font-bold text-gray-400 mb-1.5">
                    ⚡ Selección rápida de temas frecuentes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TOPICS.map((preset) => {
                      const isSelected = getSessionTopics().includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleToggleTopicPreset(preset)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500 text-black border-amber-300 shadow-md font-black'
                              : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-700'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom Teacher Guidance */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Instrucciones o Enfoque Especial del Docente para la IA (Opcional):
                </label>
                <input
                  type="text"
                  value={activeSession?.customNotes || ''}
                  onChange={(e) => {
                    if (onUpdateActiveSession) {
                      onUpdateActiveSession({ ...activeSession, customNotes: e.target.value });
                    }
                  }}
                  placeholder="ej. Enfatizar el uso de 'while' y 'when', incluir verbos de movimiento, evaluar pronunciación en voz alta..."
                  className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Test Generation Preview */}
            <div className="mt-4 pt-3 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-gray-400">
                Estas variables gobernarán las preguntas que se generen en cada turno durante el juego.
              </span>

              <button
                type="button"
                onClick={handleGenerateTestTurn}
                disabled={isGeneratingTestQ}
                className="px-4 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isGeneratingTestQ ? 'animate-spin' : ''}`} />
                <span>{isGeneratingTestQ ? 'Consultando a Groq IA...' : '⚡ Probar Pregunta IA de Turno'}</span>
              </button>
            </div>

            {/* Test Question Display */}
            {testQuestion && (
              <div className="mt-4 p-4 bg-black/60 border border-purple-500/50 rounded-2xl animate-fadeIn space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
                    Vista Previa de Pregunta de Turno (Groq IA)
                  </span>
                  <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    Tipo: {testQuestion.type}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{testQuestion.question}</h4>
                {testQuestion.promptInstructions && (
                  <p className="text-xs text-amber-300">💡 {testQuestion.promptInstructions}</p>
                )}
                {testQuestion.modelAnswer && (
                  <p className="text-xs text-emerald-400 font-semibold">
                    ✓ Respuesta Modelo: "{testQuestion.modelAnswer}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Real-time Session Live Stats & Logs */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  Registro en Vivo de Turnos de Hoy ({totalTurns})
                </h3>
                <p className="text-xs text-gray-400">
                  Cada vez que un alumno juega en la pantalla, su resultado y fichas se registran aquí automáticamente.
                </p>
              </div>

              {/* Quick KPI Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-purple-950/80 text-purple-200 border border-purple-500/40 text-xs font-bold">
                  🎲 {exoneratedTurns} Exonerados por Suerte ({exoneratedPct}%)
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-200 border border-emerald-500/40 text-xs font-bold">
                  🎯 {correctTurns} Aciertos en Reto ({accuracyPct}%)
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-red-950/80 text-red-200 border border-red-500/40 text-xs font-bold">
                  ❌ {wrongTurns} Fallos
                </span>
              </div>
            </div>

            {/* Turn Log Table */}
            {sessionTurns.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-2xl">
                <Play className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-300">Aún no hay turnos registrados en esta sesión.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Pasa a la Sala Principal, sortea un alumno y tira en cualquier máquina para ver los datos en vivo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/60 text-gray-400 uppercase text-[10px] border-b border-gray-800">
                    <tr>
                      <th className="p-3">Hora</th>
                      <th className="p-3">Estudiante</th>
                      <th className="p-3">Máquina</th>
                      <th className="p-3">Apuesta</th>
                      <th className="p-3">Resultado</th>
                      <th className="p-3">Fichas</th>
                      <th className="p-3">Pregunta / Reto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-medium">
                    {[...sessionTurns].reverse().map((t, idx) => {
                      let badge = null;
                      if (t.outcome === 'exonerated_by_luck') {
                        badge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🌟 Exonerado x Suerte
                          </span>
                        );
                      } else if (t.outcome === 'answered_correct') {
                        badge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🎯 Reto Acertado
                          </span>
                        );
                      } else {
                        badge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/40">
                            ❌ Reto Fallado
                          </span>
                        );
                      }

                      return (
                        <tr key={t.id || idx} className="hover:bg-white/5 transition">
                          <td className="p-3 font-mono text-gray-400">{t.timestamp}</td>
                          <td className="p-3 text-white font-bold flex items-center gap-1.5">
                            <span>{t.studentAvatar || '👤'}</span>
                            <span>{t.studentName}</span>
                          </td>
                          <td className="p-3 uppercase text-gray-300 font-mono text-[11px]">{t.machine}</td>
                          <td className="p-3 font-mono">{t.bet}</td>
                          <td className="p-3">{badge}</td>
                          <td className="p-3 font-bold font-mono">
                            <span className={t.chipsDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {t.chipsDelta >= 0 ? `+${t.chipsDelta}` : t.chipsDelta}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300 max-w-xs truncate" title={t.question}>
                            {t.question || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: HISTORIAL DE SESIONES PASADAS (Registro persistente) */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                Historial Permanente de Sesiones ({sessionsHistory.length})
              </h3>
              <p className="text-xs text-gray-400">
                Consulta los resultados pedagógicos, temas abordados y estadísticas de sesiones anteriores
              </p>
            </div>
          </div>

          {sessionsHistory.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-3xl bg-black/30">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-300">No hay sesiones archivadas todavía.</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Cuando finalices una clase en la pestaña "Sesión Diaria", presiona "Guardar y Cerrar Sesión" para archivarla aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessionsHistory.map((sess) => {
                const turns = sess.turns || [];
                const exonerated = turns.filter(t => t.outcome === 'exonerated_by_luck').length;
                const correct = turns.filter(t => t.outcome === 'answered_correct').length;
                const challenged = turns.filter(t => t.outcome !== 'exonerated_by_luck').length;
                const acc = challenged > 0 ? Math.round((correct / challenged) * 100) : 0;

                return (
                  <div
                    key={sess.id}
                    className="bg-black/50 border border-gray-800 hover:border-amber-500/50 rounded-3xl p-5 shadow-xl transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          📅 {sess.date}
                        </span>
                        <span className="text-xs font-bold text-purple-300">
                          🏫 {sess.classroomName || 'Salón'}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-white mb-1">
                        {sess.topic || 'Inglés General'}
                      </h4>

                      <div className="flex flex-wrap gap-2 my-3 text-xs">
                        <span className="bg-gray-800/80 px-2.5 py-1 rounded-xl text-gray-300 font-mono">
                          Nivel: {sess.level || 'B1'}
                        </span>
                        <span className="bg-gray-800/80 px-2.5 py-1 rounded-xl text-gray-300 font-mono">
                          {turns.length} Turnos
                        </span>
                        <span className="bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-xl text-amber-300 font-bold">
                          🌟 {exonerated} Exonerados
                        </span>
                        <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-emerald-300 font-bold">
                          🎯 {acc}% Aciertos
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                      <button
                        onClick={() => setInspectingSession(inspectingSession?.id === sess.id ? null : sess)}
                        className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {inspectingSession?.id === sess.id ? 'Ocultar Detalle' : 'Ver Turnos Detallados'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onUpdateActiveSession) {
                              onUpdateActiveSession({
                                ...activeSession,
                                topic: sess.topic,
                                level: sess.level,
                                challengeType: sess.challengeType,
                                customNotes: sess.customNotes
                              });
                              setActiveTab('session');
                              sounds.playTick();
                            }
                          }}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                          title="Cargar este tema a la sesión activa"
                        >
                          Reanudar Tema
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar este registro del historial?')) {
                              if (onDeleteSessionFromHistory) onDeleteSessionFromHistory(sess.id);
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition cursor-pointer"
                          title="Eliminar sesión"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inspected Session Turn Detail Drawer */}
                    {inspectingSession?.id === sess.id && (
                      <div className="mt-4 pt-3 border-t border-gray-800 max-h-60 overflow-y-auto space-y-1.5 animate-fadeIn">
                        <h5 className="text-[11px] font-bold uppercase text-gray-400 mb-1">Turnos de esta sesión:</h5>
                        {turns.map((t, tIdx) => (
                          <div key={tIdx} className="p-2 bg-black/60 rounded-xl text-xs flex items-center justify-between gap-2">
                            <span className="font-bold text-white flex items-center gap-1">
                              {t.studentAvatar || '👤'} {t.studentName}
                            </span>
                            <span className="text-gray-400 font-mono text-[10px]">{t.machine}</span>
                            <span className={t.outcome === 'exonerated_by_luck' ? 'text-amber-300 font-bold' : t.outcome === 'answered_correct' ? 'text-emerald-400' : 'text-red-400'}>
                              {t.outcome === 'exonerated_by_luck' ? '🌟 Exonerado' : t.outcome === 'answered_correct' ? '🎯 Acertó' : '❌ Falló'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GESTIÓN DE SALONES Y ALUMNOS */}
      {/* ======================================================== */}
      {activeTab === 'classrooms' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Classrooms Manager Bar */}
          <div className="bg-gradient-to-r from-gray-900 to-black border-2 border-purple-500/50 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <School className="w-5 h-5 text-purple-400" />
                  Salones de Clase Registrados
                </h3>
                <p className="text-xs text-gray-400">
                  Crea salones para tus diferentes grupos o cursos y gestiona sus alumnos
                </p>
              </div>

              {/* Create Classroom Form */}
              <form onSubmit={handleCreateClassroomSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  placeholder="Nombre de nuevo salón (ej. 10-A, 11-B)..."
                  className="bg-black/60 border border-gray-700 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear Salón
                </button>
              </form>
            </div>

            {/* Classroom Pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
              {classrooms.map((c) => {
                const isSelected = c.id === activeClassroomId;
                return (
                  <div key={c.id} className="flex items-center">
                    <button
                      onClick={() => {
                        sounds.playTick();
                        if (onSelectClassroom) onSelectClassroom(c.id);
                      }}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 scale-105 font-black'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      <span>🏫 {c.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/40 text-purple-200">
                        {c.students?.length || 0} alumnos
                      </span>
                    </button>

                    {classrooms.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el salón "${c.name}" y todos sus alumnos?`)) {
                            if (onDeleteClassroom) onDeleteClassroom(c.id);
                          }
                        }}
                        className="ml-1 p-1 text-gray-600 hover:text-red-400 transition cursor-pointer"
                        title="Eliminar este salón"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Students Roster & Editor for Current Classroom */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-3">
              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Alumnos de <span className="text-amber-300">{currentClassroom?.name}</span> ({students.length})
                </h4>
                <p className="text-xs text-gray-400">
                  Agrega nuevos estudiantes, edita nombres o consulta sus estadísticas acumuladas
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkInput(!showBulkInput)}
                  className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {showBulkInput ? '← Agregar Individual' : '📋 Pegar Lista desde Excel'}
                </button>

                <button
                  onClick={handleResetChips}
                  className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reiniciar Fichas a 1,000
                </button>
              </div>
            </div>

            {/* Input: Single vs Bulk */}
            {!showBulkInput ? (
              <form onSubmit={handleAddSingleStudent} className="flex gap-2">
                <input
                  type="text"
                  value={singleStudentName}
                  onChange={(e) => setSingleStudentName(e.target.value)}
                  placeholder="Nombre del estudiante (ej. Valentina Ríos)..."
                  className="flex-1 bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Agregar Alumno
                </button>
              </form>
            ) : (
              <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-gray-800 animate-fadeIn">
                <label className="block text-xs font-bold text-gray-300">
                  Pega aquí los nombres de tus estudiantes (uno por línea o separados por comas):
                </label>
                <textarea
                  value={bulkStudentsText}
                  onChange={(e) => setBulkStudentsText(e.target.value)}
                  placeholder={`Carlos Gómez\nAna Morales\nMateo Silva\nValentina Ríos`}
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-amber-400 rounded-xl p-3 text-xs text-white focus:outline-none font-sans"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkInput(false)}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBulkStudents}
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs rounded-xl shadow hover:scale-105 transition cursor-pointer"
                  >
                    Importar Estudiantes
                  </button>
                </div>
              </div>
            )}

            {/* Students Table */}
            {students.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-2xl">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-300 text-sm font-semibold">No hay alumnos en este salón.</p>
                <p className="text-xs text-gray-500 mt-1">Escribe un nombre o pega la lista para comenzar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {students.map((student) => {
                  const isEditing = editingStudentId === student.id;

                  return (
                    <div
                      key={student.id}
                      className="p-3 rounded-2xl bg-black/50 border border-gray-800 hover:border-gray-700 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                        <span className="text-2xl">{student.avatar || '🎩'}</span>
                        <div className="overflow-hidden flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingStudentName}
                                onChange={(e) => setEditingStudentName(e.target.value)}
                                className="w-full bg-gray-900 border border-amber-400 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveStudentEdit(student.id)}
                                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h5 className="text-xs font-bold text-white truncate">{student.name}</h5>
                              <p className="text-[10px] text-gray-400 font-mono">
                                💰 {student.chips || 1000} fichas • {student.correctAnswers || 0} aciertos
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingStudentId(student.id);
                              setEditingStudentName(student.name);
                            }}
                            className="p-1 text-gray-500 hover:text-amber-400 transition cursor-pointer"
                            title="Editar nombre"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition cursor-pointer"
                          title="Eliminar alumno"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: GENERADOR DE BANCOS IA (GROQ) */}
      {/* ======================================================== */}
      {activeTab === 'create' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/40 border border-amber-500/40 rounded-3xl p-6 shadow-xl relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Generador de Paquetes de Preguntas con IA Groq
              </span>
              {!groqApiKey && (
                <button
                  onClick={onOpenSettings}
                  className="text-xs text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" /> Configurar Groq API Key
                </button>
              )}
            </div>

            {aiError && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200">
                {aiError}
              </div>
            )}

            <form onSubmit={handleGenerateAI} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Tema o Punto Gramatical en Inglés *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="ej. Past Simple & Irregular Verbs, Travel Vocabulary..."
                    className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">
                    Tipo de Ejercicio / Desafío:
                  </label>
                  <select
                    value={challengeType}
                    onChange={(e) => setChallengeType(e.target.value)}
                    className="w-full bg-black/60 border border-amber-500/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none"
                  >
                    {CHALLENGE_TYPES.map(ct => (
                      <option key={ct.id} value={ct.id}>{ct.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Nivel CEFR
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="A1">A1 Beginner</option>
                    <option value="A2">A2 Elementary</option>
                    <option value="B1">B1 Intermediate</option>
                    <option value="B2">B2 Upper Intermediate</option>
                    <option value="C1">C1 Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Máquina de Casino
                  </label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  >
                    {GAME_TYPES.map(gt => (
                      <option key={gt.id} value={gt.id}>{gt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Cantidad de Desafíos
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value={4}>4 Preguntas (Partida Rápida)</option>
                    <option value={6}>6 Preguntas (Estándar)</option>
                    <option value={8}>8 Preguntas (Extendido)</option>
                    <option value={10}>10 Preguntas (Gran Casino)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Modelo de Groq IA
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    {GROQ_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Instrucciones Especiales del Docente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="ej. Enfatizar verbos irregulares comunes, usar vocabulario de viajes..."
                    className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 text-gray-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Generando Actividad con Groq...' : '⚡ Generar Actividad con IA'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Activity Review & Manual Customization Section */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  Detalles y Desafíos de la Actividad ({questions.length})
                </h3>
                <p className="text-xs text-gray-400">
                  Revisa, personaliza o agrega preguntas antes de jugar en clase
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddQuestion}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar Desafío
                </button>

                <button
                  onClick={handleSaveActivity}
                  disabled={isSaving || questions.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Actividad'}
                </button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-bold rounded-xl animate-fadeIn flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                ¡Actividad guardada exitosamente! Ya está lista para ser jugada en el proyector.
              </div>
            )}

            {/* Title & Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Título de la Actividad
                </label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="ej. Las Vegas Irregular Verbs Jackpot"
                  className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Descripción o Instrucción
                </label>
                <input
                  type="text"
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  placeholder="ej. Practica el pasado simple y participios con la ruleta y las tragaperras"
                  className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-2xl">
                <FileQuestion className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-semibold mb-1">No hay preguntas cargadas todavía.</p>
                <p className="text-xs text-gray-500">
                  Usa el Generador de IA arriba o haz clic en "Agregar Desafío" para redactar manualmente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="bg-black/50 border border-gray-800 rounded-2xl p-4 relative group space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          #{qIdx + 1} Desafío
                        </span>

                        <select
                          value={q.type || 'multiple_choice'}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'type', e.target.value)}
                          className="bg-gray-900 border border-gray-700 text-xs text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400"
                        >
                          <option value="multiple_choice">📝 Opción Múltiple</option>
                          <option value="fill_blank">✏️ Completar Espacios</option>
                          <option value="sentence_affirmative">➕ Frase Afirmativa</option>
                          <option value="sentence_negative">➖ Frase Negativa</option>
                          <option value="sentence_question">❓ Formular Pregunta</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="text-gray-500 hover:text-red-400 p-1 transition cursor-pointer"
                        title="Eliminar desafío"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1">
                        Pregunta o Claves en Inglés:
                      </label>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'question', e.target.value)}
                        placeholder="ej. She ____ (go) to Paris last summer. O [we / visit / friends]"
                        className="w-full bg-gray-900 border border-gray-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1">
                        Instrucción para el Alumno (en español):
                      </label>
                      <input
                        type="text"
                        value={q.promptInstructions || ''}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'promptInstructions', e.target.value)}
                        placeholder="ej. Di en voz alta una oración afirmativa en pasado simple con:"
                        className="w-full bg-gray-900 border border-gray-700 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none"
                      />
                    </div>

                    {q.options && q.options.length >= 2 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2 bg-gray-900/60 p-2 rounded-xl border border-gray-800">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correctAnswer === opt && opt !== ''}
                              onChange={() => handleUpdateQuestion(qIdx, 'correctAnswer', opt)}
                              className="accent-emerald-500 cursor-pointer"
                              title="Marcar como respuesta correcta"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              placeholder={`Opción ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                          Respuesta / Frase Modelo Esperada:
                        </label>
                        <input
                          type="text"
                          value={q.modelAnswer || q.correctAnswer || ''}
                          onChange={(e) => {
                            handleUpdateQuestion(qIdx, 'modelAnswer', e.target.value);
                            handleUpdateQuestion(qIdx, 'correctAnswer', e.target.value);
                          }}
                          placeholder="ej. She went to Paris last summer."
                          className="w-full bg-emerald-950/30 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1">
                          Regla / Explicación Educativa:
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                          placeholder="ej. 'Go' es un verbo irregular cuyo pasado simple es 'went'."
                          className="w-full bg-gray-900 border border-gray-700 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: ACTIVIDADES DISPONIBLES */}
      {/* ======================================================== */}
      {activeTab === 'activities' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Actividades Disponibles</h3>
            <span className="text-xs text-gray-400">Total: {activities.length} actividades</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((act) => (
              <div
                key={act.id}
                className="bg-black/40 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Nivel {act.level || 'B1'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {act.questions?.length || 0} preguntas
                    </span>
                  </div>

                  <h4 className="text-base font-black text-white mb-1">{act.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">{act.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    Máquina: <strong>{act.gameType || 'Todas'}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPlayActivity && onPlayActivity(act)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs rounded-xl shadow transition hover:scale-105 cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" /> Jugar
                    </button>

                    <button
                      onClick={() => handleDeleteActivity(act.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition cursor-pointer"
                      title="Eliminar actividad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
