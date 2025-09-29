import React from 'react';

interface KeywordInputSectionProps {
  mainKeyword: string;
  subKeywords: string;
  blogContent: string;
  onMainKeywordChange: (value: string) => void;
  onSubKeywordsChange: (value: string) => void;
  onBlogContentChange: (value: string) => void;
}

const KeywordInputSection: React.FC<KeywordInputSectionProps> = ({
  mainKeyword,
  subKeywords,
  blogContent,
  onMainKeywordChange,
  onSubKeywordsChange,
  onBlogContentChange,
}) => {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
          🔍
        </div>
        <h3 className="text-xl font-bold text-gray-800">키워드 입력 및 제목 추천</h3>
      </div>
      <p className="text-gray-600 text-sm mb-6 leading-relaxed bg-blue-50 border border-blue-200 rounded-lg p-3">
        💡 메인키워드, SEO 보조키워드, 글 내용을 입력하면 AI가 독자 관심을 끌 매력적인 제목 10개를 추천합니다
      </p>
      
      {/* 통합 입력 섹션 - 3개 필드 */}
      <div className="space-y-6">
        {/* 메인키워드 */}
        <div className="group">
          <label className="flex items-center space-x-2 mb-2 text-sm font-semibold text-gray-700">
            <span className="text-red-500">*</span>
            <span>메인키워드</span>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">필수</span>
          </label>
          <input
            type="text"
            value={mainKeyword}
            onChange={(e) => onMainKeywordChange(e.target.value)}
            placeholder="예: 홈트레이닝"
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 placeholder-gray-400"
          />
          <p className="text-gray-500 text-xs mt-1.5 flex items-center space-x-1">
            <span className="text-blue-500">💡</span>
            <span>블로그 글의 핵심 주제 키워드를 입력하세요</span>
          </p>
        </div>
        
        {/* 보조키워드 */}
        <div className="group">
          <label className="flex items-center space-x-2 mb-2 text-sm font-semibold text-gray-700">
            <span>보조키워드</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">선택사항</span>
          </label>
          <input
            type="text"
            value={subKeywords}
            onChange={(e) => onSubKeywordsChange(e.target.value)}
            placeholder="예: 홈트레이닝루틴, 홈트레이닝장비, 집에서운동 (쉼표로 구분)"
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all duration-200 placeholder-gray-400"
          />
          <p className="text-gray-500 text-xs mt-1.5 flex items-center space-x-1">
            <span className="text-green-500">📝</span>
            <span>관련 키워드를 쉼표(,)로 구분해서 입력하세요</span>
          </p>
        </div>

        {/* 어떤 블로그를 쓰고 싶은지 */}
        <div className="group">
          <label className="flex items-center space-x-2 mb-2 text-sm font-semibold text-gray-700">
            <span>어떤 내용으로 쓸지</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">선택사항</span>
          </label>
          <textarea
            value={blogContent}
            onChange={(e) => onBlogContentChange(e.target.value)}
            placeholder="예: 초보자를 위한 실전 가이드 / 단계별 따라하기 방법 / 경험담과 후기 중심 / 최신 트렌드 정리 / 비교분석 리뷰"
            rows={3}
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200 placeholder-gray-400 resize-vertical font-inherit"
          />
          <p className="text-gray-500 text-xs mt-1.5 flex items-center space-x-1">
            <span className="text-purple-500">✨</span>
            <span>어떤 내용으로 블로그 글을 쓸지 자세히 적어주세요</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeywordInputSection;