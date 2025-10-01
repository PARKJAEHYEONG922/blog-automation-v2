import type { DownloadProgress } from '@/shared/types/electron.types';
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
  onDownload: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>;
}


const UpdateModal: React.FC<UpdateModalProps> = ({ isVisible, updateInfo, onClose, onDownload }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadComplete, setDownloadComplete] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setIsDownloading(false);
      setDownloadProgress(null);
      setDownloadComplete(false);
      return;
    }

    // 다운로드 진행률 이벤트 리스너
    const handleDownloadProgress = (data: DownloadProgress) => {
      console.log('다운로드 진행률 수신:', data);
      setDownloadProgress(data);
    };

    let removeListener: (() => void) | undefined;

    if (window.electronAPI && window.electronAPI.onDownloadProgress) {
      removeListener = window.electronAPI.onDownloadProgress(handleDownloadProgress);
    }

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [isVisible]);

  if (!isVisible || !updateInfo) return null;

  const handleDownload = async () => {
    if (updateInfo.downloadUrl) {
      console.log('다운로드 시작:', updateInfo.downloadUrl);
      setIsDownloading(true);
      setDownloadProgress({ progress: 0, downloadedBytes: 0, totalBytes: 0 });
      
      try {
        const result = await onDownload(updateInfo.downloadUrl);
        console.log('다운로드 결과:', result);
        
        if (result && result.success) {
          console.log('다운로드 성공 - 완료 상태로 변경');
          setDownloadComplete(true);
          setTimeout(() => {
            console.log('앱이 곧 종료됩니다');
          }, 1000);
        } else {
          console.error('다운로드 실패:', result);
          setIsDownloading(false);
          setDownloadProgress(null);
        }
      } catch (error) {
        console.error('다운로드 예외 발생:', error);
        setIsDownloading(false);
        setDownloadProgress(null);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

              {/* 다운로드 진행률 표시 */}
              {isDownloading && downloadProgress && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700 font-medium">📥 다운로드 중...</span>
                      <span className="text-green-600 font-mono text-sm">{downloadProgress.progress}%</span>
                    </div>
                    
                    {/* 진행률 바 */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress.progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-green-600">
                      <span>
                        {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes)}
                      </span>
                      <span>
                        {downloadProgress.progress === 100 ? '설치 프로그램 실행 중...' : '다운로드 중...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 다운로드 완료 */}
              {downloadComplete && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500 text-lg">✅</span>
                    <div>
                      <p className="text-green-700 font-medium">다운로드 완료!</p>
                      <p className="text-green-600 text-sm mt-1">
                        설치 프로그램이 시작됩니다. 잠시만 기다려주세요...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 일반 안내 */}
              {!isDownloading && !downloadComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-amber-500 text-lg">⚠️</span>
                    <div>
                      <p className="text-amber-700 font-medium">자동 업데이트</p>
                      <p className="text-amber-600 text-sm mt-1">
                        다운로드 버튼을 클릭하면 자동으로 설치 프로그램이 실행됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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