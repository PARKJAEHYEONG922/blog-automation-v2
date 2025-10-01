/**
 * Step2 Generation 커스텀 훅
 * UI와 비즈니스 로직 분리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflow } from '@/app/WorkflowContext';
import { useDialog } from '@/app/DialogContext';
import { BlogWritingService } from '@/shared/services/content/blog-writing-service';
import { ContentProcessor } from '@/02-generation/services/content-processor';

export interface UseGenerationReturn {
  // WorkflowContext
  workflowData: any;
  prevStep: () => void;
  reset: () => void;

  // AI 모델 상태
  aiModelStatus: {
    writing: string;
    image: string;
  };

  // 콘텐츠 상태
  originalContent: string;
  editedContent: string;
  charCount: number;
  charCountWithSpaces: number;
  currentFontSize: string;
  fontSizes: Array<{ name: string; size: string; weight: string }>;
  activeTab: 'original' | 'edited';
  isEditing: boolean;

  // 이미지 관련 상태
  imagePositions: string[];
  images: { [key: string]: string };
  isGeneratingImages: boolean;
  imagePrompts: any[];
  isRegeneratingPrompts: boolean;
  imagePromptError: string | null;

  // 발행 관련 상태
  selectedPlatform: string;
  isRefreshingContent: boolean;

  // Refs
  editorRef: React.RefObject<HTMLDivElement>;

  // 상태 업데이트 함수
  setEditedContent: (content: string) => void;
  setCurrentFontSize: (size: string) => void;
  setActiveTab: (tab: 'original' | 'edited') => void;
  setIsEditing: (editing: boolean) => void;
  setImages: (images: { [key: string]: string }) => void;
  setSelectedPlatform: (platform: string) => void;

  // 비즈니스 로직 함수
  handleImagesChange: (newImages: { [key: string]: string }) => void;
  generateImagePrompts: () => Promise<void>;
  regenerateImagePrompts: () => Promise<void>;
  handleRefreshContent: () => Promise<void>;
  replaceImagesInContent: () => void;
  handlePublish: () => void;
  updateCharCount: () => void;
  handleContentChange: () => void;
  restoreOriginal: () => void;
  copyToClipboard: () => Promise<boolean>;
  handleFontSizeChange: (newSize: string) => void;
  applyFontSizeToSelection: (fontSize: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleClick: () => void;

  // 유틸리티 함수
  processMarkdown: (content: string) => string;
  getPlatformName: (platform: string) => string;
}

export const useGeneration = (): UseGenerationReturn => {
  const { showAlert } = useDialog();
  const { workflowData, prevStep, reset } = useWorkflow();

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

  // AI 설정 변경 이벤트 리스너
  useEffect(() => {
    const handleSettingsChanged = () => {
      refreshModelStatus();
    };

    window.addEventListener('app-llm-settings-changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('app-llm-settings-changed', handleSettingsChanged);
    };
  }, [refreshModelStatus]);

  const editorRef = useRef<HTMLDivElement>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [charCount, setCharCount] = useState(0);
  const [charCountWithSpaces, setCharCountWithSpaces] = useState(0);
  const [currentFontSize, setCurrentFontSize] = useState('15px');

  const fontSizes = [
    { name: '대제목 (24px)', size: '24px', weight: 'bold' },
    { name: '소제목 (19px)', size: '19px', weight: 'bold' },
    { name: '강조 (16px)', size: '16px', weight: 'bold' },
    { name: '일반 (15px)', size: '15px', weight: 'normal' }
  ];

  const [imagePositions, setImagePositions] = useState<string[]>([]);
  const [images, setImages] = useState<{[key: string]: string}>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | 'edited'>('edited');
  const [imagePrompts, setImagePrompts] = useState<any[]>([]);

  const [isRegeneratingPrompts, setIsRegeneratingPrompts] = useState(false);
  const [imagePromptError, setImagePromptError] = useState<string | null>(null);
  const [isRefreshingContent, setIsRefreshingContent] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  // 이미지 변경 콜백
  const handleImagesChange = useCallback((newImages: { [key: string]: string }) => {
    setImages(newImages);
  }, []);

  // 마크다운 처리 함수들은 GenerationContainer에서 그대로 가져옴
  const processMarkdown = useCallback((content: string): string => {
    return ContentProcessor.processMarkdown(content);
  }, []);

  // 이미지 프롬프트 생성
  const generateImagePrompts = useCallback(async () => {
    setIsRegeneratingPrompts(true);
    setImagePromptError(null);

    try {
      const content = workflowData.generatedContent || '';
      const result = await BlogWritingService.generateImagePrompts(content);

      if (result.success && result.imagePrompts) {
        setImagePrompts(result.imagePrompts);
        showAlert('success', `이미지 프롬프트 ${result.imagePrompts.length}개가 생성되었습니다.`);
      } else {
        throw new Error('이미지 프롬프트 생성 실패');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '이미지 프롬프트 생성 중 오류가 발생했습니다.';
      setImagePromptError(errorMessage);
      showAlert('error', errorMessage);
    } finally {
      setIsRegeneratingPrompts(false);
    }
  }, [workflowData, showAlert]);

  // 이미지 프롬프트 재생성
  const regenerateImagePrompts = useCallback(async () => {
    await generateImagePrompts();
  }, [generateImagePrompts]);

  // 콘텐츠 새로고침
  const handleRefreshContent = useCallback(async () => {
    setIsRefreshingContent(true);

    try {
      // 현재 편집된 내용을 다시 처리
      if (editorRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        const processed = processMarkdown(currentHtml);
        setEditedContent(processed);
        showAlert('success', '콘텐츠가 새로고침되었습니다.');
      }
    } catch (error) {
      showAlert('error', '콘텐츠 새로고침 중 오류가 발생했습니다.');
    } finally {
      setIsRefreshingContent(false);
    }
  }, [processMarkdown, showAlert]);

  // 콘텐츠에 이미지 삽입
  const replaceImagesInContent = useCallback(() => {
    if (editorRef.current && Object.keys(images).length > 0) {
      const updatedHtml = ContentProcessor.replaceImagePlaceholders(
        editorRef.current.innerHTML,
        images
      );
      editorRef.current.innerHTML = updatedHtml;
      updateCharCount();
    }
  }, [images]);

  // 발행 시작
  const handlePublish = useCallback(() => {
    if (!selectedPlatform) {
      showAlert('warning', '발행할 플랫폼을 선택해주세요.');
      return;
    }
    // 발행 로직은 GenerationContainer에서 처리
  }, [selectedPlatform, showAlert]);

  // 플랫폼 이름 가져오기
  const getPlatformName = useCallback((platform: string): string => {
    const platformNames: { [key: string]: string } = {
      naver: '네이버 블로그',
      tistory: '티스토리'
    };
    return platformNames[platform] || platform;
  }, []);

  // 글자 수 업데이트
  const updateCharCount = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const textWithoutSpaces = text.replace(/\s/g, '');
      setCharCount(textWithoutSpaces.length);
      setCharCountWithSpaces(text.length);
    }
  }, []);

  // 콘텐츠 변경 핸들러
  const handleContentChange = useCallback(() => {
    updateCharCount();
    setIsEditing(true);
  }, [updateCharCount]);

  // 원본 복원
  const restoreOriginal = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = originalContent;
      setEditedContent(originalContent);
      updateCharCount();
      setIsEditing(false);
      showAlert('success', '원본 내용으로 복원되었습니다.');
    }
  }, [originalContent, updateCharCount, showAlert]);

  // 클립보드에 복사
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    if (!editorRef.current) {
      showAlert('error', '에디터가 로드되지 않았습니다.');
      return false;
    }

    try {
      const htmlContent = editorRef.current.innerHTML;

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([editorRef.current.innerText], { type: 'text/plain' })
        })
      ]);

      return true;
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      return false;
    }
  }, [showAlert]);

  // 폰트 크기 변경
  const handleFontSizeChange = useCallback((newSize: string) => {
    setCurrentFontSize(newSize);
  }, []);

  // 선택 영역에 폰트 크기 적용
  const applyFontSizeToSelection = useCallback((fontSize: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = fontSize;

    try {
      range.surroundContents(span);
    } catch (error) {
      console.error('폰트 크기 적용 실패:', error);
    }
  }, []);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br><br>');
    }
  }, []);

  // 클릭 이벤트 핸들러
  const handleClick = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === 3 ? container.parentElement : container as HTMLElement;

      if (element) {
        const computedSize = window.getComputedStyle(element).fontSize;
        setCurrentFontSize(computedSize);
      }
    }
  }, []);

  // 초기 콘텐츠 설정
  useEffect(() => {
    const content = workflowData.generatedContent || '';
    const processed = processMarkdown(content);
    setOriginalContent(processed);
    setEditedContent(processed);
  }, [workflowData.generatedContent, processMarkdown]);

  // 이미지 프롬프트 초기 설정
  useEffect(() => {
    if (workflowData.imagePrompts && Array.isArray(workflowData.imagePrompts)) {
      setImagePrompts(workflowData.imagePrompts);
    }
  }, [workflowData.imagePrompts]);

  // 스크롤을 최상단으로 이동
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

  return {
    // WorkflowContext
    workflowData,
    prevStep,
    reset,

    // AI 모델 상태
    aiModelStatus,

    // 콘텐츠 상태
    originalContent,
    editedContent,
    charCount,
    charCountWithSpaces,
    currentFontSize,
    fontSizes,
    activeTab,
    isEditing,

    // 이미지 관련 상태
    imagePositions,
    images,
    isGeneratingImages,
    imagePrompts,
    isRegeneratingPrompts,
    imagePromptError,

    // 발행 관련 상태
    selectedPlatform,
    isRefreshingContent,

    // Refs
    editorRef,

    // 상태 업데이트 함수
    setEditedContent,
    setCurrentFontSize,
    setActiveTab,
    setIsEditing,
    setImages,
    setSelectedPlatform,

    // 비즈니스 로직 함수
    handleImagesChange,
    generateImagePrompts,
    regenerateImagePrompts,
    handleRefreshContent,
    replaceImagesInContent,
    handlePublish,
    updateCharCount,
    handleContentChange,
    restoreOriginal,
    copyToClipboard,
    handleFontSizeChange,
    applyFontSizeToSelection,
    handleKeyDown,
    handleClick,

    // 유틸리티 함수
    processMarkdown,
    getPlatformName,
  };
};
