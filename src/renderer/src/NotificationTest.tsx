import React from 'react';
import { useNotifications } from './NotificationContext';

const NotificationTest: React.FC = () => {
  const { showSuccess, showError, showInfo, showWarning, showLoading, updateLoading } = useNotifications();

  const handleSuccess = () => {
    showSuccess('Operation completed successfully!', 'Your changes have been saved.');
  };

  const handleError = () => {
    showError('Failed to save changes', 'Please check your connection and try again.');
  };

  const handleInfo = () => {
    showInfo('New update available', 'Version 4.1.0 is ready to install.');
  };

  const handleWarning = () => {
    showWarning('Disk space running low', 'Consider cleaning up old files.');
  };

  const handleLoading = () => {
    const toastId = showLoading('Processing your request...');
    setTimeout(() => {
      updateLoading(toastId, 'Request completed successfully!', 'success');
    }, 2000);
  };

  const handleLoadingError = () => {
    const toastId = showLoading('Uploading file...');
    setTimeout(() => {
      updateLoading(toastId, 'Upload failed. Please try again.', 'error');
    }, 2000);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-green-400 mb-4">Notification System Test</h2>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleSuccess}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors focus-visible"
        >
          Show Success
        </button>
        <button
          onClick={handleError}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors focus-visible"
        >
          Show Error
        </button>
        <button
          onClick={handleInfo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors focus-visible"
        >
          Show Info
        </button>
        <button
          onClick={handleWarning}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-black rounded transition-colors focus-visible"
        >
          Show Warning
        </button>
        <button
          onClick={handleLoading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors focus-visible"
        >
          Show Loading Success
        </button>
        <button
          onClick={handleLoadingError}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors focus-visible"
        >
          Show Loading Error
        </button>
      </div>
    </div>
  );
};

export default NotificationTest;