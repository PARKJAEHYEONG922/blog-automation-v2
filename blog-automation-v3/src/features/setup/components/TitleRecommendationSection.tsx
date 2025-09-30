import React, { useState } from 'react';
import Button from '../../../shared/components/ui/Button';

interface TitleRecommendationSectionProps {
  generatedTitles: string[];
  selectedTitle: string;
  isGeneratingTitles: boolean;
  isGenerating: boolean;
  mainKeyword: string;
  onGenerateTitles: () => void;
  onSelectTitle: (title: string) => void;
  onStartGeneration: () => void;
  onLoadDummyTitles?: (titles: string[]) => void;
}

const TitleRecommendationSection: React.FC<TitleRecommendationSectionProps> = ({
  generatedTitles,
  selectedTitle,
  isGeneratingTitles,
  isGenerating,
  mainKeyword,
  onGenerateTitles,
  onSelectTitle,
  onStartGeneration,
  onLoadDummyTitles,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // 더미 제목 데이터
  const dummyTitles = [
    "테슬라 주가 상승 이유 5가지! 미래 전망까지 완벽 분석",
    "2025년 테슬라 투자 전략 - 전문가가 알려주는 핵심 포인트",
    "테슬라 vs 경쟁사 비교분석! 왜 테슬라가 유리한가?",
    "테슬라 신기술 발표 후 주가 전망과 투자 기회",
    "테슬라 주식 투자 전 반드시 알아야 할 10가지",
    "일론 머스크의 테슬라 비전 - 2030년까지의 로드맵",
    "테슬라 자율주행 기술의 현재와 미래 전망",
    "테슬라 배터리 기술 혁신이 주가에 미치는 영향",
    "테슬라 중국 시장 전략과 글로벌 확장 계획",
    "테슬라 주가 분석: 언제 사고 언제 팔아야 할까?"
  ];

  const handleLoadDummy = () => {
    if (onLoadDummyTitles) {
      onLoadDummyTitles(dummyTitles);
    }
  };
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
            🎯
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">AI 추천 제목</h3>
            {generatedTitles.length > 0 && (
              <span className="text-sm text-green-600 font-medium">
                ({generatedTitles.length}개 생성됨)
              </span>
            )}
          </div>
        </div>
        
        {/* 제목 생성 버튼들 - 오른쪽 배치 */}
        <div className="flex space-x-3">
          {/* 더미 데이터 버튼 */}
          <Button
            onClick={handleLoadDummy}
            disabled={isGeneratingTitles}
            variant="secondary"
            className="inline-flex items-center space-x-2"
            title="테스트용 더미 제목 10개를 불러옵니다"
          >
            <span>🧪</span>
            <span>더미 데이터</span>
          </Button>
          
          {/* 제목 생성 버튼 */}
          <Button
            onClick={onGenerateTitles}
            disabled={isGeneratingTitles || !mainKeyword.trim()}
            loading={isGeneratingTitles}
            variant={generatedTitles.length > 0 ? "success" : "primary"}
            className="inline-flex items-center space-x-2"
          >
            {!isGeneratingTitles && (
              <>
                {generatedTitles.length > 0 ? (
                  <>
                    <span>🔄</span>
                    <span>재생성</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>제목 생성</span>
                  </>
                )}
              </>
            )}
            {isGeneratingTitles && <span>생성 중...</span>}
          </Button>
        </div>
      </div>
      
      {/* 제목이 생성되기 전 안내 메시지 및 직접 입력 */}
      {generatedTitles.length === 0 && !isGeneratingTitles && (
        <div>
          <div className="text-center p-5 text-gray-600 text-sm bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl mb-4">
            📝 메인키워드를 입력하고 "제목 생성" 버튼을 클릭해주세요
          </div>
          
          <div className="text-center text-xs text-gray-500 mb-4">
            또는
          </div>
          
          {/* 직접 제목 입력 (항상 표시) */}
          <div className="mb-5">
            <label className="flex items-center space-x-2 mb-3 text-sm font-semibold text-gray-700">
              <span>✍️</span>
              <span>직접 제목 입력</span>
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="사용하고 싶은 제목을 입력해주세요..."
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all duration-200 placeholder-gray-400"
            />
            {customTitle.trim() && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs text-green-700 font-semibold mb-1">
                  ✅ 입력된 제목
                </div>
                <div className="text-sm text-green-800 font-semibold">
                  {customTitle}
                </div>
              </div>
            )}
          </div>
          
          {/* 직접 입력 제목으로 글 생성 버튼 */}
          {customTitle.trim() && (
            <div className="text-center">
              <Button
                onClick={onStartGeneration}
                disabled={isGenerating}
                loading={isGenerating}
                variant="success"
                size="lg"
                className="inline-flex items-center space-x-2"
              >
                <span>🚀</span>
                <span>입력한 제목으로 글 생성하기</span>
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* 제목 생성 중 표시 */}
      {isGeneratingTitles && (
        <div className="text-center p-8 text-blue-600 text-sm bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3 animate-spin"></div>
          AI가 매력적인 제목 10개를 생성하고 있습니다...
        </div>
      )}
      
      {/* 제목 선택 드롭다운 */}
      {generatedTitles.length > 0 && !isGeneratingTitles && (
        <>
          <div className="mb-5">
            <label className="flex items-center space-x-2 mb-3 text-sm font-semibold text-gray-700">
              <span className="text-red-500">*</span>
              <span>사용할 제목 선택</span>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">필수</span>
            </label>
            <select
              value={selectedTitle}
              onChange={(e) => onSelectTitle(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all duration-200 cursor-pointer"
            >
              <option value="">제목을 선택해주세요...</option>
              {generatedTitles.map((title, index) => (
                <option key={index} value={title}>
                  {index + 1}. {title}
                </option>
              ))}
              <option value="__CUSTOM__">✍️ 직접 입력하기</option>
            </select>
          </div>
          
          {/* 커스텀 제목 입력 */}
          {selectedTitle === '__CUSTOM__' && (
            <div className="mb-5">
              <label className="flex items-center space-x-2 mb-3 text-sm font-semibold text-gray-700">
                <span>✍️</span>
                <span>직접 제목 입력</span>
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="사용하고 싶은 제목을 입력해주세요..."
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all duration-200 placeholder-gray-400"
              />
              {customTitle.trim() && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-xs text-green-700 font-semibold mb-1">
                    ✅ 입력된 제목
                  </div>
                  <div className="text-sm text-green-800 font-semibold">
                    {customTitle}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 선택된 제목 표시 (AI 추천 제목인 경우) */}
          {selectedTitle && selectedTitle !== '__CUSTOM__' && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-700 font-semibold mb-1">
                ✅ 선택된 제목
              </div>
              <div className="text-sm text-green-800 font-semibold">
                {selectedTitle}
              </div>
            </div>
          )}
          
          {/* 글 생성 버튼 */}
          {((selectedTitle && selectedTitle !== '__CUSTOM__') || (selectedTitle === '__CUSTOM__' && customTitle.trim())) && (
            <div className="text-center">
              <Button
                onClick={() => {
                  onStartGeneration();
                }}
                disabled={isGenerating}
                loading={isGenerating}
                variant="success"
                size="lg"
                className="inline-flex items-center space-x-2"
              >
                {!isGenerating && <span>🚀</span>}
                <span>{isGenerating ? '글 생성 중...' : `${selectedTitle === '__CUSTOM__' ? '입력한' : '선택한'} 제목으로 글 생성하기`}</span>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TitleRecommendationSection;