import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GameErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 text-center">
          <div className="max-w-md w-full bg-gray-900 border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500 flex items-center justify-center mx-auto text-3xl">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-black text-red-300">
              Error en la Escena 3D
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ocurrió un error inesperado al renderizar el juego WebGL. Tus datos y fichas están a salvo.
            </p>
            <p className="text-[10px] font-mono text-red-400/80 bg-black/50 p-2 rounded-xl overflow-x-auto text-left">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleRetry}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-black text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar</span>
              </button>
              {this.props.onBackToLobby && (
                <button
                  onClick={this.props.onBackToLobby}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl border border-gray-700 cursor-pointer flex items-center justify-center gap-1.5 transition"
                >
                  <Home className="w-4 h-4 text-amber-400" />
                  <span>Volver al Lobby</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

