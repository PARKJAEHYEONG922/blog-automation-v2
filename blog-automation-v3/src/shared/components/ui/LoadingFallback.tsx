import React, { memo } from 'react';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * 코드 스플리팅 로딩 UI
 */
const LoadingFallbackComponent: React.FC<LoadingFallbackProps> = ({
  message = '로딩 중...',
  fullScreen = false
}) => {
  const containerClass = fullScreen
    ? 'min-h-screen bg-gray-900 flex items-center justify-center'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  );
};

const LoadingFallback = memo(LoadingFallbackComponent);
LoadingFallback.displayName = 'LoadingFallback';

export default LoadingFallback;
