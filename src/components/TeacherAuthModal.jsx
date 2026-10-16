import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  UserCheck, 
  UserPlus, 
  Mail, 
  KeyRound, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  LogIn
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import { loginTeacher, registerTeacher } from '../services/authService';

export default function TeacherAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  promptReason = 'acceder al panel y gestionar datos de la clase'
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        sounds.playWrong();
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener mínimo 6 caracteres.');
        sounds.playWrong();
        return;
      }
    }

    setIsLoading(true);
    try {
      let teacherUser = null;
      if (mode === 'login') {
        teacherUser = await loginTeacher({ email, password });
      } else {
        teacherUser = await registerTeacher({ email, password, displayName: name });
      }

      sounds.playJackpot();
      if (onLoginSuccess) {
        onLoginSuccess(teacherUser);
      }
      onClose();
    } catch (err) {
      sounds.playWrong();
      setError(err.message || 'Error durante la autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('docente@casino.edu');
    setPassword('docente123');
    setError('');
    sounds.playTick();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-500/80 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security Shield Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 mx-auto flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/20">
            <Lock className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            Acceso Protegido Docente
          </div>

          <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100">
            {mode === 'login' ? 'Iniciar Sesión Docente' : 'Registrar Nuevo Docente'}
          </h3>

          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Por seguridad, debes autenticarte para {promptReason}.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-black/60 p-1 rounded-xl border border-gray-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              sounds.playTick();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-amber-500 text-black shadow font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              sounds.playTick();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-amber-500 text-black shadow font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Registrarse</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Nombre Completo del Docente
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Prof. Alejandro Ramírez"
                  className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-white font-semibold focus:outline-none"
                />
                <UserCheck className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. docente@colegio.edu"
                className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-white font-semibold focus:outline-none"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-white font-semibold focus:outline-none"
              />
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full bg-black/60 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-white font-semibold focus:outline-none"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Sparkles className="w-4 h-4 text-gray-950 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {isLoading 
                ? 'Verificando credenciales...' 
                : mode === 'login' 
                  ? 'Entrar como Docente' 
                  : 'Crear Cuenta Docente'}
            </span>
          </button>
        </form>

        {/* Demo Fast Login Helper */}
        {mode === 'login' && (
          <div className="mt-4 pt-3 border-t border-gray-800 text-center">
            <p className="text-[11px] text-gray-400 mb-1.5">
              ¿Quieres probar rápidamente sin registrarte aún?
            </p>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
            >
              Rellenar con usuario demo (docente@casino.edu)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
