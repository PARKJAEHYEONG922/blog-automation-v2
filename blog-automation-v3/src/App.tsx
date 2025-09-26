import React, { useState, useCallback, useEffect } from 'react';
import Step1Setup from './components/Step1Setup';
import Step2Generation from './components/Step2Generation';
import LLMSettings from './components/LLMSettings';
import LogPanel from './components/LogPanel';

type Step = 1 | 2;

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [setupData, setSetupData] = useState({
    writingStylePaths: [] as string[],
    seoGuidePath: '',
    topic: '',
    selectedTitle: '',
    mainKeyword: '',
    subKeywords: '',
    blogContent: '',
    generatedContent: undefined as string | undefined,
    isAIGenerated: false,
    generatedTitles: [] as string[],
    imagePrompts: [] as any[],
    imagePromptGenerationFailed: false
  });
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [showLLMSettings, setShowLLMSettings] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  
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

  const handleSetupComplete = (data: typeof setupData) => {
    setSetupData(data);
    
    // Set generated content and move to Step 2
    if (data.generatedContent) {
      setGeneratedContent(data.generatedContent);
    }
    setCurrentStep(2);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSetupData({ 
      writingStylePaths: [], 
      seoGuidePath: '', 
      topic: '', 
      selectedTitle: '',
      mainKeyword: '',
      subKeywords: '',
      blogContent: '',
      generatedContent: undefined,
      isAIGenerated: false,
      generatedTitles: [],
      imagePrompts: [],
      imagePromptGenerationFailed: false
    });
    setGeneratedContent('');
  };

  const handleGoBack = () => {
    setCurrentStep(1);
    // 기존 데이터는 유지
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
                    <div className={`w-2 h-2 rounded-full ${
                      aiModelStatus.writing !== '미설정' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span>글쓰기: {aiModelStatus.writing}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      aiModelStatus.image !== '미설정' ? 'bg-purple-500' : 'bg-red-500'
                    }`}></div>
                    <span>이미지: {aiModelStatus.image}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  showLogs
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 hover:-translate-y-0.5 shadow-sm'
                }`}
              >
                <span>📝</span>
                <span>로그</span>
              </button>
              <button
                onClick={() => setShowLLMSettings(true)}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  showLLMSettings
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
            {currentStep === 1 && (
              <Step1Setup 
                onComplete={handleSetupComplete} 
                initialData={setupData}
              />
            )}
            {currentStep === 2 && (
              <Step2Generation 
                content={generatedContent}
                setupData={setupData}
                onReset={handleReset}
                onGoBack={handleGoBack}
              />
            )}
          </div>
        </div>
        <LogPanel isVisible={showLogs} />
      </main>

      {/* LLM Settings Modal */}
      {showLLMSettings && (
        <LLMSettings
          onClose={() => setShowLLMSettings(false)}
          onSettingsChange={() => {
            refreshModelStatus();
          }}
        />
      )}
    </div>
  );
};

export default App;