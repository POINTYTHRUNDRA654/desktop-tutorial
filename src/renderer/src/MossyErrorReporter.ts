/**
 * Mossy Error Reporter
 * Logs errors to a structured file for debugging and diagnostic sharing
 */

import { redactSensitiveObject } from './utils/privacyRedaction';

interface MossyErrorLog {
  timestamp: string;
  toolName: string;
  errorMessage: string;
  errorStack?: string;
  context?: Record<string, any>;
  userAction?: string;
  suggestedFix?: string;
}

type PrivacySettings = {
  keepLocalOnly: boolean;
  shareBugReports: boolean;
};

function loadPrivacySettings(): PrivacySettings {
  try {
    const raw = localStorage.getItem('mossy_privacy_settings');
    if (!raw) return { keepLocalOnly: true, shareBugReports: false };
    const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
    return {
      keepLocalOnly: parsed.keepLocalOnly !== false,
      shareBugReports: parsed.shareBugReports === true,
    };
  } catch {
    return { keepLocalOnly: true, shareBugReports: false };
  }
}

const API_ENDPOINT = ((import.meta as any)?.env?.VITE_ERROR_LOG_ENDPOINT as string | undefined)?.trim() || '';

export const logMossyError = async (
  toolName: string,
  error: Error | string,
  context?: Record<string, any>,
  userAction?: string,
  suggestedFix?: string
): Promise<{ success: boolean; filename?: string; message?: string }> => {
  try {
    const errorLog: MossyErrorLog = {
      timestamp: new Date().toISOString(),
      toolName,
      errorMessage: typeof error === 'string' ? error : error.message,
      errorStack: typeof error === 'string' ? undefined : error.stack,
      context,
      userAction,
      suggestedFix,
    };

    const privacy = loadPrivacySettings();
    const allowSend = !privacy.keepLocalOnly && privacy.shareBugReports && !!API_ENDPOINT;

    if (allowSend) {
      // Send a redacted version only (never raw paths, emails, tokens, etc).
      const safeLog = redactSensitiveObject(errorLog);

      // Try to send to backend (fire and forget)
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeLog),
      }).catch(() => {
        // Silently fail if backend not available
        console.log('[MOSSY] Error log endpoint not reachable; stored locally only');
      });
    }

    // Always store in localStorage regardless of backend
    const errorLogs = JSON.parse(localStorage.getItem('mossy_error_logs') || '[]');
    // Store redacted logs locally too, so exports don't leak secrets.
    errorLogs.push(redactSensitiveObject(errorLog));
    
    // Keep only last 50 errors
    if (errorLogs.length > 50) {
      errorLogs.shift();
    }
    localStorage.setItem('mossy_error_logs', JSON.stringify(errorLogs));

    return {
      success: true,
      message: `Error logged locally (${errorLogs.length} total). Use Settings > Privacy Settings > Export Error Logs to download.`,
    };
  } catch (e) {
    console.error('Failed to log Mossy error:', e);
    return { success: false, message: 'Could not log error' };
  }
};

/**
 * Export all logged errors as a formatted text file
 */
export const exportErrorLogs = (): void => {
  try {
    const errorLogs = JSON.parse(localStorage.getItem('mossy_error_logs') || '[]');
    
    if (errorLogs.length === 0) {
      alert('No error logs to export.');
      return;
    }

    let content = `MOSSY ERROR DIAGNOSTIC LOG
Generated: ${new Date().toISOString()}
Total Errors: ${errorLogs.length}

================================\n\n`;

    errorLogs.forEach((log: MossyErrorLog, index: number) => {
      content += `[${index + 1}] ${log.timestamp}\n`;
      content += `Tool: ${log.toolName}\n`;
      content += `Error: ${log.errorMessage}\n`;
      if (log.userAction) content += `User Action: ${log.userAction}\n`;
      if (log.context) content += `Context: ${JSON.stringify(log.context, null, 2)}\n`;
      if (log.errorStack) content += `Stack Trace:\n${log.errorStack}\n`;
      if (log.suggestedFix) content += `Suggested Fix: ${log.suggestedFix}\n`;
      content += '\n--------------------------------\n\n';
    });

    // Download as file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mossy-error-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export error logs:', e);
    alert('Failed to export error logs');
  }
};

/**
 * Get human-readable error message for Mossy to report
 */
export const getErrorReport = (
  toolName: string,
  filename?: string
): string => {
  return `I encountered an error while attempting to execute the **${toolName}** function. ${
    filename
      ? `Error details have been logged to **${filename}**. Please share this file with your assistant for diagnosis.`
      : `Error details have been logged locally. Go to **Settings > Diagnostic Tools > Export Error Logs** to download a diagnostic report.`
  } This will help your assistant identify and fix the issue faster.`;
};
