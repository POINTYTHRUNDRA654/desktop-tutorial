import React, { Component, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full flex flex-col items-center justify-center bg-[#050505] text-slate-200 p-8">
          <div className="max-w-lg text-center space-y-4">
            <div className="w-20 h-20 rounded-full border-2 border-red-500/30 bg-black/60 backdrop-blur-md flex items-center justify-center mx-auto">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-400">Component Crashed</h2>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <pre className="text-xs text-left bg-slate-900 p-4 rounded overflow-auto max-h-40">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.hash = '/'}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-full text-white font-mono text-sm transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" /> Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
