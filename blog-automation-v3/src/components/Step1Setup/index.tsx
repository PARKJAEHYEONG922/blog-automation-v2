import React, { useState, useEffect, useCallback } from 'react';
import ConfirmDialog from './ConfirmDialog';
import DocumentUploadSection from './DocumentUploadSection';
import KeywordInputSection from './KeywordInputSection';
import TitleRecommendationSection from './TitleRecommendationSection';
import GenerationProgressSection from './GenerationProgressSection';
import ManualUploadSection from './ManualUploadSection';
import { BlogPromptService } from '../../services/blog-prompt-service';
import { BlogWritingService } from '../../services/blog-writing-service';

interface Step1Props {
  onComplete: (data: {
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

interface SavedDocument {
  id: string;
  name: string;
  content: string;
  filePath: string;
  createdAt: string;
}

const Step1Setup: React.FC<Step1Props> = ({ onComplete, initialData }) => {
  
  // 키워드 입력 상태
  const [mainKeyword, setMainKeyword] = useState(initialData?.mainKeyword || '');
  const [subKeywords, setSubKeywords] = useState(initialData?.subKeywords || '');
  const [blogContent, setBlogContent] = useState(initialData?.blogContent || '');
  
  // 제목 추천 관련 상태
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>(initialData?.generatedTitles || []);
  const [selectedTitle, setSelectedTitle] = useState(initialData?.selectedTitle || '');
  
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

  // 로컬 스토리지에서 저장된 문서들 로드 및 초기 데이터 복원
  useEffect(() => {
    const loadSavedDocuments = async () => {
      const savedWritingStylesData = localStorage.getItem('savedWritingStyles');
      let loadedWritingStyles: SavedDocument[] = [];
      
      if (savedWritingStylesData) {
        loadedWritingStyles = JSON.parse(savedWritingStylesData);
        setSavedWritingStyles(loadedWritingStyles);
      }
      
      try {
        const seoGuides = await window.electronAPI.loadDocuments('seoGuide');
        if (seoGuides && seoGuides.length > 0) {
          setSavedSeoGuides(seoGuides);
          localStorage.setItem('savedSeoGuides', JSON.stringify(seoGuides));
          
          // 초기 데이터가 있으면 해당 SEO 가이드 선택
          if (initialData?.seoGuidePath) {
            const selectedSEO = seoGuides.find((doc: SavedDocument) => doc.filePath === initialData.seoGuidePath);
            if (selectedSEO) {
              setSelectedSeoGuide(selectedSEO);
            }
          } else {
            const defaultSEO = seoGuides.find((doc: SavedDocument) => doc.name.includes('기본'));
            if (defaultSEO && !selectedSeoGuide) {
              setSelectedSeoGuide(defaultSEO);
            }
          }
        } else {
          await window.electronAPI.createDefaultSEO();
          const newSeoGuides = await window.electronAPI.loadDocuments('seoGuide');
          if (newSeoGuides && newSeoGuides.length > 0) {
            setSavedSeoGuides(newSeoGuides);
            localStorage.setItem('savedSeoGuides', JSON.stringify(newSeoGuides));
            
            const defaultSEO = newSeoGuides.find((doc: SavedDocument) => doc.name.includes('기본'));
            if (defaultSEO && !selectedSeoGuide) {
              setSelectedSeoGuide(defaultSEO);
            }
          }
        }
      } catch (error) {
        console.error('SEO 가이드 문서 로드 실패:', error);
        const savedSeoGuidesData = localStorage.getItem('savedSeoGuides');
        if (savedSeoGuidesData) {
          const seoGuides = JSON.parse(savedSeoGuidesData);
          setSavedSeoGuides(seoGuides);
          
          const defaultSEO = seoGuides.find((doc: SavedDocument) => doc.name.includes('기본'));
          if (defaultSEO && !selectedSeoGuide) {
            setSelectedSeoGuide(defaultSEO);
          }
        }
      }

      // 초기 데이터가 있으면 선택된 말투 문서들도 복원
      if (initialData?.writingStylePaths && initialData.writingStylePaths.length > 0) {
        const selectedStyles = loadedWritingStyles.filter(doc => 
          initialData.writingStylePaths.includes(doc.filePath)
        );
        setSelectedWritingStyles(selectedStyles);
      }
    };
    
    loadSavedDocuments();
  }, [initialData]);

  // 말투 문서 선택/해제
  const toggleWritingStyle = (doc: SavedDocument) => {
    const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);
    
    if (isSelected) {
      setSelectedWritingStyles(selectedWritingStyles.filter(selected => selected.id !== doc.id));
    } else {
      if (selectedWritingStyles.length < 2) {
        setSelectedWritingStyles([...selectedWritingStyles, doc]);
      } else {
        alert('말투 문서는 최대 2개까지만 선택할 수 있습니다!');
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
    const { type, docId } = deleteDialog;

    try {
      if (type === 'writingStyle') {
        const docToDelete = savedWritingStyles.find(doc => doc.id === docId);
        if (docToDelete) {
          await window.electronAPI.deleteDocument(docToDelete.filePath);
        }
        
        setSelectedWritingStyles(selectedWritingStyles.filter(doc => doc.id !== docId));
        const updated = savedWritingStyles.filter(doc => doc.id !== docId);
        setSavedWritingStyles(updated);
        localStorage.setItem('savedWritingStyles', JSON.stringify(updated));
      } else {
        const docToDelete = savedSeoGuides.find(doc => doc.id === docId);
        if (docToDelete) {
          await window.electronAPI.deleteDocument(docToDelete.filePath);
        }
        
        if (selectedSeoGuide?.id === docId) {
          setSelectedSeoGuide(null);
        }
        const updated = savedSeoGuides.filter(doc => doc.id !== docId);
        setSavedSeoGuides(updated);
        localStorage.setItem('savedSeoGuides', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      alert('파일 삭제에 실패했습니다.');
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

  // 자동 저장 함수
  const saveDocumentAuto = async (type: 'writingStyle' | 'seoGuide', name: string, content: string): Promise<SavedDocument> => {
    const filePath = await window.electronAPI.saveDocument(type, name, content);
    
    const newDocument: SavedDocument = {
      id: Date.now().toString(),
      name: name.trim(),
      content,
      filePath,
      createdAt: new Date().toISOString()
    };

    if (type === 'writingStyle') {
      const existingIndex = savedWritingStyles.findIndex(doc => doc.name === name.trim());
      let updated;
      if (existingIndex >= 0) {
        await window.electronAPI.deleteDocument(savedWritingStyles[existingIndex].filePath);
        updated = [...savedWritingStyles];
        updated[existingIndex] = newDocument;
      } else {
        updated = [...savedWritingStyles, newDocument];
      }
      setSavedWritingStyles(updated);
      localStorage.setItem('savedWritingStyles', JSON.stringify(updated));
    } else {
      const existingIndex = savedSeoGuides.findIndex(doc => doc.name === name.trim());
      let updated;
      if (existingIndex >= 0) {
        await window.electronAPI.deleteDocument(savedSeoGuides[existingIndex].filePath);
        updated = [...savedSeoGuides];
        updated[existingIndex] = newDocument;
      } else {
        updated = [...savedSeoGuides, newDocument];
      }
      setSavedSeoGuides(updated);
      localStorage.setItem('savedSeoGuides', JSON.stringify(updated));
    }
    
    return newDocument;
  };

  const handleFileUpload = (type: 'writingStyle' | 'seoGuide', file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const fileName = file.name.replace(/\.(txt|md)$/, '');
      
      try {
        const savedDoc = await saveDocumentAuto(type, fileName, content);
        
        if (type === 'writingStyle') {
          if (selectedWritingStyles.length < 2) {
            setSelectedWritingStyles([...selectedWritingStyles, savedDoc]);
          }
        } else {
          setSelectedSeoGuide(savedDoc);
        }
      } catch (error) {
        console.error('파일 저장 실패:', error);
        alert('파일 저장에 실패했습니다.');
      }
    };
    reader.readAsText(file);
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

  // 더미 제목 로드 함수
  const handleLoadDummyTitles = (dummyTitles: string[]) => {
    setGeneratedTitles(dummyTitles);
    setSelectedTitle(''); // 선택된 제목 초기화
    console.log('더미 제목 데이터 로드됨:', dummyTitles.length + '개');
  };

  // v2 스타일 제목 추천 함수
  const generateTitleRecommendations = async () => {
    if (!mainKeyword.trim()) {
      alert('메인키워드를 입력해주세요!');
      return;
    }

    // API 설정 확인
    const apiSettings = await getWritingAPISettings();
    if (!apiSettings) {
      alert('글쓰기 API가 설정되지 않았습니다. API 설정에서 글쓰기 AI를 연결해주세요.');
      return;
    }

    setIsGeneratingTitles(true);
    setGeneratedTitles([]);
    setSelectedTitle('');
    
    try {
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
        alert('제목 생성에 실패했습니다. 다시 시도해주세요.');
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
      
      alert(userMessage);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // 수동 업로드 콘텐츠 처리 함수
  const handleFileUploaded = async (content: string) => {
    setIsGenerating(true);
    setGenerationStep('업로드된 파일 처리 중...');
    
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
      
      // 제목 결정: 직접 입력한 제목 > AI 추천 제목 > 기본값
      const finalTitle = manualTitle || selectedTitle || '수동 업로드된 글';
      
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
      alert('제목을 선택하거나 입력해주세요!');
      return;
    }

    if (!mainKeyword.trim()) {
      alert('메인키워드를 입력해주세요!');
      return;
    }

    if (!selectedSeoGuide) {
      alert('SEO 가이드를 선택해주세요!');
      return;
    }

    setIsGenerating(true);
    setGenerationStep('클로드 웹 브라우저 열기...');
    
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
      
      const content = await window.electronAPI.downloadFromClaude();
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
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
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
      />

      {/* 키워드 입력 섹션 */}
      <KeywordInputSection
        mainKeyword={mainKeyword}
        subKeywords={subKeywords}
        blogContent={blogContent}
        onMainKeywordChange={setMainKeyword}
        onSubKeywordsChange={setSubKeywords}
        onBlogContentChange={setBlogContent}
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
        onLoadDummyTitles={handleLoadDummyTitles}
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
      <GenerationProgressSection
        isGenerating={isGenerating}
        generationStep={generationStep}
      />
      
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
    </div>
  );
};

export default Step1Setup;