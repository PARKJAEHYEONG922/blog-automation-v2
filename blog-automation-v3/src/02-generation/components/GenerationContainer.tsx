import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import WorkSummary from './WorkSummary';
import ImageGenerator from './ImageGenerator';
import NaverPublishUI from '@/03-publish/platforms/NaverPublishUI';
import { ContentProcessor } from '@/02-generation/services/content-processor';
import { GenerationAutomationService } from '@/02-generation/services/generation-automation-service';
import Button from '@/shared/components/ui/Button';
import '@/shared/types/electron.types';
import { useDialog } from '@/app/DialogContext';
import { useWorkflow } from '@/app/WorkflowContext';
import { useGeneration } from '../hooks/useGeneration';

const Step2Generation: React.FC = () => {
  const { showAlert } = useDialog();
  const { workflowData, prevStep, reset } = useWorkflow();

  // WorkflowContext에서 필요한 데이터 추출
  const setupData = workflowData;
  const content = workflowData.generatedContent || '';
  const onGoBack = prevStep;
  const onReset = reset;

  // useGeneration 훅에서 실제 사용하는 상태와 함수만 가져오기
  const {
    editorRef,
    originalContent,
    editedContent,
    charCount,
    charCountWithSpaces,
    currentFontSize,
    fontSizes,
    imagePositions,
    images,
    activeTab,
    imagePrompts,
    isRegeneratingPrompts,
    imagePromptError,
    isRefreshingContent,
    selectedPlatform,
    aiModelStatus,
    setOriginalContent,
    setEditedContent,
    setCurrentFontSize,
    setActiveTab,
    setImages,
    setImagePositions,
    setImagePrompts,
    setImagePromptError,
    setSelectedPlatform,
    handleImagesChange,
    generateImagePrompts,
    regenerateImagePrompts,
    handleRefreshContent,
    replaceImagesInContent,
    handlePublish,
    updateCharCount,
    handleContentChange,
    restoreOriginal,
    copyToClipboard,
    handleFontSizeChange,
    applyFontSizeToSelection,
    insertLink,
    insertSeparator,
    handleKeyDown,
    handleClick,
    getPlatformName
  } = useGeneration();

  // 로컬에서만 필요한 추가 상태
  const [imageAIInfo, setImageAIInfo] = useState<string>('확인 중...');
  
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
        const llmSettings = await GenerationAutomationService.getLLMSettings();
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

  // v2와 동일한 초기 콘텐츠 로딩
  useEffect(() => {
    if (content) {
      // 원본 콘텐츠 저장
      setOriginalContent(content);

      // 자동편집 콘텐츠 생성 (네이버 블로그용 HTML) - v2와 동일한 방식
      const processedContent = ContentProcessor.convertToNaverBlogHTML(content);
      setEditedContent(processedContent);

      // 이미지 위치 감지 (원본 마크다운에서)
      const imageInfo = ContentProcessor.processImages(content);
      setImagePositions(imageInfo.imagePositions);
    }
  }, [content]);

  // 에디터 초기화 여부 추적 (한 번만 초기화)
  const isEditorPopulatedRef = useRef(false);

  // editedContent가 처음 생성될 때만 에디터에 반영
  useEffect(() => {
    if (editedContent && editorRef.current && !isEditorPopulatedRef.current) {
      editorRef.current.innerHTML = editedContent;
      isEditorPopulatedRef.current = true;
      // DOM 업데이트 완료 후 글자 수 계산
      setTimeout(() => {
        updateCharCount();
      }, 100);
    }
  }, [editedContent]);

  // 1단계에서 전달된 이미지 프롬프트들 초기화
  useEffect(() => {
    console.log('🔍 useEffect - setupData.imagePrompts:', setupData.imagePrompts);
    console.log('🔍 useEffect - Array.isArray?', Array.isArray(setupData.imagePrompts));
    console.log('🔍 useEffect - length:', setupData.imagePrompts?.length);

    if (setupData.imagePrompts && setupData.imagePrompts.length > 0) {
      console.log(`📋 1단계에서 생성된 이미지 프롬프트 ${setupData.imagePrompts.length}개 로드됨`);
      setImagePrompts(setupData.imagePrompts);
      setImagePromptError(null);
    } else if (setupData.imagePromptGenerationFailed) {
      console.warn('⚠️ 1단계에서 이미지 프롬프트 생성 실패');
      setImagePromptError('1단계에서 이미지 프롬프트 생성에 실패했습니다.');
    } else {
      console.warn('⚠️ imagePrompts가 없거나 빈 배열입니다');
    }
  }, [setupData.imagePrompts, setupData.imagePromptGenerationFailed]);

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
        setupData={setupData}
        charCount={charCount}
        charCountWithSpaces={charCountWithSpaces}
        imageCount={imagePositions.length}
        imageAIInfo={imageAIInfo}
        onRefreshContent={handleRefreshContent}
        isRefreshingContent={isRefreshingContent}
      />

      {/* 콘텐츠 편집기 - v2 Step3 스타일 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-base">
              📝
            </div>
            <h2 className="text-base font-semibold text-gray-900">콘텐츠 편집</h2>
          </div>
          {/* 헤더 오른쪽에 글자 수 표시 */}
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
            📊 글자 수: {charCount.toLocaleString()}자 / 공백포함: {charCountWithSpaces.toLocaleString()}자
          </div>
        </div>
        
        {/* v2 Step3와 완전 동일한 편집기 UI */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '12px'
        }}>
          {/* 탭 버튼들 */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              onClick={() => setActiveTab('edited')}
              style={{
                backgroundColor: activeTab === 'edited' ? '#3b82f6' : 'transparent',
                color: activeTab === 'edited' ? 'white' : '#6b7280',
                borderTop: activeTab === 'edited' ? 'none' : '1px solid #d1d5db',
                borderLeft: activeTab === 'edited' ? 'none' : '1px solid #d1d5db',
                borderRight: activeTab === 'edited' ? 'none' : '1px solid #d1d5db',
                borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📝 자동편집 콘텐츠
            </button>
            <button
              onClick={() => setActiveTab('original')}
              style={{
                backgroundColor: activeTab === 'original' ? '#3b82f6' : 'transparent',
                color: activeTab === 'original' ? 'white' : '#6b7280',
                borderTop: activeTab === 'original' ? 'none' : '1px solid #d1d5db',
                borderLeft: activeTab === 'original' ? 'none' : '1px solid #d1d5db',
                borderRight: activeTab === 'original' ? 'none' : '1px solid #d1d5db',
                borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📄 원본 콘텐츠
            </button>
          </div>

          {/* 기능 버튼 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeTab === 'edited' && (
              <>
                <select
                  value={currentFontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  title="텍스트 드래그 후 글씨 크기 선택"
                >
                  {fontSizes.map((font) => (
                    <option key={font.size} value={font.size}>
                      {font.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={insertLink}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="링크 카드 추가 (커서 위치에 삽입)"
                >
                  🔗 링크
                </button>

                <button
                  onClick={insertSeparator}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                  title="구분선 추가 (커서 위치에 삽입)"
                >
                  ➕ 구분선
                </button>

                <button
                  onClick={restoreOriginal}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 원본 복원
                </button>
                
                <button
                  onClick={async () => await copyToClipboard()}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  📋 복사
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* 글자 수 표시 */}
        {activeTab === 'edited' && (
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            글자 수: {charCount.toLocaleString()}자 / 공백포함: {charCountWithSpaces.toLocaleString()}자
          </div>
        )}

        {/* v2와 완전 동일한 편집기 - 탭 전환 시에도 DOM 유지 */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0 8px 8px 8px',
          backgroundColor: '#ffffff',
          minHeight: '400px'
        }}>
          {/* 자동편집 에디터 - 항상 렌더링하되 display로 숨김 */}
          <div
            ref={editorRef}
            id="step3-editor"
            contentEditable
            style={{
              display: activeTab === 'edited' ? 'block' : 'none',
              width: '100%',
              minHeight: '400px',
              maxHeight: '600px',
              padding: '16px',
              border: 'none',
              borderRadius: '0 8px 8px 8px',
              fontSize: '15px',
              lineHeight: '1.8',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              backgroundColor: 'white',
              position: 'relative',
              zIndex: 1,
              overflowY: 'auto',
              outline: 'none'
            }}
            onInput={handleContentChange}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            suppressContentEditableWarning={true}
          />

          {/* 원본 콘텐츠 뷰어 - 항상 렌더링하되 display로 숨김 */}
          <div
            style={{
              display: activeTab === 'original' ? 'block' : 'none',
              padding: '20px',
              fontSize: '15px',
              lineHeight: '1.7',
              height: '500px',
              maxHeight: '500px',
              overflowY: 'auto',
              color: '#374151',
              backgroundColor: '#f9fafb',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: '1px solid #e5e7eb'
            }}
          >
            {originalContent || workflowData.generatedContent || '원본 콘텐츠가 없습니다.'}
          </div>
        </div>

        {/* v2와 동일한 CSS 스타일 */}
        <style>{`
          .se-text-paragraph {
            margin: 0;
            padding: 0;
            line-height: 1.8;
          }
          .se-text-paragraph-align-left {
            text-align: left;
          }
          .se-text-paragraph-align-center {
            text-align: center;
          }
          .se-ff-nanumgothic {
            font-family: "Nanum Gothic", "나눔고딕", "돋움", Dotum, Arial, sans-serif;
          }
          .se-fs15 {
            font-size: 15px !important;
          }
          .se-fs16 {
            font-size: 16px !important;
          }
          .se-fs19 {
            font-size: 19px !important;
          }
          .se-fs24 {
            font-size: 24px !important;
          }
          .se-component {
            margin: 16px 0;
          }
          .se-table {
            width: 100%;
          }
          .se-table-content {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
          }
          .se-cell {
            border: 1px solid #ddd;
            padding: 8px;
            vertical-align: top;
          }
          .se-tr {
            border: none;
          }
          .se-module-text {
            margin: 0;
            padding: 0;
          }
          #step3-editor:focus {
            outline: 2px solid #3b82f6;
            outline-offset: -2px;
          }
        `}</style>

        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
          💡 <strong>편집 팁:</strong> 텍스트 선택 후 폰트 크기 변경 | 네이버 블로그 완전 호환 방식 | Ctrl+1~4로 폰트 크기 단축키
        </div>
      </div>

      {/* 이미지 프롬프트 재생성 섹션 (오류 시에만 표시) */}
      {(imagePromptError || (imagePositions.length > 0 && imagePrompts.length === 0)) && (
        <div className="section-card" style={{padding: '20px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
          <div className="section-header" style={{marginBottom: '16px'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="section-icon" style={{
                width: '32px', 
                height: '32px', 
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}>⚠️</div>
              <h2 className="section-title" style={{fontSize: '16px', margin: '0', lineHeight: '1', color: '#dc2626'}}>
                이미지 프롬프트 생성 오류
              </h2>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#7f1d1d', 
              marginBottom: '8px',
              backgroundColor: '#fef7f7',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #fecaca'
            }}>
              {imagePromptError || '이미지 프롬프트가 생성되지 않았습니다. 글에는 이미지 태그가 있지만 프롬프트가 생성되지 않았습니다.'}
            </div>
            
            <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>
              💡 <strong>해결 방법:</strong>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>API 설정에서 다른 AI 제공자로 변경 후 재생성 시도</li>
                <li>현재 설정 그대로 재생성 시도 (일시적 오류일 경우)</li>
                <li>수동으로 이미지 업로드하여 사용</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button
                onClick={regenerateImagePrompts}
                disabled={isRegeneratingPrompts}
                loading={isRegeneratingPrompts}
                variant="danger"
                className="flex items-center gap-2"
              >
                🔄 이미지 프롬프트 재생성
              </Button>
              
              <span style={{ fontSize: '12px', color: '#7f1d1d' }}>
                {isRegeneratingPrompts ? '프롬프트 재생성 중...' : 'API 설정을 변경한 후 재생성하면 더 성공 가능성이 높습니다'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 생성 섹션 */}
      <ImageGenerator
        imagePositions={imagePositions}
        imagePrompts={imagePrompts}
        onImagesChange={handleImagesChange}
        aiModelStatus={aiModelStatus}
      />


      {/* 발행 플랫폼 선택 섹션 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-base">
            🚀
          </div>
          <h2 className="text-base font-semibold text-gray-900">발행 플랫폼 선택</h2>
        </div>
        
        <div className="flex items-center space-x-4 mb-3">
          <label className="text-sm font-medium text-gray-700 min-w-[100px]">
            발행할 블로그:
          </label>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer min-w-[200px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          >
            <option value="" disabled>플랫폼을 선택해주세요</option>
            <option value="naver">🟢 네이버 블로그</option>
            <option value="tistory">🟠 티스토리</option>
            <option value="wordpress">🔵 워드프레스</option>
            <option value="google">🔴 구글 블로그</option>
          </select>
        </div>
        
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-2">
          <span>💡</span>
          <span>네이버 블로그 발행 기능이 구현되어 있습니다. 다른 플랫폼은 순차적으로 구현 예정입니다.</span>
        </div>
      </div>

      {/* 선택된 플랫폼별 발행 컴포넌트 */}
      {selectedPlatform === 'naver' && (
        <NaverPublishUI
          data={setupData}
          editedContent={editedContent}
          imageUrls={images}
          onComplete={(result) => {
            console.log('네이버 발행 완료:', result);
          }}
          copyToClipboard={async () => {
            try {
              // 원본 탭이면 자동편집 탭으로 전환
              if (activeTab !== 'edited') {
                setActiveTab('edited');
                await new Promise(resolve => setTimeout(resolve, 100)); // DOM 업데이트 대기
              }

              // editorRef (실제 DOM 요소)를 사용하여 복사
              if (editorRef.current) {
                // HTML 형식으로 복사하기 위해 선택 영역 생성
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                selection?.removeAllRanges();
                selection?.addRange(range);

                // 복사 실행
                const success = document.execCommand('copy');

                // 선택 해제
                selection?.removeAllRanges();

                if (success) {
                  console.log('✅ HTML 형식으로 클립보드에 복사되었습니다! (editorRef 사용)');
                  return true;
                } else {
                  throw new Error('복사 명령 실행 실패');
                }
              } else {
                throw new Error('에디터 참조를 찾을 수 없습니다');
              }
            } catch (err) {
              console.error('복사 실패:', err);
              // 대체 방법: editedContent로 텍스트 복사
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = editedContent;
              const textContent = tempDiv.innerText || '';
              await navigator.clipboard.writeText(textContent);
              console.log('⚠️ 텍스트 형식으로 복사되었습니다.');
              return false;
            }
          }}
        />
      )}

      {selectedPlatform && selectedPlatform !== 'naver' && (
        <div className="section-card" style={{padding: '20px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', color: '#dc2626', fontWeight: '600', marginBottom: '8px' }}>
              🚧 {getPlatformName(selectedPlatform)} 발행 기능 준비 중
            </div>
            <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
              해당 플랫폼의 발행 기능은 곧 구현될 예정입니다.
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="mt-8 flex justify-between items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        {/* 왼쪽: 이전으로 가기 */}
        <Button 
          onClick={onGoBack} 
          variant="secondary"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors duration-200"
        >
          <span>←</span>
          <span>이전으로 가기</span>
        </Button>
        
        {/* 가운데: 발행 버튼 (다른 플랫폼용) */}
        <div className="flex space-x-3">
          {selectedPlatform && selectedPlatform !== 'naver' && (Object.keys(images).length === imagePositions.length || imagePositions.length === 0) && (
            <Button 
              onClick={handlePublish}
              variant="publish"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors duration-200 shadow-lg shadow-emerald-500/25"
            >
              <span>📤</span>
              <span>{getPlatformName(selectedPlatform)}에 발행하기</span>
            </Button>
          )}
        </div>
        
        {/* 오른쪽: 처음부터 다시 */}
        <Button 
          onClick={onReset}
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