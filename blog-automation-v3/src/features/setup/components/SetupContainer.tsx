import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConfirmDialog from './ConfirmDialog';
import AlertDialog from '../../../shared/components/ui/AlertDialog';
import DocumentUploadSection from './DocumentUploadSection';
import KeywordInputSection from './KeywordInputSection';
import TitleRecommendationSection from './TitleRecommendationSection';
import GenerationProgressSection from './GenerationProgressSection';
import ManualUploadSection from './ManualUploadSection';
import { BlogPromptService } from '../../../shared/services/content/blog-prompt-service';
import { BlogWritingService } from '../../../shared/services/content/blog-writing-service';
import { TrendAnalysisResult } from '../../../shared/services/content/blog-trend-analyzer';
import { StorageService, SavedDocument } from '../../../shared/services/storage/storage-service';
import { SetupService } from '../services/setup-service';
import Button from '../../../shared/components/ui/Button';
import { useDialog } from '../../../app/DialogContext';

interface Step1Props {
  onComplete: (data: {
    writingStylePaths: string[];
    seoGuidePath: string;
    topic: string;
    selectedTitle: string;
    mainKeyword: string;
    subKeywords: string;
    blogContent: string;
    generatedContent: string | undefined;
    isAIGenerated: boolean;
    generatedTitles: string[];
    imagePrompts: any[];
    imagePromptGenerationFailed: boolean;
  }) => void;
  initialData?: {
    writingStylePaths: string[];
    seoGuidePath: string;
    topic: string;
    selectedTitle: string;
    mainKeyword: string;
    subKeywords: string;
    blogContent: string;
    generatedContent?: string;
    isAIGenerated: boolean;
    generatedTitles: string[];
    imagePrompts?: any[];
    imagePromptGenerationFailed?: boolean;
  };
}

