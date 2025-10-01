/**
 * Step1 Setup 커스텀 훅
 * UI와 비즈니스 로직 분리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflow } from '@/app/WorkflowContext';
import { useDialog } from '@/app/DialogContext';
import { SavedDocument, StorageService } from '@/shared/services/storage/storage-service';
import { SetupService } from '@/01-setup/services/setup-service';
import { TitleGenerationService, TrendAnalysisCache } from '@/01-setup/services/title-generation-service';
import { ContentGenerationService } from '@/01-setup/services/content-generation-service';

export interface UseSetupReturn {
  // 상태
  mainKeyword: string;
  subKeywords: string;
  blogContent: string;
  isGeneratingTitles: boolean;
  generatedTitles: string[];
  selectedTitle: string;
  isGenerating: boolean;
  generationStep: string;
  savedWritingStyles: SavedDocument[];
  savedSeoGuides: SavedDocument[];
  selectedWritingStyles: SavedDocument[];
  selectedSeoGuide: SavedDocument | null;
  progressSectionRef: React.RefObject<HTMLDivElement>;

  // 상태 업데이트 함수
  setMainKeyword: (value: string) => void;
  setSubKeywords: (value: string) => void;
  setBlogContent: (value: string) => void;
  setSelectedTitle: (value: string) => void;

  // 비즈니스 로직 함수
  handleUrlCrawl: (url: string) => Promise<{ title: string; contentLength: number } | null>;
  handleFileUpload: (type: 'writingStyle' | 'seoGuide', file: File) => Promise<void>;
  toggleWritingStyle: (doc: SavedDocument) => void;
  toggleSeoGuide: (doc: SavedDocument) => void;
  openDeleteDialog: (docId: string, docName: string, type: 'writingStyle' | 'seoGuide') => void;
  handleDeleteConfirm: () => Promise<void>;
  closeDeleteDialog: () => void;
  generateTitleRecommendations: () => Promise<void>;
  handleStartGeneration: () => Promise<void>;
  handleFileUploaded: (content: string) => Promise<void>;
  scrollToProgress: () => void;

  // 다이얼로그 상태
  deleteDialog: {
    isOpen: boolean;
    docId: string;
    docName: string;
    type: 'writingStyle' | 'seoGuide';
  };
}

export const useSetup = (): UseSetupReturn => {
  const { workflowData, updateWorkflowData, nextStep } = useWorkflow();
  const { showAlert } = useDialog();

  const progressSectionRef = useRef<HTMLDivElement>(null);

  // 키워드 입력 상태
  const [mainKeyword, setMainKeyword] = useState(workflowData.mainKeyword || '');
  const [subKeywords, setSubKeywords] = useState(workflowData.subKeywords || '');
  const [blogContent, setBlogContent] = useState(workflowData.blogContent || '');

  // 제목 추천 관련 상태
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>(workflowData.generatedTitles || []);
  const [selectedTitle, setSelectedTitle] = useState(workflowData.selectedTitle || '');

  // 트렌드 분석 결과 저장 (제목 재생성용)
  const [trendAnalysisCache, setTrendAnalysisCache] = useState<TrendAnalysisCache | null>(null);

  // 생성 관련 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');

  // 저장된 문서들
  const [savedWritingStyles, setSavedWritingStyles] = useState<SavedDocument[]>([]);
  const [savedSeoGuides, setSavedSeoGuides] = useState<SavedDocument[]>([]);

  // 선택된 문서들
  const [selectedWritingStyles, setSelectedWritingStyles] = useState<SavedDocument[]>([]);
  const [selectedSeoGuide, setSelectedSeoGuide] = useState<SavedDocument | null>(null);

  // 초기 로드 완료 플래그
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // 다이얼로그 상태
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    docId: string;
    docName: string;
    type: 'writingStyle' | 'seoGuide';
  }>({
    isOpen: false,
    docId: '',
    docName: '',
    type: 'writingStyle'
  });

  // 문서 로드
  useEffect(() => {
    const loadSavedDocuments = async () => {
      try {
        const result = await SetupService.loadDocuments(workflowData);

        setSavedWritingStyles(result.writingStyles);
        setSavedSeoGuides(result.seoGuides);
        setSelectedWritingStyles(result.selectedWritingStyles);
        setSelectedSeoGuide(result.selectedSeoGuide);
        setIsInitialLoadComplete(true); // 초기 로드 완료 표시
      } catch (error) {
        console.error('문서 로드 실패:', error);
        setIsInitialLoadComplete(true); // 에러여도 플래그 설정
      }
    };

    loadSavedDocuments();
  }, []);

  // 선택된 말투 변경 시 로컬 스토리지 저장 (초기 로드 이후에만)
  useEffect(() => {
    if (isInitialLoadComplete) {
      SetupService.saveSelectedWritingStyles(selectedWritingStyles);
    }
  }, [selectedWritingStyles, isInitialLoadComplete]);

  // URL 크롤링
  const handleUrlCrawl = useCallback(async (url: string): Promise<{ title: string; contentLength: number } | null> => {
    try {
      const result = await SetupService.crawlBlogContent(url);

      if (result) {
        const fileName = result.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);

        // 중복 체크
        const existingDoc = savedWritingStyles.find(doc =>
          doc.name === fileName || doc.name.startsWith(fileName)
        );

        if (existingDoc) {
          showAlert({ type: 'warning', message: `이미 동일한 제목의 글이 저장되어 있습니다.\n제목: ${result.title}` });
          return null;
        }

        const savedDoc = await SetupService.saveWritingStyleDirect(fileName, result.content);

        // 상태 업데이트
        setSavedWritingStyles(StorageService.getWritingStyles());

        // 자동으로 선택 목록에 추가
        if (selectedWritingStyles.length < 2) {
          setSelectedWritingStyles([...selectedWritingStyles, savedDoc]);
        }

        return {
          title: result.title,
          contentLength: result.content.length
        };
      } else {
        throw new Error('크롤링 실패');
      }
    } catch (error) {
      console.error('URL 크롤링 실패:', error);
      showAlert({ type: 'error', message: `블로그 글 가져오기에 실패했습니다.\n오류: ${(error as Error).message}` });
      return null;
    }
  }, [savedWritingStyles, selectedWritingStyles, showAlert]);

  // 파일 업로드
  const handleFileUpload = useCallback(async (type: 'writingStyle' | 'seoGuide', file: File) => {
    try {
      let savedDoc: SavedDocument;

      if (type === 'writingStyle') {
        savedDoc = await SetupService.saveWritingStyle(file);
        setSavedWritingStyles(StorageService.getWritingStyles());

        if (selectedWritingStyles.length < 2) {
          setSelectedWritingStyles([...selectedWritingStyles, savedDoc]);
        }
      } else {
        savedDoc = await SetupService.saveSeoGuide(file);
        setSavedSeoGuides(StorageService.getSeoGuides());
        setSelectedSeoGuide(savedDoc);
      }
    } catch (error) {
      console.error('파일 저장 실패:', error);
      showAlert({ type: 'error', message: '파일 저장에 실패했습니다.' });
    }
  }, [selectedWritingStyles, showAlert]);

  // 말투 토글
  const toggleWritingStyle = useCallback((doc: SavedDocument) => {
    const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);

    if (isSelected) {
      setSelectedWritingStyles(selectedWritingStyles.filter(selected => selected.id !== doc.id));
    } else {
      if (selectedWritingStyles.length >= 2) {
        showAlert({ type: 'warning', message: '말투는 최대 2개까지만 선택할 수 있습니다.' });
        return;
      }
      setSelectedWritingStyles([...selectedWritingStyles, doc]);
    }
  }, [selectedWritingStyles, showAlert]);

  // SEO 가이드 토글
  const toggleSeoGuide = useCallback((doc: SavedDocument) => {
    if (selectedSeoGuide?.id === doc.id) {
      setSelectedSeoGuide(null);
    } else {
      setSelectedSeoGuide(doc);
    }
  }, [selectedSeoGuide]);

  // 삭제 다이얼로그 열기
  const openDeleteDialog = useCallback((docId: string, docName: string, type: 'writingStyle' | 'seoGuide') => {
    setDeleteDialog({
      isOpen: true,
      docId,
      docName,
      type
    });
  }, []);

  // 삭제 확인
  const handleDeleteConfirm = useCallback(async () => {
    try {
      const result = await SetupService.deleteDocument(deleteDialog.docId, deleteDialog.type, deleteDialog.docName);

      if (deleteDialog.type === 'writingStyle' && result.writingStyles) {
        setSavedWritingStyles(result.writingStyles);
        setSelectedWritingStyles(selectedWritingStyles.filter(doc => doc.id !== deleteDialog.docId));
      } else if (deleteDialog.type === 'seoGuide' && result.seoGuides) {
        setSavedSeoGuides(result.seoGuides);
        if (selectedSeoGuide?.id === deleteDialog.docId) {
          setSelectedSeoGuide(null);
        }
      }

      setDeleteDialog({ isOpen: false, docId: '', docName: '', type: 'writingStyle' });
      showAlert({ type: 'success', message: '문서가 삭제되었습니다.' });
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      showAlert({ type: 'error', message: (error as Error).message });
    }
  }, [deleteDialog, selectedWritingStyles, selectedSeoGuide, showAlert]);

  // 삭제 다이얼로그 닫기
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ isOpen: false, docId: '', docName: '', type: 'writingStyle' });
  }, []);

  // 제목 추천 생성
  const generateTitleRecommendations = useCallback(async () => {
    if (!mainKeyword.trim()) {
      showAlert({ type: 'warning', message: '메인키워드를 입력해주세요!' });
      return;
    }

    // API 설정 확인
    const apiSettings = await TitleGenerationService.getWritingAPISettings();
    if (!apiSettings) {
      showAlert({ type: 'warning', message: '글쓰기 API가 설정되지 않았습니다. API 설정에서 글쓰기 AI를 연결해주세요.' });
      return;
    }

    setIsGeneratingTitles(true);
    setGeneratedTitles([]);
    setSelectedTitle('');

    try {
      let titles: string[] = [];

      // 트렌드 분석 캐시가 있으면 제목만 재생성
      if (trendAnalysisCache && trendAnalysisCache.contents.length > 0) {
        titles = await TitleGenerationService.regenerateTitlesFromCache(trendAnalysisCache);
        showAlert({ type: 'success', message: `새로운 제목 ${titles.length}개가 생성되었습니다.` });
      } else {
        // 캐시가 없으면 기존 방식으로 제목 생성
        titles = await TitleGenerationService.generateTitles({
          mainKeyword,
          subKeywords,
          blogContent
        });
      }

      if (titles.length > 0) {
        setGeneratedTitles(titles);
      }
    } catch (error) {
      console.error('제목 생성 실패:', error);
      const errorMessage = TitleGenerationService.getErrorMessage(error as Error);
      showAlert({ type: 'error', message: errorMessage });
    } finally {
      setIsGeneratingTitles(false);
    }
  }, [mainKeyword, subKeywords, blogContent, trendAnalysisCache, showAlert]);

  // 진행률 섹션으로 스크롤
  const scrollToProgress = useCallback(() => {
    if (progressSectionRef.current) {
      progressSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // 콘텐츠 생성 시작
  const handleStartGeneration = useCallback(async () => {
    const customTitle = ContentGenerationService.getCustomTitleInput();
    const finalTitle = ContentGenerationService.determineFinalTitle(customTitle, selectedTitle);

    // 입력값 검증
    const validation = ContentGenerationService.validateInputs({
      finalTitle,
      mainKeyword,
      selectedSeoGuide
    });

    if (!validation.valid) {
      // Toast 알림 표시
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = validation.error!;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }

    setIsGenerating(true);
    setTimeout(scrollToProgress, 100);

    try {
      // Claude Web으로 콘텐츠 생성
      const content = await ContentGenerationService.generateWithClaudeWeb(
        {
          finalTitle,
          mainKeyword,
          subKeywords,
          blogContent,
          selectedWritingStyles,
          selectedSeoGuide: selectedSeoGuide!
        },
        setGenerationStep
      );

      // 이미지 프롬프트 생성
      setTimeout(async () => {
        const imageResult = await ContentGenerationService.generateImagePrompts(content, setGenerationStep);

        // WorkflowData 업데이트 및 Step2로 이동
        updateWorkflowData({
          writingStylePaths: selectedWritingStyles.map(doc => doc.filePath),
          seoGuidePath: selectedSeoGuide?.filePath || '',
          topic: `제목: ${finalTitle}`,
          selectedTitle: finalTitle,
          mainKeyword: mainKeyword,
          subKeywords: subKeywords,
          blogContent: blogContent,
          generatedContent: content,
          isAIGenerated: true,
          generatedTitles: generatedTitles,
          imagePrompts: imageResult.imagePrompts,
          imagePromptGenerationFailed: imageResult.failed
        });
        nextStep();
      }, 1000);

    } catch (error) {
      console.error('생성 실패:', error);
      setGenerationStep('오류 발생: ' + (error as Error).message);
      setIsGenerating(false);
    }
  }, [
    selectedTitle,
    mainKeyword,
    subKeywords,
    blogContent,
    selectedWritingStyles,
    selectedSeoGuide,
    generatedTitles,
    updateWorkflowData,
    nextStep,
    scrollToProgress
  ]);

  // 수동 업로드 처리
  const handleFileUploaded = useCallback(async (content: string) => {
    setIsGenerating(true);
    setGenerationStep('업로드된 파일 처리 중...');
    setTimeout(scrollToProgress, 100);

    try {
      console.log('📄 수동 파일 업로드됨, 이미지 프롬프트 생성 중...');

      const customTitle = ContentGenerationService.getCustomTitleInput();
      const extractedTitle = ContentGenerationService.extractTitleFromContent(content);
      const finalTitle = customTitle || extractedTitle;

      // 이미지 프롬프트 생성
      const imageResult = await ContentGenerationService.generateImagePrompts(content, setGenerationStep);

      // WorkflowData 업데이트 및 Step2로 이동
      updateWorkflowData({
        writingStylePaths: [],
        seoGuidePath: '',
        topic: `제목: ${finalTitle}`,
        selectedTitle: finalTitle,
        mainKeyword: mainKeyword || '직접 업로드',
        subKeywords: subKeywords || '',
        blogContent: '',
        generatedContent: content,
        isAIGenerated: false,
        imagePrompts: imageResult.imagePrompts,
        imagePromptGenerationFailed: imageResult.failed
      });
      nextStep();

    } catch (error) {
      console.error('파일 처리 실패:', error);
      setGenerationStep('오류 발생: ' + (error as Error).message);
      setIsGenerating(false);
    }
  }, [mainKeyword, subKeywords, updateWorkflowData, nextStep, scrollToProgress]);

  return {
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
    scrollToProgress,

    // 다이얼로그 상태
    deleteDialog
  };
};