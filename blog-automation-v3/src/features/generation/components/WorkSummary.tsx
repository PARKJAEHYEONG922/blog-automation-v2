import React from 'react';

interface WorkSummaryProps {
  setupData: {
    selectedTitle: string;
    mainKeyword: string;
    subKeywords: string;
    blogContent: string;
    isAIGenerated: boolean;
  };
  charCount: number;
  charCountWithSpaces: number;
  imageCount: number;
  imageAIInfo: string;
  onRefreshContent?: () => void;
  isRefreshingContent?: boolean;
}

const WorkSummary: React.FC<WorkSummaryProps> = ({ 
  setupData, 
  charCount,
  charCountWithSpaces,
  imageCount, 
  imageAIInfo,
  onRefreshContent,
  isRefreshingContent = false
}) => {
  return (
    <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-0.5 mb-6 shadow-xl shadow-purple-500/20">
      <div className="bg-white rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center space-x-2">
            <span>📋</span>
            <span>작업 요약</span>
          </h3>
          
          {/* AI 생성된 글인 경우에만 수정된 글 가져오기 버튼 표시 */}
          {setupData.isAIGenerated && onRefreshContent && (
            <button
              onClick={onRefreshContent}
              disabled={isRefreshingContent}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isRefreshingContent
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 hover:-translate-y-0.5 shadow-lg shadow-blue-500/25'
              } text-white`}
              title="Claude Web에서 수정한 글을 다시 가져옵니다"
            >
              {isRefreshingContent ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>가져오는 중...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>수정된 글 가져오기</span>
                </>
              )}
            </button>
          )}
        </div>
        
        {/* 제목 섹션 - 특별히 강조 */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-base text-indigo-600 font-semibold">📝 글제목</span>
            <span className="text-base font-bold text-slate-800 flex-1 truncate">
              {setupData.selectedTitle || '제목 정보 없음'}
            </span>
          </div>
        </div>

        {/* 정보 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* 메인 키워드 카드 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs text-red-600 font-semibold mb-1">🎯 메인 키워드</div>
            <div className="text-sm font-semibold text-red-800 truncate">
              {setupData.mainKeyword || '입력되지 않음'}
            </div>
          </div>

          {/* 보조 키워드 카드 */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-xs text-orange-600 font-semibold mb-1">📌 보조 키워드</div>
            <div className="text-sm font-semibold text-orange-800 truncate">
              {setupData.subKeywords || '입력되지 않음'}
            </div>
          </div>

          {/* 글자 수 카드 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-semibold mb-1">📊 글자 수</div>
            <div className="text-sm font-semibold text-blue-800">
              {charCount.toLocaleString()}자 / 공백포함 {charCountWithSpaces.toLocaleString()}자
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 글 방향 카드 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-600 font-semibold mb-1">📋 글 방향</div>
            <div className="text-sm font-semibold text-green-800 truncate">
              {setupData.blogContent ? 
                setupData.blogContent.slice(0, 25) + (setupData.blogContent.length > 25 ? '...' : '') : 
                '입력되지 않음'}
            </div>
          </div>

          {/* 이미지 개수 카드 */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-xs text-purple-600 font-semibold mb-1">🖼️ 이미지 개수</div>
            <div className="text-sm font-semibold text-purple-800">
              {imageCount}개
            </div>
          </div>

          {/* 생성된 콘텐츠 카드 */}
          <div className={`border rounded-lg p-3 ${
            setupData.isAIGenerated 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className={`text-xs font-semibold mb-1 ${
              setupData.isAIGenerated ? 'text-blue-600' : 'text-purple-600'
            }`}>📝 생성 방식</div>
            <div className={`text-sm font-semibold ${
              setupData.isAIGenerated ? 'text-blue-800' : 'text-purple-800'
            }`}>
              {setupData.isAIGenerated ? '🤖 AI로 생성됨' : '✏️ 수동으로 입력됨'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkSummary;