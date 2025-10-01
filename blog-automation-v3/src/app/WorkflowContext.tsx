import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { WorkflowData } from '@/shared/types/common.types';

interface WorkflowContextType {
  // Workflow 데이터
  workflowData: WorkflowData;

  // 현재 단계
  currentStep: 1 | 2;

  // 데이터 업데이트
  updateWorkflowData: (data: Partial<WorkflowData>) => void;

  // 단계 이동
  goToStep: (step: 1 | 2) => void;
  nextStep: () => void;
  prevStep: () => void;

  // 초기화
  reset: () => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// 초기 워크플로우 데이터
const initialWorkflowData: WorkflowData = {
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
  imagePromptGenerationFailed: false,
  publishedUrl: undefined,
  publishPlatform: undefined,
  selectedBoard: undefined
};

export const WorkflowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [workflowData, setWorkflowData] = useState<WorkflowData>(initialWorkflowData);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const updateWorkflowData = useCallback((data: Partial<WorkflowData>) => {
    setWorkflowData(prev => ({ ...prev, ...data }));
  }, []);

  const goToStep = useCallback((step: 1 | 2) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => (prev === 1 ? 2 : prev) as 1 | 2);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => (prev === 2 ? 1 : prev) as 1 | 2);
  }, []);

  const reset = useCallback(async () => {
    // 브라우저 정리
    try {
      console.log('🧹 브라우저 정리 시작...');

      if (window.electronAPI?.playwrightCleanup) {
        await window.electronAPI.playwrightCleanup();
        console.log('✅ Playwright 브라우저 정리 완료');
      }

      if (window.electronAPI?.cleanupClaudeWeb) {
        const result = await window.electronAPI.cleanupClaudeWeb();
        if (result.success) {
          console.log('✅ Claude Web 서비스 정리 완료');
        } else {
          console.warn('⚠️ Claude Web 서비스 정리 실패:', result.error);
        }
      }
    } catch (error) {
      console.warn('⚠️ 브라우저 정리 중 오류:', error);
    }

    // 상태 초기화
    setWorkflowData(initialWorkflowData);
    setCurrentStep(1);
  }, []);

  const value: WorkflowContextType = {
    workflowData,
    currentStep,
    updateWorkflowData,
    goToStep,
    nextStep,
    prevStep,
    reset
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

// Custom Hook
export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
};
