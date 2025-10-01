import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from '@/shared/components/ui/Button';
import { GenerationAutomationService } from '@/02-generation/services/generation-automation-service';
import { useDialog } from '@/app/DialogContext';
import { IMAGE_GENERATION_OPTIONS } from '@/shared/utils/constants';

interface ImagePrompt {
  index: number;
  context: string;
  prompt: string;
  position: string;
}

interface ImageGeneratorProps {
  imagePositions: string[];
  imagePrompts?: ImagePrompt[];
  onImagesChange?: (images: { [key: string]: string }) => void;
  aiModelStatus: {
    writing: string;
    image: string;
  };
}

// 이미지 상태 타입
type ImageStatus = 'empty' | 'uploading' | 'completed' | 'generating';

const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  imagePositions,
  imagePrompts = [],
  onImagesChange,
  aiModelStatus
}) => {
  const { showAlert } = useDialog();
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
  
  // AI 설정 상태 (모든 provider 지원)
  const [hasImageClient, setHasImageClient] = useState(false);
  const [imageClientInfo, setImageClientInfo] = useState('미설정');
  const [currentProvider, setCurrentProvider] = useState<'gemini' | 'openai' | 'runware' | ''>('');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [shouldStopGeneration, setShouldStopGeneration] = useState(false);
  const shouldStopRef = useRef(false);
  const [imageQuality, setImageQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [imageSize, setImageSize] = useState<'512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024'>('1024x1024');
  const [imageStyle, setImageStyle] = useState<'photographic' | 'illustration' | 'minimalist' | 'natural'>('photographic');
  
  // Use aiModelStatus prop to determine current image provider and model
  useEffect(() => {
    if (aiModelStatus.image && aiModelStatus.image !== '미설정') {
      setHasImageClient(true);
      setImageClientInfo(aiModelStatus.image);

      // Extract provider from aiModelStatus (e.g., "openai GPT-Image-1" -> "openai")
      const provider = aiModelStatus.image.toLowerCase().split(' ')[0] as 'gemini' | 'openai' | 'runware';
      setCurrentProvider(provider);
    } else {
      setHasImageClient(false);
      setImageClientInfo('미설정');
      setCurrentProvider('');
    }
  }, [aiModelStatus]);

  // API 설정에서 이미지 설정 불러오기 (컴포넌트 마운트 시)
  useEffect(() => {
    const loadImageSettingsFromAPI = async () => {
      try {
        const imageSettings = await GenerationAutomationService.getImageSettings();
        if (imageSettings) {
          const { style, quality, size } = imageSettings;

          if (style) {
            console.log('🎨 API에서 불러온 이미지 스타일:', style);
            // 옛날 스타일 값이면 기본값으로 변환
            const validStyles = ['photographic', 'illustration', 'minimalist', 'natural'];
            const finalStyle = validStyles.includes(style) ? style : 'photographic';
            setImageStyle(finalStyle as typeof imageStyle);
            if (style !== finalStyle) {
              console.log('⚠️ 구버전 스타일 감지, 기본값으로 변환:', style, '→', finalStyle);
            }
          }
          if (quality) {
            console.log('🔧 API에서 불러온 이미지 품질:', quality);
            setImageQuality(quality as typeof imageQuality);
          }
          if (size) {
            console.log('📐 API에서 불러온 이미지 크기:', size);
            setImageSize(size as typeof imageSize);
          }
        }
      } catch (error) {
        console.error('이미지 설정 불러오기 실패:', error);
      }
    };

    loadImageSettingsFromAPI();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // API 설정 변경 이벤트 수신 (App.tsx에서 발생)
  useEffect(() => {
    const handleSettingsChange = async () => {
      try {
        const imageSettings = await GenerationAutomationService.getImageSettings();
        if (imageSettings) {
          const { style, quality, size } = imageSettings;

          if (style) {
            console.log('🎨 API 설정 변경 - 이미지 스타일 업데이트:', style);
            setImageStyle(style as typeof imageStyle);
          }
          if (quality) {
            console.log('🔧 API 설정 변경 - 이미지 품질 업데이트:', quality);
            setImageQuality(quality as typeof imageQuality);
          }
          if (size) {
            console.log('📐 API 설정 변경 - 이미지 크기 업데이트:', size);
            setImageSize(size as typeof imageSize);
          }
        }
      } catch (error) {
        console.error('설정 변경 시 이미지 설정 업데이트 실패:', error);
      }
    };

    window.addEventListener('app-llm-settings-changed', handleSettingsChange);
    
    return () => {
      window.removeEventListener('app-llm-settings-changed', handleSettingsChange);
    };
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
  
  // 부모 컴포넌트에 이미지 변경 알림
  useEffect(() => {
    if (onImagesChange) {
      // imageUrls를 string key 형태로 변환하여 전달
      const stringKeyImageUrls = Object.entries(imageUrls).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as { [key: string]: string });
      
      onImagesChange(stringKeyImageUrls);
    }
  }, [imageUrls, onImagesChange]);
  
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
      if (typeof window !== 'undefined' && window.electronAPI) {
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

  // AI 이미지 생성 처리 (v2 스타일) - 배치 모드 지원
  const handleAIImageGeneration = async (imageIndex: number, isPartOfBatch = false) => {
    const prompt = getCurrentPrompt(imageIndex);
    if (!hasImageClient || !prompt.trim()) return;
    
    setImageStatus(prev => ({ ...prev, [imageIndex]: 'generating' }));
    
    try {
      // 프롬프트 (스타일은 options으로 전달)
      const enhancedPrompt = prompt;

      console.log(`이미지 ${imageIndex} 생성 시작:`, {
        prompt: enhancedPrompt,
        style: imageStyle,
        quality: imageQuality,
        size: imageSize
      });

      console.log('실제 전달되는 imageSize 값:', imageSize);

      // 이미지 옵션은 메인 프로세스에서 LLM 설정에서 가져오므로 여기서는 처리하지 않음

      // 이미지 옵션은 메인 프로세스에서 LLM 설정을 사용하므로 별도로 전달하지 않음
      console.log('프롬프트로 이미지 생성 요청:', enhancedPrompt);

      // 실제 API 호출 (옵션은 저장된 LLM 설정 사용)
      const imageUrl = await GenerationAutomationService.generateImage(enhancedPrompt);
      
      // 정지 요청 확인 (배치 모드일 때만)
      if (shouldStopRef.current && isPartOfBatch) {
        console.log(`이미지 ${imageIndex} 생성 중단됨 (배치 모드)`);
        setImageStatus(prev => ({ ...prev, [imageIndex]: 'empty' }));
        return;
      }
      
      if (imageUrl) {
        const currentUrl = imageUrls[imageIndex];
        
        // 기존 이미지가 있으면 선택 모달 표시 (배치 모드가 아닐 때만)
        if (currentUrl && !isPartOfBatch) {
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
    shouldStopRef.current = false;
    const emptySlots = Array.from({ length: imageCount }, (_, idx) => idx + 1)
      .filter(index => getImageStatus(index) === 'empty' && getCurrentPrompt(index).trim());
    
    console.log(`배치 생성 시작: ${emptySlots.length}개 이미지, 스타일: ${imageStyle}`);
    
    for (let i = 0; i < emptySlots.length; i++) {
      // 정지 신호 확인 (루프 시작 시)
      if (shouldStopRef.current) {
        console.log('배치 생성 정지됨 (루프 시작)');
        break;
      }
      
      const imageIndex = emptySlots[i];
      console.log(`배치 생성 ${i + 1}/${emptySlots.length} - 이미지 ${imageIndex} 시작`);
      
      // v2와 동일하게 handleAIImageGeneration에 배치 모드 플래그 전달
      await handleAIImageGeneration(imageIndex, true);
      
      // 이미지 생성 완료 후 정지 신호 재확인
      if (shouldStopRef.current) {
        console.log('배치 생성 정지됨 (이미지 생성 완료 후)');
        break;
      }
      
      console.log(`배치 생성 완료 ${i + 1}/${emptySlots.length} - 이미지 ${imageIndex}`);
      
      // 다음 이미지 생성 전 잠시 대기 (API 과부하 방지)
      if (i < emptySlots.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsGeneratingAll(false);
    setShouldStopGeneration(false);
    shouldStopRef.current = false;
    console.log('배치 생성 완료 또는 정지됨');

    // 배치 생성 완료 다이얼로그 (정지되지 않았을 때만)
    if (!shouldStopRef.current && emptySlots.length > 0) {
      showAlert({
        type: 'success',
        title: '🎨 이미지 생성 완료',
        message: `모든 AI 이미지 생성이 완료되었습니다!\n\n총 ${emptySlots.length}개의 이미지가 생성되었습니다.`
      });
    }
  };
  
  // 배치 생성 정지
  const handleStopGeneration = () => {
    setShouldStopGeneration(true);
    shouldStopRef.current = true;
    console.log('배치 생성 정지 요청');
  };

  // 이미지 설정을 API 설정에 저장
  const saveImageSettingToAPI = async (settingType: 'style' | 'quality' | 'size', value: string) => {
    try {
      await GenerationAutomationService.updateImageSettings(settingType, value);
    } catch (error) {
      console.error('이미지 설정 저장 실패:', error);
    }
  };

  // 스타일 변경 핸들러 (API 설정과 동기화)
  const handleStyleChange = async (newStyle: typeof imageStyle) => {
    setImageStyle(newStyle);
    await saveImageSettingToAPI('style', newStyle);
  };

  // 품질 변경 핸들러 (API 설정과 동기화)
  const handleQualityChange = async (newQuality: typeof imageQuality) => {
    setImageQuality(newQuality);
    await saveImageSettingToAPI('quality', newQuality);
  };

  // 크기 변경 핸들러 (API 설정과 동기화)
  const handleSizeChange = async (newSize: typeof imageSize) => {
    setImageSize(newSize);
    await saveImageSettingToAPI('size', newSize);
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
      <div className="text-center p-10 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
        이미지가 필요하지 않은 글입니다.
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
              🖼️
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              이미지 관리 - 준비 현황: {Object.keys(imageUrls).length} / {imageCount} 완료
            </h2>
          </div>
          
        </div>
        
        {/* 이미지 생성 AI 상태 카드 */}
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
              <span>🤖</span>
              <span>이미지 생성 AI 상태</span>
            </span>
            <span className={`
              text-sm px-3 py-1 rounded-full font-medium
              ${hasImageClient 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
              }
            `}>
              {hasImageClient ? '✅ 연결됨' : '❌ 미설정'}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            현재 설정: {imageClientInfo}
          </div>
          
          {/* 이미지 생성 옵션 */}
          {hasImageClient && (
            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                <span>🎛️</span>
                <span>이미지 생성 옵션</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 동적 옵션 렌더링 */}
                {(() => {
                  const providerOptions = currentProvider && IMAGE_GENERATION_OPTIONS[currentProvider as keyof typeof IMAGE_GENERATION_OPTIONS];
                  if (!providerOptions) return null;

                  return (
                    <>
                      {/* 품질 설정 */}
                      {providerOptions.qualities?.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            품질
                          </label>
                          <select
                            value={imageQuality}
                            onChange={(e) => handleQualityChange(e.target.value as typeof imageQuality)}
                            className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 cursor-pointer focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                          >
                            {providerOptions.qualities.map((q: any) => (
                              <option key={q.value} value={q.value}>{q.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 해상도 설정 */}
                      {providerOptions.sizes?.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            해상도
                          </label>
                          <select
                            value={imageSize}
                            onChange={(e) => handleSizeChange(e.target.value as typeof imageSize)}
                            className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 cursor-pointer focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                            disabled={providerOptions.sizes.length === 1}
                          >
                            {providerOptions.sizes.map((s: any) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 스타일 설정 */}
                      {providerOptions.styles?.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            스타일
                          </label>
                          <select
                            value={imageStyle}
                            onChange={(e) => handleStyleChange(e.target.value as typeof imageStyle)}
                            className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 cursor-pointer focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200"
                          >
                            {providerOptions.styles.map((st: any) => (
                              <option key={st.value} value={st.value}>{st.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        
        {/* 배치 생성 버튼 및 정지 버튼 */}
        {hasImageClient && imageCount > 0 && (
          <div className="flex justify-center space-x-3 mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
            <Button
              onClick={handleGenerateAllEmpty}
              disabled={isGeneratingAll}
              loading={isGeneratingAll}
              variant="primary"
              size="lg"
              className="inline-flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/25"
            >
              <span>🎨</span>
              <span>빈 이미지 모두 AI로 생성 ({emptyWithPromptCount > 0 ? emptyWithPromptCount : imageCount}개)</span>
            </Button>
            
            {/* 정지 버튼 */}
            {isGeneratingAll && (
              <Button
                onClick={handleStopGeneration}
                variant="danger"
                size="lg"
                className="inline-flex items-center space-x-2"
              >
                <span>⏹️</span>
                <span>정지</span>
              </Button>
            )}
          </div>
        )}
        
        {/* 이미지 목록 - v2 스타일 */}
        <div className="space-y-4">
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
              <div key={idx} className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow duration-300">
                <div className="flex space-x-4">
                  {/* 이미지 미리보기 영역 */}
                  <div className="flex-shrink-0 w-40 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 relative overflow-hidden hover:border-purple-300 transition-colors duration-200">
                    {isGenerating && (
                      <div className="text-center">
                        <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-2 animate-spin"></div>
                        <div className="text-xs text-gray-600">AI 생성 중...</div>
                      </div>
                    )}
                    {isCompleted && imageUrl && (
                      <div 
                        className="w-full h-full relative cursor-pointer group"
                        onClick={() => openPreviewModal(imageUrl, imageIndex)}
                      >
                        <img 
                          src={imageUrl} 
                          alt={`이미지 ${imageIndex}`}
                          className="w-full h-full object-contain rounded-lg"
                        />
                        {/* 호버 효과 */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-2xl rounded-lg">
                          🔍
                        </div>
                      </div>
                    )}
                    {isCompleted && !imageUrl && (
                      <div className="w-full h-full flex items-center justify-center bg-blue-50 border-2 border-blue-400 rounded-lg text-blue-700">
                        <div className="text-center">
                          <div className="text-2xl mb-1">🖼️</div>
                          <div className="text-xs">이미지 로드 중...</div>
                        </div>
                      </div>
                    )}
                    {isEmpty && (
                      <div className="text-center text-gray-400">
                        <div className="text-2xl mb-1">📷</div>
                        <div className="text-xs">이미지 {imageIndex}</div>
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