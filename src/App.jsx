import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StudentLobby from './components/StudentLobby';
import TeacherPortal from './components/TeacherPortal';
import LeaderboardModal from './components/LeaderboardModal';
import SettingsModal from './components/SettingsModal';
import ClassroomRosterModal from './components/ClassroomRosterModal';
import ClassroomTurnBar from './components/ClassroomTurnBar';
import StudentSpinnerModal from './components/StudentSpinnerModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import SlotsGame from './components/games/SlotsGame';
import RouletteGame from './components/games/RouletteGame';
import BlackjackGame from './components/games/BlackjackGame';
import PlinkoGame from './components/games/PlinkoGame';
import CrashRocketGame from './components/games/CrashRocketGame';
import MinesGame from './components/games/MinesGame';
import GameErrorBoundary from './components/GameErrorBoundary';

import { DEFAULT_ACTIVITIES } from './data/defaultActivities';
import { 
  getAllActivities, 
  submitScore 
} from './services/firebaseService';
import { getCurrentTeacher, logoutTeacher } from './services/authService';
import { generateSingleTurnQuestion } from './services/groqService';
import { sounds } from './utils/soundEffects';

const STORAGE_CHIPS_KEY = 'lucky_english_chips';
const STORAGE_GROQ_KEY = 'lucky_english_groq_key';
const STORAGE_CLASSROOMS_KEY = 'lucky_english_classrooms';
const STORAGE_ACTIVE_CLASSROOM_ID_KEY = 'lucky_english_active_classroom_id';
const STORAGE_ACTIVE_SESSION_KEY = 'lucky_english_active_session';
const STORAGE_SESSIONS_HISTORY_KEY = 'lucky_english_sessions_history';

const DEFAULT_INITIAL_CLASSROOMS = [
  {
    id: 'class_10a',
    name: 'Salón 10-A (Mañana)',
    students: [
      { id: 'std_1', name: 'Carlos Gómez', avatar: '🎩', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 },
      { id: 'std_2', name: 'Sofía Martínez', avatar: '👑', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 },
      { id: 'std_3', name: 'Mateo Silva', avatar: '🍀', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 },
      { id: 'std_4', name: 'Valentina Ríos', avatar: '💎', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 },
      { id: 'std_5', name: 'Lucas Herrera', avatar: '🚀', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 }
    ]
  },
  {
    id: 'class_10b',
    name: 'Salón 10-B (Tarde)',
    students: [
      { id: 'std_6', name: 'Camila Torres', avatar: '🌸', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 },
      { id: 'std_7', name: 'Nicolás Castro', avatar: '⚡', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 },
      { id: 'std_8', name: 'Isabella Moreno', avatar: '⭐', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 },
      { id: 'std_9', name: 'Daniel Pardo', avatar: '🦁', chips: 1000, correctAnswers: 0, totalQuestions: 0, exoneratedCount: 0 }
    ]
  }
];

function getInitialSession(classroomId, classroomName) {
  return {
    id: `sess_${Date.now()}`,
    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
    classroomId,
    classroomName,
    topics: ['Past Simple', 'Irregular Verbs'],
    topic: 'Past Simple, Irregular Verbs',
    level: 'B1',
    challengeType: 'random',
    customNotes: '',
    status: 'active',
    turns: [],
    completedStudentIds: []
  };
}

