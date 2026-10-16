// Native Web Speech API Text-to-Speech integration for English pronunciation

class TTSEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.selectedVoice = null;
    this.rate = 0.95; // Slightly slower for clear educational articulation
    this.pitch = 1.0;
    this.isSpeaking = false;

    if (this.synth) {
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    const allVoices = this.synth.getVoices();
    // Prioritize English voices (US, GB, AU, CA)
    this.voices = allVoices.filter(v => v.lang.startsWith('en'));
    if (this.voices.length === 0) {
      this.voices = allVoices; // Fallback
    }

    // Default to natural/enhanced English voice if available
    const preferred = this.voices.find(v => 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
    ) || this.voices[0];

    this.selectedVoice = preferred || null;
  }

  getEnglishVoices() {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  setVoice(voiceURI) {
    const found = this.voices.find(v => v.voiceURI === voiceURI);
    if (found) {
      this.selectedVoice = found;
    }
  }

  setRate(newRate) {
    this.rate = Math.max(0.5, Math.min(2, newRate));
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  speak(text, options = {}) {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    // Clean text of markdown or special punctuation that ruins flow
    const cleanText = text.replace(/[*_#`~[\]]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (err) => {
      this.isSpeaking = false;
      if (options.onError) options.onError(err);
    };

    this.synth.speak(utterance);
  }
}

export const tts = new TTSEngine();
