import React, { useState, useEffect, useRef, useCallback } from 'react';
import WorkSummary from './WorkSummary';
import ImageGenerator from './ImageGenerator';
import ContentEditorSection from './ContentEditorSection';
import ImagePromptSection from './ImagePromptSection';
import PublishPlatformSection from './PublishPlatformSection';
import { ContentProcessor } from '../services/content-processor';
import { BlogWritingService } from '@/shared/services/content/blog-writing-service';
import Button from '@/shared/components/ui/Button';
import '@/shared/types/electron.types';
import { useDialog } from '@/app/DialogContext';
import { useWorkflow } from '@/app/WorkflowContext';

const Step2Generation: React.FC = () => {
  // Workflow Context 사용
  const { workflowData, reset, prevStep } = useWorkflow();
  const { showAlert } = useDialog();

  // AI 모델 상태
  const [aiModelStatus, setAiModelStatus] = useState({
    writing: '미설정',
    image: '미설정'
  });

  // 모델 상태 로드
  useEffect(() => {
    const loadModelStatus = async () => {
      try {
        const llmSettings = await window.electronAPI?.getLLMSettings?.();
        if (llmSettings?.appliedSettings) {
          const { writing, image } = llmSettings.appliedSettings;
          setAiModelStatus({
            writing: writing?.provider && writing?.model ? `${writing.provider} ${writing.model}` : '미설정',
            image: image?.provider && image?.model ? `${image.provider} ${image.model}` : '미설정'
          });
        }
      } catch (error) {
        console.error('모델 상태 로드 실패:', error);
      }
    };
    loadModelStatus();

    // LLM 설정 변경 이벤트 리스너
    const handleSettingsChanged = () => loadModelStatus();
    window.addEventListener('app-llm-settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('app-llm-settings-changed', handleSettingsChanged);
  }, []);

  const editorRef = useRef<HTMLDivElement>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [charCount, setCharCount] = useState(0);
  const [charCountWithSpaces, setCharCountWithSpaces] = useState(0);

  const [imagePositions, setImagePositions] = useState<string[]>([]);
  const [images, setImages] = useState<{ [key: string]: string }>({});
  const [imageAIInfo, setImageAIInfo] = useState<string>('확인 중...');
  const [imagePrompts, setImagePrompts] = useState<any[]>([]);

  // 이미지 프롬프트 재생성 관련 상태
  const [isRegeneratingPrompts, setIsRegeneratingPrompts] = useState(false);
  const [imagePromptError, setImagePromptError] = useState<string | null>(null);

  // 수정된 글 가져오기 관련 상태
  const [isRefreshingContent, setIsRefreshingContent] = useState(false);

  // 발행 플랫폼 선택 상태
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  // 이미지 변경 콜백 메모이제이션
  const handleImagesChange = useCallback((newImages: { [key: string]: string }) => {
    setImages(newImages);
  }, []);

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

  // 이미지 AI 설정 정보 가져오기
  useEffect(() => {
    const loadImageAIInfo = async () => {
      try {
        const llmSettings = await window.electronAPI?.getLLMSettings?.();
        if (llmSettings?.appliedSettings?.image) {
          const { provider, model } = llmSettings.appliedSettings.image;
          if (provider && model) {
            setImageAIInfo(`✅ ${provider} ${model}`);
          } else {
            setImageAIInfo('❌ 미설정');
          }
        } else {
          setImageAIInfo('❌ 미설정');
        }
      } catch (error) {
        console.error('이미지 AI 설정 확인 실패:', error);
        setImageAIInfo('❌ 확인 실패');
      }
    };

    loadImageAIInfo();
  }, []);

  // v2와 동일한 글자 수 계산
  const updateCharCount = () => {
    if (editorRef.current) {
      const textContent = editorRef.current.innerText || '';
      const textContentNoSpaces = textContent.replace(/\s+/g, '');

      setCharCount(textContentNoSpaces.length);
      setCharCountWithSpaces(textContent.length);
    }
  };

  // v2와 동일한 콘텐츠 변경 처리
  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
    // 에디터 내용이 변경되었으므로 글자 수 업데이트
    setTimeout(updateCharCount, 0);
  };

  // v2와 동일한 초기 콘텐츠 로딩
  useEffect(() => {
    const content = workflowData.generatedContent;
    if (content) {
      // 원본 콘텐츠 저장
      setOriginalContent(content);

      // 자동편집 콘텐츠 생성 (네이버 블로그용 HTML) - v2와 동일한 방식
      const processedContent = ContentProcessor.processMarkdown(content);
      setEditedContent(processedContent);

      // 이미지 위치 감지 (원본 마크다운에서)
      const imageInfo = ContentProcessor.processImages(content);
      setImagePositions(imageInfo.imagePositions);
    }
  }, [workflowData.generatedContent]);

  // 1단계에서 전달된 이미지 프롬프트들 초기화
  useEffect(() => {
    if (workflowData.imagePrompts && workflowData.imagePrompts.length > 0) {
      console.log(`📋 1단계에서 생성된 이미지 프롬프트 ${workflowData.imagePrompts.length}개 로드됨`);
      setImagePrompts(workflowData.imagePrompts);
      setImagePromptError(null);
    } else if (workflowData.imagePromptGenerationFailed) {
      console.warn('⚠️ 1단계에서 이미지 프롬프트 생성 실패');
      setImagePromptError('1단계에서 이미지 프롬프트 생성에 실패했습니다.');
    }
  }, [workflowData.imagePrompts, workflowData.imagePromptGenerationFailed]);

  // 이미지 프롬프트 재생성 함수
  const regenerateImagePrompts = async () => {
    // 현재 원본 콘텐츠를 사용 (수정된 글이 있다면 그것을, 아니면 초기 콘텐츠를)
    const currentContent = originalContent || workflowData.generatedContent;
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
  };

  // 수정된 글 가져오기 함수
  const handleRefreshContent = async () => {
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
        const processedContent = ContentProcessor.processMarkdown(newContent);
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
  };

  // v2와 동일한 CSS 스타일
  const sectionStyles = `
    .section-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .section-icon.blue {
      background-color: #dbeafe;
      color: #1d4ed8;
    }

    .section-icon.purple {
      background-color: #ede9fe;
      color: #7c3aed;
    }

    .section-title {
      margin: 0;
      font-weight: 600;
      color: #1f2937;
    }
  `;

  return (
    <div className="max-w-6xl mx-auto min-h-screen bg-gray-50 p-6">
      <style>{sectionStyles}</style>

      {/* 작업 요약 */}
      <WorkSummary
        setupData={workflowData}
        charCount={charCount}
        charCountWithSpaces={charCountWithSpaces}
        imageCount={imagePositions.length}
        imageAIInfo={imageAIInfo}
        onRefreshContent={handleRefreshContent}
        isRefreshingContent={isRefreshingContent}
      />

      {/* 콘텐츠 편집기 */}
      <ContentEditorSection
        originalContent={originalContent}
        editedContent={editedContent}
        onContentChange={handleContentChange}
        charCount={charCount}
        charCountWithSpaces={charCountWithSpaces}
        editorRef={editorRef}
      />

      {/* 이미지 프롬프트 재생성 섹션 (오류 시에만 표시) */}
      {(imagePromptError || (imagePositions.length > 0 && imagePrompts.length === 0)) && (
        <ImagePromptSection
          imagePromptError={imagePromptError || '이미지 프롬프트가 생성되지 않았습니다. 글에는 이미지 태그가 있지만 프롬프트가 생성되지 않았습니다.'}
          isRegeneratingPrompts={isRegeneratingPrompts}
          onRegeneratePrompts={regenerateImagePrompts}
        />
      )}

      {/* 이미지 생성 섹션 */}
      <ImageGenerator
        imagePositions={imagePositions}
        imagePrompts={imagePrompts}
        onImagesChange={handleImagesChange}
        aiModelStatus={aiModelStatus}
      />

      {/* 발행 플랫폼 선택 및 UI */}
      <PublishPlatformSection
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        workflowData={workflowData}
        editedContent={editedContent}
        images={images}
        editorRef={editorRef}
      />

      {/* 액션 버튼 */}
      <div className="mt-8 flex justify-between items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        {/* 왼쪽: 이전으로 가기 */}
        <Button
          onClick={prevStep}
          variant="secondary"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors duration-200"
        >
          <span>←</span>
          <span>이전으로 가기</span>
        </Button>

        {/* 오른쪽: 처음부터 다시 */}
        <Button
          onClick={reset}
          variant="danger"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors duration-200"
        >
          <span>🔄</span>
          <span>처음부터 다시</span>
        </Button>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Step2Generation;
