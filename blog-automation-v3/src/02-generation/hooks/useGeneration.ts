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

  // 이미지 관련 상태
  imagePositions: string[];
  images: { [key: string]: string };
  imagePrompts: any[];
  isRegeneratingPrompts: boolean;
  imagePromptError: string | null;

  // 발행 관련 상태
  selectedPlatform: string;
  isRefreshingContent: boolean;

  // Refs
  editorRef: React.RefObject<HTMLDivElement>;

  // 상태 업데이트 함수
  setOriginalContent: (content: string) => void;
  setEditedContent: (content: string) => void;
  setCurrentFontSize: (size: string) => void;
  setActiveTab: (tab: 'original' | 'edited') => void;
  setImages: (images: { [key: string]: string }) => void;
  setImagePositions: (positions: string[]) => void;
  setImagePrompts: (prompts: any[]) => void;
  setImagePromptError: (error: string | null) => void;
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

  // 마크다운 처리 함수
  const processMarkdown = useCallback((content: string): string => {
    return ContentProcessor.convertToNaverBlogHTML(content);
  }, []);

  // 이미지 생성 (프롬프트를 이용해 실제 이미지 생성)
  const generateImagePrompts = useCallback(async () => {
    if (imagePrompts.length === 0) {
      showAlert({ type: 'error', message: '이미지 프롬프트가 없습니다. 1단계에서 이미지 프롬프트 생성이 실패했을 수 있습니다.' });
      return;
    }

    setIsGeneratingImages(true);

    try {
      console.log(`🎨 이미지 생성 시작: ${imagePrompts.length}개 프롬프트 사용`);

      // 1단계에서 생성된 각 프롬프트로 이미지 생성
      const generatedImages: {[key: string]: string} = {};

      for (let i = 0; i < imagePrompts.length; i++) {
        const imagePrompt = imagePrompts[i];
        const imageKey = `이미지${i + 1}`;

        console.log(`🖼️ 이미지 ${i + 1} 생성 중... 프롬프트: ${imagePrompt.prompt.substring(0, 50)}...`);

        const imageUrl = await window.electronAPI.generateImage(imagePrompt.prompt);
        generatedImages[imageKey] = imageUrl;

        console.log(`✅ 이미지 ${i + 1} 생성 완료`);
      }

      setImages(generatedImages);
      console.log(`🎉 모든 이미지 생성 완료: ${Object.keys(generatedImages).length}개`);

    } catch (error) {
      console.error('❌ 이미지 생성 실패:', error);
      showAlert({ type: 'error', message: `이미지 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` });
    } finally {
      setIsGeneratingImages(false);
    }
  }, [imagePrompts, showAlert]);

  // 이미지 프롬프트 재생성
  const regenerateImagePrompts = useCallback(async () => {
    // 현재 원본 콘텐츠를 사용 (수정된 글이 있다면 그것을, 아니면 초기 콘텐츠를)
    const content = workflowData.generatedContent || '';
    const currentContent = originalContent || content;
    if (!currentContent || isRegeneratingPrompts) return;

    setIsRegeneratingPrompts(true);
    setImagePromptError(null);

    try {
      console.log('🔄 이미지 프롬프트 재생성 시작');
      const result = await BlogWritingService.generateImagePrompts(currentContent);

      if (result.success && result.imagePrompts && result.imagePrompts.length > 0) {
        console.log(`✅ 이미지 프롬프트 재생성 성공: ${result.imagePrompts.length}개`);
        setImagePrompts(result.imagePrompts);
        setImagePromptError(null);
      } else {
        console.warn('⚠️ 이미지 프롬프트 재생성 실패:', result.error);
        setImagePromptError(result.error || '이미지 프롬프트 재생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 이미지 프롬프트 재생성 중 오류:', error);
      setImagePromptError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsRegeneratingPrompts(false);
    }
  }, [originalContent, workflowData, isRegeneratingPrompts]);

  // 수정된 글 가져오기 (Claude Web에서)
  const handleRefreshContent = useCallback(async () => {
    if (isRefreshingContent) return;

    setIsRefreshingContent(true);

    try {
      console.log('🔄 Claude Web에서 수정된 글 가져오기 시작');

      // Claude Web에서 다시 다운로드
      const newContent = await window.electronAPI.downloadFromClaude();

      if (newContent && newContent.trim()) {
        console.log('✅ 수정된 글 가져오기 성공');

        // 원본 및 편집 콘텐츠 업데이트
        setOriginalContent(newContent);

        // 새로운 콘텐츠로 마크다운 처리
        const processedContent = ContentProcessor.convertToNaverBlogHTML(newContent);
        setEditedContent(processedContent);

        // 이미지 위치 재감지
        const imageInfo = ContentProcessor.processImages(newContent);
        setImagePositions(imageInfo.imagePositions);

        // 기존 이미지와 프롬프트 초기화 (새로운 글이므로)
        setImages({});
        setImagePrompts([]);

        // 이미지 프롬프트 오류 상태 설정 (재생성 필요)
        const hasImageTags = newContent.match(/\(이미지\)|\[이미지\]/g);
        const expectedImageCount = hasImageTags ? hasImageTags.length : 0;

        if (expectedImageCount > 0) {
          setImagePromptError('새로운 글로 업데이트되었습니다. 이미지 프롬프트를 재생성해주세요.');
        } else {
          setImagePromptError(null);
        }

        console.log(`📊 새 글 통계: ${newContent.length}자, 예상 이미지: ${expectedImageCount}개`);

      } else {
        throw new Error('Claude Web에서 빈 콘텐츠가 반환되었습니다.');
      }

    } catch (error) {
      console.error('❌ 수정된 글 가져오기 실패:', error);
      showAlert({ type: 'error', message: `수정된 글 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\nClaude Web에서 마크다운을 다시 복사해보세요.` });
    } finally {
      setIsRefreshingContent(false);
    }
  }, [isRefreshingContent, showAlert]);

  // 콘텐츠에 이미지 삽입 (발행 시 사용)
  const replaceImagesInContent = useCallback((): string => {
    let finalContent = editedContent;

    imagePositions.forEach((imageKey) => {
      const imageUrl = images[imageKey];
      if (imageUrl) {
        // 첫 번째 (이미지)를 실제 이미지로 교체
        finalContent = finalContent.replace('(이미지)', `![${imageKey}](${imageUrl})`);
      }
    });

    return finalContent;
  }, [editedContent, imagePositions, images]);

  // 발행 시작
  const handlePublish = useCallback(() => {
    if (!selectedPlatform) {
      showAlert({ type: 'warning', message: '발행할 플랫폼을 선택해주세요.' });
      return;
    }

    const finalContent = replaceImagesInContent();

    if (selectedPlatform === 'naver') {
      // v2의 네이버 블로그 발행 로직 재사용
      window.electronAPI.publishToBlog(finalContent);
    } else {
      showAlert({ type: 'info', message: `${getPlatformName(selectedPlatform)} 발행 기능은 곧 구현될 예정입니다.` });
    }
  }, [selectedPlatform, replaceImagesInContent, showAlert]);

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
      showAlert({ type: 'success', message: '원본 내용으로 복원되었습니다.' });
    }
  }, [originalContent, updateCharCount, showAlert]);

  // 클립보드에 복사
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    if (!editorRef.current) {
      showAlert({ type: 'error', message: '에디터가 로드되지 않았습니다.' });
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

    // 이미지 관련 상태
    imagePositions,
    images,
    imagePrompts,
    isRegeneratingPrompts,
    imagePromptError,

    // 발행 관련 상태
    selectedPlatform,
    isRefreshingContent,

    // Refs
    editorRef,

    // 상태 업데이트 함수
    setOriginalContent,
    setEditedContent,
    setCurrentFontSize,
    setActiveTab,
    setImages,
    setImagePositions,
    setImagePrompts,
    setImagePromptError,
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