const Step1Setup: React.FC<Step1Props> = ({ onComplete, initialData }) => {

  // Dialog 사용
  const { showAlert, showConfirm } = useDialog();

  // 진행률 섹션 참조 (자동 스크롤용)
  const progressSectionRef = useRef<HTMLDivElement>(null);

  // 키워드 입력 상태
  const [mainKeyword, setMainKeyword] = useState(initialData?.mainKeyword || '');
  const [subKeywords, setSubKeywords] = useState(initialData?.subKeywords || '');
  const [blogContent, setBlogContent] = useState(initialData?.blogContent || '');
  
  // 제목 추천 관련 상태
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>(initialData?.generatedTitles || []);
  const [selectedTitle, setSelectedTitle] = useState(initialData?.selectedTitle || '');

  // 트렌드 분석 결과 저장 (제목 재생성용)
  const [trendAnalysisCache, setTrendAnalysisCache] = useState<{
    contents: any[];
    mainKeyword: string;
    allTitles: string[];
    subKeywords: string[];
    direction: string;
  } | null>(null);

  // 생성 관련 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  
  // 저장된 문서들
  const [savedWritingStyles, setSavedWritingStyles] = useState<SavedDocument[]>([]);
  const [savedSeoGuides, setSavedSeoGuides] = useState<SavedDocument[]>([]);
  
  // 선택된 문서들
  const [selectedWritingStyles, setSelectedWritingStyles] = useState<SavedDocument[]>([]);
  const [selectedSeoGuide, setSelectedSeoGuide] = useState<SavedDocument | null>(null);

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

  // 알림 다이얼로그 상태
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

  // 로컬 스토리지에서 저장된 문서들 로드 및 초기 데이터 복원
  useEffect(() => {
    const loadSavedDocuments = async () => {
      try {
        const result = await SetupService.loadDocuments(initialData);

        setSavedWritingStyles(result.writingStyles);
        setSavedSeoGuides(result.seoGuides);
        setSelectedWritingStyles(result.selectedWritingStyles);
        setSelectedSeoGuide(result.selectedSeoGuide);
      } catch (error) {
        console.error('문서 로드 실패:', error);
      }
    };

    loadSavedDocuments();
  }, [initialData]);

  // 말투 선택 상태가 변경되면 localStorage에 저장
  useEffect(() => {
    if (selectedWritingStyles.length > 0) {
      SetupService.saveSelectedWritingStyles(selectedWritingStyles);
    }
  }, [selectedWritingStyles]);

  // 말투 문서 선택/해제
  const toggleWritingStyle = (doc: SavedDocument) => {
    const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);
    
    if (isSelected) {
      setSelectedWritingStyles(selectedWritingStyles.filter(selected => selected.id !== doc.id));
    } else {
      if (selectedWritingStyles.length < 2) {
        setSelectedWritingStyles([...selectedWritingStyles, doc]);
      } else {
        showAlert({ type: 'warning', message: '말투 문서는 최대 2개까지만 선택할 수 있습니다!' });
      }
    }
  };

  // SEO 가이드 선택
  const toggleSeoGuide = (doc: SavedDocument) => {
    setSelectedSeoGuide(selectedSeoGuide?.id === doc.id ? null : doc);
  };

  // 삭제 다이얼로그 관련 함수들
  const openDeleteDialog = (type: 'writingStyle' | 'seoGuide', docId: string, docName: string) => {
    setDeleteDialog({ isOpen: true, docId, docName, type });
  };

  const confirmDelete = async () => {
    const { type, docId, docName } = deleteDialog;

    try {
      const result = await SetupService.deleteDocument(docId, type, docName);

      if (type === 'writingStyle') {
        // 선택 목록에서도 제거
        setSelectedWritingStyles(selectedWritingStyles.filter(doc => doc.id !== docId));
        setSavedWritingStyles(result.writingStyles!);
      } else {
        // SEO 가이드가 선택되어 있었으면 해제
        if (selectedSeoGuide?.id === docId) {
          setSelectedSeoGuide(null);
        }
        setSavedSeoGuides(result.seoGuides!);
      }
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      showAlert({ type: 'error', message: '파일 삭제에 실패했습니다.' });
    }

    setDeleteDialog({ isOpen: false, docId: '', docName: '', type: 'writingStyle' });
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, docId: '', docName: '', type: 'writingStyle' });
  };

  // 이미지 프롬프트 자동 생성 함수
  const generateImagePromptsForContent = async (content: string) => {
    try {
      console.log('🎨 1단계에서 이미지 프롬프트 자동 생성 시작');
      const result = await BlogWritingService.generateImagePrompts(content);
      
      if (result.success) {
        console.log(`✅ 이미지 프롬프트 생성 완료: ${result.imagePrompts?.length || 0}개`);
        return result.imagePrompts || [];
      } else {
        console.warn('⚠️ 이미지 프롬프트 생성 실패:', result.error);
        return [];
      }
    } catch (error) {
      console.error('❌ 이미지 프롬프트 생성 중 오류:', error);
      return [];
    }
  };


  // URL 크롤링 핸들러
  const handleUrlCrawl = async (url: string): Promise<{ title: string; contentLength: number } | null> => {
    try {
      const result = await SetupService.crawlBlogContent(url);

      if (result) {
        // 파일명으로 사용할 제목 정리
        const fileName = result.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);

        // 중복 체크: 동일한 이름의 문서가 이미 있는지 확인
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

        // 성공 정보 반환
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
  };

  const handleFileUpload = async (type: 'writingStyle' | 'seoGuide', file: File) => {
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
  };

  // 현재 적용된 글쓰기 API 설정 가져오기
  const getWritingAPISettings = async () => {
    try {
      const llmSettings = await window.electronAPI?.getLLMSettings?.();
      if (llmSettings?.appliedSettings?.writing) {
        const { provider, model, apiKey } = llmSettings.appliedSettings.writing;
        if (provider && model && apiKey) {
          return { provider, model, apiKey };
        }
      }
      return null;
    } catch (error) {
      console.error('글쓰기 API 설정 로드 실패:', error);
      return null;
    }
  };

  // v2 스타일 제목 추천 함수
  const generateTitleRecommendations = async () => {
    if (!mainKeyword.trim()) {
      showAlert({ type: 'warning', message: '메인키워드를 입력해주세요!' });
      return;
    }

    // API 설정 확인
    const apiSettings = await getWritingAPISettings();
    if (!apiSettings) {
      showAlert({ type: 'warning', message: '글쓰기 API가 설정되지 않았습니다. API 설정에서 글쓰기 AI를 연결해주세요.' });
      return;
    }

    setIsGeneratingTitles(true);
    setGeneratedTitles([]);
    setSelectedTitle('');

    try {
      // 트렌드 분석 캐시가 있으면 제목만 재생성
      if (trendAnalysisCache && trendAnalysisCache.contents.length > 0) {
        console.log('🔄 트렌드 분석 데이터로 제목 재생성...');
        const { BlogTrendAnalyzer } = await import('../../../shared/services/content/blog-trend-analyzer');

        const newTitles = await BlogTrendAnalyzer.regenerateTitlesOnly(
          trendAnalysisCache.contents,
          trendAnalysisCache.mainKeyword,
          trendAnalysisCache.allTitles
        );

        if (newTitles.length > 0) {
          setGeneratedTitles(newTitles);
          setAlertDialog({
            isOpen: true,
            type: 'success',
            title: '제목 재생성 완료',
            message: `새로운 제목 ${newTitles.length}개가 생성되었습니다.`
          });
        } else {
          throw new Error('제목 생성에 실패했습니다.');
        }

        setIsGeneratingTitles(false);
        return;
      }

      // 캐시가 없으면 기존 방식으로 제목 생성
      // 서비스에서 프롬프트 생성
      const systemPrompt = BlogPromptService.getTitleGenerationSystemPrompt();
      const userPrompt = BlogPromptService.getTitleGenerationUserPrompt({
        mainKeyword,
        subKeywords,
        blogContent
      });

      // 연결된 글쓰기 API를 통해 제목 생성
      const response = await window.electronAPI.generateTitles({
        systemPrompt: systemPrompt,
        userPrompt: userPrompt
      });
      
      // API 응답에서 제목 추출
      let titles: string[] = [];
      
      if (response.success) {
        // titles 배열이 직접 있는 경우 사용
        if (response.titles && Array.isArray(response.titles)) {
          titles = response.titles.slice(0, 10);
        }
        // content 속성에서 파싱이 필요한 경우 (main process에서 content로 반환)
        else if ((response as any).content) {
          const content = (response as any).content;
          try {
            // JSON 형식으로 응답이 올 경우 파싱
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);
              if (jsonData.titles && Array.isArray(jsonData.titles)) {
                titles = jsonData.titles.slice(0, 10);
              }
            }
          } catch (error) {
            console.warn('JSON 파싱 실패, 번호 목록으로 처리:', error);
          }

          // fallback: 번호 목록 형태 처리
          if (titles.length === 0) {
            const titleMatches = content.match(/^\d+\.\s*(.+)$/gm);
            if (titleMatches && titleMatches.length > 0) {
              titles = titleMatches
                .map((match: string): string => match.replace(/^\d+\.\s*/, '').trim())
                .slice(0, 10);
            }
          }
        }
      } else {
        throw new Error(response.error || '제목 생성 API 호출 실패');
      }
      
      if (titles.length > 0) {
        setGeneratedTitles(titles);
      } else {
        showAlert({ type: 'error', message: '제목 생성에 실패했습니다. 다시 시도해주세요.' });
      }
      
    } catch (error) {
      console.error('제목 생성 실패:', error);
      
      const errorMessage = (error as Error).message;
      let userMessage = '제목 생성 중 오류가 발생했습니다.';
      
      if (errorMessage.includes('일시적으로 과부하')) {
        userMessage = '🔄 AI 서버가 바쁩니다. 잠시 후 "🔄 재생성" 버튼을 눌러 다시 시도해주세요.';
      } else if (errorMessage.includes('사용량 한도')) {
        userMessage = '⏰ API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
      } else if (errorMessage.includes('API 키가 올바르지')) {
        userMessage = '🔑 API 키 설정에 문제가 있습니다. 설정 → LLM 설정에서 API 키를 확인해주세요.';
      } else {
        userMessage += `\n\n오류 상세: ${errorMessage}`;
      }
      
      showAlert({ type: 'error', message: userMessage });
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // 수동 업로드 콘텐츠 처리 함수
  const handleFileUploaded = async (content: string) => {
    setIsGenerating(true);
    setGenerationStep('업로드된 파일 처리 중...');
    
    // 진행률 섹션으로 부드럽게 스크롤
    setTimeout(() => {
      scrollToProgress();
    }, 100); // UI 업데이트 후 스크롤
    
    try {
      console.log('📄 수동 파일 업로드됨, 이미지 프롬프트 생성 중...');
      
      // 수동으로 입력한 제목이 있는지 확인
      const customTitleInputs = document.querySelectorAll('input[placeholder*="사용하고 싶은 제목"]') as NodeListOf<HTMLInputElement>;
      let manualTitle = '';
      
      // 각 입력 필드에서 값이 있는지 확인
      for (const input of customTitleInputs) {
        if (input.value && input.value.trim()) {
          manualTitle = input.value.trim();
          break;
        }
      }
      
      // 파일에서 #제목 추출 (마크다운 제목 형태)
      let extractedTitle = '';
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1]) {
        extractedTitle = titleMatch[1].trim();
        console.log('📝 파일에서 제목 추출됨:', extractedTitle);
      }
      
      // 제목 결정 우선순위: 직접 입력한 제목 > 파일에서 추출한 제목 > AI 추천 제목 > 기본값
      const finalTitle = manualTitle || extractedTitle || selectedTitle || '수동 업로드된 글';
      
      // 이미지 프롬프트 자동 생성
      setGenerationStep('이미지 프롬프트 생성 중...');
      const imagePrompts = await generateImagePromptsForContent(content);
      
      // 이미지 프롬프트 생성 실패 여부 확인
      const hasImageTags = content.match(/\(이미지\)|\[이미지\]/g);
      const expectedImageCount = hasImageTags ? hasImageTags.length : 0;
      const generatedImageCount = imagePrompts ? imagePrompts.length : 0;
      
      setGenerationStep('완료!');
      
      setTimeout(() => {
        // 통합된 onComplete 호출 - 수동 업로드
        onComplete({ 
          writingStylePaths: selectedWritingStyles.map(doc => doc.filePath),
          seoGuidePath: selectedSeoGuide?.filePath || '',
          topic: `제목: ${finalTitle}`,
          selectedTitle: finalTitle,
          mainKeyword: mainKeyword,
          subKeywords: subKeywords,
          blogContent: blogContent,
          generatedContent: content, // 수동 업로드된 콘텐츠
          isAIGenerated: false, // 수동 업로드
          generatedTitles: generatedTitles, // 생성된 제목들도 유지
          imagePrompts: imagePrompts, // 자동 생성된 이미지 프롬프트들
          imagePromptGenerationFailed: expectedImageCount > 0 && generatedImageCount === 0 // 이미지 프롬프트 실패 플래그
        });
      }, 1000);
    } catch (error) {
      console.error('파일 업로드 처리 중 오류:', error);
      setGenerationStep('오류 발생: ' + (error as Error).message);
      setIsGenerating(false);
    }
  };

  // 진행률 섹션으로 자동 스크롤
  const scrollToProgress = () => {
    if (progressSectionRef.current) {
      progressSectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center' // 화면 중앙에 위치하도록
      });
    }
  };

  // 자동 생성 함수 (제목 선택 후 호출됨)
  const handleStartGeneration = async () => {
    // 먼저 커스텀 제목 입력값 확인
    const customTitleInputs = document.querySelectorAll('input[placeholder*="사용하고 싶은 제목"]') as NodeListOf<HTMLInputElement>;
    let customTitle = '';
    
    for (const input of customTitleInputs) {
      if (input.value && input.value.trim()) {
        customTitle = input.value.trim();
        break;
      }
    }
    
    // 실제 사용할 제목 결정 (우선순위: 커스텀 입력 > AI 선택 제목)
    const finalTitle = customTitle || (selectedTitle !== '__CUSTOM__' ? selectedTitle : '');
    
    // 필수 요구사항 검증
    if (!finalTitle) {
      // alert 대신 키워드 입력 필드로 포커스 이동
      const titleError = document.createElement('div');
      titleError.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      titleError.textContent = '제목을 선택하거나 입력해주세요!';
      document.body.appendChild(titleError);
      setTimeout(() => titleError.remove(), 3000);
      return;
    }

    if (!mainKeyword.trim()) {
      // 메인키워드 입력 필드로 포커스 이동
      const keywordInput = document.querySelector('input[placeholder*="메인키워드"]') as HTMLInputElement;
      if (keywordInput) {
        keywordInput.focus();
        keywordInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // alert 대신 토스트 알림
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = '메인키워드를 입력해주세요!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }

    if (!selectedSeoGuide) {
      // alert 대신 토스트 알림
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'SEO 가이드를 선택해주세요!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }

    setIsGenerating(true);
    setGenerationStep('클로드 웹 브라우저 열기...');
    
    // 진행률 섹션으로 부드럽게 스크롤
    setTimeout(() => {
      scrollToProgress();
    }, 100); // UI 업데이트 후 스크롤
    
    try {
      await window.electronAPI.openClaudeWeb();
      setGenerationStep('문서 업로드 중...');
      
      // 서비스에서 Claude Web용 통합 프롬프트 생성
      const detailedInstructions = BlogPromptService.getClaudeWebPrompt({
        selectedTitle: finalTitle,
        mainKeyword,
        subKeywords,
        blogContent,
        writingStyleCount: selectedWritingStyles.length,
        hasSeoGuide: !!selectedSeoGuide
      });

      await window.electronAPI.sendToClaudeWeb(
        selectedWritingStyles.map(doc => doc.filePath),
        selectedSeoGuide?.filePath || '',
        detailedInstructions
      );
      setGenerationStep('AI 응답 생성 중...');
      
      await window.electronAPI.waitForClaudeResponse();
      setGenerationStep('마크다운 다운로드 중...');
      
      if (!window.electronAPI?.downloadFromClaude) {
        throw new Error('Claude 다운로드 API를 사용할 수 없습니다.');
      }
      
      const content = await window.electronAPI.downloadFromClaude();
      
      if (!content) {
        throw new Error('Claude에서 콘텐츠를 다운로드할 수 없습니다.');
      }
      setGenerationStep('완료!');
      
      setTimeout(async () => {
        // 이미지 프롬프트 자동 생성
        setGenerationStep('이미지 프롬프트 생성 중...');
        const imagePrompts = await generateImagePromptsForContent(content);
        
        // 이미지 프롬프트 생성 실패 여부 확인
        const hasImageTags = content.match(/\(이미지\)|\[이미지\]/g);
        const expectedImageCount = hasImageTags ? hasImageTags.length : 0;
        const generatedImageCount = imagePrompts ? imagePrompts.length : 0;
        
        // 글쓰기는 성공했으므로 이미지 프롬프트 실패 여부와 관계없이 완료 처리
        onComplete({ 
          writingStylePaths: selectedWritingStyles.map(doc => doc.filePath),
          seoGuidePath: selectedSeoGuide?.filePath || '',
          topic: `제목: ${finalTitle}`,
          selectedTitle: finalTitle, // 실제 사용할 제목 전달
          mainKeyword: mainKeyword,
          subKeywords: subKeywords,
          blogContent: blogContent,
          generatedContent: content,
          isAIGenerated: true, // AI로 생성됨
          generatedTitles: generatedTitles, // 생성된 제목들도 유지
          imagePrompts: imagePrompts, // 자동 생성된 이미지 프롬프트들 (실패해도 빈 배열)
          imagePromptGenerationFailed: expectedImageCount > 0 && generatedImageCount === 0 // 이미지 프롬프트 실패 플래그
        });
      }, 1000);
      
    } catch (error) {
      console.error('생성 실패:', error);
      setGenerationStep('오류 발생: ' + (error as Error).message);
      setIsGenerating(false);
    }
  };


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
          setGeneratedTitles(result.recommendedTitles);

          // 제목 재생성을 위한 캐시 저장
          if (result.crawledContents && result.allTitles) {
            setTrendAnalysisCache({
              contents: result.crawledContents,
              mainKeyword: result.mainKeyword,
              allTitles: result.allTitles,
              subKeywords: result.subKeywords,
              direction: result.contentDirection
            });
          }

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
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="문서 삭제"
        message={`"${deleteDialog.docName}" 문서를 정말로 삭제하시겠습니까?`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

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