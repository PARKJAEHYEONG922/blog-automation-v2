import React, { useState } from 'react';
import './index.css';

// 3단계 워크플로우 컴포넌트들
import Step1 from './components/Step1';
import Step2 from './components/Step2';
import Step3 from './components/Step3';
import LLMSettings from './components/LLMSettings';
import LogPanel from './components/LogPanel';

// Context 제거 - 직접 상태 관리 사용

import { BlogWritingResult } from './services/blog-writing-service';
import { LLMClientFactory } from './services/llm-client-factory';

export interface WorkflowData {
  platform: string;
  keyword: string;
  subKeywords: string[];
  contentType: string;
  reviewType: string;
  tone: string;
  customPrompt: string;
  blogDescription: string;
  bloggerIdentity?: string; // 블로거 정체성
  selectedTitle: string;
  generatedTitles?: string[]; // 생성된 제목들
  titlesWithSearch?: { title: string; searchQuery: string }[]; // 제목과 검색어
  searchKeyword?: string; // Step2에서 사용자가 수정한 서치키워드
  collectedData: unknown;
  writingResult?: BlogWritingResult; // 글쓰기 결과
  generatedContent: string;
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(() => {
    // 더미 데이터가 있으면 적절한 Step으로 이동
    try {
      const savedData = localStorage.getItem('workflow-data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.writingResult && parsed.writingResult.success) {
          console.log('🚀 더미 데이터 감지 - Step3으로 이동');
          return 3; // 글쓰기 결과가 있으면 Step3로
        } else if (parsed.collectedData && parsed.collectedData.success) {
          console.log('🚀 더미 데이터 감지 - Step2로 이동');
          return 2; // 수집 데이터가 있으면 Step2로
        } else if (parsed.platform && parsed.selectedTitle) {
          console.log('🚀 더미 데이터 감지 - Step2로 이동');
          return 2; // 기본 설정이 있으면 Step2로
        }
      }
    } catch (error) {
      console.error('Step 결정 실패:', error);
    }
    return 1; // 기본값
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isReturningFromLaterStep, setIsReturningFromLaterStep] = useState(false);
  
  // 직접 AI 모델 상태 관리
  const [aiModelStatus, setAiModelStatus] = useState({
    information: '미설정',
    writing: '미설정',
    image: '미설정'
  });

  // 모델 상태 새로고침 함수
  const refreshModelStatus = React.useCallback(() => {
    try {
      const status = LLMClientFactory.getCachedModelStatus();
      setAiModelStatus(status);
    } catch (error) {
      console.error('모델 상태 확인 실패:', error);
    }
  }, []);

