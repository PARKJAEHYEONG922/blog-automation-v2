import React, { useState, useEffect } from 'react';

interface Step1Props {
  onComplete: (data: {
    writingStylePaths: string[]; // 말투 문서 파일 경로들
    seoGuidePath: string;        // SEO 가이드 파일 경로
    topic: string;
    generatedContent?: string;   // 생성된 글 (옵셔널)
  }) => void;
}

interface SavedDocument {
  id: string;
  name: string;
  content: string;
  filePath: string;  // 실제 저장된 파일 경로
  createdAt: string;
}

// 공용 다이얼로그 컴포넌트
const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#495057', fontSize: '18px' }}>{title}</h3>
        <p style={{ margin: '0 0 24px 0', color: '#6c757d', fontSize: '14px', lineHeight: '1.5' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              backgroundColor: '#f8f9fa',
              color: '#495057',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#dc3545',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

const Step1Setup: React.FC<Step1Props> = ({ onComplete }) => {
  const [topic, setTopic] = useState('');
  
  // 키워드 입력 상태
  const [mainKeyword, setMainKeyword] = useState('');
  const [subKeywords, setSubKeywords] = useState('');
  
  // 제목 추천 관련 상태
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  
  // 생성 관련 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  
  // 저장된 문서들
  const [savedWritingStyles, setSavedWritingStyles] = useState<SavedDocument[]>([]);
  const [savedSeoGuides, setSavedSeoGuides] = useState<SavedDocument[]>([]);
  
  // 선택된 문서들 (말투 2개, SEO 1개)
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

  // 로컬 스토리지에서 저장된 문서들 로드
  useEffect(() => {
    const loadSavedDocuments = async () => {
      const savedWritingStylesData = localStorage.getItem('savedWritingStyles');
      
      if (savedWritingStylesData) {
        setSavedWritingStyles(JSON.parse(savedWritingStylesData));
      }
      
      // 항상 파일시스템에서 최신 SEO 가이드 로드 (기본 문서 포함)
      try {
        const seoGuides = await window.electronAPI.loadDocuments('seoGuide');
        if (seoGuides && seoGuides.length > 0) {
          setSavedSeoGuides(seoGuides);
          localStorage.setItem('savedSeoGuides', JSON.stringify(seoGuides));
          
          // 기본 SEO 가이드가 있으면 자동 선택
          const defaultSEO = seoGuides.find((doc: SavedDocument) => doc.name.includes('기본'));
          if (defaultSEO && !selectedSeoGuide) {
            setSelectedSeoGuide(defaultSEO);
          }
        } else {
          // SEO 가이드가 하나도 없으면 기본 가이드 생성
          await window.electronAPI.createDefaultSEO();
          // 생성 후 다시 로드
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
        // 실패 시 로컬스토리지에서라도 로드 시도
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
    };
    
    loadSavedDocuments();
  }, []);


  // 말투 문서 선택/해제 함수
  const toggleWritingStyle = (doc: SavedDocument) => {
    const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);
    
    if (isSelected) {
      // 선택 해제
      setSelectedWritingStyles(selectedWritingStyles.filter(selected => selected.id !== doc.id));
    } else {
      // 선택 (최대 2개)
      if (selectedWritingStyles.length < 2) {
        setSelectedWritingStyles([...selectedWritingStyles, doc]);
      } else {
        alert('말투 문서는 최대 2개까지만 선택할 수 있습니다!');
      }
    }
  };

  // SEO 가이드 선택 함수
  const toggleSeoGuide = (doc: SavedDocument) => {
    setSelectedSeoGuide(selectedSeoGuide?.id === doc.id ? null : doc);
  };

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (type: 'writingStyle' | 'seoGuide', docId: string, docName: string) => {
    setDeleteDialog({
      isOpen: true,
      docId,
      docName,
      type
    });
  };

  // 문서 삭제 확인
  const confirmDelete = async () => {
    const { type, docId } = deleteDialog;

    try {
      if (type === 'writingStyle') {
        // 물리 파일 삭제
        const docToDelete = savedWritingStyles.find(doc => doc.id === docId);
        if (docToDelete) {
          await window.electronAPI.deleteDocument(docToDelete.filePath);
        }
        
        // 선택된 문서에서도 제거
        setSelectedWritingStyles(selectedWritingStyles.filter(doc => doc.id !== docId));
        const updated = savedWritingStyles.filter(doc => doc.id !== docId);
        setSavedWritingStyles(updated);
        localStorage.setItem('savedWritingStyles', JSON.stringify(updated));
      } else {
        // 물리 파일 삭제
        const docToDelete = savedSeoGuides.find(doc => doc.id === docId);
        if (docToDelete) {
          await window.electronAPI.deleteDocument(docToDelete.filePath);
        }
        
        // 선택된 SEO 가이드도 제거
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

  // 삭제 다이얼로그 닫기
  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, docId: '', docName: '', type: 'writingStyle' });
  };

  // 자동 저장 함수 (알림 없이)
  const saveDocumentAuto = async (type: 'writingStyle' | 'seoGuide', name: string, content: string): Promise<SavedDocument> => {
    // 파일을 실제 폴더에 저장
    const filePath = await window.electronAPI.saveDocument(type, name, content);
    
    const newDocument: SavedDocument = {
      id: Date.now().toString(),
      name: name.trim(),  // 원래 파일명 유지
      content,
      filePath,
      createdAt: new Date().toISOString()
    };

    if (type === 'writingStyle') {
      // 같은 이름이 있으면 교체, 없으면 추가
      const existingIndex = savedWritingStyles.findIndex(doc => doc.name === name.trim());
      let updated;
      if (existingIndex >= 0) {
        // 기존 파일 삭제
        await window.electronAPI.deleteDocument(savedWritingStyles[existingIndex].filePath);
        updated = [...savedWritingStyles];
        updated[existingIndex] = newDocument;
      } else {
        updated = [...savedWritingStyles, newDocument];
      }
      setSavedWritingStyles(updated);
      localStorage.setItem('savedWritingStyles', JSON.stringify(updated));
    } else {
      // 같은 이름이 있으면 교체, 없으면 추가
      const existingIndex = savedSeoGuides.findIndex(doc => doc.name === name.trim());
      let updated;
      if (existingIndex >= 0) {
        // 기존 파일 삭제
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
        // 자동 저장
        const savedDoc = await saveDocumentAuto(type, fileName, content);
        
        // 저장 후 자동 선택
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

  // 제목 추천 함수
  const generateTitleRecommendations = async () => {
    if (!mainKeyword.trim()) {
      alert('메인키워드를 입력해주세요!');
      return;
    }

    setIsGeneratingTitles(true);
    setGeneratedTitles([]);
    setSelectedTitle('');
    
    try {
      // Claude Web 브라우저 열기
      await window.electronAPI.openClaudeWeb();
      
      // 제목 생성 프롬프트 구성
      const subKeywordList = subKeywords.split(',').map(k => k.trim()).filter(k => k);
      const titlePrompt = `메인키워드: ${mainKeyword}
${subKeywordList.length > 0 ? `보조키워드: ${subKeywordList.join(', ')}` : ''}

위 키워드를 활용해서 네이버 블로그 최적화에 맞는 매력적인 제목 10개를 추천해주세요.

요구사항:
- 메인키워드는 제목에 자연스럽게 포함
- 보조키워드 중 1-2개는 제목에 활용
- 클릭하고 싶은 매력적인 제목
- 검색 최적화 고려
- 다양한 스타일 (방법, 후기, 추천, 비교, 정보 등)

제목만 번호와 함께 목록으로 작성해주세요.`;

      // 프롬프트 전송 (파일 업로드 없이)
      await window.electronAPI.sendToClaudeWeb([], '', titlePrompt);
      
      // 응답 대기
      await window.electronAPI.waitForClaudeResponse();
      
      // 응답 다운로드
      const response = await window.electronAPI.downloadFromClaude();
      
      // 제목 파싱 (번호가 있는 목록에서 제목만 추출)
      const titleMatches = response.match(/^\d+\.\s*(.+)$/gm);
      if (titleMatches && titleMatches.length > 0) {
        const titles = titleMatches
          .map(match => match.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 10); // 최대 10개
        
        setGeneratedTitles(titles);
      } else {
        alert('제목 생성에 실패했습니다. 다시 시도해주세요.');
      }
      
    } catch (error) {
      console.error('제목 생성 실패:', error);
      alert('제목 생성 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // 자동 생성 함수
  const handleStartGeneration = async () => {
    if (!topic.trim()) {
      alert('블로그 주제를 입력해주세요!');
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
      
      await window.electronAPI.sendToClaudeWeb(
        selectedWritingStyles.map(doc => doc.filePath),
        selectedSeoGuide?.filePath || '',
        topic
      );
      setGenerationStep('AI 응답 생성 중...');
      
      await window.electronAPI.waitForClaudeResponse();
      setGenerationStep('마크다운 다운로드 중...');
      
      const content = await window.electronAPI.downloadFromClaude();
      setGenerationStep('완료!');
      
      setTimeout(() => {
        // 선택된 제목이 있으면 주제에 포함
        const finalTopic = selectedTitle ? 
          `제목: ${selectedTitle}\n주제: ${topic}\n메인키워드: ${mainKeyword}\n보조키워드: ${subKeywords}` : 
          topic;
          
        onComplete({ 
          writingStylePaths: selectedWritingStyles.map(doc => doc.filePath),
          seoGuidePath: selectedSeoGuide?.filePath || '',
          topic: finalTopic,
          generatedContent: content
        });
      }, 1000);
      
    } catch (error) {
      console.error('생성 실패:', error);
      setGenerationStep('오류 발생: ' + error.message);
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
      {/* 단계 제목 제거 */}
      
      {/* 문서 업로드 통합 섹션 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '2px solid #e9ecef',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h3 style={{ color: '#495057', fontSize: '20px', marginBottom: '8px' }}>📚 문서 업로드</h3>
          <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
            블로그 글 생성에 사용할 참고 문서들을 업로드하세요
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '25px' }}>
          {/* 말투 문서 */}
          <div style={{ flex: '1' }}>
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{ color: '#495057', marginBottom: '8px', fontSize: '16px' }}>✍️ 나만의 말투 문서</h4>
              <p style={{ color: '#6c757d', fontSize: '13px', marginBottom: '16px' }}>
                평소 블로그 글 스타일 참고용 (최대 2개)
              </p>
            
              <input
                type="file"
                accept=".txt,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('writingStyle', file);
                }}
                style={{
                  padding: '8px',
                  border: '2px dashed #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                  width: '100%',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              />

              {savedWritingStyles.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {savedWritingStyles.map(doc => {
                      const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);
                      return (
                        <div key={doc.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: isSelected ? '#e8f5e8' : '#f8f9fa',
                          border: isSelected ? '2px solid #28a745' : '1px solid #dee2e6',
                          borderRadius: '15px',
                          padding: '4px 10px',
                          fontSize: '12px'
                        }}>
                          <span
                            onClick={() => toggleWritingStyle(doc)}
                            style={{ cursor: 'pointer', color: '#495057', marginRight: '6px' }}
                          >
                            {isSelected ? '✅ ' : ''}{doc.name}
                          </span>
                          <button
                            onClick={() => openDeleteDialog('writingStyle', doc.id, doc.name)}
                            style={{
                              background: 'none', border: 'none', color: '#dc3545',
                              cursor: 'pointer', fontSize: '12px', padding: '0'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {selectedWritingStyles.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#6c757d' }}>
                      선택: {selectedWritingStyles.length}/2
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SEO 가이드 */}
          <div style={{ flex: '1' }}>
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h4 style={{ color: '#495057', marginBottom: '8px', fontSize: '16px' }}>📊 네이버 SEO 가이드</h4>
              <p style={{ color: '#6c757d', fontSize: '13px', marginBottom: '16px' }}>
                SEO 최적화 가이드 (1개 선택)
              </p>
            
              <input
                type="file"
                accept=".txt,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('seoGuide', file);
                }}
                style={{
                  padding: '8px',
                  border: '2px dashed #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                  width: '100%',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              />

              {savedSeoGuides.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {savedSeoGuides.map(doc => {
                      const isSelected = selectedSeoGuide?.id === doc.id;
                      return (
                        <div key={doc.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: isSelected ? '#e3f2fd' : '#f8f9fa',
                          border: isSelected ? '2px solid #2196f3' : '1px solid #dee2e6',
                          borderRadius: '15px',
                          padding: '4px 10px',
                          fontSize: '12px'
                        }}>
                          <span
                            onClick={() => toggleSeoGuide(doc)}
                            style={{ cursor: 'pointer', color: '#495057', marginRight: '6px' }}
                          >
                            {isSelected ? '📘 ' : '📄 '}{doc.name}
                          </span>
                          <button
                            onClick={() => openDeleteDialog('seoGuide', doc.id, doc.name)}
                            style={{
                              background: 'none', border: 'none', color: '#dc3545',
                              cursor: 'pointer', fontSize: '12px', padding: '0'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {selectedSeoGuide && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#6c757d' }}>
                      선택: {selectedSeoGuide.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 키워드 입력 및 제목 추천 */}
      <div style={{
        backgroundColor: '#fff',
        border: '2px solid #e9ecef',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#495057', marginBottom: '8px', fontSize: '20px' }}>🔍 키워드 입력 및 제목 추천</h3>
        <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
          메인키워드와 보조키워드를 입력하고 AI가 추천하는 제목을 선택하세요
        </p>
        
        {/* 키워드 입력 섹션 */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              메인키워드 *
            </label>
            <input
              type="text"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              placeholder="예: 강아지 산책"
              style={{
                width: '100%',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#fafafa'
              }}
            />
            <small style={{ color: '#6c757d', fontSize: '12px' }}>
              블로그 글의 핵심 키워드를 입력하세요
            </small>
          </div>
          
          <div style={{ flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#495057' }}>
              보조키워드
            </label>
            <input
              type="text"
              value={subKeywords}
              onChange={(e) => setSubKeywords(e.target.value)}
              placeholder="예: 훈련, 방법, 팁 (쉼표로 구분)"
              style={{
                width: '100%',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                backgroundColor: '#fafafa'
              }}
            />
            <small style={{ color: '#6c757d', fontSize: '12px' }}>
              관련 키워드를 쉼표(,)로 구분해서 입력하세요
            </small>
          </div>
        </div>

        {/* 제목 생성 버튼 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            onClick={generateTitleRecommendations}
            disabled={isGeneratingTitles || !mainKeyword.trim()}
            style={{
              backgroundColor: isGeneratingTitles ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isGeneratingTitles ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              opacity: !mainKeyword.trim() ? 0.5 : 1
            }}
          >
            {isGeneratingTitles ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                AI 제목 생성 중...
              </>
            ) : (
              <>
                🎯 AI 제목 10개 추천받기
              </>
            )}
          </button>
        </div>

        {/* 생성된 제목 목록 */}
        {generatedTitles.length > 0 && (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '10px',
            padding: '20px'
          }}>
            <h4 style={{ color: '#495057', marginBottom: '15px', fontSize: '16px' }}>
              🎯 AI 추천 제목 ({generatedTitles.length}개)
            </h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {generatedTitles.map((title, index) => (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: selectedTitle === title ? '#e3f2fd' : '#fff',
                    border: selectedTitle === title ? '2px solid #2196f3' : '1px solid #dee2e6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTitle !== title) {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTitle !== title) {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="selectedTitle"
                    value={title}
                    checked={selectedTitle === title}
                    onChange={(e) => setSelectedTitle(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontWeight: selectedTitle === title ? 'bold' : 'normal' }}>
                    {index + 1}. {title}
                  </span>
                </label>
              ))}
            </div>
            
            {selectedTitle && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: '#e8f5e8',
                border: '1px solid #c3e6cb',
                borderRadius: '6px'
              }}>
                <div style={{ fontSize: '12px', color: '#155724', fontWeight: 'bold', marginBottom: '4px' }}>
                  ✅ 선택된 제목:
                </div>
                <div style={{ fontSize: '14px', color: '#155724' }}>
                  {selectedTitle}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 블로그 주제 입력 및 버튼들 */}
      <div style={{
        backgroundColor: '#fff',
        border: '2px solid #e9ecef',
        borderRadius: '16px',
        padding: '25px'
      }}>
        <h3 style={{ color: '#495057', marginBottom: '8px', fontSize: '20px' }}>🎯 블로그 주제 입력</h3>
        <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>
          어떤 주제로 글을 작성하고 싶은지 입력하세요 (위에서 제목을 선택했다면 관련 내용을 입력하세요)
        </p>
        
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 강아지 산책 훈련 방법"
          rows={4}
          style={{
            width: '100%',
            border: '2px solid #dee2e6',
            borderRadius: '10px',
            padding: '15px',
            fontSize: '15px',
            backgroundColor: '#fafafa',
            resize: 'vertical',
            fontFamily: 'inherit',
            marginBottom: '20px'
          }}
        />

        {/* 버튼 섹션 */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          {!isGenerating ? (
            <>
              <button 
                onClick={handleStartGeneration}
                style={{
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px 30px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#218838';
                  target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#28a745';
                  target.style.transform = 'translateY(0)';
                }}
              >
                🚀 자동 생성하기
              </button>

              <label style={{
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLLabelElement;
                target.style.backgroundColor = '#5a6268';
                target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLLabelElement;
                target.style.backgroundColor = '#6c757d';
                target.style.transform = 'translateY(0)';
              }}>
                📁 수동 업로드
                <input
                  type="file"
                  accept=".md,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        
                        // 선택된 제목이 있으면 주제에 포함
                        const finalTopic = selectedTitle ? 
                          `제목: ${selectedTitle}\n주제: ${topic || '수동 업로드된 글'}\n메인키워드: ${mainKeyword}\n보조키워드: ${subKeywords}` : 
                          (topic || '수동 업로드된 글');
                          
                        onComplete({ 
                          writingStylePaths: selectedWritingStyles.map(doc => doc.filePath),
                          seoGuidePath: selectedSeoGuide?.filePath || '',
                          topic: finalTopic,
                          generatedContent: content
                        });
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </>
          ) : (
            <div style={{
              backgroundColor: '#fff',
              border: '2px solid #007bff',
              borderRadius: '12px',
              padding: '20px 40px',
              textAlign: 'center',
              minWidth: '300px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #007bff',
                borderTop: '3px solid transparent',
                borderRadius: '50%',
                margin: '0 auto 12px auto',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ color: '#007bff', fontSize: '14px', margin: 0, fontWeight: 'bold' }}>
                {generationStep}
              </p>
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#e8f4f8',
          borderRadius: '8px',
          border: '1px solid #bee5eb',
          textAlign: 'center'
        }}>
          <small style={{ color: '#0c5460', fontSize: '13px' }}>
            💡 자동 생성: 위 문서들을 참고해서 AI가 글을 생성합니다 | 수동 업로드: 직접 작성한 마크다운 파일을 업로드합니다
          </small>
        </div>
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
    </div>
  );
};

export default Step1Setup;