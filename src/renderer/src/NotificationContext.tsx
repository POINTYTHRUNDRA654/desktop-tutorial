import React, { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface NotificationContextType {
  showSuccess: (message: string, description?: string) => void;
  showError: (message: string, description?: string) => void;
  showInfo: (message: string, description?: string) => void;
  showWarning: (message: string, description?: string) => void;
  showLoading: (message: string) => string;
  updateLoading: (toastId: string, message: string, type: 'success' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const showSuccess = (message: string, description?: string) => {
    toast.success(description ? `${message}\n${description}` : message, {
      duration: 4000,
      style: {
        background: '#00ff00',
        color: '#000000',
        border: '1px solid #008000',
        fontFamily: 'monospace',
      },
      icon: '✅',
    });
  };

  const showError = (message: string, description?: string) => {
    toast.error(description ? `${message}\n${description}` : message, {
      duration: 6000,
      style: {
        background: '#ff4444',
        color: '#ffffff',
        border: '1px solid #cc0000',
        fontFamily: 'monospace',
      },
      icon: '❌',
    });
  };

  const showInfo = (message: string, description?: string) => {
    toast(description ? `${message}\n${description}` : message, {
      duration: 4000,
      style: {
        background: '#4444ff',
        color: '#ffffff',
        border: '1px solid #0000cc',
        fontFamily: 'monospace',
      },
      icon: 'ℹ️',
    });
  };

  const showWarning = (message: string, description?: string) => {
    toast(description ? `${message}\n${description}` : message, {
      duration: 5000,
      style: {
        background: '#ffaa00',
        color: '#000000',
        border: '1px solid #cc8800',
        fontFamily: 'monospace',
      },
      icon: '⚠️',
    });
  };

  const showLoading = (message: string): string => {
    return toast.loading(message, {
      style: {
        background: '#333333',
        color: '#00ff00',
        border: '1px solid #008000',
        fontFamily: 'monospace',
      },
    });
  };

  const updateLoading = (toastId: string, message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message, {
        id: toastId,
        duration: 4000,
        style: {
          background: '#00ff00',
          color: '#000000',
          border: '1px solid #008000',
          fontFamily: 'monospace',
        },
        icon: '✅',
      });
    } else {
      toast.error(message, {
        id: toastId,
        duration: 6000,
        style: {
          background: '#ff4444',
          color: '#ffffff',
          border: '1px solid #cc0000',
          fontFamily: 'monospace',
        },
        icon: '❌',
      });
    }
  };

  const value: NotificationContextType = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    updateLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'monospace',
            fontSize: '14px',
          },
        }}
        containerStyle={{
          top: 80, // Account for mobile header
        }}
      />
    </NotificationContext.Provider>
  );
};