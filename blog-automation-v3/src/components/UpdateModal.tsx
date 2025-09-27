import React, { useState, useEffect } from 'react';

interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion?: string;
  downloadUrl?: string;
  error?: string;
}

interface UpdateModalProps {
  isVisible: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
  onDownload: (downloadUrl: string) => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ isVisible, updateInfo, onClose, onDownload }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setIsDownloading(false);
    }
  }, [isVisible]);

  if (!isVisible || !updateInfo) return null;

  const handleDownload = async () => {
    if (updateInfo.downloadUrl) {
      setIsDownloading(true);
      await onDownload(updateInfo.downloadUrl);
      setTimeout(() => {
        setIsDownloading(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {updateInfo.hasUpdate ? '🎉 업데이트 발견!' : '✅ 최신 버전'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {updateInfo.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-red-500 text-lg">❌</span>
                <div>
                  <p className="text-red-700 font-medium">업데이트 확인 실패</p>
                  <p className="text-red-600 text-sm mt-1">{updateInfo.error}</p>
                </div>
              </div>
            </div>
          ) : updateInfo.hasUpdate ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-500 text-lg">🚀</span>
                  <div>
                    <p className="text-blue-700 font-medium">새 버전이 있습니다!</p>
                    <p className="text-blue-600 text-sm mt-1">
                      최신 버전: <span className="font-mono">{updateInfo.latestVersion}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  <div>
                    <p className="text-amber-700 font-medium">업데이트 방법</p>
                    <p className="text-amber-600 text-sm mt-1">
                      다운로드 후 현재 애플리케이션을 종료하고 새 버전을 설치해주세요.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !updateInfo.downloadUrl}
                  className={`flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isDownloading || !updateInfo.downloadUrl
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span>다운로드 중...</span>
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      <span>다운로드</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  나중에
                </button>
              </div>
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-green-500 text-lg">✅</span>
                <div>
                  <p className="text-green-700 font-medium">최신 버전을 사용 중입니다</p>
                  <p className="text-green-600 text-sm mt-1">
                    현재 버전: <span className="font-mono">{updateInfo.latestVersion}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!updateInfo.hasUpdate && !updateInfo.error && (
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateModal;