import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ArrowLeft, RefreshCw, Bug, Copy, AlertCircle } from 'lucide-react';

interface ErrorReport {
  id: string;
  timestamp: number;
  error: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  userId?: string;
  recoveryAttempted?: boolean;
  recoverySuccessful?: boolean;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorReport: ErrorReport) => void;
  enableReporting?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
  errorReport: ErrorReport | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      errorReport: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isRecovering: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      recoveryAttempted: false,
      recoverySuccessful: false
    };

    this.setState({
      errorInfo,
      errorReport
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorReport);
    }

    // Log to console for debugging
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Store error report for debugging
    this.storeErrorReport(errorReport);
  }

  private getUserId(): string | undefined {
    // Try to get user ID from localStorage or generate anonymous ID
    try {
      let userId = localStorage.getItem('mossy_user_id');
      if (!userId) {
        userId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('mossy_user_id', userId);
      }
      return userId;
    } catch {
      return undefined;
    }
  }

  private storeErrorReport(report: ErrorReport): void {
    try {
      const existingReports = JSON.parse(localStorage.getItem('mossy_error_reports') || '[]');
      existingReports.unshift(report); // Add to beginning

      // Keep only last 10 reports
      if (existingReports.length > 10) {
        existingReports.splice(10);
      }

      localStorage.setItem('mossy_error_reports', JSON.stringify(existingReports));
    } catch (e) {
      console.warn('Failed to store error report:', e);
    }
  }

  private handleRetry = async () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRecovering: true });

    // Update error report
    const updatedReport = this.state.errorReport ? {
      ...this.state.errorReport,
      recoveryAttempted: true
    } : null;

    try {
      // Wait a bit before retrying
      await new Promise(resolve => {
        this.retryTimeoutId = window.setTimeout(resolve, 1000);
      });

      // Clear error state to trigger re-render
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        isRecovering: false,
        errorReport: updatedReport ? { ...updatedReport, recoverySuccessful: true } : null
      });

      // Update stored report
      if (updatedReport) {
        this.storeErrorReport({ ...updatedReport, recoverySuccessful: true });
      }

    } catch (error) {
      this.setState({
        isRecovering: false,
        retryCount: retryCount + 1,
        errorReport: updatedReport ? { ...updatedReport, recoverySuccessful: false } : null
      });

      if (updatedReport) {
        this.storeErrorReport({ ...updatedReport, recoverySuccessful: false });
      }
    }
  };

  private handleCopyError = () => {
    const { error, errorInfo, errorReport } = this.state;
    const errorText = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
URL: ${errorReport?.url || window.location.href}
User Agent: ${errorReport?.userAgent || navigator.userAgent}
Timestamp: ${errorReport?.timestamp ? new Date(errorReport.timestamp).toISOString() : new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorText).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  private handleDownloadReport = () => {
    const { errorReport } = this.state;
    if (!errorReport) return;

    const reportData = {
      ...errorReport,
      additionalInfo: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        localStorage: this.getSafeLocalStorage(),
        sessionStorage: this.getSafeSessionStorage()
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mossy-error-report-${errorReport.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  private getSafeLocalStorage(): Record<string, any> {
    try {
      const result: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Skip sensitive keys
          if (!key.includes('token') && !key.includes('key') && !key.includes('password')) {
            result[key] = localStorage.getItem(key);
          } else {
            result[key] = '[REDACTED]';
          }
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  private getSafeSessionStorage(): Record<string, any> {
    try {
      const result: Record<string, any> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          result[key] = sessionStorage.getItem(key);
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, retryCount, isRecovering, errorReport, showDetails } = this.state;
      const { maxRetries = 3, enableReporting = true } = this.props;

      return (
        <div className="h-full flex flex-col items-center justify-center bg-[#050505] text-slate-200 p-8">
          <div className="max-w-2xl w-full space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full border-2 border-red-500/30 bg-black/60 backdrop-blur-md flex items-center justify-center mx-auto">
                <span className="text-4xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-bold text-red-400">Component Crashed</h2>
              <p className="text-sm text-slate-400">
                {error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              {retryCount < maxRetries && (
                <button
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-full text-white font-mono text-sm transition-colors flex items-center gap-2"
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                >
                  {isRecovering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Retrying...
                    </>
                  ) : (
                    `Try Again${retryCount > 0 ? ` (${retryCount}/${maxRetries})` : ''}`
                  )}
                </button>
              )}

              <button
                onClick={() => window.location.hash = '/'}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-full text-white font-mono text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Return Home
              </button>

              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-full text-white font-mono text-sm transition-colors"
              >
                Reload Page
              </button>

              {enableReporting && (
                <button
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-full text-white font-mono text-sm transition-colors"
                  onClick={this.handleCopyError}
                >
                  Copy Error
                </button>
              )}
            </div>

            {showDetails && errorReport && (
              <div className="bg-slate-900/50 backdrop-blur-md rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-200">Error Report</h3>
                  <button
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors"
                    onClick={() => this.setState({ showDetails: !showDetails })}
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong className="text-slate-400">ID:</strong>
                    <div className="text-slate-200 font-mono text-xs break-all">{errorReport.id}</div>
                  </div>
                  <div>
                    <strong className="text-slate-400">Time:</strong>
                    <div className="text-slate-200">{new Date(errorReport.timestamp).toLocaleString()}</div>
                  </div>
                  <div>
                    <strong className="text-slate-400">URL:</strong>
                    <div className="text-slate-200 font-mono text-xs break-all">{errorReport.url}</div>
                  </div>
                </div>

                {showDetails && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-md font-semibold text-slate-200 mb-2">Error Message</h4>
                      <pre className="text-xs bg-slate-950 p-3 rounded overflow-auto max-h-20 text-red-300">
                        {error?.message}
                      </pre>
                    </div>

                    {error?.stack && (
                      <div>
                        <h4 className="text-md font-semibold text-slate-200 mb-2">Stack Trace</h4>
                        <pre className="text-xs bg-slate-950 p-3 rounded overflow-auto max-h-40 text-slate-300">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {errorInfo?.componentStack && (
                      <div>
                        <h4 className="text-md font-semibold text-slate-200 mb-2">Component Stack</h4>
                        <pre className="text-xs bg-slate-950 p-3 rounded overflow-auto max-h-40 text-slate-300">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    <div>
                      <h4 className="text-md font-semibold text-slate-200 mb-2">Environment</h4>
                      <div className="text-sm space-y-1">
                        <div><strong className="text-slate-400">User Agent:</strong> <span className="text-slate-200">{errorReport.userAgent}</span></div>
                        <div><strong className="text-slate-400">Recovery Attempted:</strong> <span className="text-slate-200">{errorReport.recoveryAttempted ? 'Yes' : 'No'}</span></div>
                        <div><strong className="text-slate-400">Recovery Successful:</strong> <span className="text-slate-200">{errorReport.recoverySuccessful ? 'Yes' : 'No'}</span></div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors"
                        onClick={this.handleDownloadReport}
                      >
                        Download Full Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-slate-500">
                If this problem persists, please report it with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
