import { useState, useCallback } from 'react';

export interface PublishState {
  isPublishing: boolean;
  status: 'idle' | 'preparing' | 'publishing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

export const usePublishing = () => {
  const [publishState, setPublishState] = useState<PublishState>({
    isPublishing: false,
    status: 'idle',
    progress: 0,
    message: ''
  });

  const updatePublishState = useCallback((updates: Partial<PublishState>) => {
    setPublishState(prev => ({ ...prev, ...updates }));
  }, []);

  const startPublishing = useCallback(() => {
    setPublishState({
      isPublishing: true,
      status: 'preparing',
      progress: 0,
      message: '발행 준비 중...'
    });
  }, []);

  const updateProgress = useCallback((progress: number, message: string) => {
    setPublishState(prev => ({
      ...prev,
      progress,
      message,
      status: progress === 100 ? 'completed' : 'publishing'
    }));
  }, []);

  const completePublishing = useCallback((success: boolean, message: string) => {
    setPublishState(prev => ({
      ...prev,
      isPublishing: false,
      status: success ? 'completed' : 'failed',
      progress: success ? 100 : prev.progress,
      message,
      error: success ? undefined : message
    }));
  }, []);

  const resetPublishing = useCallback(() => {
    setPublishState({
      isPublishing: false,
      status: 'idle',
      progress: 0,
      message: ''
    });
  }, []);

  const publishToBlog = useCallback(async (content: string, platform: string) => {
    startPublishing();
    
    try {
      updateProgress(10, '콘텐츠 검증 중...');
      
      // 콘텐츠 유효성 검사
      if (!content || content.trim().length < 100) {
        throw new Error('콘텐츠가 너무 짧습니다. (최소 100자 이상)');
      }

      updateProgress(30, '발행 플랫폼 연결 중...');
      
      // 실제 발행 로직 (플랫폼별 분기)
      updateProgress(50, '콘텐츠 업로드 중...');
      
      const result = await window.electronAPI.publishToBlog(content);
      
      if (result.success) {
        updateProgress(100, '발행 완료!');
        completePublishing(true, '블로그 포스트가 성공적으로 발행되었습니다.');
        return { success: true };
      } else {
        throw new Error('발행 처리 중 오류가 발생했습니다.');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      completePublishing(false, errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [startPublishing, updateProgress, completePublishing]);

  return {
    publishState,
    publishToBlog,
    resetPublishing,
    updatePublishState
  };
};