export default function App() {
  // App views: 'lobby' | 'teacher' | 'game'
  const [currentView, setCurrentView] = useState('lobby');

  // Player chips (pool / table)
  const [chips, setChips] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHIPS_KEY);
      const parsed = saved ? parseInt(saved, 10) : 1000;
      return Number.isFinite(parsed) ? parsed : 1000;
    } catch {
      return 1000;
    }
  });

  // Multiple Classrooms (Salones)
  const [classrooms, setClassrooms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CLASSROOMS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_INITIAL_CLASSROOMS;
    } catch {
      return DEFAULT_INITIAL_CLASSROOMS;
    }
  });

  const [activeClassroomId, setActiveClassroomId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE_CLASSROOM_ID_KEY);
    return saved || 'class_10a';
  });

  const activeClassroom = classrooms.find(c => c.id === activeClassroomId) || classrooms[0] || { id: 'default', name: 'Salón', students: [] };
  const students = activeClassroom.students || [];

  const [activeStudentIndex, setActiveStudentIndex] = useState(0);
  const [hasChosenTurnStudent, setHasChosenTurnStudent] = useState(false);
  const activeStudent = students.length > 0 ? (students[activeStudentIndex] || students[0]) : null;

  // Active Daily Session & Persistent History
  const [activeSession, setActiveSession] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not parse active session:', e);
    }
    return getInitialSession(activeClassroom.id, activeClassroom.name);
  });

  const [sessionsHistory, setSessionsHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isSpinnerOpen, setIsSpinnerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Teacher Authentication State
  const [currentTeacher, setCurrentTeacher] = useState(() => getCurrentTeacher());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState('');
  const [postAuthCallback, setPostAuthCallback] = useState(null);

  const handleRequireTeacherAuth = (reason = 'realizar esta acción', callback = null) => {
    if (currentTeacher) {
      if (callback) callback();
      return true;
    }
    setAuthPromptReason(reason);
    setPostAuthCallback(() => callback);
    setIsAuthModalOpen(true);
    return false;
  };

  const handleTeacherLoginSuccess = (teacherUser) => {
    setCurrentTeacher(teacherUser);
    if (postAuthCallback) {
      const cb = postAuthCallback;
      setPostAuthCallback(null);
      cb();
    }
  };

  const handleTeacherLogout = async () => {
    await logoutTeacher();
    setCurrentTeacher(null);
    if (currentView === 'teacher') {
      setCurrentView('lobby');
    }
  };

  // Settings & Configuration
  const [groqApiKey, setGroqApiKey] = useState(() => {
    return localStorage.getItem(STORAGE_GROQ_KEY) || import.meta.env.VITE_GROQ_API_KEY || '';
  });
  const [volume, setVolume] = useState(0.6);
  const [isMuted, setIsMuted] = useState(false);

  // Activities
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [currentActivity, setCurrentActivity] = useState(DEFAULT_ACTIVITIES[0]);
  const [activeGameMachine, setActiveGameMachine] = useState('slots'); // 'slots' | 'roulette' | 'blackjack'

  // Persist State
  useEffect(() => {
    localStorage.setItem(STORAGE_CHIPS_KEY, chips.toString());
  }, [chips]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CLASSROOMS_KEY, JSON.stringify(classrooms));
  }, [classrooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_CLASSROOM_ID_KEY, activeClassroomId);
  }, [activeClassroomId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, JSON.stringify(activeSession));
  }, [activeSession]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SESSIONS_HISTORY_KEY, JSON.stringify(sessionsHistory));
  }, [sessionsHistory]);

  // Ensure every calendar day begins with a completely fresh session (no leftover pending students)
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    if (activeSession?.date && activeSession.date !== todayStr) {
      const hadActivity = (activeSession?.turns || []).length > 0 || (activeSession?.completedStudentIds || []).length > 0;
      if (hadActivity) {
        const archivedSession = {
          ...activeSession,
          status: 'finished',
          finishedAt: Date.now()
        };
        setSessionsHistory(prev => [archivedSession, ...prev]);
      }
      const freshDay = getInitialSession(activeClassroom.id, activeClassroom.name);
      freshDay.completedStudentIds = [];
      setActiveSession(freshDay);
    }
  }, [activeClassroom.id, activeClassroom.name, activeSession]);

  // Turn Navigation
  const handleNextStudent = () => {
    if (students.length === 0) return;
    const completedIds = activeSession?.completedStudentIds || [];
    const pendingStudents = students.filter(s => !completedIds.includes(s.id));
    if (pendingStudents.length > 0) {
      const nextPending = pendingStudents[0];
      const nextIdx = students.findIndex(s => s.id === nextPending.id);
      setActiveStudentIndex(nextIdx !== -1 ? nextIdx : 0);
    } else {
      setActiveStudentIndex(prev => (prev + 1) % students.length);
    }
  };

  const handleRandomStudent = () => {
    if (students.length === 0) return;
    const randIdx = Math.floor(Math.random() * students.length);
    setActiveStudentIndex(randIdx);
  };

  // Classroom Management Handlers
  const handleSelectClassroom = (id) => {
    setActiveClassroomId(id);
    setActiveStudentIndex(0);
    setHasChosenTurnStudent(false);
    const targetC = classrooms.find(c => c.id === id);
    if (targetC && activeSession) {
      setActiveSession(prev => ({
        ...prev,
        classroomId: targetC.id,
        classroomName: targetC.name
      }));
    }
  };

  const handleCreateClassroom = (name) => {
    const newClass = {
      id: `class_${Date.now()}`,
      name,
      students: []
    };
    setClassrooms(prev => [...prev, newClass]);
    setActiveClassroomId(newClass.id);
    setActiveStudentIndex(0);
  };

  const handleDeleteClassroom = (id) => {
    if (classrooms.length <= 1) {
      alert('Debe quedar al menos un salón de clases.');
      return;
    }
    const updated = classrooms.filter(c => c.id !== id);
    setClassrooms(updated);
    if (activeClassroomId === id) {
      setActiveClassroomId(updated[0].id);
      setActiveStudentIndex(0);
    }
  };

  const handleUpdateStudents = (newStudentsList) => {
    setClassrooms(prev => prev.map(c => {
      if (c.id === activeClassroomId) {
        return { ...c, students: newStudentsList };
      }
      return c;
    }));

    if (activeStudentIndex >= newStudentsList.length) {
      setActiveStudentIndex(Math.max(0, newStudentsList.length - 1));
    }
  };

  // Record individual score & log turn into activeSession.turns
  const handleRecordStudentScore = (studentId, chipDelta, isCorrect, countAsQuestion, turnMeta = {}) => {
    // 1. Update student in classroom
    setClassrooms(prev => prev.map(c => {
      if (c.id === activeClassroomId) {
        return {
          ...c,
          students: c.students.map(s => {
            if (s.id === studentId) {
              const isExonerated = turnMeta.outcome === 'exonerated_by_luck';
              return {
                ...s,
                chips: Math.max(0, (s.chips || 1000) + chipDelta),
                correctAnswers: (s.correctAnswers || 0) + (isCorrect && countAsQuestion ? 1 : 0),
                totalQuestions: (s.totalQuestions || 0) + (countAsQuestion ? 1 : 0),
                exoneratedCount: (s.exoneratedCount || 0) + (isExonerated ? 1 : 0)
              };
            }
            return s;
          })
        };
      }
      return c;
    }));

    // 2. Append live turn log to activeSession
    const foundStudent = students.find(s => s.id === studentId);
    const newTurnLog = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      studentId,
      studentName: foundStudent?.name || 'Estudiante',
      studentAvatar: foundStudent?.avatar || '🎩',
      machine: turnMeta.machine || activeGameMachine,
      bet: turnMeta.bet || 50,
      outcome: turnMeta.outcome || (isCorrect ? 'answered_correct' : 'answered_wrong'),
      chipsDelta: chipDelta,
      question: turnMeta.question || null
    };

    setActiveSession(prev => {
      const existingCompleted = prev?.completedStudentIds || [];
      const updatedCompleted = existingCompleted.includes(studentId)
        ? existingCompleted
        : [...existingCompleted, studentId];
      return {
        ...prev,
        turns: [...(prev?.turns || []), newTurnLog],
        completedStudentIds: updatedCompleted
      };
    });
  };

  // Close daily session & reset participation list for fresh next day
  const handleCloseDailySession = () => {
    const totalStudentsInClass = students.length;
    const completedIds = activeSession?.completedStudentIds || [];
    const participatedCount = completedIds.length;
    const remainingCount = Math.max(0, totalStudentsInClass - participatedCount);
    const hasActivity = (activeSession?.turns || []).length > 0 || participatedCount > 0;

    const confirmMsg = remainingCount > 0
      ? `¿Deseas cerrar la sesión diaria del salón "${activeClassroom?.name}"?\n\n• Participaron hoy: ${participatedCount} de ${totalStudentsInClass} alumnos\n• Quedaron sin participar: ${remainingCount} alumnos\n\nLos alumnos restantes NO quedarán pendientes: la próxima sesión diaria comenzará 100% limpia con todos los alumnos disponibles.`
      : `¿Deseas cerrar y archivar la sesión diaria del salón "${activeClassroom?.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    if (activeSession && hasActivity) {
      const completedSession = {
        ...activeSession,
        status: 'finished',
        finishedAt: Date.now(),
        participatedCount,
        remainingCount,
        totalStudents: totalStudentsInClass
      };
      setSessionsHistory(prev => [completedSession, ...prev]);
    }

    // Start a fresh session: completedStudentIds is empty [] so each session is brand new!
    const freshSession = getInitialSession(activeClassroom.id, activeClassroom.name);
    freshSession.topic = activeSession?.topic || 'Past Simple & Irregular Verbs';
    freshSession.level = activeSession?.level || 'B1';
    freshSession.challengeType = activeSession?.challengeType || 'random';
    freshSession.completedStudentIds = [];
    setActiveSession(freshSession);
    setHasChosenTurnStudent(false);

    sounds.playJackpot();
    alert('✅ Sesión diaria cerrada con éxito. La nueva sesión está limpia con todos los alumnos listos para participar.');
  };

  const handleResetSessionRound = () => {
    setActiveSession(prev => ({
      ...prev,
      completedStudentIds: []
    }));
    setHasChosenTurnStudent(false);
    sounds.playChips();
  };

  const handleDeleteSessionFromHistory = (sessionId) => {
    setSessionsHistory(prev => prev.filter(s => s.id !== sessionId));
  };

  // Real-time Single Turn Question Generator via Groq AI
  const handleGenerateTurnQuestion = async (student = activeStudent) => {
    if (!groqApiKey) {
      console.warn('Groq API Key no configurada; no se puede generar pregunta en tiempo real.');
      return null;
    }

    // Support multiple topics configured by the teacher:
    let currentTopic = 'General English';
    if (Array.isArray(activeSession?.topics) && activeSession.topics.length > 0) {
      currentTopic = activeSession.topics;
    } else if (activeSession?.topic) {
      currentTopic = activeSession.topic;
    } else if (currentActivity?.title) {
      currentTopic = currentActivity.title;
    }

    const currentLevel = activeSession?.level || currentActivity?.level || 'B1';
    const currentType = activeSession?.challengeType || 'random';
    const currentNotes = activeSession?.customNotes || '';

    try {
      const newQ = await generateSingleTurnQuestion({
        apiKey: groqApiKey,
        topic: currentTopic,
        level: currentLevel,
        challengeType: currentType,
        studentName: student?.name || 'Estudiante',
        customInstructions: currentNotes
      });

      return newQ;
    } catch (err) {
      console.error('Error generating turn question with Groq:', err);
      return null;
    }
  };

  // Load activities from Firebase or LocalStorage
  const loadAllActivities = async () => {
    try {
      const customList = await getAllActivities();
      const merged = [...customList];
      DEFAULT_ACTIVITIES.forEach(def => {
        if (!merged.some(m => m.id === def.id || m.pin === def.pin)) {
          merged.push(def);
        }
      });
      setActivities(merged);
      if (!currentActivity && merged.length > 0) {
        setCurrentActivity(merged[0]);
      }
    } catch (err) {
      console.warn('Could not load custom activities:', err);
    }
  };

  useEffect(() => {
    loadAllActivities();
  }, []);

  const handleUpdateChips = (delta) => {
    setChips(prev => Math.max(0, prev + delta));
  };

  // Sound handlers
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const handleChangeVolume = (vol) => {
    setVolume(vol);
    sounds.setVolume(vol);
  };

  const handleSaveGroqKey = (key) => {
    setGroqApiKey(key);
    localStorage.setItem(STORAGE_GROQ_KEY, key);
  };

  // Launch a game machine
  const handleLaunchGame = (machineType) => {
    setActiveGameMachine(machineType);
    setCurrentView('game');
  };

  // When a student is chosen by the roulette spinner
  const handleStudentSelectedFromSpinner = (chosenStudent) => {
    if (!chosenStudent) return;
    const studentId = chosenStudent.id;
    const idx = students.findIndex(s => s.id === studentId || s.name === chosenStudent.name);
    if (idx !== -1) {
      setActiveStudentIndex(idx);
    }
    setHasChosenTurnStudent(true);
    // Mark as participated in today's session immediately
    setActiveSession(prev => {
      const existing = prev?.completedStudentIds || [];
      const idToStore = studentId || (students[idx] ? students[idx].id : null);
      if (!idToStore || existing.includes(idToStore)) return prev;
      return {
        ...prev,
        completedStudentIds: [...existing, idToStore]
      };
    });
  };

  // Game complete handler
  const handleFinishGame = async ({ gameId, correctAnswers, totalQuestions, finalChips }) => {
    try {
      const scoringPlayer = activeStudent ? activeStudent.name : 'Estudiante';
      const scoringAvatar = activeStudent ? activeStudent.avatar : '🎩';

      await submitScore({
        pin: currentActivity?.pin || 'CASINO',
        gameId,
        playerNick: scoringPlayer,
        chips: finalChips,
        correctAnswers,
        totalQuestions,
        avatar: scoringAvatar
      });
    } catch (err) {
      console.warn('Score submission error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        chips={chips}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenSettings={() => {
          handleRequireTeacherAuth('modificar la configuración de API y base de datos', () => setIsSettingsOpen(true));
        }}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        studentsCount={students.length}
        onOpenRosterModal={() => {
          handleRequireTeacherAuth('gestionar salones y alumnos', () => setIsRosterModalOpen(true));
        }}
        currentTeacher={currentTeacher}
        onOpenAuthModal={(reason, cb) => handleRequireTeacherAuth(reason, cb)}
        onLogoutTeacher={handleTeacherLogout}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {currentView === 'lobby' && (
          <StudentLobby
            activities={activities}
            currentActivity={currentActivity}
            onSelectActivity={(act) => setCurrentActivity(act)}
            onLaunchGame={handleLaunchGame}
            classrooms={classrooms}
            activeClassroomId={activeClassroomId}
            onSelectClassroom={handleSelectClassroom}
            students={students}
            activeStudent={activeStudent}
            hasChosenTurnStudent={hasChosenTurnStudent}
            completedStudentIds={activeSession?.completedStudentIds || []}
            onOpenSpinner={() => setIsSpinnerOpen(true)}
            onOpenRosterModal={() => {
              handleRequireTeacherAuth('ver y gestionar la lista de alumnos', () => setIsRosterModalOpen(true));
            }}
            onOpenTeacherPortal={() => {
              handleRequireTeacherAuth('acceder al Panel Docente', () => setCurrentView('teacher'));
            }}
            onResetSessionRound={handleResetSessionRound}
            onCloseDailySession={() => {
              handleRequireTeacherAuth('cerrar y archivar la sesión diaria', handleCloseDailySession);
            }}
            currentTeacher={currentTeacher}
            onOpenAuthModal={(reason, cb) => handleRequireTeacherAuth(reason, cb)}
          />
        )}

        {currentView === 'teacher' && (
          !currentTeacher ? (
            <div className="max-w-md mx-auto my-16 p-8 bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-500/60 rounded-3xl text-center shadow-2xl space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
                🔒
              </div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100">
                Panel Docente Protegido
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                El acceso a la configuración de salones, historial de sesiones pedagógicas y generación de preguntas IA requiere autenticación de docente registrado.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleRequireTeacherAuth('acceder al Panel Docente')}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition transform hover:scale-[1.02]"
                >
                  🔑 Iniciar Sesión como Docente
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('lobby')}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Volver al Lobby de Juegos
                </button>
              </div>
            </div>
          ) : (
            <TeacherPortal
              groqApiKey={groqApiKey}
              activities={activities}
              onActivitySaved={(saved) => {
                loadAllActivities();
                if (saved) setCurrentActivity(saved);
              }}
              onPlayActivity={(act) => {
                setCurrentActivity(act);
                if (act.gameType && ['slots', 'roulette', 'blackjack', 'plinko', 'crash', 'mines'].includes(act.gameType)) {
                  setActiveGameMachine(act.gameType);
                }
                setCurrentView('game');
              }}
              onOpenSettings={() => setIsSettingsOpen(true)}
              classrooms={classrooms}
              activeClassroomId={activeClassroomId}
              onSelectClassroom={handleSelectClassroom}
              onCreateClassroom={handleCreateClassroom}
              onDeleteClassroom={handleDeleteClassroom}
              students={students}
              onUpdateStudents={handleUpdateStudents}
              activeSession={activeSession}
              onUpdateActiveSession={setActiveSession}
              onSaveSessionToHistory={handleCloseDailySession}
              onCloseDailySession={handleCloseDailySession}
              onResetSessionRound={handleResetSessionRound}
              sessionsHistory={sessionsHistory}
              onDeleteSessionFromHistory={handleDeleteSessionFromHistory}
              onOpenRosterModal={() => setIsRosterModalOpen(true)}
            />
          )
        )}

        {currentView === 'game' && currentActivity && (
          <div className="w-full">
            {/* Classroom Turn Bar (Shown above games) */}
            <ClassroomTurnBar
              students={students}
              activeStudent={activeStudent}
              completedStudentIds={activeSession?.completedStudentIds || []}
              onNextStudent={handleNextStudent}
              onRandomStudent={handleRandomStudent}
              onOpenSpinner={() => setIsSpinnerOpen(true)}
              onOpenRosterModal={() => {
                handleRequireTeacherAuth('modificar la lista de estudiantes', () => setIsRosterModalOpen(true));
              }}
              onGenerateTurnQuestion={handleGenerateTurnQuestion}
            />

            <GameErrorBoundary onBackToLobby={() => setCurrentView('lobby')}>
              {activeGameMachine === 'slots' && (
                <SlotsGame
                  activity={currentActivity}
                  chips={chips}
                  onUpdateChips={handleUpdateChips}
                  onFinishGame={handleFinishGame}
                  onBackToLobby={() => setCurrentView('lobby')}
                  activeStudent={activeStudent}
                  onRecordStudentScore={handleRecordStudentScore}
                  onAdvanceStudentTurn={handleNextStudent}
                  onGenerateTurnQuestion={handleGenerateTurnQuestion}
                />
              )}

              {activeGameMachine === 'roulette' && (
                <RouletteGame
                  activity={currentActivity}
                  chips={chips}
                  onUpdateChips={handleUpdateChips}
                  onFinishGame={handleFinishGame}
                  onBackToLobby={() => setCurrentView('lobby')}
                  activeStudent={activeStudent}
                  onRecordStudentScore={handleRecordStudentScore}
                  onAdvanceStudentTurn={handleNextStudent}
                  onGenerateTurnQuestion={handleGenerateTurnQuestion}
                />
              )}

              {activeGameMachine === 'blackjack' && (
                <BlackjackGame
                  activity={currentActivity}
                  chips={chips}
                  onUpdateChips={handleUpdateChips}
                  onFinishGame={handleFinishGame}
                  onBackToLobby={() => setCurrentView('lobby')}
                  activeStudent={activeStudent}
                  onRecordStudentScore={handleRecordStudentScore}
                  onAdvanceStudentTurn={handleNextStudent}
                  onGenerateTurnQuestion={handleGenerateTurnQuestion}
                />
              )}

              {activeGameMachine === 'plinko' && (
                <PlinkoGame
                  activity={currentActivity}
                  chips={chips}
                  onUpdateChips={handleUpdateChips}
                  onFinishGame={handleFinishGame}
                  onBackToLobby={() => setCurrentView('lobby')}
                  activeStudent={activeStudent}
                  onRecordStudentScore={handleRecordStudentScore}
                  onAdvanceStudentTurn={handleNextStudent}
                  onGenerateTurnQuestion={handleGenerateTurnQuestion}
                />
              )}

              {activeGameMachine === 'crash' && (
                <CrashRocketGame
                  activity={currentActivity}
                  chips={chips}
                  onUpdateChips={handleUpdateChips}
                  onFinishGame={handleFinishGame}
                  onBackToLobby={() => setCurrentView('lobby')}
                  activeStudent={activeStudent}
                  onRecordStudentScore={handleRecordStudentScore}
                  onAdvanceStudentTurn={handleNextStudent}
                  onGenerateTurnQuestion={handleGenerateTurnQuestion}
                />
              )}

              {activeGameMachine === 'mines' && (
                <MinesGame
                  activity={currentActivity}
                  chips={chips}
                  onUpdateChips={handleUpdateChips}
                  onFinishGame={handleFinishGame}
                  onBackToLobby={() => setCurrentView('lobby')}
                  activeStudent={activeStudent}
                  onRecordStudentScore={handleRecordStudentScore}
                  onAdvanceStudentTurn={handleNextStudent}
                  onGenerateTurnQuestion={handleGenerateTurnQuestion}
                />
              )}
            </GameErrorBoundary>
          </div>
        )}
      </main>

      {/* Classroom Roster & Salones Modal */}
      <ClassroomRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        classrooms={classrooms}
        activeClassroomId={activeClassroomId}
        onSelectClassroom={handleSelectClassroom}
        onCreateClassroom={handleCreateClassroom}
        onDeleteClassroom={handleDeleteClassroom}
        students={students}
        onUpdateStudents={handleUpdateStudents}
        activeStudentIndex={activeStudentIndex}
        onSelectActiveStudent={(idx) => setActiveStudentIndex(idx)}
        onOpenSpinner={() => setIsSpinnerOpen(true)}
      />

      {/* Student Luck Wheel / Spinner Modal */}
      <StudentSpinnerModal
        isOpen={isSpinnerOpen}
        onClose={() => setIsSpinnerOpen(false)}
        students={students}
        completedStudentIds={activeSession?.completedStudentIds || []}
        activeClassroomName={activeClassroom?.name}
        onStudentSelected={handleStudentSelectedFromSpinner}
        onOpenRosterModal={() => {
          handleRequireTeacherAuth('modificar la lista de estudiantes', () => setIsRosterModalOpen(true));
        }}
        onResetRound={handleResetSessionRound}
        onCloseSession={() => {
          handleRequireTeacherAuth('cerrar la sesión del día', handleCloseDailySession);
        }}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        students={students}
        pin={currentActivity?.pin}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        groqApiKey={groqApiKey}
        onSaveGroqKey={handleSaveGroqKey}
        volume={volume}
        onChangeVolume={handleChangeVolume}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Teacher Authentication Modal */}
      <TeacherAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPostAuthCallback(null);
        }}
        onLoginSuccess={handleTeacherLoginSuccess}
        promptReason={authPromptReason}
      />
    </div>
  );
}
