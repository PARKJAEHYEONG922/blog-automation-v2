import React, { useState, useCallback, useEffect } from 'react';
import Step1Setup from './components/Step1Setup';
import Step2Generation from './components/Step2Generation';
import LLMSettings from './components/LLMSettings';
import LogPanel from './components/LogPanel';
import './App.css';

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
    generatedTitles: [] as string[]
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
      generatedTitles: []
    });
    setGeneratedContent('');
  };

  const handleGoBack = () => {
    setCurrentStep(1);
    // 기존 데이터는 유지
  };

  return (
    <div className="app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '56px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                <span>🤖</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  margin: 0,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  AI 블로그 자동화 V3
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748b', marginTop: '4px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: aiModelStatus.writing !== '미설정' ? '#10b981' : '#ef4444' }}></span>
                    <span>글쓰기: {aiModelStatus.writing}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: aiModelStatus.image !== '미설정' ? '#8b5cf6' : '#ef4444' }}></span>
                    <span>이미지: {aiModelStatus.image}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setShowLogs(!showLogs)}
                style={{
                  background: showLogs ? '#059669' : 'white',
                  color: showLogs ? 'white' : '#475569',
                  border: showLogs ? 'none' : '2px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  boxShadow: showLogs 
                    ? '0 0 0 1px rgba(5, 150, 105, 0.1), 0 2px 4px rgba(5, 150, 105, 0.2)'
                    : '0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.06)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '80px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!showLogs) {
                    const target = e.target as HTMLElement;
                    target.style.background = '#f0fdf4';
                    target.style.borderColor = '#bbf7d0';
                    target.style.color = '#059669';
                    target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showLogs) {
                    const target = e.target as HTMLElement;
                    target.style.background = 'white';
                    target.style.borderColor = '#e2e8f0';
                    target.style.color = '#475569';
                    target.style.transform = 'translateY(0)';
                  }
                }}
              >
                <span>📝</span>
                <span>로그</span>
              </button>
              <button
                onClick={() => setShowLLMSettings(true)}
                style={{
                  background: showLLMSettings ? '#059669' : 'white',
                  color: showLLMSettings ? 'white' : '#475569',
                  border: showLLMSettings ? 'none' : '2px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                  boxShadow: showLLMSettings 
                    ? '0 0 0 1px rgba(5, 150, 105, 0.1), 0 2px 4px rgba(5, 150, 105, 0.2)'
                    : '0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.06)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '80px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!showLLMSettings) {
                    const target = e.target as HTMLElement;
                    target.style.background = '#f0fdf4';
                    target.style.borderColor = '#bbf7d0';
                    target.style.color = '#059669';
                    target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showLLMSettings) {
                    const target = e.target as HTMLElement;
                    target.style.background = 'white';
                    target.style.borderColor = '#e2e8f0';
                    target.style.color = '#475569';
                    target.style.transform = 'translateY(0)';
                  }
                }}
              >
                <span>🤖</span>
                <span>API 설정</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: showLogs ? 1 : '1', overflowY: 'auto' }}>
          <div className="app-main">
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

      {/* LLM 설정 모달 */}
      {showLLMSettings && (
        <LLMSettings
          onClose={() => setShowLLMSettings(false)}
          onSettingsChange={() => {
            // 설정 변경 후 모델 상태 새로고침
            refreshModelStatus();
          }}
        />
      )}
    </div>
  );
};

export default App;