  // 초기화 및 상태 확인 (한번만 실행)
  React.useEffect(() => {
    let isInitialized = false;
    
    const initializeAndRefresh = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      try {
        // 렌더러 프로세스 console.log 오버라이드 설정
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.log = (...args: any[]) => {
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
          originalConsoleLog(...args); // 원래 로그도 출력
          // 메인 프로세스로 전송
          window.electronAPI?.sendLog('info', message);
        };

        console.error = (...args: any[]) => {
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
          originalConsoleError(...args); // 원래 로그도 출력
          // 메인 프로세스로 전송
          window.electronAPI?.sendLog('error', message);
        };

        console.warn = (...args: any[]) => {
          const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
          originalConsoleWarn(...args); // 원래 로그도 출력
          // 메인 프로세스로 전송
          window.electronAPI?.sendLog('warning', message);
        };

        await LLMClientFactory.loadDefaultSettings();
        // 로드 완료 후 상태 새로고침
        refreshModelStatus();
        
        console.log('🚀 렌더러 프로세스 로그 캡처 활성화됨');
      } catch (error) {
        console.error('초기화 실패:', error);
      }
    };

    initializeAndRefresh();
  }, []); // 빈 의존성 배열로 한번만 실행

  const [workflowData, setWorkflowData] = useState<WorkflowData>(() => {
    // localStorage에서 더미 데이터 불러오기
    try {
      const savedData = localStorage.getItem('workflow-data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('🔄 더미 데이터 불러옴:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('더미 데이터 불러오기 실패:', error);
    }
    
    // 기본값
    return {
      platform: '',
      keyword: '',
      subKeywords: [],
      contentType: '',
      reviewType: '',
      tone: '',
      customPrompt: '',
      blogDescription: '',
      selectedTitle: '',
      generatedTitles: [],
      titlesWithSearch: [],
      collectedData: null,
      generatedContent: ''
    };
  });

  // 초기화 로직은 모두 AppInitContext로 이동



  const updateWorkflowData = (updates: Partial<WorkflowData>) => {
    setWorkflowData(prev => {
      console.log('🔍 updateWorkflowData 호출:', {
        updates,
        isReturningFromLaterStep,
        hasCollectedData: !!prev.collectedData,
        hasWritingResult: !!prev.writingResult
      });
      
      const newData = { ...prev, ...updates };
      
      // Step1에서 핵심 정보가 변경된 경우에만 Step2 상태 초기화
      const actuallyChanged = 
        (updates.platform && updates.platform !== prev.platform) ||
        (updates.keyword && updates.keyword !== prev.keyword) ||
        (updates.contentType && updates.contentType !== prev.contentType) ||
        (updates.reviewType && updates.reviewType !== prev.reviewType) ||
        (updates.tone && updates.tone !== prev.tone) ||
        (updates.selectedTitle && updates.selectedTitle !== prev.selectedTitle);
      
      console.log('🔍 변경사항 분석:', {
        actuallyChanged,
        isReturningFromLaterStep,
        platformChanged: updates.platform && updates.platform !== prev.platform,
        keywordChanged: updates.keyword && updates.keyword !== prev.keyword,
        selectedTitleChanged: updates.selectedTitle && updates.selectedTitle !== prev.selectedTitle
      });
      
      // 이후 단계에서 돌아온 상황이 아니고, 실제로 값이 변경된 경우에만 초기화
      if (actuallyChanged && !isReturningFromLaterStep) {
        console.log('🔄 핵심 정보 실제 변경 감지 - Step2/Step3 상태 초기화');
        newData.collectedData = null;
        newData.writingResult = undefined;  // 글쓰기 결과도 초기화
        newData.searchKeyword = undefined;
        
        // Step3 이미지 상태도 초기화
        sessionStorage.removeItem('step3-image-urls');
        sessionStorage.removeItem('step3-image-status');
        console.log('🔄 핵심 정보 변경으로 인한 이미지 상태 초기화');
      } else if (isReturningFromLaterStep) {
        console.log('🔙 이후 단계에서 돌아옴 - 기존 데이터 모두 유지 (정보수집 + 글쓰기 결과)');
        console.log('🔙 유지되는 데이터:', {
          collectedData: !!newData.collectedData,
          writingResult: !!newData.writingResult,
          searchKeyword: newData.searchKeyword
        });
      }
      
      return newData;
    });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1
            data={workflowData}
            onNext={(data) => {
              updateWorkflowData(data);
              setIsReturningFromLaterStep(false); // Step1에서 다음으로 갈 때는 리셋
              setCurrentStep(2);
            }}
            isBackFromStep2={isReturningFromLaterStep}
          />
        );
      case 2:
        return (
          <Step2
            data={workflowData}
            onNext={(data) => {
              updateWorkflowData(data);
              setCurrentStep(3);
            }}
            onDataUpdate={(data) => {
              updateWorkflowData(data);
            }}
            onBack={() => {
              // Step2에서 돌아갈 때 현재 상태를 먼저 저장
              console.log('🔙 Step2에서 돌아가기 - 현재 데이터 보존 시도');
              setIsReturningFromLaterStep(true); // Step2에서 돌아갈 때 플래그 설정
              setCurrentStep(1);
            }}
            aiModelStatus={aiModelStatus}
          />
        );
      case 3:
        return (
          <Step3
            data={workflowData}
            onComplete={(data) => {
              updateWorkflowData(data);
              // 완료 처리
            }}
            onBack={() => setCurrentStep(2)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* 헤더 - 고정 */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-4">
              <div className="section-icon blue" style={{width: '32px', height: '32px', fontSize: '16px'}}>
                <span>🤖</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-slate-900">
                  AI 블로그 자동화 V2
                </h1>
                <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>정보처리: {aiModelStatus.information}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>글쓰기: {aiModelStatus.writing}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>이미지: {aiModelStatus.image}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  style={{
                    background: showLogs ? '#059669' : 'white',
                    color: showLogs ? 'white' : '#475569',
                    border: showLogs ? 'none' : '2px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    fontFamily: 'Poppins, sans-serif',
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
                  onClick={() => {
                    setShowSettings(!showSettings);
                    // API 설정 화면 진입 시 스크롤을 최상단으로 이동
                    if (!showSettings) {
                      setTimeout(() => {
                        const mainElement = document.querySelector('main');
                        if (mainElement) {
                          mainElement.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }, 100);
                    }
                  }}
                  style={{
                    background: showSettings ? '#2563eb' : 'white',
                    color: showSettings ? 'white' : '#475569',
                    border: showSettings ? 'none' : '2px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    boxShadow: showSettings 
                      ? '0 0 0 1px rgba(37, 99, 235, 0.1), 0 2px 4px rgba(37, 99, 235, 0.2)'
                      : '0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.06)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '80px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!showSettings) {
                      const target = e.target as HTMLElement;
                      target.style.background = '#f8fafc';
                      target.style.borderColor = '#cbd5e1';
                      target.style.color = '#334155';
                      target.style.transform = 'translateY(-1px)';
                      target.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showSettings) {
                      const target = e.target as HTMLElement;
                      target.style.background = 'white';
                      target.style.borderColor = '#e2e8f0';
                      target.style.color = '#475569';
                      target.style.transform = 'translateY(0)';
                      target.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.06)';
                    }
                  }}
                >
                  <span>⚙️</span>
                  <span>API 설정</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 - 스크롤 가능 */}
      <main className="flex-1 overflow-hidden flex">
        <div className={`${showLogs ? 'flex-1' : 'w-full'} overflow-y-auto`}>
          {showSettings ? (
            <LLMSettings 
              onClose={() => {
                setShowSettings(false);
                setIsReturningFromLaterStep(false); // API 설정에서 나올 때 플래그 리셋
                // 설정 변경 후 상태만 새로고침
                refreshModelStatus();
              }}
              onSettingsChange={refreshModelStatus} // 설정 변경 시 실시간 업데이트
            />
          ) : (
            renderCurrentStep()
          )}
        </div>
        <LogPanel isVisible={showLogs} />
      </main>
    </div>
  );
};

export default App;