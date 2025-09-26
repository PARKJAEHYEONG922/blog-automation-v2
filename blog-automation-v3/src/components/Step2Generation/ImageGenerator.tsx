import React, { useState, useEffect } from 'react';

interface ImagePrompt {
  index: number;
  context: string;
  prompt: string;
  position: string;
}

interface ImageGeneratorProps {
  imagePositions: string[];
  imagePrompts?: ImagePrompt[];
}

// 이미지 상태 타입
type ImageStatus = 'empty' | 'uploading' | 'completed' | 'generating';

const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  imagePositions,
  imagePrompts = []
}) => {
  const [editingPrompts, setEditingPrompts] = useState<{ [key: number]: string }>({});
  const [previewModal, setPreviewModal] = useState<{ 
    isOpen: boolean; 
    imageUrl: string; 
    imageIndex: number; 
  }>({
    isOpen: false,
    imageUrl: '',
    imageIndex: 0
  });
  
  // 이미지 상태 관리 (v2와 동일)
  const [imageStatus, setImageStatus] = useState<{ [key: number]: ImageStatus }>({});
  const [imageUrls, setImageUrls] = useState<{ [key: number]: string }>({});
  
  // v2와 동일한 이미지 히스토리 관리
  const [imageHistory, setImageHistory] = useState<{ [key: number]: string[] }>(() => {
    try {
      const saved = sessionStorage.getItem('step2-image-history');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  // 이미지 선택 모달 (v2와 동일)
  const [selectionModal, setSelectionModal] = useState<{
    isOpen: boolean;
    imageIndex: number;
    currentUrl: string;
    newUrl: string;
  }>({
    isOpen: false,
    imageIndex: 0,
    currentUrl: '',
    newUrl: ''
  });
  
  // AI 설정 상태 (Gemini 전용)
  const [hasImageClient, setHasImageClient] = useState(false);
  const [imageClientInfo, setImageClientInfo] = useState('미설정');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [shouldStopGeneration, setShouldStopGeneration] = useState(false);
  const [imageQuality, setImageQuality] = useState<'high'>('high');
  const [imageSize, setImageSize] = useState<'1024x1024'>('1024x1024');
  const [imageStyle, setImageStyle] = useState<'realistic' | 'photographic' | 'anime' | 'illustration' | 'dreamy'>('realistic');
  
  // API 설정에서 이미지 설정 로드
  useEffect(() => {
    const loadImageSettings = async () => {
      try {
        const settings = await window.electronAPI?.getLLMSettings?.();
        if (settings?.appliedSettings?.image) {
          const imageConfig = settings.appliedSettings.image;
          if (imageConfig.provider && imageConfig.apiKey) {
            setHasImageClient(true);
            setImageClientInfo(`${imageConfig.provider} ${imageConfig.model || ''}`);
            if (imageConfig.style) {
              setImageStyle(imageConfig.style as 'realistic' | 'photographic' | 'anime' | 'illustration' | 'dreamy');
            }
            if (imageConfig.quality) {
              setImageQuality(imageConfig.quality as 'high');
            }
            if (imageConfig.size) {
              setImageSize(imageConfig.size as '1024x1024');
            }
          }
        }
      } catch (error) {
        console.error('이미지 설정 로드 실패:', error);
      }
    };
    
    loadImageSettings();
  }, []);

  // v2와 동일한 이미지 히스토리 세션스토리지 저장
  useEffect(() => {
    try {
      sessionStorage.setItem('step2-image-history', JSON.stringify(imageHistory));
    } catch (error) {
      console.warn('이미지 히스토리 저장 실패:', error);
    }
  }, [imageHistory]);

  // 이미지 개수 계산
  const imageCount = imagePositions.length;
  
  // 이미지 상태 가져오기 헬퍼
  const getImageStatus = (imageIndex: number): ImageStatus => imageStatus[imageIndex] || 'empty';
  
  // 현재 프롬프트 가져오기
  const getCurrentPrompt = (imageIndex: number): string => {
    if (editingPrompts.hasOwnProperty(imageIndex)) {
      return editingPrompts[imageIndex];
    }
    const imagePrompt = imagePrompts.find(p => p.index === imageIndex);
    return imagePrompt?.prompt || '';
  };
  
  // 완료된 이미지 개수 계산
  const completedCount = Object.values(imageStatus).filter(s => s === 'completed').length;
  
  // 생성 가능한 빈 슬롯 개수
  const emptyWithPromptCount = Array.from({ length: imageCount }, (_, idx) => idx + 1)
    .filter(index => getImageStatus(index) === 'empty' && getCurrentPrompt(index).trim())
    .length;

  // 프롬프트 편집 처리
  const handlePromptChange = (imageIndex: number, newPrompt: string) => {
    setEditingPrompts(prev => ({
      ...prev,
      [imageIndex]: newPrompt
    }));
  };

  // 프롬프트를 원본으로 리셋
  const resetPromptToOriginal = (imageIndex: number) => {
    setEditingPrompts(prev => {
      const newPrompts = { ...prev };
      delete newPrompts[imageIndex];
      return newPrompts;
    });
  };

  
  // 이미지 업로드 처리 (기존 이미지를 히스토리에 저장)
  const handleImageUpload = (imageIndex: number, file: File | null) => {
    if (!file) return;
    
    setImageStatus(prev => ({ ...prev, [imageIndex]: 'uploading' }));
    
    // 파일을 URL로 변환 (브라우저에서 표시하기 위해)
    const imageUrl = URL.createObjectURL(file);
    
    // 업로드 시뮬레이션
    setTimeout(() => {
      // 기존 이미지가 있으면 히스토리에 저장하고 새 이미지 적용
      const currentUrl = imageUrls[imageIndex];
      applyNewImage(imageIndex, imageUrl, currentUrl);
    }, 1500);
  };
  
  // v2와 동일한 이미지 히스토리 관리 함수들
  const applyNewImage = (imageIndex: number, newUrl: string, currentUrl?: string) => {
    // 현재 이미지가 있으면 히스토리에 추가
    if (currentUrl) {
      setImageHistory(prev => ({
        ...prev,
        [imageIndex]: [...(prev[imageIndex] || []), currentUrl]
      }));
    }
    
    // 새 이미지 적용
    setImageUrls(prev => ({ ...prev, [imageIndex]: newUrl }));
    setImageStatus(prev => ({ ...prev, [imageIndex]: 'completed' }));
  };

  const handleImageSelection = (useNew: boolean) => {
    const { imageIndex, currentUrl, newUrl } = selectionModal;
    
    if (useNew) {
      // 새 이미지 사용: 현재를 히스토리에 추가하고 새것을 현재로
      applyNewImage(imageIndex, newUrl, currentUrl);
    } else {
      // 현재 유지: 새것을 히스토리에 추가 (갤러리 선택용)
      if (newUrl) {
        setImageHistory(prev => ({
          ...prev,
          [imageIndex]: [...(prev[imageIndex] || []), newUrl]
        }));
      }
    }
    
    setSelectionModal({ isOpen: false, imageIndex: 0, currentUrl: '', newUrl: '' });
  };

  const selectImageFromGallery = (imageIndex: number, selectedImageUrl: string) => {
    // 현재 이미지가 다르면 히스토리에 추가
    const currentUrl = imageUrls[imageIndex];
    if (currentUrl && currentUrl !== selectedImageUrl) {
      setImageHistory(prev => ({
        ...prev,
        [imageIndex]: [...(prev[imageIndex] || []), currentUrl]
      }));
    }

    // 선택된 이미지를 현재로 설정
    setImageUrls(prev => ({ ...prev, [imageIndex]: selectedImageUrl }));
    setImageStatus(prev => ({ ...prev, [imageIndex]: 'completed' }));
    
    // 히스토리에서 중복 제거
    setImageHistory(prev => ({
      ...prev,
      [imageIndex]: (prev[imageIndex] || []).filter(url => url !== selectedImageUrl)
    }));

    // 프리뷰 모달 업데이트
    setPreviewModal(prev => ({ ...prev, imageUrl: selectedImageUrl }));
  };

  const downloadImage = async (imageUrl: string, imageIndex: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `blog-image-${imageIndex}-${timestamp}.png`;
      
      // Electron API 사용 (v3 구조에 맞게)
      if (window.electronAPI) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // TODO: saveFile API 구현 필요 (현재는 브라우저 다운로드로 대체)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // 브라우저 fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
    }
  };

  // AI 이미지 생성 처리 (v2 스타일)
  const handleAIImageGeneration = async (imageIndex: number) => {
    const prompt = getCurrentPrompt(imageIndex);
    if (!hasImageClient || !prompt.trim()) return;
    
    setImageStatus(prev => ({ ...prev, [imageIndex]: 'generating' }));
    
    try {
      // 스타일을 포함한 프롬프트 생성
      const styledPrompt = `${prompt}, style: ${imageStyle}`;
      
      console.log(`이미지 ${imageIndex} 생성 시작:`, { prompt: styledPrompt, style: imageStyle });
      
      // 실제 API 호출
      const imageUrl = await window.electronAPI?.generateImage?.(styledPrompt);
      
      if (imageUrl) {
        const currentUrl = imageUrls[imageIndex];
        
        // 기존 이미지가 있으면 선택 모달 표시
        if (currentUrl) {
          setSelectionModal({
            isOpen: true,
            imageIndex,
            currentUrl,
            newUrl: imageUrl
          });
          setImageStatus(prev => ({ ...prev, [imageIndex]: 'completed' }));
        } else {
          // 새 이미지 직접 적용
          applyNewImage(imageIndex, imageUrl);
        }
        
        console.log(`이미지 ${imageIndex} 생성 완료:`, imageUrl);
      } else {
        throw new Error('이미지 생성 실패');
      }
    } catch (error) {
      console.error(`이미지 ${imageIndex} 생성 실패:`, error);
      setImageStatus(prev => ({ ...prev, [imageIndex]: 'empty' }));
    }
  };
  
  // 이미지 제거
  const removeImage = (imageIndex: number) => {
    // 이미지 URL 정리 (메모리 누수 방지)
    const imageUrl = imageUrls[imageIndex];
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    
    setImageUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[imageIndex];
      return newUrls;
    });
    setImageStatus(prev => ({ ...prev, [imageIndex]: 'empty' }));
  };
  
  // 이미지 미리보기 모달 열기
  const openPreviewModal = (imageUrl: string, imageIndex: number) => {
    setPreviewModal({
      isOpen: true,
      imageUrl,
      imageIndex
    });
  };

  // 이미지 미리보기 모달 닫기
  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      imageUrl: '',
      imageIndex: 0
    });
  };
  
  // 빈 이미지 모두 AI 생성 (정지 기능 포함)
  const handleGenerateAllEmpty = async () => {
    if (!hasImageClient || isGeneratingAll) return;
    
    setIsGeneratingAll(true);
    setShouldStopGeneration(false);
    const emptySlots = Array.from({ length: imageCount }, (_, idx) => idx + 1)
      .filter(index => getImageStatus(index) === 'empty' && getCurrentPrompt(index).trim());
    
    console.log(`배치 생성 시작: ${emptySlots.length}개 이미지, 스타일: ${imageStyle}`);
    
    for (let i = 0; i < emptySlots.length; i++) {
      // 정지 신호 확인
      if (shouldStopGeneration) {
        console.log('배치 생성 정지됨');
        break;
      }
      
      const imageIndex = emptySlots[i];
      const prompt = getCurrentPrompt(imageIndex);
      
      setImageStatus(prev => ({ ...prev, [imageIndex]: 'generating' }));
      
      try {
        const styledPrompt = `${prompt}, style: ${imageStyle}`;
        console.log(`배치 생성 ${i + 1}/${emptySlots.length} - 이미지 ${imageIndex}:`, styledPrompt);
        
        const imageUrl = await window.electronAPI?.generateImage?.(styledPrompt);
        
        if (imageUrl) {
          // 배치 생성에서는 선택 모달 없이 바로 적용
          applyNewImage(imageIndex, imageUrl);
          console.log(`배치 생성 완료 ${i + 1}/${emptySlots.length} - 이미지 ${imageIndex}`);
        } else {
          throw new Error('이미지 생성 실패');
        }
      } catch (error) {
        console.error(`배치 생성 실패 - 이미지 ${imageIndex}:`, error);
        setImageStatus(prev => ({ ...prev, [imageIndex]: 'empty' }));
      }
      
      // 다음 이미지 생성 전 잠시 대기 (API 과부하 방지)
      if (i < emptySlots.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsGeneratingAll(false);
    setShouldStopGeneration(false);
    console.log('배치 생성 완료 또는 정지됨');
  };
  
  // 배치 생성 정지
  const handleStopGeneration = () => {
    setShouldStopGeneration(true);
    console.log('배치 생성 정지 요청');
  };
  
  // 이미지 설정을 API 설정에 저장
  const saveImageSettingToAPI = async (settingType: 'style' | 'quality' | 'size', value: string) => {
    try {
      const currentSettings = await window.electronAPI?.getLLMSettings?.();
      if (currentSettings?.appliedSettings?.image) {
        const updatedSettings = {
          ...currentSettings,
          appliedSettings: {
            ...currentSettings.appliedSettings,
            image: {
              ...currentSettings.appliedSettings.image,
              [settingType]: value
            }
          }
        };
        
        await window.electronAPI?.saveLLMSettings?.(updatedSettings);
        console.log(`이미지 ${settingType} 설정 저장됨:`, value);
      }
    } catch (error) {
      console.error('이미지 설정 저장 실패:', error);
    }
  };
  
  // 스타일 변경 핸들러 (API 설정과 동기화)
  const handleStyleChange = async (newStyle: 'realistic' | 'photographic' | 'anime' | 'illustration' | 'dreamy') => {
    setImageStyle(newStyle);
    await saveImageSettingToAPI('style', newStyle);
  };
  
  // 공통 스타일
  const buttonStyle = (bgColor: string, disabled = false) => ({
    padding: '6px 12px',
    backgroundColor: disabled ? '#9ca3af' : bgColor,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    opacity: disabled ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  } as const);
  
  
  // 상태 표시 컴포넌트
  const StatusIndicator = ({ status }: { status: ImageStatus }) => {
    const statusConfig = {
      empty: { color: '#9ca3af', text: '⚪ 대기중' },
      uploading: { color: '#3b82f6', text: '🔄 업로드 중...' },
      generating: { color: '#7c3aed', text: '🎨 AI 생성 중...' },
      completed: { color: '#10b981', text: '✅ 완료' }
    };
    const config = statusConfig[status];
    return <span style={{ color: config.color }}>{config.text}</span>;
  };

  if (imageCount === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        이미지가 필요하지 않은 글입니다.
      </div>
    );
  }

  return (
    <>
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#ede9fe',
              color: '#7c3aed',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}>🖼️</div>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>이미지 관리 ({imageCount}개)</h2>
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            이미지 준비 현황: {completedCount} / {imageCount} 완료
          </div>
        </div>
        
        {/* 이미지 생성 AI 상태 카드 */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              🤖 이미지 생성 AI 상태
            </span>
            <span style={{
              fontSize: '14px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: hasImageClient ? '#dcfce7' : '#fef2f2',
              color: hasImageClient ? '#166534' : '#dc2626',
              fontWeight: '500'
            }}>
              {hasImageClient ? '✅ 연결됨' : '❌ 미설정'}
            </span>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280'
          }}>
            현재 설정: {imageClientInfo}
          </div>
          
          {/* 이미지 생성 옵션 */}
          {hasImageClient && (
            <div style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '12px',
              marginTop: '12px'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                🎛️ 이미지 생성 옵션
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px'
              }}>
                {/* 품질 설정 */}
                <div>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    품질
                  </label>
                  <select
                    value={imageQuality}
                    onChange={(e) => setImageQuality(e.target.value as 'high')}
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      backgroundColor: 'white',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="high">고품질 (권장)</option>
                  </select>
                </div>
                
                {/* 해상도 설정 */}
                <div>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    해상도
                  </label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as '1024x1024')}
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      backgroundColor: 'white',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="1024x1024">정사각형 (1024×1024)</option>
                  </select>
                </div>
                
                {/* 스타일 설정 */}
                <div>
                  <label style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    스타일
                  </label>
                  <select
                    value={imageStyle}
                    onChange={(e) => handleStyleChange(e.target.value as 'realistic' | 'photographic' | 'anime' | 'illustration' | 'dreamy')}
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      backgroundColor: 'white',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="realistic">사실적</option>
                    <option value="photographic">사진 같은</option>
                    <option value="anime">애니메이션</option>
                    <option value="illustration">일러스트</option>
                    <option value="dreamy">몽환적</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 배치 생성 버튼 및 정지 버튼 */}
        {hasImageClient && imageCount > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={handleGenerateAllEmpty}
              disabled={isGeneratingAll}
              style={{
                backgroundColor: isGeneratingAll ? '#9ca3af' : '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isGeneratingAll ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isGeneratingAll) {
                  e.currentTarget.style.backgroundColor = '#6d28d9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isGeneratingAll) {
                  e.currentTarget.style.backgroundColor = '#7c3aed';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              🎨 빈 이미지 모두 AI로 생성 ({emptyWithPromptCount > 0 ? emptyWithPromptCount : imageCount}개)
              {isGeneratingAll && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
            </button>
            
            {/* 정지 버튼 */}
            {isGeneratingAll && (
              <button
                onClick={handleStopGeneration}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }}
              >
                ⏹️ 정지
              </button>
            )}
          </div>
        )}
        
        {/* 이미지 목록 - v2 스타일 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Array.from({ length: imageCount }, (_, idx) => {
            const imageIndex = idx + 1;
            const imagePrompt = imagePrompts.find(p => p.index === imageIndex);
            const status = getImageStatus(imageIndex);
            const isGenerating = status === 'generating';
            const isEmpty = status === 'empty';
            const isCompleted = status === 'completed';
            const currentPrompt = getCurrentPrompt(imageIndex);
            const canGenerate = hasImageClient && !isGeneratingAll && currentPrompt.trim();
            const imageUrl = imageUrls[imageIndex];
            
            return (
              <div key={idx} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'white'
              }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* 이미지 미리보기 영역 */}
                  <div style={{
                    flexShrink: 0,
                    width: '160px',
                    height: '128px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {isGenerating && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid #3b82f6',
                          borderTop: '3px solid transparent',
                          borderRadius: '50%',
                          margin: '0 auto 8px auto',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>AI 생성 중...</div>
                      </div>
                    )}
                    {isCompleted && imageUrl && (
                      <div 
                        style={{
                          width: '100%',
                          height: '100%',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        onClick={() => openPreviewModal(imageUrl, imageIndex)}
                      >
                        <img 
                          src={imageUrl} 
                          alt={`이미지 ${imageIndex}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '4px'
                          }}
                        />
                        {/* 호버 효과 */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          color: 'white',
                          fontSize: '24px',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                        >
                          🔍
                        </div>
                      </div>
                    )}
                    {isCompleted && !imageUrl && (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f0f9ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '4px',
                        color: '#1e40af'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>🖼️</div>
                          <div style={{ fontSize: '10px' }}>이미지 로드 중...</div>
                        </div>
                      </div>
                    )}
                    {isEmpty && (
                      <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>📷</div>
                        <div style={{ fontSize: '12px' }}>이미지 {imageIndex}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* 이미지 정보 및 컨트롤 */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontWeight: '600',
                        color: '#1f2937',
                        fontSize: '14px'
                      }}>
                        📸 이미지 {imageIndex}
                      </span>
                      {imagePrompt && (
                        <span style={{
                          fontSize: '12px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          📍 {imagePrompt.position}
                        </span>
                      )}
                    </div>
                    
                    {/* AI 프롬프트 정보 */}
                    <div style={{ marginBottom: '12px' }}>
                      {imagePrompt ? (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '4px'
                        }}>
                          <strong>컨텍스트:</strong> {imagePrompt.context}
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '12px',
                          color: '#ea580c',
                          marginBottom: '4px'
                        }}>
                          <strong>⚠️ 프롬프트 없음:</strong> AI가 생성하지 못한 이미지 위치입니다. 직접 프롬프트를 입력해주세요.
                        </div>
                      )}
                      
                      <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px'
                        }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#4b5563'
                          }}>
                            💡 이미지 프롬프트:
                          </div>
                          {editingPrompts.hasOwnProperty(imageIndex) && imagePrompt && (
                            <button
                              onClick={() => resetPromptToOriginal(imageIndex)}
                              style={{
                                fontSize: '12px',
                                color: '#ea580c',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px'
                              }}
                              title="원본으로 되돌리기"
                            >
                              🔄 원본
                            </button>
                          )}
                        </div>
                        <textarea
                          value={currentPrompt}
                          onChange={(e) => handlePromptChange(imageIndex, e.target.value)}
                          placeholder="이미지 생성을 위한 프롬프트를 입력하세요..."
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            resize: 'vertical',
                            backgroundColor: 'white'
                          }}
                        />
                      </div>
                      
                      {/* 개별 버튼 영역 */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px'
                      }}>
                        {/* 이미지 업로드 버튼 */}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(imageIndex, e.target.files?.[0] || null)}
                          style={{ display: 'none' }}
                          id={`image-upload-${imageIndex}`}
                        />
                        <label
                          htmlFor={`image-upload-${imageIndex}`}
                          style={buttonStyle('#3b82f6')}
                        >
                          📁 이미지 업로드
                        </label>
                        
                        {/* AI 이미지 생성 버튼 */}
                        <button
                          onClick={() => handleAIImageGeneration(imageIndex)}
                          disabled={!canGenerate || isGenerating}
                          style={buttonStyle('#7c3aed', !canGenerate || isGenerating)}
                          title={
                            !hasImageClient ? 'AI가 설정되지 않았습니다' :
                            !currentPrompt.trim() ? '프롬프트를 입력해주세요' : ''
                          }
                        >
                          🎨 AI 이미지생성
                          {isGenerating && (
                            <div style={{
                              width: '10px',
                              height: '10px',
                              border: '2px solid transparent',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                          )}
                        </button>
                        
                        {/* 제거 버튼 (완료된 이미지만) */}
                        {status === 'completed' && (
                          <button
                            onClick={() => removeImage(imageIndex)}
                            style={buttonStyle('#ef4444')}
                          >
                            🗑️ 제거
                          </button>
                        )}
                      </div>
                      
                      {/* 상태 표시 */}
                      <div style={{ marginTop: '8px', fontSize: '12px' }}>
                        <StatusIndicator status={status} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 이미지 미리보기 모달 (v2 스타일 - 갤러리 포함) */}
      {previewModal.isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closePreviewModal}
        >
          <div 
            style={{
              maxWidth: '1152px', // max-w-6xl 상당
              maxHeight: '70vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 메인 이미지 */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <img 
                src={previewModal.imageUrl}
                alt={`이미지 ${previewModal.imageIndex}`}
                style={{
                  maxWidth: '1152px',
                  maxHeight: '60vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
              
              {/* 닫기 버튼 */}
              <button
                onClick={closePreviewModal}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
              
              {/* 저장 버튼 (v2 원본처럼 우하단에 배치) */}
              <button
                onClick={() => downloadImage(previewModal.imageUrl, previewModal.imageIndex)}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s',
                  zIndex: 10
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                💾 저장
              </button>
            </div>
            
            {/* 이미지 갤러리 (히스토리가 있는 경우) */}
            {(() => {
              const currentImageUrl = imageUrls[previewModal.imageIndex];
              const historyImages = imageHistory[previewModal.imageIndex] || [];
              const allImages = [currentImageUrl, ...historyImages].filter(Boolean);
              
              return allImages.length > 1 && (
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  borderRadius: '8px',
                  padding: '16px',
                  maxWidth: '1152px'
                }}>
                  <div style={{
                    color: 'white',
                    fontSize: '14px',
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    📸 이미지 갤러리 ({allImages.length}개) - 클릭해서 선택하세요
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    justifyContent: 'center',
                    paddingBottom: '4px'
                  }}>
                    {allImages.map((imageUrl, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          flexShrink: 0,
                          cursor: 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: imageUrl === previewModal.imageUrl ? '2px solid #3b82f6' : '2px solid #6b7280',
                          transform: imageUrl === previewModal.imageUrl ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.2s',
                          boxShadow: imageUrl === previewModal.imageUrl ? '0 4px 8px 0 rgba(0, 0, 0, 0.1), 0 2px 4px 0 rgba(0, 0, 0, 0.06)' : 'none'
                        }}
                        onClick={() => selectImageFromGallery(previewModal.imageIndex, imageUrl)}
                        onMouseEnter={(e) => {
                          if (imageUrl !== previewModal.imageUrl) {
                            e.currentTarget.style.borderColor = '#9ca3af';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (imageUrl !== previewModal.imageUrl) {
                            e.currentTarget.style.borderColor = '#6b7280';
                          }
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={`버전 ${index + 1}`}
                          style={{
                            width: '96px',
                            height: '96px',
                            objectFit: 'cover'
                          }}
                        />
                        {imageUrl === previewModal.imageUrl && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              fontSize: '12px',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}>
                              현재
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* 이미지 선택 모달 (현재 vs 새로운) */}
      {selectionModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '1024px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              🎨 이미지 {selectionModal.imageIndex} - 새로운 버전이 생성되었습니다!
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              어떤 이미지를 사용하시겠습니까?
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* 현재 이미지 */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#2563eb'
                }}>
                  🔷 현재 이미지 (기존)
                </h4>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f9fafb'
                }}>
                  <img 
                    src={selectionModal.currentUrl} 
                    alt="현재 이미지" 
                    style={{
                      width: '100%',
                      height: '256px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <button
                  onClick={() => handleImageSelection(false)}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  ✅ 현재 이미지 유지
                </button>
              </div>
              
              {/* 새 이미지 */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#16a34a'
                }}>
                  🔶 새 이미지 (AI 생성)
                </h4>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f9fafb'
                }}>
                  <img 
                    src={selectionModal.newUrl} 
                    alt="새 이미지" 
                    style={{
                      width: '100%',
                      height: '256px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                <button
                  onClick={() => handleImageSelection(true)}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  🆕 새 이미지 사용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default ImageGenerator;