import React, { useState, useEffect } from 'react';

interface Step1Props {
  onComplete: (data: {
    writingStylePaths: string[]; // 말투 문서 파일 경로들
    seoGuidePath: string;        // SEO 가이드 파일 경로
    topic: string;
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
    const loadSavedDocuments = () => {
      const savedWritingStylesData = localStorage.getItem('savedWritingStyles');
      const savedSeoGuidesData = localStorage.getItem('savedSeoGuides');
      
      if (savedWritingStylesData) {
        setSavedWritingStyles(JSON.parse(savedWritingStylesData));
      }
      
      if (savedSeoGuidesData) {
        setSavedSeoGuides(JSON.parse(savedSeoGuidesData));
      }
    };
    
    loadSavedDocuments();
  }, []);

  // 수동 저장 함수 (현재 사용하지 않음 - 자동저장으로 대체됨)
  // const saveDocument = (type: 'writingStyle' | 'seoGuide', name: string) => {
  //   // 현재 선택된 문서들에서 내용을 가져옴
  //   const content = type === 'writingStyle' 
  //     ? selectedWritingStyles[0]?.content || ''
  //     : selectedSeoGuide?.content || '';
  //   
  //   if (!name.trim()) {
  //     alert('문서 이름을 입력해주세요!');
  //     return;
  //   }
  // 
  //   if (!content.trim()) {
  //     alert('저장할 내용이 없습니다!');
  //     return;
  //   }
  // 
  //   // ... 저장 로직
  // };

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
  const selectSeoGuide = (doc: SavedDocument) => {
    setSelectedSeoGuide(doc);
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
          await window.electronAPI.deleteDocumentFile(docToDelete.filePath);
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
          await window.electronAPI.deleteDocumentFile(docToDelete.filePath);
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
    const filePath = await window.electronAPI.saveDocumentFile(type, name, content);
    
    const newDocument: SavedDocument = {
      id: Date.now().toString(),
      name: name.trim(),
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
        await window.electronAPI.deleteDocumentFile(savedWritingStyles[existingIndex].filePath);
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
        await window.electronAPI.deleteDocumentFile(savedSeoGuides[existingIndex].filePath);
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

  const handleSubmit = () => {
    onComplete({ 
      writingStylePaths: selectedWritingStyles.map(doc => doc.filePath),
      seoGuidePath: selectedSeoGuide?.filePath || '',
      topic 
    });
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
      <h2 style={{
        textAlign: 'center',
        color: '#495057',
        marginBottom: '30px',
        fontSize: '28px',
        fontWeight: 'bold'
      }}>📝 1단계: 기본 설정</h2>
      
      {/* 문서 업로드 섹션 - 가로 배치 */}
      <div style={{
        display: 'flex',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* 말투 문서 업로드 */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '20px',
          flex: '1'
        }}>
          <h3 style={{ color: '#495057', marginBottom: '8px' }}>✍️ 나만의 말투 문서</h3>
          <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '16px' }}>
            평소 블로그에 쓰는 글들을 복사해서 텍스트 파일로 만든 후 업로드하세요. (자동 저장됩니다)
          </p>
        
        <div style={{ marginBottom: '16px' }}>
          <input
            type="file"
            accept=".txt,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload('writingStyle', file);
            }}
            style={{
              padding: '10px',
              border: '2px dashed #dee2e6',
              borderRadius: '8px',
              backgroundColor: '#fff',
              width: '100%',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* 저장된 말투 문서 목록 */}
        {savedWritingStyles.length > 0 && (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{ color: '#495057', marginBottom: '12px', fontSize: '16px' }}>📁 저장된 말투 문서 (최대 2개까지 선택 가능)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {savedWritingStyles.map(doc => {
                const isSelected = selectedWritingStyles.some(selected => selected.id === doc.id);
                return (
                  <div key={doc.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: isSelected ? '#e8f5e8' : '#f8f9fa',
                    border: isSelected ? '2px solid #28a745' : '1px solid #dee2e6',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '14px'
                  }}>
                    <span
                      onClick={() => toggleWritingStyle(doc)}
                      style={{
                        cursor: 'pointer',
                        color: '#495057',
                        marginRight: '8px'
                      }}
                    >
                      {isSelected ? '✅ ' : ''}{doc.name}
                    </span>
                    <button
                      onClick={() => openDeleteDialog('writingStyle', doc.id, doc.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            {selectedWritingStyles.length > 0 && (
              <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <small style={{ color: '#6c757d' }}>
                  선택됨: {selectedWritingStyles.map(doc => doc.name).join(', ')} ({selectedWritingStyles.length}/2)
                </small>
              </div>
            )}
          </div>
        )}
        </div>

        {/* SEO 가이드 업로드 */}
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '20px',
          flex: '1'
        }}>
          <h3 style={{ color: '#495057', marginBottom: '8px' }}>📊 네이버 SEO 가이드</h3>
          <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '16px' }}>
            네이버 블로그 SEO 최적화 가이드 문서를 업로드하세요. (자동 저장됩니다)
          </p>
        
        <div style={{ marginBottom: '16px' }}>
          <input
            type="file"
            accept=".txt,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload('seoGuide', file);
            }}
            style={{
              padding: '10px',
              border: '2px dashed #dee2e6',
              borderRadius: '8px',
              backgroundColor: '#fff',
              width: '100%',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* 저장된 SEO 가이드 목록 */}
        {savedSeoGuides.length > 0 && (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{ color: '#495057', marginBottom: '12px', fontSize: '16px' }}>📁 저장된 SEO 가이드 (1개 선택)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {savedSeoGuides.map(doc => {
                const isSelected = selectedSeoGuide?.id === doc.id;
                return (
                  <div key={doc.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: isSelected ? '#e3f2fd' : '#f8f9fa',
                    border: isSelected ? '2px solid #2196f3' : '1px solid #dee2e6',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '14px'
                  }}>
                    <span
                      onClick={() => selectSeoGuide(doc)}
                      style={{
                        cursor: 'pointer',
                        color: '#495057',
                        marginRight: '8px'
                      }}
                    >
                      {isSelected ? '📘 ' : '📄 '}{doc.name}
                    </span>
                    <button
                      onClick={() => openDeleteDialog('seoGuide', doc.id, doc.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            {selectedSeoGuide && (
              <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <small style={{ color: '#6c757d' }}>
                  선택됨: {selectedSeoGuide.name}
                </small>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* 주제 입력 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '2px solid #e9ecef',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ color: '#495057', marginBottom: '8px' }}>🎯 블로그 주제</h3>
        <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '16px' }}>
          어떤 주제로 글을 작성하고 싶은지 입력하세요.
        </p>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 강아지 산책 훈련 방법"
          rows={4}
          style={{
            width: '100%',
            border: '2px solid #dee2e6',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            backgroundColor: '#fff',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={handleSubmit}
          style={{
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '25px',
            padding: '15px 40px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.transform = 'translateY(-2px)';
            target.style.boxShadow = '0 6px 20px rgba(0, 123, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.transform = 'translateY(0)';
            target.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
          }}
        >
          다음 단계로 시작하기 →
        </button>
      </div>

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