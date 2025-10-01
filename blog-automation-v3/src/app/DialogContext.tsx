import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AlertDialog from '../shared/components/ui/AlertDialog';

interface AlertOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
}

interface DialogContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
};

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  resolve?: (value: boolean) => void;
}

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const [confirm, setConfirm] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: ''
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert({
      isOpen: true,
      type: options.type || 'info',
      title: options.title || '알림',
      message: options.message
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({
        isOpen: true,
        title: options.title || '확인',
        message: options.message,
        resolve
      });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirmYes = useCallback(() => {
    if (confirm.resolve) {
      confirm.resolve(true);
    }
    setConfirm(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [confirm.resolve]);

  const handleConfirmNo = useCallback(() => {
    if (confirm.resolve) {
      confirm.resolve(false);
    }
    setConfirm(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, [confirm.resolve]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alert.isOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={handleAlertClose}
      />

      {/* Confirm Dialog */}
      {confirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-11/12 shadow-2xl transform transition-all duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                ❓
              </div>
              <h3 className="text-lg font-bold text-gray-800">{confirm.title}</h3>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 whitespace-pre-line">
              {confirm.message}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleConfirmNo}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors text-sm font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleConfirmYes}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
