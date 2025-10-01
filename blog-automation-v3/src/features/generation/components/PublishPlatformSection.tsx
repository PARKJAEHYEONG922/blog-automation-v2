import React, { useRef } from 'react';
import NaverPublishUI from '@/features/publishing/components/NaverPublishUI';
import type { WorkflowData, ImageUrls } from '@/shared/types/common.types';

interface PublishPlatformSectionProps {
  selectedPlatform: string;
  onPlatformChange: (platform: string) => void;
  workflowData: WorkflowData;
  editedContent: string;
  images: ImageUrls;
  editorRef: React.RefObject<HTMLDivElement>;
}

const PublishPlatformSection: React.FC<PublishPlatformSectionProps> = ({
  selectedPlatform,
  onPlatformChange,
  workflowData,
  editedContent,
  images,
  editorRef
}) => {
  // 플랫폼 이름 반환 함수
  const getPlatformName = (platform: string): string => {
    switch (platform) {
      case 'naver': return '네이버 블로그';
      case 'tistory': return '티스토리';
      case 'wordpress': return '워드프레스';
      case 'google': return '구글 블로그';
      default: return '선택된 플랫폼';
    }
  };

  return (
    <>
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
            onChange={(e) => onPlatformChange(e.target.value)}
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
          data={workflowData}
          editedContent={editedContent}
          imageUrls={images}
          onComplete={(result) => {
            console.log('네이버 발행 완료:', result);
          }}
          copyToClipboard={async () => {
            try {
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
        <div className="section-card" style={{ padding: '20px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
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
    </>
  );
};

export default PublishPlatformSection;
