/**
 * Step2 Generation 커스텀 훅
 * UI와 비즈니스 로직 분리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflow } from '@/app/WorkflowContext';
import { useDialog } from '@/app/DialogContext';
import { BlogWritingService } from '@/shared/services/content/blog-writing-service';
import { ContentProcessor } from '@/02-generation/services/content-processor';
import { GenerationAutomationService } from '@/02-generation/services/generation-automation-service';

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
  insertLink: () => void;
  insertSeparator: () => void;
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
      const llmSettings = await GenerationAutomationService.getLLMSettings();
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

      const generatedImages = await GenerationAutomationService.generateImages(imagePrompts);

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

    // 이미지 프롬프트 재생성 시 기존 생성된 이미지도 초기화
    setImages({});

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
      const newContent = await GenerationAutomationService.downloadFromClaude();

      if (newContent && newContent.trim()) {
        console.log('✅ 수정된 글 가져오기 성공');

        // ⚠️ HTML 변환 전에 이미지 태그 감지 (마크다운 상태)
        const hasImageTags = newContent.match(/\(이미지\)|\[이미지\]/g);
        const expectedImageCount = hasImageTags ? hasImageTags.length : 0;

        // 이미지 위치 재감지 (마크다운 상태에서)
        const imageInfo = ContentProcessor.processImages(newContent);
        setImagePositions(imageInfo.imagePositions);

        console.log(`📊 새 글 통계: ${newContent.length}자, 예상 이미지: ${expectedImageCount}개`);

        // 원본 콘텐츠 저장 (마크다운 그대로)
        setOriginalContent(newContent);

        // 마크다운 → HTML 변환
        const processedContent = ContentProcessor.convertToNaverBlogHTML(newContent);

        // 자동편집 콘텐츠 업데이트 (HTML)
        setEditedContent(processedContent);

        // 에디터에도 반영
        if (editorRef.current) {
          editorRef.current.innerHTML = processedContent;
          updateCharCount();
        }

        // 기존 이미지와 프롬프트 초기화 (새로운 글이므로)
        setImages({});
        setImagePrompts([]);

        // 이미지 프롬프트 오류 상태 설정 (재생성 필요)
        if (expectedImageCount > 0) {
          setImagePromptError('새로운 글로 업데이트되었습니다. 이미지 프롬프트를 재생성해주세요.');
        } else {
          setImagePromptError(null);
        }

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
      // 네이버 블로그 발행
      GenerationAutomationService.publishToNaverBlog(finalContent);
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
    if (editorRef.current) {
      setEditedContent(editorRef.current.innerHTML);
    }
    setIsEditing(true);
  }, [updateCharCount]);

  // 원본 복원 (v2와 동일한 방식)
  const restoreOriginal = useCallback(() => {
    if (originalContent) {
      // 마크다운 원본을 다시 HTML로 변환
      const processedContent = processMarkdown(originalContent);
      setEditedContent(processedContent);

      if (editorRef.current) {
        editorRef.current.innerHTML = processedContent;
        updateCharCount();
      }

      setIsEditing(false);
      showAlert({ type: 'success', message: '원본 내용으로 복원되었습니다.' });
    }
  }, [originalContent, processMarkdown, updateCharCount, showAlert]);

  // 클립보드에 HTML 형식으로 복사 (발행 시와 동일한 방식)
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    if (!editorRef.current) {
      showAlert({ type: 'error', message: '에디터가 로드되지 않았습니다.' });
      return false;
    }

    try {
      // HTML 형식으로 복사하기 위해 선택 영역 생성
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);

      // HTML 복사 실행
      const success = document.execCommand('copy');

      // 선택 해제
      selection?.removeAllRanges();

      if (success) {
        showAlert({ type: 'success', message: 'HTML 형식으로 클립보드에 복사되었습니다!' });
        return true;
      } else {
        throw new Error('복사 명령 실행 실패');
      }
    } catch (error) {
      showAlert({ type: 'error', message: '클립보드 복사에 실패했습니다.' });
      console.error('클립보드 복사 실패:', error);
      return false;
    }
  }, [showAlert]);

  // 선택 영역에 폰트 크기 적용
  const applyFontSizeToSelection = useCallback((fontSize: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.warn('선택된 텍스트가 없습니다');
      return;
    }

    const range = selection.getRangeAt(0);

    // 선택된 내용이 비어있으면 리턴
    if (range.collapsed) {
      console.warn('선택 영역이 비어있습니다');
      return;
    }

    // fontSizes에서 해당 폰트 정보 찾기
    const fontInfo = fontSizes.find(f => f.size === fontSize);
    if (!fontInfo) return;

    try {
      // execCommand 방식으로 변경 (더 안정적)
      document.execCommand('fontSize', false, '7');

      // 방금 적용된 font 태그들을 찾아서 span으로 변경
      const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
      fontElements?.forEach((fontEl) => {
        const span = document.createElement('span');
        span.style.fontSize = fontSize;
        span.style.fontWeight = fontInfo.weight; // weight 적용
        span.innerHTML = fontEl.innerHTML;
        fontEl.replaceWith(span);
      });

      updateCharCount();
    } catch (error) {
      console.error('폰트 크기 적용 실패:', error);
    }
  }, [updateCharCount]);

  // 폰트 크기 변경 (select 변경 시 바로 적용)
  const handleFontSizeChange = useCallback((newSize: string) => {
    setCurrentFontSize(newSize);
    // 선택된 텍스트가 있으면 바로 적용
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
      applyFontSizeToSelection(newSize);
    }
  }, [applyFontSizeToSelection]);

  // 링크 삽입 함수
  const insertLink = useCallback(() => {
    if (!editorRef.current) return;

    // 현재 selection을 미리 저장 (단, 편집기 내부에 있을 때만)
    const selection = window.getSelection();
    let savedRange: Range | null = null;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // selection이 편집기 내부에 있는지 확인
      const isInsideEditor = editorRef.current.contains(
        container.nodeType === Node.TEXT_NODE ? container.parentNode : container
      );

      if (!isInsideEditor) {
        showAlert({ message: '편집기 내부를 클릭한 후 링크를 삽입해주세요.' });
        return;
      }

      savedRange = range.cloneRange();
    } else {
      showAlert({ message: '편집기 내부를 클릭한 후 링크를 삽입해주세요.' });
      return;
    }

    // 모달 생성
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';

    const dialog = document.createElement('div');
    dialog.style.cssText = 'background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); min-width: 400px;';
    dialog.innerHTML = `
      <div style="margin-bottom: 16px; font-size: 16px; font-weight: 600; color: #333;">링크 URL 입력</div>
      <input type="text" id="url-input" placeholder="https://..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 16px; box-sizing: border-box;" />
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="url-cancel" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 14px;">취소</button>
        <button id="url-ok" style="padding: 8px 16px; border: none; border-radius: 6px; background: #3b82f6; color: white; cursor: pointer; font-size: 14px;">확인</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = document.getElementById('url-input') as HTMLInputElement;
    const okBtn = document.getElementById('url-ok');
    const cancelBtn = document.getElementById('url-cancel');

    input?.focus();

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    const handleInsert = () => {
      const url = input?.value.trim();
      if (!url) {
        cleanup();
        return;
      }

      // 네이버 스타일 링크 카드 (회색 박스)
      const linkCard = document.createElement('div');
      linkCard.contentEditable = 'false';
      linkCard.className = 'blog-link-card'; // 식별자 추가
      linkCard.setAttribute('data-link-url', url); // URL 저장
      linkCard.style.cssText = 'border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; margin: 12px 0; background: #fafafa; display: inline-block; max-width: 100%; cursor: default;';

      const link = document.createElement('a');
      link.href = url;
      link.textContent = url;
      link.style.cssText = 'color: #03c75a; font-size: 14px; word-break: break-all; text-decoration: none;';

      linkCard.appendChild(link);

      // 저장된 range 복원 또는 편집기 끝에 삽입
      if (savedRange) {
        const newSelection = window.getSelection();
        if (newSelection) {
          newSelection.removeAllRanges();
          newSelection.addRange(savedRange);

          savedRange.deleteContents();
          savedRange.insertNode(linkCard);

          // 다음 줄로 이동하기 위한 br 추가
          const br = document.createElement('br');
          savedRange.setStartAfter(linkCard);
          savedRange.insertNode(br);

          // 커서를 br 다음으로 이동
          savedRange.setStartAfter(br);
          savedRange.collapse(true);
        }
      } else {
        // 커서 위치가 없으면 편집기 끝에 추가
        editorRef.current?.appendChild(linkCard);
        const br = document.createElement('br');
        editorRef.current?.appendChild(br);
      }

      updateCharCount();
      cleanup();
    };

    okBtn?.addEventListener('click', handleInsert);
    cancelBtn?.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup();
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInsert();
      if (e.key === 'Escape') cleanup();
    });
  }, [updateCharCount]);

  // 구분선 삽입 함수
  const insertSeparator = useCallback(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      showAlert({ message: '편집기 내부를 클릭한 후 구분선을 삽입해주세요.' });
      return;
    }

    // 편집기 내부에 있는지 확인
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const isInsideEditor = editorRef.current.contains(
      container.nodeType === Node.TEXT_NODE ? container.parentNode : container
    );

    if (!isInsideEditor) {
      showAlert({ message: '편집기 내부를 클릭한 후 구분선을 삽입해주세요.' });
      return;
    }

    // 빈 줄 + 구분선 + 빈 줄 구조로 삽입
    const separatorHTML = `
      <p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">&nbsp;</span></p>
      <hr style="border: none; border-top: 1px solid #666; margin: 16px auto; width: 30%;">
      <p class="se-text-paragraph se-text-paragraph-align-center" style="line-height: 1.8;"><span class="se-ff-nanumgothic se-fs15" style="color: rgb(0, 0, 0);">&nbsp;</span></p>
    `;

    // 선택 영역 삭제하고 구분선 삽입
    range.deleteContents();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = separatorHTML;

    while (tempDiv.firstChild) {
      range.insertNode(tempDiv.firstChild);
    }

    // 글자 수 업데이트
    updateCharCount();
  }, [updateCharCount]);


  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl + 1/2/3/4 단축키로 글씨 크기 변경 (우선 처리)
    if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const fontSizeMap: { [key: string]: string } = {
        '1': '24px', // 대제목
        '2': '19px', // 소제목
        '3': '16px', // 강조
        '4': '15px'  // 일반
      };
      const fontSize = fontSizeMap[e.key];
      applyFontSizeToSelection(fontSize);
      setCurrentFontSize(fontSize);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      // <br> 태그 삽입 (한 칸 줄바꿈)
      const br = document.createElement('br');
      range.deleteContents();
      range.insertNode(br);

      // 커서를 <br> 다음으로 이동
      const newRange = document.createRange();
      newRange.setStartAfter(br);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }, [applyFontSizeToSelection]);

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

  // 초기 콘텐츠 설정 (v2와 동일한 방식)
  useEffect(() => {
    const content = workflowData.generatedContent || '';

    // 원본 콘텐츠 저장 (마크다운)
    setOriginalContent(content);

    // 자동편집 콘텐츠 생성 (HTML)
    const processed = processMarkdown(content);
    setEditedContent(processed);

    // 에디터에도 즉시 반영 (초기 로드 시)
    if (editorRef.current) {
      editorRef.current.innerHTML = processed;
      // 글자 수 업데이트 (인라인으로 처리)
      const text = editorRef.current.innerText || '';
      const textWithoutSpaces = text.replace(/\s/g, '');
      setCharCount(textWithoutSpaces.length);
      setCharCountWithSpaces(text.length);
    }
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
    insertLink,
    insertSeparator,
    handleKeyDown,
    handleClick,

    // 유틸리티 함수
    processMarkdown,
    getPlatformName,
  };
};
