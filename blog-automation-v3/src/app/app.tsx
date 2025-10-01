import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { LogPanel, Button } from '@/shared/components';
import ErrorBoundary from '@/shared/components/error/ErrorBoundary';
import LoadingFallback from '@/shared/components/ui/LoadingFallback';
import { DialogProvider } from './DialogContext';
import { WorkflowProvider, useWorkflow } from './WorkflowContext';

// Code Splitting: 필요한 시점에만 로드
const SetupContainer = lazy(() => import('@/01-setup').then(module => ({ default: module.SetupContainer })));
const GenerationContainer = lazy(() => import('@/02-generation').then(module => ({ default: module.GenerationContainer })));
const LLMSettings = lazy(() => import('@/features/settings').then(module => ({ default: module.LLMSettings })));
const UpdateModal = lazy(() => import('@/features/settings').then(module => ({ default: module.UpdateModal })));

const AppContent: React.FC = () => {
  const { currentStep, workflowData, updateWorkflowData, nextStep, prevStep, reset } = useWorkflow();

  const [showLLMSettings, setShowLLMSettings] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  // AI 모델 상태
  const [aiModelStatus, setAiModelStatus] = useState({
    writing: '미설정',
    image: '미설정'
  });

  // 모델 상태 새로고침 함수
  const refreshModelStatus = useCallback(async () => {
    try {
      const llmSettings = await window.electronAPI?.getLLMSettings?.();
      if (llmSettings?.appliedSettings) {
        const { writing, image } = llmSettings.appliedSettings;

        setAiModelStatus({
          writing: writing?.provider && writing?.model ?
            `${writing.provider} ${writing.model}` : '미설정',
          image: image?.provider && image?.model ?
            `${image.provider} ${image.model}` : '미설정'
        });
      }
    } catch (error) {
      console.error('모델 상태 확인 실패:', error);
    }
  }, []);

  // 초기화 시 모델 상태 로드
  useEffect(() => {
    refreshModelStatus();
  }, [refreshModelStatus]);

  // 업데이트 확인 결과 리스너
  useEffect(() => {
    const handleUpdateCheckResult = (data: any) => {
      setUpdateInfo(data);
      setShowUpdateModal(true);
    };

    const cleanup = window.electronAPI?.onUpdateCheckResult?.(handleUpdateCheckResult);
    return cleanup;
  }, []);

  const handleUpdateDownload = async (downloadUrl: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await window.electronAPI?.downloadUpdate?.(downloadUrl);
      if (result?.success) {
        console.log('업데이트 다운로드 시작됨');
        return { success: true };
      } else {
        console.error('업데이트 다운로드 실패:', result?.error);
        return { success: false, error: result?.error || '다운로드 실패' };
      }
    } catch (error) {
      console.error('업데이트 다운로드 오류:', error);
      return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  AI 블로그 자동화 V3
                </h1>
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-2 h-2 rounded-full ${aiModelStatus.writing !== '미설정' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    <span>글쓰기: {aiModelStatus.writing}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-2 h-2 rounded-full ${aiModelStatus.image !== '미설정' ? 'bg-purple-500' : 'bg-red-500'
                      }`}></div>
                    <span>이미지: {aiModelStatus.image}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={() => setShowLogs(!showLogs)}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${showLogs
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 hover:-translate-y-0.5 shadow-sm'
                  }`}
              >
                <span>📝</span>
                <span>로그</span>
              </Button>
              <button
                onClick={() => setShowLLMSettings(true)}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${showLLMSettings
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 hover:-translate-y-0.5 shadow-sm'
                  }`}
              >
                <span>🤖</span>
                <span>API 설정</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex">
        <div className={`${showLogs ? 'flex-1' : 'w-full'} overflow-y-auto`}>
          <div className="h-full">
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback message="컴포넌트 로딩 중..." fullScreen />}>
                {currentStep === 1 && <SetupContainer />}
                {currentStep === 2 && <GenerationContainer />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
        <LogPanel isVisible={showLogs} />
      </main>

      {/* LLM Settings Modal */}
      {showLLMSettings && (
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="설정 로딩 중..." />}>
            <LLMSettings
              onClose={() => setShowLLMSettings(false)}
              onSettingsChange={() => {
                refreshModelStatus();
                // Step2에서도 감지할 수 있도록 전역 이벤트 발생
                window.dispatchEvent(new CustomEvent('app-llm-settings-changed'));
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Update Modal */}
      <Suspense fallback={null}>
        <UpdateModal
          isVisible={showUpdateModal}
          updateInfo={updateInfo}
          onClose={() => setShowUpdateModal(false)}
          onDownload={handleUpdateDownload}
        />
      </Suspense>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DialogProvider>
      <WorkflowProvider>
        <AppContent />
      </WorkflowProvider>
    </DialogProvider>
  );
};

export default App;
