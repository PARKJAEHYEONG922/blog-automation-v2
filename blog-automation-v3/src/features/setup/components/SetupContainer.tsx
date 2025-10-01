/**
 * Step1 Setup Container - UI만 담당
 * 비즈니스 로직은 useSetup 훅에서 처리
 */

import React, { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from '@/shared/components/ui/AlertDialog';
import DocumentUploadSection from './DocumentUploadSection';
import KeywordInputSection from './KeywordInputSection';
import TitleRecommendationSection from './TitleRecommendationSection';
import GenerationProgressSection from './GenerationProgressSection';
import ManualUploadSection from './ManualUploadSection';
import { TrendAnalysisResult } from '@/shared/services/content/blog-trend-analyzer';
import { useSetup } from '../hooks/useSetup';

const Step1Setup: React.FC = () => {
  // 커스텀 훅에서 모든 로직과 상태 가져오기
  const {
    // 상태
    mainKeyword,
    subKeywords,
    blogContent,
    isGeneratingTitles,
    generatedTitles,
    selectedTitle,
    isGenerating,
    generationStep,
    savedWritingStyles,
    savedSeoGuides,
    selectedWritingStyles,
    selectedSeoGuide,
    progressSectionRef,

    // 상태 업데이트
    setMainKeyword,
    setSubKeywords,
    setBlogContent,
    setSelectedTitle,

    // 비즈니스 로직
    handleUrlCrawl,
    handleFileUpload,
    toggleWritingStyle,
    toggleSeoGuide,
    openDeleteDialog,
    handleDeleteConfirm,
    closeDeleteDialog,
    generateTitleRecommendations,
    handleStartGeneration,
    handleFileUploaded,

    // 다이얼로그 상태
    deleteDialog
  } = useSetup();

  // 알림 다이얼로그 상태 (useSetup으로 이동하지 않은 로컬 UI 상태)
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  return (
    <div className="max-w-6xl mx-auto p-5 bg-white min-h-screen">
      {/* 문서 업로드 섹션 */}
      <DocumentUploadSection
        savedWritingStyles={savedWritingStyles}
        savedSeoGuides={savedSeoGuides}
        selectedWritingStyles={selectedWritingStyles}
        selectedSeoGuide={selectedSeoGuide}
        onToggleWritingStyle={toggleWritingStyle}
        onToggleSeoGuide={toggleSeoGuide}
        onFileUpload={handleFileUpload}
        onOpenDeleteDialog={openDeleteDialog}
        onUrlCrawl={handleUrlCrawl}
      />

      {/* 키워드 입력 섹션 */}
      <KeywordInputSection
        mainKeyword={mainKeyword}
        subKeywords={subKeywords}
        blogContent={blogContent}
        onMainKeywordChange={setMainKeyword}
        onSubKeywordsChange={setSubKeywords}
        onBlogContentChange={setBlogContent}
        onTrendAnalysisComplete={(result: TrendAnalysisResult) => {
          // 트렌드 분석 결과를 폼에 자동 입력
          setMainKeyword(result.mainKeyword);
          setSubKeywords(result.subKeywords.join(', '));
          setBlogContent(result.contentDirection);
          setSelectedTitle(''); // 기존 선택 초기화

          // TODO: 트렌드 분석 캐시 저장 (useSetup에 추가 필요)

          // 성공 알림
          setAlertDialog({
            isOpen: true,
            type: 'success',
            title: '트렌드 분석 완료',
            message: `제목 ${result.recommendedTitles.length}개, 키워드 ${result.subKeywords.length}개가 생성되었습니다.`
          });
        }}
      />

      {/* AI 추천 제목 섹션 */}
      <TitleRecommendationSection
        generatedTitles={generatedTitles}
        selectedTitle={selectedTitle}
        isGeneratingTitles={isGeneratingTitles}
        isGenerating={isGenerating}
        mainKeyword={mainKeyword}
        onGenerateTitles={generateTitleRecommendations}
        onSelectTitle={setSelectedTitle}
        onStartGeneration={handleStartGeneration}
      />

      {/* 수동 업로드 섹션 */}
      <ManualUploadSection
        selectedTitle={selectedTitle}
        selectedWritingStyles={selectedWritingStyles}
        selectedSeoGuide={selectedSeoGuide}
        blogContent={blogContent}
        mainKeyword={mainKeyword}
        subKeywords={subKeywords}
        onFileUploaded={handleFileUploaded}
      />

      {/* 생성 진행 상태 섹션 */}
      <div ref={progressSectionRef}>
        <GenerationProgressSection
          isGenerating={isGenerating}
          generationStep={generationStep}
        />
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="문서 삭제"
        message={`"${deleteDialog.docName}" 문서를 정말로 삭제하시겠습니까?`}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteDialog}
      />

      {/* 알림 다이얼로그 */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        type={alertDialog.type}
        title={alertDialog.title}
        message={alertDialog.message}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
      />
    </div>
  );
};

export default Step1Setup;
