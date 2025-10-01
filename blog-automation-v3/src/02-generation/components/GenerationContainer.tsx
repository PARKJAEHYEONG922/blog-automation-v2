/**
 * Step2 Generation Container - UI만 담당
 * 비즈니스 로직은 useGeneration 훅에서 처리
 */

import React from 'react';
import WorkSummary from './WorkSummary';
import ImageGenerator from './ImageGenerator';
import ContentEditorSection from './ContentEditorSection';
import ImagePromptSection from './ImagePromptSection';
import { PublishPlatformSection } from '@/03-publish';
import Button from '@/shared/components/ui/Button';
import { useGeneration } from '@/02-generation/useGeneration';
import { useWorkflow } from '@/app/WorkflowContext';

const Step2Generation: React.FC = () => {
  const { workflowData } = useWorkflow();

  // 커스텀 훅에서 모든 로직과 상태 가져오기
  const {
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
  } = useGeneration();

  // 스타일 정의
  const sectionStyles = `
    .section-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
      margin-bottom: 24px;
      overflow: hidden;
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
          onRegeneratePrompts={handleRegenerateImagePrompts}
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
          onClick={handleGoBack}
          variant="secondary"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors duration-200"
        >
          <span>←</span>
          <span>이전으로 가기</span>
        </Button>

        {/* 오른쪽: 처음부터 다시 */}
        <Button
          onClick={handleReset}
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
