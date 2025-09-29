import React from 'react';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'card' | 'banner';
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title = '오류 발생',
  onRetry,
  onDismiss,
  variant = 'default',
  className = ''
}) => {
  const variantClasses = {
    default: 'bg-red-50 border border-red-200 text-red-800 p-4 rounded-md',
    card: 'bg-white border border-red-200 shadow-sm text-red-800 p-6 rounded-lg',
    banner: 'bg-red-500 text-white p-4 rounded-none'
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-sm">{message}</p>
          
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm font-medium underline hover:no-underline"
                >
                  다시 시도
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm font-medium underline hover:no-underline"
                >
                  닫기
                </button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;