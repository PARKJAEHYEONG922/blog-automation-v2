/**
 * Step2 Generation 커스텀 훅
 * UI와 비즈니스 로직 분리
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkflow } from '@/app/WorkflowContext';
import { useDialog } from '@/app/DialogContext';
import { ContentProcessor } from '../services/content-processor';
import { GenerationService } from '../services/generation-service';

export interface ImageUrls {
  [key: string]: string;
}

export interface UseGenerationReturn {
  // 상태
  aiModelStatus: {
    writing: string;
    image: string;
  };
  originalContent: string;
  editedContent: string;
  charCount: number;
  charCountWithSpaces: number;
  imagePositions: string[];
  images: ImageUrls;
  imageAIInfo: string;
  imagePrompts: any[];
  isRegeneratingPrompts: boolean;
  imagePromptError: string | null;
  isRefreshingContent: boolean;
  selectedPlatform: string;
  editorRef: React.RefObject<HTMLDivElement>;

  // 상태 업데이트 함수
  setSelectedPlatform: (platform: string) => void;
  handleContentChange: (newContent: string) => void;
  handleImagesChange: (newImages: ImageUrls) => void;

  // 비즈니스 로직 함수
  handleRefreshContent: () => Promise<void>;
  handleRegenerateImagePrompts: () => Promise<void>;
  handleGoBack: () => void;
  handleReset: () => void;
}

export const useGeneration = (): UseGenerationReturn => {
  const { workflowData, reset, prevStep } = useWorkflow();
  const { showAlert } = useDialog();

  const editorRef = useRef<HTMLDivElement>(null);

  // AI 모델 상태
  const [aiModelStatus, setAiModelStatus] = useState({
    writing: '미설정',
    image: '미설정'
  });

  // 콘텐츠 관련 상태
  const [originalContent, setOriginalContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [charCount, setCharCount] = useState(0);
  const [charCountWithSpaces, setCharCountWithSpaces] = useState(0);

  // 이미지 관련 상태
  const [imagePositions, setImagePositions] = useState<string[]>([]);
  const [images, setImages] = useState<ImageUrls>({});
  const [imageAIInfo, setImageAIInfo] = useState<string>('확인 중...');
  const [imagePrompts, setImagePrompts] = useState<any[]>([]);

  // 이미지 프롬프트 재생성 관련 상태
  const [isRegeneratingPrompts, setIsRegeneratingPrompts] = useState(false);
  const [imagePromptError, setImagePromptError] = useState<string | null>(null);

  // 수정된 글 가져오기 관련 상태
  const [isRefreshingContent, setIsRefreshingContent] = useState(false);

  // 발행 플랫폼 선택 상태
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  // 모델 상태 로드
  useEffect(() => {
    const loadModelStatus = async () => {
      const status = await GenerationService.loadModelStatus();
      setAiModelStatus(status);
    };

    loadModelStatus();

    // LLM 설정 변경 이벤트 리스너
    const handleSettingsChanged = () => loadModelStatus();
    window.addEventListener('app-llm-settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('app-llm-settings-changed', handleSettingsChanged);
  }, []);

  // 이미지 AI 설정 정보 가져오기
  useEffect(() => {
    const loadImageAIInfo = async () => {
      const info = await GenerationService.getImageAIInfo();
      setImageAIInfo(info);
    };

    loadImageAIInfo();
  }, []);

  // 초기 콘텐츠 처리
  useEffect(() => {
    if (workflowData.generatedContent) {
      const content = workflowData.generatedContent;
      setOriginalContent(content);
      setEditedContent(content);

      // 콘텐츠에서 이미지 위치 추출
      const positions = ContentProcessor.extractImagePositions(content);
      setImagePositions(positions);

      // 초기 이미지 맵 생성
      const initialImages: ImageUrls = {};
      positions.forEach((_, index) => {
        initialImages[`image_${index + 1}`] = '';
      });
      setImages(initialImages);

      // 글자 수 계산
      const { withoutSpaces, withSpaces } = ContentProcessor.countChars(content);
      setCharCount(withoutSpaces);
      setCharCountWithSpaces(withSpaces);
    }

    // 이미지 프롬프트 설정
    if (workflowData.imagePrompts && workflowData.imagePrompts.length > 0) {
      setImagePrompts(workflowData.imagePrompts);
      setImagePromptError(null);
    } else if (workflowData.imagePromptGenerationFailed) {
      setImagePromptError('이미지 프롬프트 생성에 실패했습니다. "이미지 프롬프트 재생성" 버튼을 눌러 다시 시도해주세요.');
    }
  }, [workflowData]);

  // 컴포넌트 마운트 시 스크롤을 최상단으로 이동
  useEffect(() => {
    const scrollableContainer = document.querySelector('main > div');
    const mainElement = document.querySelector('main');

    if (scrollableContainer) {
      scrollableContainer.scrollTop = 0;
    } else if (mainElement) {
      mainElement.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // 콘텐츠 변경 핸들러
  const handleContentChange = useCallback((newContent: string) => {
    setEditedContent(newContent);

    // 이미지 위치 재추출
    const positions = ContentProcessor.extractImagePositions(newContent);
    setImagePositions(positions);

    // 글자 수 재계산
    const { withoutSpaces, withSpaces } = ContentProcessor.countChars(newContent);
    setCharCount(withoutSpaces);
    setCharCountWithSpaces(withSpaces);
  }, []);

  // 이미지 변경 콜백
  const handleImagesChange = useCallback((newImages: ImageUrls) => {
    setImages(newImages);
  }, []);

  // Claude에서 수정된 콘텐츠 가져오기
  const handleRefreshContent = useCallback(async () => {
    setIsRefreshingContent(true);

    try {
      const newContent = await GenerationService.downloadContentFromClaude();

      setEditedContent(newContent);

      // 이미지 위치 재추출
      const positions = ContentProcessor.extractImagePositions(newContent);
      setImagePositions(positions);

      // 글자 수 재계산
      const { withoutSpaces, withSpaces } = ContentProcessor.countChars(newContent);
      setCharCount(withoutSpaces);
      setCharCountWithSpaces(withSpaces);

      showAlert({ type: 'success', message: '수정된 글을 성공적으로 가져왔습니다!' });
    } catch (error) {
      console.error('콘텐츠 새로고침 실패:', error);
      showAlert({ type: 'error', message: (error as Error).message });
    } finally {
      setIsRefreshingContent(false);
    }
  }, [showAlert]);

  // 이미지 프롬프트 재생성
  const handleRegenerateImagePrompts = useCallback(async () => {
    setIsRegeneratingPrompts(true);
    setImagePromptError(null);

    try {
      const prompts = await GenerationService.regenerateImagePrompts(editedContent);

      if (prompts.length > 0) {
        setImagePrompts(prompts);
        showAlert({ type: 'success', message: `이미지 프롬프트 ${prompts.length}개가 생성되었습니다.` });
      } else {
        throw new Error('이미지 프롬프트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 프롬프트 재생성 실패:', error);
      setImagePromptError((error as Error).message);
      showAlert({ type: 'error', message: (error as Error).message });
    } finally {
      setIsRegeneratingPrompts(false);
    }
  }, [editedContent, showAlert]);

  // 뒤로 가기
  const handleGoBack = useCallback(() => {
    prevStep();
  }, [prevStep]);

  // 초기화
  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return {
    // 상태
    aiModelStatus,
    originalContent,
    editedContent,
    charCount,
    charCountWithSpaces,
    imagePositions,
    images,
    imageAIInfo,
    imagePrompts,
    isRegeneratingPrompts,
    imagePromptError,
    isRefreshingContent,
    selectedPlatform,
    editorRef,

    // 상태 업데이트
    setSelectedPlatform,
    handleContentChange,
    handleImagesChange,

    // 비즈니스 로직
    handleRefreshContent,
    handleRegenerateImagePrompts,
    handleGoBack,
    handleReset
  };
};
