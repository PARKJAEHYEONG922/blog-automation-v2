import React from 'react';
import Button from './Button';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertDialogProps {
  isOpen: boolean;
  type?: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  onClose
}) => {
  if (!isOpen) return null;

  // 타입별 스타일
  const styles = {
    success: {
      icon: '✅',
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      button: 'primary' as const
    },
    error: {
      icon: '❌',
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      button: 'danger' as const
    },
    warning: {
      icon: '⚠️',
      gradient: 'from-yellow-500 to-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      button: 'warning' as const
    },
    info: {
      icon: 'ℹ️',
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      button: 'primary' as const
    }
  };

  const style = styles[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-11/12 shadow-2xl transform transition-all duration-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-8 h-8 bg-gradient-to-br ${style.gradient} rounded-lg flex items-center justify-center text-white text-sm font-semibold`}>
            {style.icon}
          </div>
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>

        <p className={`text-gray-600 text-sm leading-relaxed mb-6 ${style.bg} border ${style.border} rounded-lg p-3 whitespace-pre-line`}>
          {message}
        </p>

        <div className="flex justify-end">
          <Button
            onClick={onClose}
            variant={style.button}
            size="sm"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
