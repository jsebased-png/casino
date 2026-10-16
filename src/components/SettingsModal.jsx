import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Database, 
  Volume2, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Sparkles,
  Save,
  Trash2
} from 'lucide-react';
import { testGroqConnection } from '../services/groqService';
import { 
  getStoredFirebaseConfig, 
  saveStoredFirebaseConfig, 
  isFirebaseConfigured 
} from '../services/firebaseService';
import { sounds } from '../utils/soundEffects';
import { tts } from '../utils/tts';

export default function SettingsModal({
  isOpen,
  onClose,
  groqApiKey,
  onSaveGroqKey,
  volume,
  onChangeVolume,
  isMuted,
  onToggleMute
}) {
  const [activeTab, setActiveTab] = useState('groq'); // 'groq' | 'firebase' | 'audio'

  // Groq State
  const [keyInput, setKeyInput] = useState(groqApiKey || '');
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqStatus, setGroqStatus] = useState(null);

  // Firebase State
  const [fbConfigJson, setFbConfigJson] = useState('');
  const [fbConnected, setFbConnected] = useState(isFirebaseConfigured());
  const [fbStatus, setFbStatus] = useState(null);

  // Audio / TTS State
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [speechRate, setSpeechRate] = useState(0.95);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(groqApiKey || '');
      const currentFb = getStoredFirebaseConfig();
      if (currentFb) {
        setFbConfigJson(JSON.stringify(currentFb, null, 2));
      }
      setFbConnected(isFirebaseConfigured());
      setVoices(tts.getEnglishVoices());
    }
  }, [isOpen, groqApiKey]);

  if (!isOpen) return null;

  const handleTestGroq = async () => {
    if (!keyInput.trim()) {
      setGroqStatus({ type: 'error', message: 'Please enter a key to test.' });
      return;
    }

    setTestingGroq(true);
    setGroqStatus(null);

    try {
      await testGroqConnection(keyInput);
      setGroqStatus({ type: 'success', message: 'Groq API Key is valid and connected!' });
      sounds.playCorrect();
      onSaveGroqKey(keyInput.trim());
    } catch (err) {
      setGroqStatus({ type: 'error', message: err.message });
      sounds.playWrong();
    } finally {
      setTestingGroq(false);
    }
  };

  const handleSaveGroqKey = () => {
    onSaveGroqKey(keyInput.trim());
    sounds.playCoin();
    setGroqStatus({ type: 'success', message: 'API Key saved to browser local storage.' });
  };

  const parseFirebaseConfig = (input) => {
    if (!input || !input.trim()) return null;
    const raw = input.trim();

    // 1. Try standard JSON.parse
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && obj.apiKey && obj.projectId) {
        return obj;
      }
    } catch {}

    // 2. Try cleanup of JS object syntax
    try {
      let cleaned = raw
        .replace(/^(const|let|var)\s+\w+\s*=\s*/i, '')
        .replace(/;?\s*$/, '')
        .trim();

      if (!cleaned.startsWith('{')) cleaned = '{' + cleaned;
      if (!cleaned.endsWith('}')) cleaned = cleaned + '}';

      cleaned = cleaned
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
        .replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '"$1"')
        .replace(/,\s*}/g, '}');

      const obj = JSON.parse(cleaned);
      if (obj && typeof obj === 'object' && obj.apiKey && obj.projectId) {
        return obj;
      }
    } catch {}

    // 3. Ultra-resilient Regex extractor for Firebase fields
    const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
    const extracted = {};
    for (const k of keys) {
      const match = raw.match(new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']+)["']`, 'i'));
      if (match) {
        extracted[k] = match[1];
      }
    }

    if (extracted.apiKey && extracted.projectId) {
      return extracted;
    }

    throw new Error('Formato no reconocido. Asegúrate de incluir apiKey y projectId entre llaves { ... }');
  };

  const handleSaveFirebase = () => {
    try {
      if (!fbConfigJson.trim()) {
        saveStoredFirebaseConfig(null);
        setFbConnected(false);
        setFbStatus({ type: 'info', message: 'Configuración de Firebase eliminada. Usando modo LocalStorage.' });
        return;
      }

      const parsed = parseFirebaseConfig(fbConfigJson);
      saveStoredFirebaseConfig(parsed);
      setFbConfigJson(JSON.stringify(parsed, null, 2));
      setFbConnected(true);
      setFbStatus({ type: 'success', message: '¡Firebase conectado e inicializado con éxito!' });
      sounds.playJackpot();
    } catch (err) {
      setFbStatus({ type: 'error', message: `Error de formato: ${err.message}` });
      sounds.playWrong();
    }
  };

  const handleTestAudioAndTTS = () => {
    sounds.playCorrect();
    setTimeout(() => {
      tts.speak('Welcome to Lucky English Casino! Double your chips with grammar!', {
        rate: speechRate
      });
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-500/80 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Casino App Settings</h3>
            <p className="text-xs text-gray-400">
              Configure Groq AI, Firebase backend, and Audio/TTS
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-4">
          <button
            onClick={() => setActiveTab('groq')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'groq'
                ? 'bg-amber-500 text-black shadow'
                : 'bg-gray-800/60 text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Groq AI
          </button>

          <button
            onClick={() => setActiveTab('firebase')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'firebase'
                ? 'bg-amber-500 text-black shadow'
                : 'bg-gray-800/60 text-gray-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Firebase Backend
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'audio'
                ? 'bg-amber-500 text-black shadow'
                : 'bg-gray-800/60 text-gray-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" /> Sound & TTS
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: Groq AI */}
          {activeTab === 'groq' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-black/40 border border-gray-800 rounded-xl text-xs text-gray-300 leading-relaxed">
                <p className="mb-2">
                  Groq powers real-time question generation for teachers. Your API key is stored safely inside your own browser (<strong className="text-amber-300">localStorage</strong>) and is never shared.
                </p>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Get a free Groq API key here <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Groq API Key (starts with gsk_...)
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setGroqStatus(null);
                  }}
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-black/80 border border-gray-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {groqStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  groqStatus.type === 'success'
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-200'
                    : 'bg-red-950 border border-red-500 text-red-200'
                }`}>
                  {groqStatus.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{groqStatus.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestGroq}
                  disabled={testingGroq}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {testingGroq ? 'Testing connection...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveGroqKey}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl text-xs shadow hover:scale-105 transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save Key
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Firebase */}
          {activeTab === 'firebase' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/50 border border-gray-800">
                <span className="text-xs text-gray-300 font-medium">Backend Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  fbConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {fbConnected ? '🟢 Connected to Firebase Firestore' : '🟡 Local Storage / Demo Mode'}
                </span>
              </div>

              <div className="p-3 bg-black/40 border border-gray-800 rounded-xl text-[11px] text-gray-300 leading-relaxed">
                Paste your Firebase Web App configuration below. If left empty, the application will use the built-in persistent <strong className="text-amber-300">LocalStorage Cloud Mock</strong> (works 100% with no setup required).
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Firebase Config (JSON or JS Object)
                </label>
                <textarea
                  value={fbConfigJson}
                  onChange={(e) => setFbConfigJson(e.target.value)}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "myproject.firebaseapp.com",\n  "projectId": "myproject",\n  "storageBucket": "myproject.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                  rows={6}
                  className="w-full bg-black/80 border border-gray-700 focus:border-amber-400 rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {fbStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  fbStatus.type === 'success'
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-200'
                    : fbStatus.type === 'error'
                    ? 'bg-red-950 border border-red-500 text-red-200'
                    : 'bg-blue-950 border border-blue-500 text-blue-200'
                }`}>
                  {fbStatus.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{fbStatus.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveFirebase}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl text-xs shadow hover:scale-105 transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save Firebase Config
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Audio & TTS */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {/* Sound Effects Volume */}
              <div className="p-4 bg-black/40 border border-gray-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    Casino Sound Effects
                  </span>
                  <button
                    onClick={onToggleMute}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      isMuted
                        ? 'bg-red-950 border-red-500 text-red-300'
                        : 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    }`}
                  >
                    {isMuted ? 'Muted' : 'Sound ON'}
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Effects Volume: {Math.round(volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Text-to-Speech (TTS) Settings */}
              <div className="p-4 bg-black/40 border border-gray-800 rounded-xl space-y-3">
                <span className="text-xs font-bold text-gray-300 block">
                  English Text-to-Speech (TTS) Pronunciation
                </span>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Voice Selection ({voices.length} English voices found)
                  </label>
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => {
                      setSelectedVoiceURI(e.target.value);
                      tts.setVoice(e.target.value);
                    }}
                    className="w-full bg-black border border-gray-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Speech Rate: {speechRate}x
                  </label>
                  <input
                    type="range"
                    min="0.6"
                    max="1.3"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => {
                      const r = parseFloat(e.target.value);
                      setSpeechRate(r);
                      tts.setRate(r);
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestAudioAndTTS}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" /> Test Voice & Casino Chimes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
