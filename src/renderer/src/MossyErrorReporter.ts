/**
 * Mossy Error Reporter
 * Logs errors to a structured file for debugging and diagnostic sharing
 */

interface MossyErrorLog {
  timestamp: string;
  toolName: string;
  errorMessage: string;
  errorStack?: string;
  context?: Record<string, any>;
  userAction?: string;
  suggestedFix?: string;
}

const API_ENDPOINT = 'http://localhost:5173/api/mossy-error-log';

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

    // Try to send to backend to write file (no await, fire and forget)
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorLog),
    }).catch(() => {
      // Silently fail if backend not available
      console.log('[MOSSY] Backend error log not available, using localStorage');
    });

    // Always store in localStorage regardless of backend
    const errorLogs = JSON.parse(localStorage.getItem('mossy_error_logs') || '[]');
    errorLogs.push(errorLog);
    
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
